"""Date ideas endpoints with surprise masking and asymmetric evening lock-in."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_couple, get_current_user
from app.core.database import get_db
from app.core.i18n import get_localized_message
from app.models.entities import Couple, CustomDateCategory, DateIdea, User
from app.models.enums import DateCategoryEnum, EnergyLevelEnum
from app.schemas.ideas import (
    CustomCategoryCreate,
    CustomCategoryResponse,
    DateIdeaCreate,
    DateIdeaResponse,
    DateIdeaUpdate,
    EveningScenarioResponse,
    EveningWishRequest,
    serialize_date_idea,
)
from app.services.notification_service import notify_partner

router = APIRouter(prefix="/ideas/dates", tags=["Ideas - Date Ideas"])

CATEGORY_DEFAULT_HEX: dict[DateCategoryEnum, str] = {
    DateCategoryEnum.ROMANTIC: "#DB2777",
    DateCategoryEnum.HOME: "#2563EB",
    DateCategoryEnum.FOOD: "#EA580C",
    DateCategoryEnum.RELAX: "#7C3AED",
    DateCategoryEnum.ACTIVE: "#059669",
    DateCategoryEnum.EXTREME: "#DC2626",
}


async def _validate_custom_category(
    db: AsyncSession,
    couple_id: UUID,
    custom_category_id: UUID | None,
) -> CustomDateCategory | None:
    if custom_category_id is None:
        return None
    res = await db.execute(
        select(CustomDateCategory).where(
            CustomDateCategory.id == custom_category_id,
            CustomDateCategory.couple_id == couple_id,
        )
    )
    custom_cat = res.scalar_one_or_none()
    if custom_cat is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Custom category not found",
        )
    return custom_cat


@router.get("/categories", response_model=list[CustomCategoryResponse])
async def list_custom_categories(
    couple: Couple = Depends(get_current_couple),
    db: AsyncSession = Depends(get_db),
) -> list[CustomCategoryResponse]:
    """List custom date categories created by the couple."""
    res = await db.execute(
        select(CustomDateCategory)
        .where(CustomDateCategory.couple_id == couple.id)
        .order_by(CustomDateCategory.created_at.asc())
    )
    categories = res.scalars().all()
    return [CustomCategoryResponse.model_validate(cat) for cat in categories]


@router.post(
    "/categories",
    response_model=CustomCategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_custom_category(
    payload: CustomCategoryCreate,
    current_user: User = Depends(get_current_user),
    couple: Couple = Depends(get_current_couple),
    db: AsyncSession = Depends(get_db),
) -> CustomCategoryResponse:
    """Create a custom category folder for the couple."""
    color_hex = (
        payload.color_hex.strip()
        if payload.color_hex
        else CATEGORY_DEFAULT_HEX[payload.base_category]
    )
    category = CustomDateCategory(
        couple_id=couple.id,
        creator_id=current_user.id,
        name=payload.name.strip(),
        base_category=payload.base_category,
        color_hex=color_hex,
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return CustomCategoryResponse.model_validate(category)


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_custom_category(
    category_id: UUID,
    couple: Couple = Depends(get_current_couple),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a custom category folder and clear its link on existing ideas."""
    res = await db.execute(
        select(CustomDateCategory).where(
            CustomDateCategory.id == category_id,
            CustomDateCategory.couple_id == couple.id,
        )
    )
    category = res.scalar_one_or_none()
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Custom category not found",
        )
    await db.delete(category)
    await db.commit()


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
    custom_cat = await _validate_custom_category(
        db=db,
        couple_id=couple.id,
        custom_category_id=payload.custom_category_id,
    )
    resolved_category = (
        custom_cat.base_category if custom_cat is not None else payload.category
    )
    idea = DateIdea(
        couple_id=couple.id,
        creator_id=current_user.id,
        title=payload.title.strip(),
        description=payload.description.strip() if payload.description else None,
        category=resolved_category,
        custom_category_id=payload.custom_category_id,
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
    custom_category_id: Optional[UUID] = Query(default=None),
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
    if custom_category_id is not None:
        stmt = stmt.where(DateIdea.custom_category_id == custom_category_id)
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


@router.post("/evening-wish", response_model=EveningScenarioResponse)
async def send_evening_wish(
    payload: EveningWishRequest,
    current_user: User = Depends(get_current_user),
    couple: Couple = Depends(get_current_couple),
    db: AsyncSession = Depends(get_db),
) -> EveningScenarioResponse:
    """Set a free-text evening wish for tonight and notify the partner."""
    wish_idea = DateIdea(
        couple_id=couple.id,
        creator_id=current_user.id,
        title=payload.wish_text.strip(),
        description=payload.description.strip() if payload.description else None,
        category=DateCategoryEnum.ROMANTIC,
        required_energy=EnergyLevelEnum.MEDIUM,
        is_surprise=False,
        suitable_for_long_distance=False,
        is_archived=True,
    )
    db.add(wish_idea)
    await db.flush()

    couple.active_evening_scenario_id = wish_idea.id
    await db.commit()
    await db.refresh(wish_idea)

    partner = next((p for p in couple.partners if p.id != current_user.id), None)
    preview_lang = partner.preferred_language if partner else current_user.preferred_language
    notification_preview = get_localized_message(
        "evening_scenario_locked",
        preview_lang,
        title=wish_idea.title,
    )

    await notify_partner(
        db=db,
        couple_id=couple.id,
        sender_id=current_user.id,
        event_type="EVENING_SCENARIO_LOCKED",
        payload_dict={
            "date_idea_id": str(wish_idea.id),
            "title": wish_idea.title,
            "is_surprise": False,
        },
        title=current_user.name,
        body=notification_preview,
    )

    return EveningScenarioResponse(
        active_evening_scenario=serialize_date_idea(wish_idea, current_user),
        notification_preview=notification_preview,
    )


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
