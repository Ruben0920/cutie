"""Authentication and user preferences endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    get_password_hash,
    verify_password,
)
from app.models.entities import Couple, User
from app.schemas.user_couple import (
    AuthTokenResponse,
    UserLoginRequest,
    UserPreferencesUpdate,
    UserRegisterRequest,
    UserResponse,
)
from app.services.pairing_service import generate_unique_invite_code
from app.services.seed_service import seed_default_date_ideas

router = APIRouter(tags=["Auth & User Preferences"])


@router.post(
    "/auth/register",
    response_model=AuthTokenResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_user(
    payload: UserRegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> AuthTokenResponse:
    """Register a partner, create an initial Couple with invite code, and issue JWT."""
    normalized_email = payload.email.strip().lower()
    existing = await db.execute(select(User).where(User.email == normalized_email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists",
        )

    invite_code = await generate_unique_invite_code(db)
    couple = Couple(invite_code=invite_code)
    db.add(couple)
    await db.flush()

    user = User(
        email=normalized_email,
        hashed_password=get_password_hash(payload.password),
        name=payload.name.strip(),
        gender_role=payload.gender_role,
        preferred_language=payload.preferred_language,
        couple_id=couple.id,
    )
    db.add(user)
    await db.flush()
    await seed_default_date_ideas(
        db=db,
        couple_id=couple.id,
        creator_id=user.id,
        lang=payload.preferred_language,
    )
    await db.commit()
    await db.refresh(user)

    token = create_access_token(subject=user.id)
    return AuthTokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/auth/login", response_model=AuthTokenResponse)
async def login_user(
    payload: UserLoginRequest,
    db: AsyncSession = Depends(get_db),
) -> AuthTokenResponse:
    """Authenticate an existing user with email and password."""
    normalized_email = payload.email.strip().lower()
    result = await db.execute(select(User).where(User.email == normalized_email))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(subject=user.id)
    return AuthTokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.patch("/users/me/preferences", response_model=UserResponse)
async def update_my_preferences(
    payload: UserPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Update the authenticated partner's language, name, gender role, or FCM token."""
    if payload.preferred_language is not None:
        current_user.preferred_language = payload.preferred_language
    if payload.name is not None:
        current_user.name = payload.name.strip()
    if payload.fcm_token is not None:
        current_user.fcm_token = payload.fcm_token
    if payload.gender_role is not None:
        current_user.gender_role = payload.gender_role

    await db.commit()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)
