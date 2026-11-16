"""Pydantic v2 schemas for Gifts Wishlist, Date Ideas, and Evening Scenarios."""

from decimal import Decimal
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl

from app.core.i18n import get_localized_message
from app.models.entities import DateIdea, GiftIdea, User
from app.models.enums import DateCategoryEnum, EnergyLevelEnum


class GiftIdeaCreate(BaseModel):
    """Request payload for adding a wishlist gift item."""

    title: str = Field(min_length=1, max_length=255)
    direct_url: HttpUrl
    price_estimate: Optional[Decimal] = Field(default=None, ge=0)
    priority: int = Field(default=3, ge=1, le=5)


class GiftReserveRequest(BaseModel):
    """Optional payload for toggling or explicitly setting gift reservation/purchase."""

    is_reserved_by_partner: Optional[bool] = None
    is_purchased: Optional[bool] = None


class GiftIdeaResponse(BaseModel):
    """Serialized gift idea with author privacy masking for reservation status."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    couple_id: UUID
    author_id: UUID
    title: str
    direct_url: str
    price_estimate: Optional[Decimal] = None
    priority: int
    is_reserved_by_partner: Optional[bool] = None
    is_purchased: bool


def serialize_gift_idea(gift: GiftIdea, viewer: User) -> GiftIdeaResponse:
    """Serialize a GiftIdea while hiding reservation status from its author."""
    reserved_value: Optional[bool] = (
        None if gift.author_id == viewer.id else gift.is_reserved_by_partner
    )
    return GiftIdeaResponse(
        id=gift.id,
        couple_id=gift.couple_id,
        author_id=gift.author_id,
        title=gift.title,
        direct_url=gift.direct_url,
        price_estimate=gift.price_estimate,
        priority=gift.priority,
        is_reserved_by_partner=reserved_value,
        is_purchased=gift.is_purchased,
    )


class DateIdeaCreate(BaseModel):
    """Request payload for creating a date idea."""

    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    category: DateCategoryEnum
    required_energy: EnergyLevelEnum = EnergyLevelEnum.MEDIUM
    is_surprise: bool = False
    suitable_for_long_distance: bool = False


class DateIdeaUpdate(BaseModel):
    """Request payload for updating a date idea."""

    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[DateCategoryEnum] = None
    required_energy: Optional[EnergyLevelEnum] = None
    is_surprise: Optional[bool] = None
    suitable_for_long_distance: Optional[bool] = None


class DateIdeaResponse(BaseModel):
    """Serialized date idea respecting surprise masking for the non-creator partner."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    couple_id: UUID
    creator_id: UUID
    title: str
    description: Optional[str] = None
    category: DateCategoryEnum
    required_energy: EnergyLevelEnum
    is_surprise: bool
    suitable_for_long_distance: bool
    is_archived: bool


class EveningScenarioResponse(BaseModel):
    """Confirmation payload when locking or clearing tonight's scenario."""

    active_evening_scenario: Optional[DateIdeaResponse] = None
    notification_preview: Optional[str] = None


GiftFilterLiteral = Literal["mine", "partner", "all"]


def serialize_date_idea(idea: DateIdea, viewer: User) -> DateIdeaResponse:
    """Serialize a DateIdea, masking title and description for non-creator surprises."""
    title = idea.title
    description = idea.description
    if idea.is_surprise and idea.creator_id != viewer.id:
        title = get_localized_message("surprise_date_title", viewer.preferred_language)
        description = get_localized_message(
            "surprise_date_description",
            viewer.preferred_language,
        )

    return DateIdeaResponse(
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
