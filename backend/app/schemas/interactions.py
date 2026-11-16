"""Pydantic v2 schemas for quick statuses, surprise requests, and Smart Dice rolls."""

from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import (
    CyclePhaseEnum,
    DateCategoryEnum,
    EnergyLevelEnum,
    QuickStatusEnum,
)
from app.schemas.ideas import DateIdeaResponse
from app.schemas.user_couple import UserResponse


class QuickStatusUpdateRequest(BaseModel):
    """Payload for pressing a quick-status button."""

    status: QuickStatusEnum


class QuickStatusUpdateResponse(BaseModel):
    """Response returned after updating a partner's quick status."""

    user: UserResponse
    status_message_preview: str
    partner_notified: bool


class SurpriseRequestPayload(BaseModel):
    """Optional hint payload when asking partner for a surprise."""

    hint: Optional[str] = Field(default=None, max_length=500)


class SurpriseRequestResponse(BaseModel):
    """Confirmation returned to the requesting partner (without leaking secret ideas)."""

    sent: bool
    partner_online: bool
    message: str


class DiceRollRequest(BaseModel):
    """Optional parameters for rolling the Smart Dice."""

    include_surprises: bool = True


class CalibrationExplanation(BaseModel):
    """Transparent breakdown of how cycle phase and statuses calibrated the Dice."""

    cycle_phase: Optional[CyclePhaseEnum] = None
    active_partner_statuses: list[QuickStatusEnum] = Field(default_factory=list)
    applied_energy_cap: EnergyLevelEnum
    boosted_categories: list[DateCategoryEnum] = Field(default_factory=list)
    excluded_categories: list[DateCategoryEnum] = Field(default_factory=list)
    reason_summary: str


class DiceRollResponse(BaseModel):
    """Winning date idea and calibration telemetry from the Smart Dice."""

    winning_idea: DateIdeaResponse
    fallback_applied: bool = False
    fallback_reason: Optional[str] = None
    calibration_explanation: CalibrationExplanation


class WebSocketEvent(BaseModel):
    """Envelope sent over WebSocket to connected partners."""

    event_type: str
    sender_id: UUID
    title: Optional[str] = None
    body: Optional[str] = None
    payload: dict[str, object] = Field(default_factory=dict)
