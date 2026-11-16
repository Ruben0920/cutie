"""Real-time partner interactions: quick statuses, surprise triggers, and Smart Dice."""

import random
from datetime import datetime, timezone

from fastapi import APIRouter, Body, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_couple, get_current_user
from app.core.database import get_db
from app.core.i18n import get_localized_message
from app.models.entities import Couple, DateIdea, GiftIdea, User
from app.models.enums import DateCategoryEnum, EnergyLevelEnum, QuickStatusEnum
from app.schemas.interactions import (
    DiceRollRequest,
    DiceRollResponse,
    QuickStatusUpdateRequest,
    QuickStatusUpdateResponse,
    SurpriseRequestPayload,
    SurpriseRequestResponse,
)
from app.schemas.user_couple import UserResponse
from app.services.dice_service import SmartDiceService
from app.services.notification_service import notify_partner

router = APIRouter(prefix="/interactions", tags=["Interactions & Smart Dice"])

STATUS_MESSAGE_KEYS: dict[QuickStatusEnum, str] = {
    QuickStatusEnum.GOING_HOME: "status_going_home",
    QuickStatusEnum.HIGH_ENERGY: "status_high_energy",
    QuickStatusEnum.TIRED: "status_tired",
    QuickStatusEnum.HUNGRY: "status_hungry",
    QuickStatusEnum.NEED_HUGS: "status_need_hugs",
    QuickStatusEnum.BUSY: "status_busy",
}


@router.post("/status", response_model=QuickStatusUpdateResponse)
async def update_quick_status(
    payload: QuickStatusUpdateRequest,
    current_user: User = Depends(get_current_user),
    couple: Couple = Depends(get_current_couple),
    db: AsyncSession = Depends(get_db),
) -> QuickStatusUpdateResponse:
    """Update quick status, calibrate energy modifier, and notify the partner immediately."""
    current_user.current_status = payload.status
    current_user.current_status_updated_at = datetime.now(timezone.utc)

    if payload.status == QuickStatusEnum.HIGH_ENERGY:
        current_user.current_energy_modifier = EnergyLevelEnum.HIGH
    elif payload.status in {QuickStatusEnum.TIRED, QuickStatusEnum.BUSY}:
        current_user.current_energy_modifier = EnergyLevelEnum.LOW

    await db.commit()
    await db.refresh(current_user)

    msg_key = STATUS_MESSAGE_KEYS[payload.status]
    preview = get_localized_message(msg_key, current_user.preferred_language)

    partner_found, _ = await notify_partner(
        db=db,
        couple_id=couple.id,
        sender_id=current_user.id,
        event_type="PARTNER_STATUS_UPDATED",
        payload_dict={
            "status": payload.status.value,
            "energy_modifier": current_user.current_energy_modifier.value,
            "sender_name": current_user.name,
        },
        title=current_user.name,
        body_key=msg_key,
    )

    return QuickStatusUpdateResponse(
        user=UserResponse.model_validate(current_user),
        status_message_preview=preview,
        partner_notified=partner_found,
    )


@router.post("/request-surprise", response_model=SurpriseRequestResponse)
async def request_surprise(
    payload: SurpriseRequestPayload | None = Body(default=None),
    current_user: User = Depends(get_current_user),
    couple: Couple = Depends(get_current_couple),
    db: AsyncSession = Depends(get_db),
) -> SurpriseRequestResponse:
    """Send an instant surprise request to the partner with 1 attached gift/date suggestion."""
    hint = payload.hint.strip() if payload and payload.hint else None

    gifts_res = await db.execute(
        select(GiftIdea).where(
            GiftIdea.couple_id == couple.id,
            GiftIdea.author_id == current_user.id,
            GiftIdea.is_purchased.is_(False),
        )
    )
    gifts = list(gifts_res.scalars().all())

    dates_res = await db.execute(
        select(DateIdea).where(
            DateIdea.couple_id == couple.id,
            DateIdea.is_archived.is_(False),
        )
    )
    all_dates = list(dates_res.scalars().all())
    surprise_or_romantic_dates = [
        d for d in all_dates if d.is_surprise or d.category == DateCategoryEnum.ROMANTIC
    ]

    suggestion_pool: list[dict[str, str]] = []
    for g in gifts:
        suggestion_pool.append(
            {
                "suggestion_type": "gift",
                "id": str(g.id),
                "title": g.title,
                "direct_url": g.direct_url,
            }
        )
    for d in surprise_or_romantic_dates:
        suggestion_pool.append(
            {
                "suggestion_type": "date",
                "id": str(d.id),
                "title": d.title,
                "category": d.category.value,
            }
        )

    attached_suggestion = (
        random.choice(suggestion_pool) if suggestion_pool else None
    )

    body_key = "surprise_requested_body" if hint else "surprise_requested_no_hint"
    partner_found, partner_online = await notify_partner(
        db=db,
        couple_id=couple.id,
        sender_id=current_user.id,
        event_type="SURPRISE_REQUESTED",
        payload_dict={
            "sender_name": current_user.name,
            "hint": hint,
            "suggested_idea": attached_suggestion,
        },
        title_key="surprise_requested_title",
        body_key=body_key,
        message_kwargs={"hint": hint} if hint else {},
    )

    return SurpriseRequestResponse(
        sent=partner_found,
        partner_online=partner_online,
        message=(
            "Surprise request delivered to your partner!"
            if partner_found
            else "No partner paired yet to receive the surprise request."
        ),
    )


@router.post("/roll-dice", response_model=DiceRollResponse)
async def roll_smart_dice(
    payload: DiceRollRequest | None = Body(default=None),
    current_user: User = Depends(get_current_user),
    couple: Couple = Depends(get_current_couple),
    db: AsyncSession = Depends(get_db),
) -> DiceRollResponse:
    """Roll the context-aware Smart Dice calibrated by cycle phase and partner statuses."""
    include_surprises = payload.include_surprises if payload is not None else True
    return await SmartDiceService.roll_dice(
        db=db,
        couple=couple,
        current_user=current_user,
        include_surprises=include_surprises,
    )
