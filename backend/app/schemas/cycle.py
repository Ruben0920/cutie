"""Pydantic v2 schemas for adaptive female cycle tracking and daily observations."""

from datetime import date
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import (
    CyclePhaseEnum,
    DateCategoryEnum,
    EnergyLevelEnum,
    LoveLanguageEnum,
)


class PeriodStartRequest(BaseModel):
    """Payload to log the start date of a menstrual period."""

    start_date: date
    period_duration_days: int = Field(default=5, ge=1, le=12)


class DailyObservationRequest(BaseModel):
    """Payload to create or override daily wellbeing, food, and love-language notes."""

    log_date: Optional[date] = None
    wellbeing_description: str = Field(min_length=1, max_length=1000)
    food_preferences: list[str] = Field(default_factory=list)
    desired_love_language: LoveLanguageEnum
    symptom_tags: list[str] = Field(default_factory=list)


class FloatingWindowSchema(BaseModel):
    """Predicted next period floating window bounds and center date."""

    start: date
    end: date
    center: date


class DiceFilterRulesSchema(BaseModel):
    """Cycle-derived constraints applied automatically to the Smart Dice."""

    allowed_energy: list[EnergyLevelEnum]
    preferred_categories: list[DateCategoryEnum]
    excluded_categories: list[DateCategoryEnum]


class CycleLogResponse(BaseModel):
    """Serialized historical period start record."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    start_date: date
    end_date: Optional[date] = None
    cycle_length_days: Optional[int] = None


class CycleStatusResponse(BaseModel):
    """Full adaptive cycle state returned to both partners."""

    current_phase: CyclePhaseEnum
    day_of_cycle: int
    expected_cycle_length_wma: float
    next_period_floating_window: FloatingWindowSchema
    wellbeing_summary: str
    food_preferences: list[str]
    love_language: LoveLanguageEnum
    symptom_tags: list[str] = Field(default_factory=list)
    dice_filter_rules: DiceFilterRulesSchema
    has_logged_data: bool = True
    recent_logs: list[CycleLogResponse] = Field(default_factory=list)
