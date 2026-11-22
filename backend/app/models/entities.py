"""SQLAlchemy 2.0 ORM entities for couples, users, ideas, and cycle tracking."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Optional

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import (
    DateCategoryEnum,
    EnergyLevelEnum,
    GenderRoleEnum,
    LanguageEnum,
    LoveLanguageEnum,
    QuickStatusEnum,
    RelationshipFormatEnum,
)

JSONBType = JSON().with_variant(JSONB(), "postgresql")


def _enum_values(enum_cls: type) -> list[str]:
    return [member.value for member in enum_cls]


class TimestampMixin:
    """Mixin adding timezone-aware created_at and updated_at columns."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class Couple(TimestampMixin, Base):
    """Shared couple space isolating partners' data and evening state."""

    __tablename__ = "couples"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    invite_code: Mapped[str] = mapped_column(
        String(8),
        unique=True,
        index=True,
        nullable=False,
    )
    relationship_format: Mapped[RelationshipFormatEnum] = mapped_column(
        SAEnum(
            RelationshipFormatEnum,
            name="relationship_format_enum",
            values_callable=_enum_values,
        ),
        default=RelationshipFormatEnum.DATING_SEPARATE,
        nullable=False,
    )
    next_meeting_datetime: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    onboarding_quiz_data: Mapped[dict[str, Any]] = mapped_column(
        JSONBType,
        default=dict,
        nullable=False,
    )
    active_evening_scenario_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(
            "date_ideas.id",
            ondelete="SET NULL",
            use_alter=True,
            name="fk_couples_active_evening_scenario_id",
        ),
        nullable=True,
    )

    partners: Mapped[list["User"]] = relationship(
        "User",
        back_populates="couple",
        foreign_keys="User.couple_id",
    )
    active_evening_scenario: Mapped[Optional["DateIdea"]] = relationship(
        "DateIdea",
        foreign_keys=[active_evening_scenario_id],
        post_update=True,
    )
    gift_ideas: Mapped[list["GiftIdea"]] = relationship(
        "GiftIdea",
        back_populates="couple",
        cascade="all, delete-orphan",
    )
    date_ideas: Mapped[list["DateIdea"]] = relationship(
        "DateIdea",
        back_populates="couple",
        foreign_keys="DateIdea.couple_id",
        cascade="all, delete-orphan",
    )
    custom_categories: Mapped[list["CustomDateCategory"]] = relationship(
        "CustomDateCategory",
        back_populates="couple",
        cascade="all, delete-orphan",
    )
    cycle_logs: Mapped[list["CycleLog"]] = relationship(
        "CycleLog",
        back_populates="couple",
        cascade="all, delete-orphan",
    )
    cycle_observations: Mapped[list["CycleDayObservation"]] = relationship(
        "CycleDayObservation",
        back_populates="couple",
        cascade="all, delete-orphan",
    )
    chat_messages: Mapped[list["ChatMessage"]] = relationship(
        "ChatMessage",
        back_populates="couple",
        cascade="all, delete-orphan",
    )


