"""Adaptive Female Cycle Engine implementing Weighted Moving Average & Floating Window."""

import math
from datetime import date, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.i18n import get_localized_message
from app.models.entities import CycleDayObservation, CycleLog
from app.models.enums import (
    CyclePhaseEnum,
    DateCategoryEnum,
    EnergyLevelEnum,
    LanguageEnum,
    LoveLanguageEnum,
)
from app.schemas.cycle import (
    CycleLogResponse,
    CycleStatusResponse,
    DiceFilterRulesSchema,
    FloatingWindowSchema,
)

MIN_VALID_CYCLE_DAYS = 18
MAX_VALID_CYCLE_DAYS = 45
DEFAULT_CYCLE_LENGTH = 28
DEFAULT_WINDOW_RADIUS = 2
MAX_HISTORY_CYCLES = 6


class AdaptiveCycleEngine:
    """Deterministic engine computing adaptive cycle predictions and Dice filter rules."""

    @staticmethod
    def compute_wma_and_radius(valid_lengths: list[int]) -> tuple[float, int]:
        """Compute Weighted Moving Average and std-dev-based floating window radius."""
        if not valid_lengths:
            return float(DEFAULT_CYCLE_LENGTH), DEFAULT_WINDOW_RADIUS

        recent = valid_lengths[-MAX_HISTORY_CYCLES:]
        k = len(recent)
        weights = list(range(1, k + 1))
        weighted_sum = sum(w * length for w, length in zip(weights, recent))
        wma = weighted_sum / sum(weights)

        mean_val = sum(recent) / k
        variance = sum((length - mean_val) ** 2 for length in recent) / k
        std_dev = math.sqrt(variance)
        window_radius = max(1, round(std_dev))

        return round(wma, 2), window_radius

    @staticmethod
    def determine_phase_and_rules(
        day_of_cycle: int,
        rounded_wma: int,
        lang: LanguageEnum | str,
    ) -> tuple[CyclePhaseEnum, DiceFilterRulesSchema, str, list[str], LoveLanguageEnum]:
        """Determine current phase, Dice constraints, and localized default insights."""
        ovulation_center_day = max(10, rounded_wma - 14)

        if day_of_cycle <= 5:
            phase = CyclePhaseEnum.MENSTRUAL
            rules = DiceFilterRulesSchema(
                allowed_energy=[EnergyLevelEnum.LOW],
                preferred_categories=[
                    DateCategoryEnum.HOME,
                    DateCategoryEnum.RELAX,
                    DateCategoryEnum.FOOD,
                ],
                excluded_categories=[
                    DateCategoryEnum.EXTREME,
                    DateCategoryEnum.ACTIVE,
                ],
            )
            wellbeing = get_localized_message("cycle_menstrual_wellbeing", lang)
            food = [
                item.strip()
                for item in get_localized_message("cycle_menstrual_food", lang).split(",")
            ]
            love_lang = LoveLanguageEnum.ACTS_OF_SERVICE
            return phase, rules, wellbeing, food, love_lang

        if day_of_cycle <= ovulation_center_day - 3:
            phase = CyclePhaseEnum.FOLLICULAR
            rules = DiceFilterRulesSchema(
                allowed_energy=[EnergyLevelEnum.MEDIUM, EnergyLevelEnum.HIGH],
                preferred_categories=[
                    DateCategoryEnum.ACTIVE,
                    DateCategoryEnum.ROMANTIC,
                    DateCategoryEnum.FOOD,
                ],
                excluded_categories=[],
            )
            wellbeing = get_localized_message("cycle_follicular_wellbeing", lang)
            food = [
                item.strip()
                for item in get_localized_message("cycle_follicular_food", lang).split(",")
            ]
            love_lang = LoveLanguageEnum.QUALITY_TIME
            return phase, rules, wellbeing, food, love_lang

        if day_of_cycle <= ovulation_center_day + 2:
            phase = CyclePhaseEnum.OVULATION
            rules = DiceFilterRulesSchema(
                allowed_energy=[EnergyLevelEnum.HIGH, EnergyLevelEnum.MEDIUM],
                preferred_categories=[
                    DateCategoryEnum.ROMANTIC,
                    DateCategoryEnum.ACTIVE,
                    DateCategoryEnum.EXTREME,
                ],
                excluded_categories=[],
            )
            wellbeing = get_localized_message("cycle_ovulation_wellbeing", lang)
            food = [
                item.strip()
                for item in get_localized_message("cycle_ovulation_food", lang).split(",")
            ]
            love_lang = LoveLanguageEnum.WORDS
            return phase, rules, wellbeing, food, love_lang

        phase = CyclePhaseEnum.LUTEAL
        is_late_luteal = day_of_cycle >= (rounded_wma - 4)
        allowed_energy = (
            [EnergyLevelEnum.LOW]
            if is_late_luteal
            else [EnergyLevelEnum.LOW, EnergyLevelEnum.MEDIUM]
        )
        excluded_categories = (
            [DateCategoryEnum.EXTREME, DateCategoryEnum.ACTIVE]
            if is_late_luteal
            else [DateCategoryEnum.EXTREME]
        )
        rules = DiceFilterRulesSchema(
            allowed_energy=allowed_energy,
            preferred_categories=[
                DateCategoryEnum.RELAX,
                DateCategoryEnum.HOME,
                DateCategoryEnum.FOOD,
                DateCategoryEnum.ROMANTIC,
            ],
            excluded_categories=excluded_categories,
        )
        wellbeing = get_localized_message("cycle_luteal_wellbeing", lang)
        food = [
            item.strip()
            for item in get_localized_message("cycle_luteal_food", lang).split(",")
        ]
        love_lang = LoveLanguageEnum.ACTS_OF_SERVICE
        return phase, rules, wellbeing, food, love_lang

    @classmethod
    async def log_period_start(
        cls,
        db: AsyncSession,
        couple_id: UUID,
        user_id: UUID,
        start_date: date,
        period_duration_days: int = 5,
    ) -> None:
        """Record a period start date and recompute historical cycle lengths."""
        end_date = start_date + timedelta(days=period_duration_days - 1)

        existing_res = await db.execute(
            select(CycleLog).where(
                CycleLog.couple_id == couple_id,
                CycleLog.start_date == start_date,
            )
        )
        existing_log = existing_res.scalar_one_or_none()
        if existing_log is not None:
            existing_log.end_date = end_date
        else:
            new_log = CycleLog(
                couple_id=couple_id,
                user_id=user_id,
                start_date=start_date,
                end_date=end_date,
            )
            db.add(new_log)

        await db.flush()

        all_res = await db.execute(
            select(CycleLog)
            .where(CycleLog.couple_id == couple_id)
            .order_by(CycleLog.start_date.asc())
        )
        ordered_logs = list(all_res.scalars().all())
        for idx, log in enumerate(ordered_logs):
            if idx + 1 < len(ordered_logs):
                log.cycle_length_days = (ordered_logs[idx + 1].start_date - log.start_date).days
            else:
                log.cycle_length_days = None

        await db.commit()

    @classmethod
    async def get_current_status(
        cls,
        db: AsyncSession,
        couple_id: UUID,
        lang: LanguageEnum | str = LanguageEnum.RU,
        query_date: date | None = None,
    ) -> CycleStatusResponse:
        """Compute full adaptive cycle status and daily observation overrides."""
        target_date = query_date or date.today()

        logs_res = await db.execute(
            select(CycleLog)
            .where(CycleLog.couple_id == couple_id)
            .order_by(CycleLog.start_date.asc())
        )
        logs = list(logs_res.scalars().all())

        valid_lengths = [
            log.cycle_length_days
            for log in logs
            if log.cycle_length_days is not None
            and MIN_VALID_CYCLE_DAYS <= log.cycle_length_days <= MAX_VALID_CYCLE_DAYS
        ]
        wma, window_radius = cls.compute_wma_and_radius(valid_lengths)
        rounded_wma = round(wma)

        has_logged_data = len(logs) > 0
        if has_logged_data:
            past_or_current = [log for log in logs if log.start_date <= target_date]
            anchor_log = past_or_current[-1] if past_or_current else logs[-1]
            day_of_cycle = max(1, (target_date - anchor_log.start_date).days + 1)
            predicted_next_start = anchor_log.start_date + timedelta(days=rounded_wma)
        else:
            day_of_cycle = 1
            predicted_next_start = target_date + timedelta(days=rounded_wma)

        floating_window = FloatingWindowSchema(
            start=predicted_next_start - timedelta(days=window_radius),
            end=predicted_next_start + timedelta(days=window_radius),
            center=predicted_next_start,
        )

        effective_day = day_of_cycle if has_logged_data else 7
        phase, rules, wellbeing, food, love_lang = cls.determine_phase_and_rules(
            day_of_cycle=effective_day,
            rounded_wma=rounded_wma,
            lang=lang,
        )
        symptom_tags: list[str] = []

        obs_res = await db.execute(
            select(CycleDayObservation).where(
                CycleDayObservation.couple_id == couple_id,
                CycleDayObservation.log_date == target_date,
            )
        )
        observation = obs_res.scalar_one_or_none()
        if observation is not None:
            wellbeing = observation.wellbeing_description
            food = list(observation.food_preferences or [])
            love_lang = observation.desired_love_language
            symptom_tags = list(observation.symptom_tags or [])

        return CycleStatusResponse(
            current_phase=phase,
            day_of_cycle=day_of_cycle,
            expected_cycle_length_wma=wma,
            next_period_floating_window=floating_window,
            wellbeing_summary=wellbeing,
            food_preferences=food,
            love_language=love_lang,
            symptom_tags=symptom_tags,
            dice_filter_rules=rules,
            has_logged_data=has_logged_data,
            recent_logs=[CycleLogResponse.model_validate(log) for log in logs[-6:]],
        )
