"""Domain enumerations shared across ORM models and Pydantic schemas."""

from enum import Enum


class LanguageEnum(str, Enum):
    """Supported per-partner UI and notification languages."""

    RU = "ru"
    EN = "en"
    ES = "es"


class GenderRoleEnum(str, Enum):
    """Partner gender role options."""

    FEMALE = "female"
    MALE = "male"
    PARTNER = "partner"


class RelationshipFormatEnum(str, Enum):
    """Couple living/distance format affecting countdown and Dice filtering."""

    LIVING_TOGETHER = "living_together"
    DATING_SEPARATE = "dating_separate"
    LONG_DISTANCE = "long_distance"


class DateCategoryEnum(str, Enum):
    """Categories for shared date ideas."""

    ROMANTIC = "romantic"
    ACTIVE = "active"
    RELAX = "relax"
    FOOD = "food"
    EXTREME = "extreme"
    HOME = "home"


class EnergyLevelEnum(str, Enum):
    """Energy requirement or current energy modifier."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class CyclePhaseEnum(str, Enum):
    """Biological phases tracked by the adaptive female cycle engine."""

    MENSTRUAL = "menstrual"
    FOLLICULAR = "follicular"
    OVULATION = "ovulation"
    LUTEAL = "luteal"


class LoveLanguageEnum(str, Enum):
    """Five love languages for daily cycle observations and recommendations."""

    WORDS = "words_of_affirmation"
    QUALITY_TIME = "quality_time"
    GIFTS = "receiving_gifts"
    ACTS_OF_SERVICE = "acts_of_service"
    TOUCH = "physical_touch"


class QuickStatusEnum(str, Enum):
    """Real-time quick-status buttons calibrating Dice & partner notifications."""

    GOING_HOME = "going_home"
    HIGH_ENERGY = "high_energy"
    TIRED = "tired"
    HUNGRY = "hungry"
    NEED_HUGS = "need_hugs"
    BUSY = "busy"
