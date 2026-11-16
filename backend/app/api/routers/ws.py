"""WebSocket endpoint for real-time partner synchronization."""

from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select

from app.core.database import async_session_factory
from app.core.security import decode_access_token
from app.models.entities import User
from app.services.notification_service import manager

router = APIRouter(tags=["WebSocket Real-Time"])


@router.websocket("/ws/{token}")
async def couple_websocket_endpoint(websocket: WebSocket, token: str) -> None:
    """Authenticate via JWT in path and stream real-time couple events."""
    payload = decode_access_token(token)
    if payload is None or "sub" not in payload:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        user_id = UUID(str(payload["sub"]))
    except ValueError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    async with async_session_factory() as db:
        res = await db.execute(select(User).where(User.id == user_id))
        user = res.scalar_one_or_none()

    if user is None or user.couple_id is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    couple_id = user.couple_id
    await manager.connect(couple_id=couple_id, user_id=user.id, websocket=websocket)
    try:
        while True:
            message = await websocket.receive_text()
            if message == "ping":
                await websocket.send_json({"event_type": "PONG"})
    except WebSocketDisconnect:
        manager.disconnect(couple_id=couple_id, user_id=user.id, websocket=websocket)
    except Exception:
        manager.disconnect(couple_id=couple_id, user_id=user.id, websocket=websocket)