class User(TimestampMixin, Base):
    """Individual partner account belonging to a Couple space."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    gender_role: Mapped[GenderRoleEnum] = mapped_column(
        SAEnum(
            GenderRoleEnum,
            name="gender_role_enum",
            values_callable=_enum_values,
        ),
        nullable=False,
    )
    preferred_language: Mapped[LanguageEnum] = mapped_column(
        SAEnum(
            LanguageEnum,
            name="language_enum",
            values_callable=_enum_values,
        ),
        default=LanguageEnum.RU,
        nullable=False,
    )
    fcm_token: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    couple_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("couples.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    current_status: Mapped[Optional[QuickStatusEnum]] = mapped_column(
        SAEnum(
            QuickStatusEnum,
            name="quick_status_enum",
            values_callable=_enum_values,
        ),
        nullable=True,
    )
    current_status_updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    current_energy_modifier: Mapped[EnergyLevelEnum] = mapped_column(
        SAEnum(
            EnergyLevelEnum,
            name="energy_level_enum",
            values_callable=_enum_values,
        ),
        default=EnergyLevelEnum.MEDIUM,
        nullable=False,
    )

    couple: Mapped[Optional["Couple"]] = relationship(
        "Couple",
        back_populates="partners",
        foreign_keys=[couple_id],
    )


class GiftIdea(TimestampMixin, Base):
    """Wishlist item authored by one partner with hidden reservation status."""

    __tablename__ = "gift_ideas"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    couple_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("couples.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    direct_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    price_estimate: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 2),
        nullable=True,
    )
    priority: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    is_reserved_by_partner: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    is_purchased: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    couple: Mapped["Couple"] = relationship("Couple", back_populates="gift_ideas")
    author: Mapped["User"] = relationship("User")


class CustomDateCategory(TimestampMixin, Base):
    """User-created custom category folder mapped to a base DateCategoryEnum."""

    __tablename__ = "custom_date_categories"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    couple_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("couples.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    creator_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    base_category: Mapped[DateCategoryEnum] = mapped_column(
        SAEnum(
            DateCategoryEnum,
            name="date_category_enum",
            values_callable=_enum_values,
        ),
        default=DateCategoryEnum.ROMANTIC,
        nullable=False,
    )
    color_hex: Mapped[str] = mapped_column(
        String(16),
        default="#DB2777",
        nullable=False,
    )

    couple: Mapped["Couple"] = relationship(
        "Couple",
        back_populates="custom_categories",
    )
    creator: Mapped["User"] = relationship("User")


class DateIdea(TimestampMixin, Base):
    """Categorized date idea usable in asymmetric lock-in or the Smart Dice."""

    __tablename__ = "date_ideas"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    couple_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("couples.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    creator_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[DateCategoryEnum] = mapped_column(
        SAEnum(
            DateCategoryEnum,
            name="date_category_enum",
            values_callable=_enum_values,
        ),
        index=True,
        nullable=False,
    )
    custom_category_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("custom_date_categories.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    required_energy: Mapped[EnergyLevelEnum] = mapped_column(
        SAEnum(
            EnergyLevelEnum,
            name="energy_level_enum",
            values_callable=_enum_values,
        ),
        default=EnergyLevelEnum.MEDIUM,
        nullable=False,
    )
    is_surprise: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    suitable_for_long_distance: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    is_archived: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    couple: Mapped["Couple"] = relationship(
        "Couple",
        back_populates="date_ideas",
        foreign_keys=[couple_id],
    )
    creator: Mapped["User"] = relationship("User")


class CycleLog(TimestampMixin, Base):
    """Historical period start dates used for adaptive floating window prediction."""

    __tablename__ = "cycle_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    couple_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("couples.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    start_date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    cycle_length_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    couple: Mapped["Couple"] = relationship("Couple", back_populates="cycle_logs")
    user: Mapped["User"] = relationship("User")


class CycleDayObservation(TimestampMixin, Base):
    """Daily manual override for wellbeing, food cravings, and love language."""

    __tablename__ = "cycle_day_observations"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    couple_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("couples.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    log_date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    wellbeing_description: Mapped[str] = mapped_column(Text, nullable=False)
    food_preferences: Mapped[list[str]] = mapped_column(
        JSONBType,
        default=list,
        nullable=False,
    )
    desired_love_language: Mapped[LoveLanguageEnum] = mapped_column(
        SAEnum(
            LoveLanguageEnum,
            name="love_language_enum",
            values_callable=_enum_values,
        ),
        nullable=False,
    )
    symptom_tags: Mapped[list[str]] = mapped_column(
        JSONBType,
        default=list,
        nullable=False,
    )

    couple: Mapped["Couple"] = relationship(
        "Couple",
        back_populates="cycle_observations",
    )


class ChatMessage(TimestampMixin, Base):
    """Real-time chat message scoped strictly to a paired couple."""

    __tablename__ = "chat_messages"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    couple_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("couples.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    sender_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    read_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    couple: Mapped["Couple"] = relationship("Couple", back_populates="chat_messages")
    sender: Mapped["User"] = relationship("User")
