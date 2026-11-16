"""Gifts wishlist endpoints with secret partner reservation privacy."""

from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_couple, get_current_user
from app.core.database import get_db
from app.models.entities import Couple, GiftIdea, User
from app.schemas.ideas import (
    GiftFilterLiteral,
    GiftIdeaCreate,
    GiftIdeaResponse,
    GiftReserveRequest,
    serialize_gift_idea,
)

router = APIRouter(prefix="/ideas/gifts", tags=["Ideas - Gifts Wishlist"])


@router.post(
    "",
    response_model=GiftIdeaResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_gift_idea(
    payload: GiftIdeaCreate,
    current_user: User = Depends(get_current_user),
    couple: Couple = Depends(get_current_couple),
    db: AsyncSession = Depends(get_db),
) -> GiftIdeaResponse:
    """Add a desired gift item to the current user's wishlist within the couple."""
    gift = GiftIdea(
        couple_id=couple.id,
        author_id=current_user.id,
        title=payload.title.strip(),
        direct_url=str(payload.direct_url),
        price_estimate=payload.price_estimate,
        priority=payload.priority,
    )
    db.add(gift)
    await db.commit()
    await db.refresh(gift)
    return serialize_gift_idea(gift, current_user)


@router.get("", response_model=list[GiftIdeaResponse])
async def list_gift_ideas(
    filter_by: GiftFilterLiteral = Query(default="all"),
    current_user: User = Depends(get_current_user),
    couple: Couple = Depends(get_current_couple),
    db: AsyncSession = Depends(get_db),
) -> list[GiftIdeaResponse]:
    """List wishlist gifts filtered by owner while masking reservation status from the author."""
    stmt = select(GiftIdea).where(GiftIdea.couple_id == couple.id)
    if filter_by == "mine":
        stmt = stmt.where(GiftIdea.author_id == current_user.id)
    elif filter_by == "partner":
        stmt = stmt.where(GiftIdea.author_id != current_user.id)

    stmt = stmt.order_by(GiftIdea.priority.desc(), GiftIdea.created_at.desc())
    result = await db.execute(stmt)
    gifts = result.scalars().all()
    return [serialize_gift_idea(gift, current_user) for gift in gifts]


@router.patch("/{gift_id}/reserve", response_model=GiftIdeaResponse)
async def reserve_partner_gift(
    gift_id: UUID,
    payload: GiftReserveRequest | None = Body(default=None),
    current_user: User = Depends(get_current_user),
    couple: Couple = Depends(get_current_couple),
    db: AsyncSession = Depends(get_db),
) -> GiftIdeaResponse:
    """Allow the non-author partner to secretly reserve or mark a gift as purchased."""
    result = await db.execute(
        select(GiftIdea).where(
            GiftIdea.id == gift_id,
            GiftIdea.couple_id == couple.id,
        )
    )
    gift = result.scalar_one_or_none()
    if gift is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gift idea not found",
        )

    if gift.author_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot reserve your own wishlist item",
        )

    if payload is None or (
        payload.is_reserved_by_partner is None and payload.is_purchased is None
    ):
        gift.is_reserved_by_partner = not gift.is_reserved_by_partner
    else:
        if payload.is_reserved_by_partner is not None:
            gift.is_reserved_by_partner = payload.is_reserved_by_partner
        if payload.is_purchased is not None:
            gift.is_purchased = payload.is_purchased
            if payload.is_purchased:
                gift.is_reserved_by_partner = True

    await db.commit()
    await db.refresh(gift)
    return serialize_gift_idea(gift, current_user)


@router.delete("/{gift_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_gift_idea(
    gift_id: UUID,
    current_user: User = Depends(get_current_user),
    couple: Couple = Depends(get_current_couple),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Allow only the wishlist author to delete their gift item."""
    result = await db.execute(
        select(GiftIdea).where(
            GiftIdea.id == gift_id,
            GiftIdea.couple_id == couple.id,
        )
    )
    gift = result.scalar_one_or_none()
    if gift is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gift idea not found",
        )

    if gift.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the author can delete their gift wishlist item",
        )

    await db.delete(gift)
    await db.commit()
