"""Female cycle calendar endpoints exposing adaptive predictions and daily overrides."""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_couple, get_current_user
from app.core.database import get_db
from app.models.entities import Couple, CycleDayObservation, User
from app.schemas.cycle import (
    CycleStatusResponse,
    DailyObservationRequest,
    PeriodStartRequest,
)
from app.services.cycle_engine import AdaptiveCycleEngine
from app.services.notification_service import notify_partner

router = APIRouter(prefix="/cycle", tags=["Adaptive Cycle Calendar"])


@router.post(
    "/period-start",
    response_model=CycleStatusResponse,
    status_code=status.HTTP_201_CREATED,
)
async def log_period_start(
    payload: PeriodStartRequest,
    current_user: User = Depends(get_current_user),
    couple: Couple = Depends(get_current_couple),
    db: AsyncSession = Depends(get_db),
) -> CycleStatusResponse:
    """Log a menstrual period start date and recompute adaptive floating window."""
    await AdaptiveCycleEngine.log_period_start(
        db=db,
        couple_id=couple.id,
        user_id=current_user.id,
        start_date=payload.start_date,
        period_duration_days=payload.period_duration_days,
    )
    status_res = await AdaptiveCycleEngine.get_current_status(
        db=db,
        couple_id=couple.id,
        lang=current_user.preferred_language,
    )
    await notify_partner(
        db=db,
        couple_id=couple.id,
        sender_id=current_user.id,
        event_type="CYCLE_UPDATED",
        payload_dict={"current_phase": status_res.current_phase.value},
        title=current_user.name,
        body=status_res.wellbeing_summary,
    )
    return status_res


@router.put("/daily-observation", response_model=CycleStatusResponse)
async def upsert_daily_observation(
    payload: DailyObservationRequest,
    current_user: User = Depends(get_current_user),
    couple: Couple = Depends(get_current_couple),
    db: AsyncSession = Depends(get_db),
) -> CycleStatusResponse:
    """Create or override wellbeing, food cravings, and love language for a date."""
    target_date = payload.log_date or date.today()

    result = await db.execute(
        select(CycleDayObservation).where(
            CycleDayObservation.couple_id == couple.id,
            CycleDayObservation.log_date == target_date,
        )
    )
    observation = result.scalar_one_or_none()
    if observation is None:
        observation = CycleDayObservation(
            couple_id=couple.id,
            log_date=target_date,
            wellbeing_description=payload.wellbeing_description.strip(),
            food_preferences=payload.food_preferences,
            desired_love_language=payload.desired_love_language,
            symptom_tags=payload.symptom_tags,
        )
        db.add(observation)
    else:
        observation.wellbeing_description = payload.wellbeing_description.strip()
        observation.food_preferences = payload.food_preferences
        observation.desired_love_language = payload.desired_love_language
        observation.symptom_tags = payload.symptom_tags

    await db.commit()
    status_res = await AdaptiveCycleEngine.get_current_status(
        db=db,
        couple_id=couple.id,
        lang=current_user.preferred_language,
        query_date=target_date,
    )
    await notify_partner(
        db=db,
        couple_id=couple.id,
        sender_id=current_user.id,
        event_type="CYCLE_UPDATED",
        payload_dict={"current_phase": status_res.current_phase.value},
        title=current_user.name,
        body=status_res.wellbeing_summary,
    )
    return status_res


@router.get("/status", response_model=CycleStatusResponse)
async def get_cycle_status(
    query_date: Optional[date] = Query(default=None),
    current_user: User = Depends(get_current_user),
    couple: Couple = Depends(get_current_couple),
    db: AsyncSession = Depends(get_db),
) -> CycleStatusResponse:
    """Return adaptive cycle phase, floating window, daily guide, and Dice filter rules."""
    return await AdaptiveCycleEngine.get_current_status(
        db=db,
        couple_id=couple.id,
        lang=current_user.preferred_language,
        query_date=query_date,
    )
