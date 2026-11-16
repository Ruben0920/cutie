"""Context-aware Smart Dice randomizer calibrating date selection in real time."""

import random
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import Couple, DateIdea, User
from app.models.enums import (
    DateCategoryEnum,
    EnergyLevelEnum,
    QuickStatusEnum,
    RelationshipFormatEnum,
)
from app.schemas.ideas import serialize_date_idea
from app.schemas.interactions import CalibrationExplanation, DiceRollResponse
from app.services.cycle_engine import AdaptiveCycleEngine

ENERGY_RANK: dict[EnergyLevelEnum, int] = {
    EnergyLevelEnum.LOW: 1,
    EnergyLevelEnum.MEDIUM: 2,
    EnergyLevelEnum.HIGH: 3,
}

ACTIVE_STATUS_WINDOW = timedelta(hours=6)
HIGH_ENERGY_OVERRIDE_WINDOW = timedelta(hours=4)


class SmartDiceService:
    """Multi-layered filtering and weighted scoring randomizer for date ideas."""

    @staticmethod
    def _normalize_dt(dt: datetime | None) -> datetime | None:
        if dt is None:
            return None
        return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)

    @classmethod
    async def roll_dice(
        cls,
        db: AsyncSession,
        couple: Couple,
        current_user: User,
        include_surprises: bool = True,
    ) -> DiceRollResponse:
        """Select a date idea calibrated by relationship format, cycle phase, and statuses."""
        stmt = select(DateIdea).where(
            DateIdea.couple_id == couple.id,
            DateIdea.is_archived.is_(False),
        )
        if not include_surprises:
            stmt = stmt.where(DateIdea.is_surprise.is_(False))

        res = await db.execute(stmt)
        all_ideas = list(res.scalars().all())
        if not all_ideas:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No date ideas found for this couple. Add some ideas first.",
            )

        now = datetime.now(timezone.utc)
        cycle_status = await AdaptiveCycleEngine.get_current_status(
            db=db,
            couple_id=couple.id,
            lang=current_user.preferred_language,
        )

        # Gather active partner statuses within the 6-hour recency window
        active_statuses: list[QuickStatusEnum] = []
        has_recent_high_energy = False
        has_tired_partner = False
        has_busy_partner = False

        for partner in couple.partners:
            updated_at = cls._normalize_dt(partner.current_status_updated_at)
            if partner.current_status is None or updated_at is None:
                continue
            age = now - updated_at
            if age <= ACTIVE_STATUS_WINDOW:
                active_statuses.append(partner.current_status)
                if partner.current_status == QuickStatusEnum.TIRED:
                    has_tired_partner = True
                elif partner.current_status == QuickStatusEnum.BUSY:
                    has_busy_partner = True
                elif (
                    partner.current_status == QuickStatusEnum.HIGH_ENERGY
                    and age <= HIGH_ENERGY_OVERRIDE_WINDOW
                ):
                    has_recent_high_energy = True

        # Filter 1: Relationship Format (Long-Distance check unless meeting today)
        apply_ld_filter = False
        if couple.relationship_format == RelationshipFormatEnum.LONG_DISTANCE:
            meeting_dt = cls._normalize_dt(couple.next_meeting_datetime)
            is_meeting_today = (
                meeting_dt is not None and meeting_dt.date() == now.date()
            )
            apply_ld_filter = not is_meeting_today

        # Filter 2: Cycle exclusions & energy cap (with 4-hour HIGH_ENERGY override)
        cycle_excluded = set(cycle_status.dice_filter_rules.excluded_categories)
        cycle_max_energy = max(
            cycle_status.dice_filter_rules.allowed_energy,
            key=lambda e: ENERGY_RANK[e],
        )

        effective_max_energy = cycle_max_energy
        effective_excluded = set(cycle_excluded)

        if has_recent_high_energy and not has_tired_partner:
            effective_max_energy = EnergyLevelEnum.HIGH
        if has_tired_partner:
            effective_max_energy = EnergyLevelEnum.LOW
            effective_excluded.update({DateCategoryEnum.ACTIVE, DateCategoryEnum.EXTREME})
        elif has_busy_partner and ENERGY_RANK[effective_max_energy] > ENERGY_RANK[EnergyLevelEnum.MEDIUM]:
            effective_max_energy = EnergyLevelEnum.MEDIUM

        def filter_candidates(
            use_ld: bool,
            use_energy: bool,
            use_excluded: bool,
        ) -> list[DateIdea]:
            out: list[DateIdea] = []
            for idea in all_ideas:
                if use_ld and not idea.suitable_for_long_distance:
                    continue
                if use_excluded and idea.category in effective_excluded:
                    continue
                if use_energy and ENERGY_RANK[idea.required_energy] > ENERGY_RANK[effective_max_energy]:
                    continue
                out.append(idea)
            return out

        candidates = filter_candidates(
            use_ld=apply_ld_filter,
            use_energy=True,
            use_excluded=True,
        )
        fallback_applied = False
        fallback_reason: str | None = None

        if not candidates:
            # Fallback 1: relax energy cap while preserving cycle/tired category exclusions
            candidates = filter_candidates(
                use_ld=apply_ld_filter,
                use_energy=False,
                use_excluded=True,
            )
            if candidates:
                fallback_applied = True
                fallback_reason = "Relaxed energy cap because no ideas matched strict energy rules."

        if not candidates and apply_ld_filter:
            # Fallback 2: relax long-distance filter while keeping cycle exclusions
            candidates = filter_candidates(
                use_ld=False,
                use_energy=False,
                use_excluded=True,
            )
            if candidates:
                fallback_applied = True
                fallback_reason = "Relaxed long-distance and energy filters to find available ideas."

        if not candidates:
            # Fallback 3: any non-archived idea for this couple
            candidates = all_ideas
            fallback_applied = True
            fallback_reason = "Relaxed all filters because all ideas were excluded by strict constraints."

        # Weighted Scoring
        preferred_categories = set(cycle_status.dice_filter_rules.preferred_categories)
        boosted_categories: set[DateCategoryEnum] = set(preferred_categories)
        weights: list[int] = []

        for idea in candidates:
            weight = 10
            if idea.category in preferred_categories:
                weight += 15

            for st in active_statuses:
                if st == QuickStatusEnum.HUNGRY and idea.category == DateCategoryEnum.FOOD:
                    weight += 30
                    boosted_categories.add(DateCategoryEnum.FOOD)
                elif st == QuickStatusEnum.NEED_HUGS and idea.category in {
                    DateCategoryEnum.ROMANTIC,
                    DateCategoryEnum.HOME,
                }:
                    weight += 20
                    boosted_categories.update({DateCategoryEnum.ROMANTIC, DateCategoryEnum.HOME})
                elif st == QuickStatusEnum.HIGH_ENERGY and idea.required_energy == EnergyLevelEnum.HIGH:
                    weight += 20
                elif st == QuickStatusEnum.GOING_HOME and idea.category == DateCategoryEnum.HOME:
                    weight += 15
                    boosted_categories.add(DateCategoryEnum.HOME)
                elif st == QuickStatusEnum.GOING_HOME and idea.category == DateCategoryEnum.FOOD:
                    weight += 10
                    boosted_categories.add(DateCategoryEnum.FOOD)

            weights.append(weight)

        winner = random.choices(candidates, weights=weights, k=1)[0]

        status_labels = ", ".join(s.value for s in active_statuses) if active_statuses else "none"
        phase_label = (
            cycle_status.current_phase.value if cycle_status.has_logged_data else "default"
        )
        reason_summary = (
            f"Calibrated for cycle phase '{phase_label}' "
            f"(energy cap: {effective_max_energy.value}) and active statuses [{status_labels}]."
        )
        if fallback_applied and fallback_reason:
            reason_summary = f"{reason_summary} {fallback_reason}"

        explanation = CalibrationExplanation(
            cycle_phase=cycle_status.current_phase if cycle_status.has_logged_data else None,
            active_partner_statuses=active_statuses,
            applied_energy_cap=effective_max_energy,
            boosted_categories=sorted(boosted_categories, key=lambda c: c.value),
            excluded_categories=sorted(effective_excluded, key=lambda c: c.value),
            reason_summary=reason_summary,
        )

        return DiceRollResponse(
            winning_idea=serialize_date_idea(winner, current_user),
            fallback_applied=fallback_applied,
            fallback_reason=fallback_reason,
            calibration_explanation=explanation,
        )
