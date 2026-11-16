"""Date ideas endpoints with surprise masking and asymmetric evening lock-in."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_couple, get_current_user
from app.core.database import get_db
from app.core.i18n import get_localized_message
from app.models.entities import Couple, DateIdea, User
from app.models.enums import DateCategoryEnum, EnergyLevelEnum
from app.schemas.ideas import (
    DateIdeaCreate,
    DateIdeaResponse,
    DateIdeaUpdate,
    EveningScenarioResponse,
    serialize_date_idea,
)
from app.services.notification_service import notify_partner

router = APIRouter(prefix="/ideas/dates", tags=["Ideas - Date Ideas"])


@router.post(
    "",
    response_model=DateIdeaResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_date_idea(
    payload: DateIdeaCreate,
    current_user: User = Depends(get_current_user),
    couple: Couple = Depends(get_current_couple),
    db: AsyncSession = Depends(get_db),
) -> DateIdeaResponse:
    """Create a categorized date idea (optionally marked as a secret surprise)."""
    idea = DateIdea(
        couple_id=couple.id,
        creator_id=current_user.id,
        title=payload.title.strip(),
        description=payload.description.strip() if payload.description else None,
        category=payload.category,
        required_energy=payload.required_energy,
        is_surprise=payload.is_surprise,
        suitable_for_long_distance=payload.suitable_for_long_distance,
    )
    db.add(idea)
    await db.commit()
    await db.refresh(idea)
    return serialize_date_idea(idea, current_user)


@router.get("", response_model=list[DateIdeaResponse])
async def list_date_ideas(
    category: Optional[DateCategoryEnum] = Query(default=None),
    required_energy: Optional[EnergyLevelEnum] = Query(default=None),
    include_surprises: bool = Query(default=True),
    only_surprises: bool = Query(default=False),
    current_user: User = Depends(get_current_user),
    couple: Couple = Depends(get_current_couple),
    db: AsyncSession = Depends(get_db),
) -> list[DateIdeaResponse]:
    """List couple date ideas with optional filters and partner surprise masking."""
    stmt = select(DateIdea).where(
        DateIdea.couple_id == couple.id,
        DateIdea.is_archived.is_(False),
    )
    if category is not None:
        stmt = stmt.where(DateIdea.category == category)
    if required_energy is not None:
        stmt = stmt.where(DateIdea.required_energy == required_energy)
    if only_surprises:
        stmt = stmt.where(DateIdea.is_surprise.is_(True))
    elif not include_surprises:
        stmt = stmt.where(DateIdea.is_surprise.is_(False))

    stmt = stmt.order_by(DateIdea.created_at.desc())
    result = await db.execute(stmt)
    ideas = result.scalars().all()
    return [serialize_date_idea(idea, current_user) for idea in ideas]


@router.delete("/active-scenario", response_model=EveningScenarioResponse)
async def clear_active_evening_scenario(
    couple: Couple = Depends(get_current_couple),
    db: AsyncSession = Depends(get_db),
) -> EveningScenarioResponse:
    """Clear the couple's locked-in evening scenario."""
    couple.active_evening_scenario_id = None
    await db.commit()
    return EveningScenarioResponse(active_evening_scenario=None)


@router.post("/{date_id}/select-for-tonight", response_model=EveningScenarioResponse)
async def select_date_for_tonight(
    date_id: UUID,
    current_user: User = Depends(get_current_user),
    couple: Couple = Depends(get_current_couple),
    db: AsyncSession = Depends(get_db),
) -> EveningScenarioResponse:
    """Asymmetrically lock in a date idea for tonight and notify the partner."""
    result = await db.execute(
        select(DateIdea).where(
            DateIdea.id == date_id,
            DateIdea.couple_id == couple.id,
            DateIdea.is_archived.is_(False),
        )
    )
    idea = result.scalar_one_or_none()
    if idea is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Date idea not found",
        )

    couple.active_evening_scenario_id = idea.id
    await db.commit()

    partner = next((p for p in couple.partners if p.id != current_user.id), None)
    preview_lang = partner.preferred_language if partner else current_user.preferred_language
    display_title = (
        get_localized_message("surprise_date_title", preview_lang)
        if idea.is_surprise and partner is not None and idea.creator_id != partner.id
        else idea.title
    )
    notification_preview = get_localized_message(
        "evening_scenario_locked",
        preview_lang,
        title=display_title,
    )

    await notify_partner(
        db=db,
        couple_id=couple.id,
        sender_id=current_user.id,
        event_type="EVENING_SCENARIO_LOCKED",
        payload_dict={
            "date_idea_id": str(idea.id),
            "title": display_title,
            "is_surprise": idea.is_surprise,
        },
        title=current_user.name,
        body=notification_preview,
    )

    return EveningScenarioResponse(
        active_evening_scenario=serialize_date_idea(idea, current_user),
        notification_preview=notification_preview,
    )


@router.put("/{date_id}", response_model=DateIdeaResponse)
async def update_date_idea(
    date_id: UUID,
    payload: DateIdeaUpdate,
    current_user: User = Depends(get_current_user),
    couple: Couple = Depends(get_current_couple),
    db: AsyncSession = Depends(get_db),
) -> DateIdeaResponse:
    """Update a date idea; surprise ideas can only be edited by their creator."""
    result = await db.execute(
        select(DateIdea).where(
            DateIdea.id == date_id,
            DateIdea.couple_id == couple.id,
            DateIdea.is_archived.is_(False),
        )
    )
    idea = result.scalar_one_or_none()
    if idea is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Date idea not found",
        )

    if idea.is_surprise and idea.creator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the creator can modify a surprise date idea",
        )

    if payload.title is not None:
        idea.title = payload.title.strip()
    if payload.description is not None:
        idea.description = payload.description.strip() or None
    if payload.category is not None:
        idea.category = payload.category
    if payload.required_energy is not None:
        idea.required_energy = payload.required_energy
    if payload.is_surprise is not None:
        idea.is_surprise = payload.is_surprise
    if payload.suitable_for_long_distance is not None:
        idea.suitable_for_long_distance = payload.suitable_for_long_distance

    await db.commit()
    await db.refresh(idea)
    return serialize_date_idea(idea, current_user)


@router.delete("/{date_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_date_idea(
    date_id: UUID,
    current_user: User = Depends(get_current_user),
    couple: Couple = Depends(get_current_couple),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a date idea; surprise ideas can only be deleted by their creator."""
    result = await db.execute(
        select(DateIdea).where(
            DateIdea.id == date_id,
            DateIdea.couple_id == couple.id,
        )
    )
    idea = result.scalar_one_or_none()
    if idea is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Date idea not found",
        )

    if idea.is_surprise and idea.creator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the creator can delete a surprise date idea",
        )

    if couple.active_evening_scenario_id == idea.id:
        couple.active_evening_scenario_id = None
        await db.flush()

    await db.delete(idea)
    await db.commit()
