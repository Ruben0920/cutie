"""Couple pairing, shared relationship profile, and dashboard endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_couple, get_current_user
from app.core.database import get_db
from app.models.entities import Couple, User
from app.schemas.user_couple import (
    CoupleDashboardResponse,
    CoupleJoinRequest,
    InviteInfoResponse,
    RelationshipProfileUpdate,
)
from app.services.pairing_service import build_couple_dashboard, join_couple_by_code

router = APIRouter(prefix="/couple", tags=["Couple & Pairing"])


@router.get("/invite-info", response_model=InviteInfoResponse)
async def get_invite_info(
    couple: Couple = Depends(get_current_couple),
) -> InviteInfoResponse:
    """Return the 6-character invite code and deep-link QR payload."""
    return InviteInfoResponse(
        invite_code=couple.invite_code,
        qr_payload=f"couplesapp://pair?code={couple.invite_code}",
    )


@router.post("/join", response_model=CoupleDashboardResponse)
async def join_couple(
    payload: CoupleJoinRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CoupleDashboardResponse:
    """Pair the current user with another partner using their 6-character invite code."""
    target_couple = await join_couple_by_code(
        db=db,
        current_user=current_user,
        raw_invite_code=payload.invite_code,
    )
    return build_couple_dashboard(target_couple, current_user)


@router.put("/relationship-profile", response_model=CoupleDashboardResponse)
async def update_relationship_profile(
    payload: RelationshipProfileUpdate,
    current_user: User = Depends(get_current_user),
    couple: Couple = Depends(get_current_couple),
    db: AsyncSession = Depends(get_db),
) -> CoupleDashboardResponse:
    """Update relationship format, onboarding survey answers, and next meeting datetime."""
    couple.relationship_format = payload.relationship_format
    couple.onboarding_quiz_data = payload.onboarding_quiz_data
    couple.next_meeting_datetime = payload.next_meeting_datetime

    await db.commit()

    refreshed_res = await db.execute(
        select(Couple)
        .where(Couple.id == couple.id)
        .options(
            selectinload(Couple.partners),
            selectinload(Couple.active_evening_scenario),
        )
        .execution_options(populate_existing=True)
    )
    refreshed_couple = refreshed_res.scalar_one()
    return build_couple_dashboard(refreshed_couple, current_user)


@router.get("/dashboard", response_model=CoupleDashboardResponse)
async def get_couple_dashboard(
    current_user: User = Depends(get_current_user),
    couple: Couple = Depends(get_current_couple),
) -> CoupleDashboardResponse:
    """Return full couple dashboard including partner profiles and live countdown."""
    return build_couple_dashboard(couple, current_user)
