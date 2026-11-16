"""Service layer for invite code generation, couple pairing, and dashboard assembly."""

import secrets
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.i18n import get_localized_message
from app.models.entities import (
    Couple,
    CycleDayObservation,
    CycleLog,
    DateIdea,
    GiftIdea,
    User,
)
from app.schemas.user_couple import (
    ActiveEveningScenarioBrief,
    CountdownData,
    CoupleDashboardResponse,
    UserResponse,
)

# Unambiguous uppercase alphanumeric alphabet (excludes 0, O, 1, I)
INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
INVITE_CODE_LENGTH = 6


async def generate_unique_invite_code(db: AsyncSession) -> str:
    """Generate a collision-free 6-character alphanumeric invite code."""
    for _ in range(25):
        code = "".join(
            secrets.choice(INVITE_CODE_ALPHABET) for _ in range(INVITE_CODE_LENGTH)
        )
        existing = await db.execute(
            select(Couple.id).where(Couple.invite_code == code)
        )
        if existing.scalar_one_or_none() is None:
            return code

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Unable to generate unique invite code",
    )


async def join_couple_by_code(
    db: AsyncSession,
    current_user: User,
    raw_invite_code: str,
) -> Couple:
    """Move a solo user into the target partner's couple space via invite code."""
    normalized_code = raw_invite_code.strip().upper()
    if len(normalized_code) != INVITE_CODE_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invite code must be 6 characters",
        )

    result = await db.execute(
        select(Couple)
        .where(Couple.invite_code == normalized_code)
        .options(
            selectinload(Couple.partners),
            selectinload(Couple.active_evening_scenario),
        )
    )
    target_couple = result.scalar_one_or_none()
    if target_couple is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Couple with this invite code was not found",
        )

    if current_user.couple_id == target_couple.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already a member of this couple",
        )

    if len(target_couple.partners) >= 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target couple already has two partners",
        )

    old_couple_id = current_user.couple_id
    if old_couple_id is not None:
        count_res = await db.execute(
            select(func.count(User.id)).where(User.couple_id == old_couple_id)
        )
        old_partner_count = count_res.scalar_one()
        if old_partner_count >= 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You are already paired in an active two-partner couple",
            )

    current_user.couple_id = target_couple.id
    await db.flush()

    if old_couple_id is not None:
        old_couple = await db.get(Couple, old_couple_id)
        if old_couple is not None:
            old_couple.active_evening_scenario_id = None
            await db.flush()
            db.expunge(old_couple)
        await db.execute(delete(DateIdea).where(DateIdea.couple_id == old_couple_id))
        await db.execute(delete(GiftIdea).where(GiftIdea.couple_id == old_couple_id))
        await db.execute(delete(CycleLog).where(CycleLog.couple_id == old_couple_id))
        await db.execute(
            delete(CycleDayObservation).where(CycleDayObservation.couple_id == old_couple_id)
        )
        await db.execute(delete(Couple).where(Couple.id == old_couple_id))

    await db.commit()

    refreshed = await db.execute(
        select(Couple)
        .where(Couple.id == target_couple.id)
        .options(
            selectinload(Couple.partners),
            selectinload(Couple.active_evening_scenario),
        )
        .execution_options(populate_existing=True)
    )
    return refreshed.scalar_one()


def compute_countdown(target_dt: datetime | None) -> CountdownData | None:
    """Compute remaining days, hours, and minutes until next meeting datetime."""
    if target_dt is None:
        return None

    normalized_target = (
        target_dt if target_dt.tzinfo is not None else target_dt.replace(tzinfo=timezone.utc)
    )
    now = datetime.now(timezone.utc)
    delta_seconds = int((normalized_target - now).total_seconds())

    if delta_seconds <= 0:
        return CountdownData(
            target_datetime=normalized_target,
            total_seconds_remaining=0,
            days=0,
            hours=0,
            minutes=0,
            is_past=True,
        )

    days, rem = divmod(delta_seconds, 86400)
    hours, rem = divmod(rem, 3600)
    minutes = rem // 60

    return CountdownData(
        target_datetime=normalized_target,
        total_seconds_remaining=delta_seconds,
        days=days,
        hours=hours,
        minutes=minutes,
        is_past=False,
    )


def build_couple_dashboard(
    couple: Couple,
    current_user: User,
) -> CoupleDashboardResponse:
    """Assemble the CoupleDashboardResponse with surprise masking & countdown."""
    scenario_brief: ActiveEveningScenarioBrief | None = None
    if couple.active_evening_scenario is not None:
        idea = couple.active_evening_scenario
        title = idea.title
        description = idea.description
        if idea.is_surprise and idea.creator_id != current_user.id:
            title = get_localized_message(
                "surprise_date_title",
                current_user.preferred_language,
            )
            description = get_localized_message(
                "surprise_date_description",
                current_user.preferred_language,
            )
        scenario_brief = ActiveEveningScenarioBrief(
            id=idea.id,
            couple_id=idea.couple_id,
            creator_id=idea.creator_id,
            title=title,
            description=description,
            category=idea.category,
            required_energy=idea.required_energy,
            is_surprise=idea.is_surprise,
            suitable_for_long_distance=idea.suitable_for_long_distance,
            is_archived=idea.is_archived,
        )

    return CoupleDashboardResponse(
        id=couple.id,
        invite_code=couple.invite_code,
        relationship_format=couple.relationship_format,
        next_meeting_datetime=couple.next_meeting_datetime,
        onboarding_quiz_data=couple.onboarding_quiz_data or {},
        countdown=compute_countdown(couple.next_meeting_datetime),
        active_evening_scenario=scenario_brief,
        partners=[UserResponse.model_validate(partner) for partner in couple.partners],
    )
