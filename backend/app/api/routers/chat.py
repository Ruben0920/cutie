"""Couple chat routes with persistent storage and WebSocket delivery."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_couple, get_current_user
from app.core.database import get_db
from app.models.entities import ChatMessage, Couple, User
from app.schemas.chat import (
    ChatHistoryResponse,
    ChatMarkReadResponse,
    ChatMessageCreate,
    ChatMessageRead,
)
from app.services.notification_service import notify_partner

router = APIRouter(prefix="/chat", tags=["Couple Chat"])


def _serialize_message(msg: ChatMessage, sender_name: str) -> ChatMessageRead:
    return ChatMessageRead(
        id=msg.id,
        couple_id=msg.couple_id,
        sender_id=msg.sender_id,
        sender_name=sender_name,
        body=msg.body,
        read_at=msg.read_at,
        created_at=msg.created_at,
    )


@router.get("/messages", response_model=ChatHistoryResponse)
async def list_chat_messages(
    limit: int = Query(default=100, ge=1, le=200),
    couple: Couple = Depends(get_current_couple),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ChatHistoryResponse:
    """Return recent couple messages in chronological order plus unread count."""
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.couple_id == couple.id)
        .options(selectinload(ChatMessage.sender))
        .order_by(ChatMessage.created_at.desc())
        .limit(limit)
    )
    rows = list(reversed(result.scalars().all()))

    unread_res = await db.execute(
        select(func.count(ChatMessage.id)).where(
            ChatMessage.couple_id == couple.id,
            ChatMessage.sender_id != current_user.id,
            ChatMessage.read_at.is_(None),
        )
    )
    unread_count = int(unread_res.scalar() or 0)

    messages = [
        _serialize_message(
            row,
            row.sender.name if row.sender is not None else "Partner",
        )
        for row in rows
    ]
    return ChatHistoryResponse(messages=messages, unread_count=unread_count)


@router.post(
    "/messages",
    response_model=ChatMessageRead,
    status_code=status.HTTP_201_CREATED,
)
async def send_chat_message(
    payload: ChatMessageCreate,
    couple: Couple = Depends(get_current_couple),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ChatMessageRead:
    """Persist a couple chat message and notify partner in real time."""
    clean_body = payload.body.strip()
    if not clean_body:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Message cannot be empty.",
        )

    msg = ChatMessage(
        couple_id=couple.id,
        sender_id=current_user.id,
        body=clean_body,
        created_at=datetime.now(timezone.utc),
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    await notify_partner(
        db=db,
        couple_id=couple.id,
        sender_id=current_user.id,
        event_type="CHAT_MESSAGE_RECEIVED",
        payload_dict={
            "message_id": str(msg.id),
            "couple_id": str(msg.couple_id),
            "sender_id": str(msg.sender_id),
            "sender_name": current_user.name,
            "body": msg.body,
            "created_at": msg.created_at.isoformat(),
        },
        title=current_user.name,
        body=clean_body[:140],
    )

    return _serialize_message(msg, current_user.name)


@router.post("/messages/read", response_model=ChatMarkReadResponse)
async def mark_chat_messages_read(
    couple: Couple = Depends(get_current_couple),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ChatMarkReadResponse:
    """Mark all unread partner messages in this couple space as read."""
    now = datetime.now(timezone.utc)
    stmt = (
        update(ChatMessage)
        .where(
            ChatMessage.couple_id == couple.id,
            ChatMessage.sender_id != current_user.id,
            ChatMessage.read_at.is_(None),
        )
        .values(read_at=now)
    )
    res = await db.execute(stmt)
    await db.commit()
    marked_count = int(res.rowcount or 0)

    if marked_count > 0:
        await notify_partner(
            db=db,
            couple_id=couple.id,
            sender_id=current_user.id,
            event_type="CHAT_MESSAGES_READ",
            payload_dict={"reader_id": str(current_user.id)},
            title=current_user.name,
            body="",
        )

    return ChatMarkReadResponse(marked_count=marked_count, unread_count=0)
