"""Pydantic v2 schemas for authentication, users, and couple dashboard."""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import (
    DateCategoryEnum,
    EnergyLevelEnum,
    GenderRoleEnum,
    LanguageEnum,
    QuickStatusEnum,
    RelationshipFormatEnum,
)


class UserRegisterRequest(BaseModel):
    """Payload for registering a new partner account."""

    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=120)
    gender_role: GenderRoleEnum
    preferred_language: LanguageEnum = LanguageEnum.RU


class UserLoginRequest(BaseModel):
    """Payload for email/password login."""

    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserPreferencesUpdate(BaseModel):
    """Payload for updating individual partner preferences and FCM token."""

    preferred_language: Optional[LanguageEnum] = None
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    fcm_token: Optional[str] = Field(default=None, max_length=512)
    gender_role: Optional[GenderRoleEnum] = None


class UserResponse(BaseModel):
    """Serialized partner profile."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    name: str
    gender_role: GenderRoleEnum
    preferred_language: LanguageEnum
    couple_id: Optional[UUID] = None
    current_status: Optional[QuickStatusEnum] = None
    current_status_updated_at: Optional[datetime] = None
    current_energy_modifier: EnergyLevelEnum


class AuthTokenResponse(BaseModel):
    """Authentication response carrying JWT access token and user profile."""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class InviteInfoResponse(BaseModel):
    """Couple invite code and QR deep-link payload."""

    invite_code: str
    qr_payload: str


class CoupleJoinRequest(BaseModel):
    """Request body for joining a partner's couple space via 6-character code."""

    invite_code: str = Field(min_length=4, max_length=12)


class RelationshipProfileUpdate(BaseModel):
    """Updates relationship format, onboarding quiz answers, and next meeting date."""

    relationship_format: RelationshipFormatEnum
    onboarding_quiz_data: dict[str, Any] = Field(default_factory=dict)
    next_meeting_datetime: Optional[datetime] = None


class CountdownData(BaseModel):
    """Dynamically computed countdown timer toward the next meeting."""

    target_datetime: datetime
    total_seconds_remaining: int
    days: int
    hours: int
    minutes: int
    is_past: bool


class ActiveEveningScenarioBrief(BaseModel):
    """Summary of the locked-in evening scenario with surprise masking."""

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


class CoupleDashboardResponse(BaseModel):
    """Unified couple dashboard payload with partners, format, countdown, and evening plan."""

    id: UUID
    invite_code: str
    relationship_format: RelationshipFormatEnum
    next_meeting_datetime: Optional[datetime] = None
    onboarding_quiz_data: dict[str, Any] = Field(default_factory=dict)
    countdown: Optional[CountdownData] = None
    active_evening_scenario: Optional[ActiveEveningScenarioBrief] = None
    partners: list[UserResponse]
