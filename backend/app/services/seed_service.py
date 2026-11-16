"""Default date ideas seed service so new couples can roll the Dice immediately."""

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import DateIdea
from app.models.enums import DateCategoryEnum, EnergyLevelEnum, LanguageEnum


@dataclass(frozen=True)
class SeedIdeaTemplate:
    """Localized template for a starter DateIdea."""

    titles: dict[str, str]
    descriptions: dict[str, str]
    category: DateCategoryEnum
    required_energy: EnergyLevelEnum
    suitable_for_long_distance: bool = False


DEFAULT_SEED_IDEAS: list[SeedIdeaTemplate] = [
    SeedIdeaTemplate(
        titles={
            "ru": "Уютный киновечер под пледом",
            "en": "Cozy Blanket Movie Marathon",
            "es": "Maratón de pelis bajo la manta",
        },
        descriptions={
            "ru": "Выбираем два фильма, готовим попкорн или какао и смотрим без телефонов.",
            "en": "Pick two comfort films, make popcorn or hot cocoa, and watch phone-free.",
            "es": "Elijan dos películas, preparen palomitas o chocolate caliente y sin móviles.",
        },
        category=DateCategoryEnum.HOME,
        required_energy=EnergyLevelEnum.LOW,
        suitable_for_long_distance=True,
    ),
    SeedIdeaTemplate(
        titles={
            "ru": "Домашнее спа и массаж",
            "en": "At-Home Spa & Massage Night",
            "es": "Noche de spa y masajes en casa",
        },
        descriptions={
            "ru": "Теплые полотенца, ароматические свечи, расслабляющая музыка и забота друг о друге.",
            "en": "Warm towels, scented candles, calm playlist, and taking turns giving massages.",
            "es": "Toallas tibias, velas aromáticas, música suave y masajes por turnos.",
        },
        category=DateCategoryEnum.RELAX,
        required_energy=EnergyLevelEnum.LOW,
        suitable_for_long_distance=False,
    ),
    SeedIdeaTemplate(
        titles={
            "ru": "Слепая дегустация десертов или чая",
            "en": "Blind Taste Test: Desserts or Tea",
            "es": "Cata a ciegas de postres o té",
        },
        descriptions={
            "ru": "Заказываем или покупаем 4–5 необычных вкусов и угадываем с закрытыми глазами.",
            "en": "Order or pick up 4-5 unusual flavors and guess each one blindfolded.",
            "es": "Pidan 4 o 5 sabores curiosos e intenten adivinarlos con los ojos vendados.",
        },
        category=DateCategoryEnum.FOOD,
        required_energy=EnergyLevelEnum.LOW,
        suitable_for_long_distance=True,
    ),
    SeedIdeaTemplate(
        titles={
            "ru": "Вечер настольных игр на двоих",
            "en": "Two-Player Board Game Tournament",
            "es": "Torneo de juegos de mesa para dos",
        },
        descriptions={
            "ru": "Небольшое дружеское соревнование — проигравший готовит завтрак утром.",
            "en": "Friendly rivalry where the loser makes breakfast tomorrow morning.",
            "es": "Competencia amistosa donde quien pierda prepara el desayuno mañana.",
        },
        category=DateCategoryEnum.HOME,
        required_energy=EnergyLevelEnum.LOW,
        suitable_for_long_distance=True,
    ),
    SeedIdeaTemplate(
        titles={
            "ru": "Ужин при свечах в новом месте",
            "en": "Candlelit Dinner at a New Spot",
            "es": "Cena a la luz de las velas en un sitio nuevo",
        },
        descriptions={
            "ru": "Бронируем столик в ресторане, где еще ни разу не были, и наряжаемся.",
            "en": "Book a table somewhere neither of you has been before and dress up.",
            "es": "Reserven mesa en un restaurante nuevo y arréglense para la ocasión.",
        },
        category=DateCategoryEnum.ROMANTIC,
        required_energy=EnergyLevelEnum.MEDIUM,
        suitable_for_long_distance=False,
    ),
    SeedIdeaTemplate(
        titles={
            "ru": "Ночная прогулка с кофе по центру",
            "en": "Late-Night Coffee & City Stroll",
            "es": "Paseo nocturno con café por la ciudad",
        },
        descriptions={
            "ru": "Берем вкусный кофе навынос и гуляем по красивым освещенным улочкам.",
            "en": "Grab warm drinks to go and wander through lit-up streets talking about everything.",
            "es": "Tomen un café para llevar y paseen por calles iluminadas charlando sin prisa.",
        },
        category=DateCategoryEnum.ROMANTIC,
        required_energy=EnergyLevelEnum.MEDIUM,
        suitable_for_long_distance=False,
    ),
    SeedIdeaTemplate(
        titles={
            "ru": "Готовим пасту или пиццу вместе",
            "en": "Cook Homemade Pasta or Pizza Together",
            "es": "Cocinar pasta o pizza casera juntos",
        },
        descriptions={
            "ru": "Включаем любимый плейлист и устраиваем кулинарный мастер-класс дома (или по видеосвязи).",
            "en": "Put on a great playlist and host a mini cooking class together (in-person or on video).",
            "es": "Pongan música y hagan una clase de cocina juntos en casa o por videollamada.",
        },
        category=DateCategoryEnum.FOOD,
        required_energy=EnergyLevelEnum.MEDIUM,
        suitable_for_long_distance=True,
    ),
    SeedIdeaTemplate(
        titles={
            "ru": "Онлайн-экскурсия и синхронный ужин",
            "en": "Virtual Museum Tour & Synced Dinner",
            "es": "Tour virtual por museo y cena sincronizada",
        },
        descriptions={
            "ru": "Заказываем одинаковую кухню и гуляем по виртуальному музею или 3D-туру мира.",
            "en": "Order the same cuisine and explore a virtual museum or world landmark on video call.",
            "es": "Pidan la misma comida y recorran un museo virtual juntos por videollamada.",
        },
        category=DateCategoryEnum.ROMANTIC,
        required_energy=EnergyLevelEnum.LOW,
        suitable_for_long_distance=True,
    ),
    SeedIdeaTemplate(
        titles={
            "ru": "Закат на смотровой или пикник в парке",
            "en": "Sunset Viewpoint or Park Picnic",
            "es": "Atardecer en un mirador o picnic en el parque",
        },
        descriptions={
            "ru": "Берем плед, фрукты, закуски и встречаем закат в красивой точке города.",
            "en": "Pack a blanket, berries, and snacks to catch golden hour at a scenic spot.",
            "es": "Lleven una manta, fruta y snacks para ver el atardecer en un lugar bonito.",
        },
        category=DateCategoryEnum.RELAX,
        required_energy=EnergyLevelEnum.MEDIUM,
        suitable_for_long_distance=False,
    ),
    SeedIdeaTemplate(
        titles={
            "ru": "Боулинг, бильярд или аркадные автоматы",
            "en": "Bowling, Pool, or Retro Arcade",
            "es": "Bolos, billar o máquinas arcade",
        },
        descriptions={
            "ru": "Веселое активное свидание с легким азартом и вкусными снеками.",
            "en": "Playful active outing with friendly competition and arcade prizes.",
            "es": "Salida activa y divertida con competencia amistosa y premios.",
        },
        category=DateCategoryEnum.ACTIVE,
        required_energy=EnergyLevelEnum.HIGH,
        suitable_for_long_distance=False,
    ),
    SeedIdeaTemplate(
        titles={
            "ru": "Велопрогулка или поход на природу",
            "en": "Scenic Bike Ride or Nature Hike",
            "es": "Paseo en bici o ruta de senderismo",
        },
        descriptions={
            "ru": "Выбираемся на свежий воздух, делаем классные фото и заряжаемся движением.",
            "en": "Get out into nature, explore a new trail, and take Polaroid-style photos.",
            "es": "Salgan a la naturaleza, exploren una ruta nueva y saquen fotos juntos.",
        },
        category=DateCategoryEnum.ACTIVE,
        required_energy=EnergyLevelEnum.HIGH,
        suitable_for_long_distance=False,
    ),
    SeedIdeaTemplate(
        titles={
            "ru": "Картинг или скалодром для адреналина",
            "en": "Go-Karting or Indoor Rock Climbing",
            "es": "Karting o escalada indoor",
        },
        descriptions={
            "ru": "Мощный выброс адреналина и море эмоций — идеально для дней с высокой энергией!",
            "en": "Adrenaline-filled challenge for high-energy days!",
            "es": "¡Dosis de adrenalina y emoción para días con mucha energía!",
        },
        category=DateCategoryEnum.EXTREME,
        required_energy=EnergyLevelEnum.HIGH,
        suitable_for_long_distance=False,
    ),
    SeedIdeaTemplate(
        titles={
            "ru": "Квест-комната или хоррор-перформанс",
            "en": "Escape Room Adventure",
            "es": "Aventura en Escape Room",
        },
        descriptions={
            "ru": "Проверяем командную работу под давлением таймера — можно даже онлайн-квест!",
            "en": "Test your teamwork against the clock — works great in-person or as an online escape!",
            "es": "Pongan a prueba su trabajo en equipo contrarreloj, ¡presencial u online!",
        },
        category=DateCategoryEnum.EXTREME,
        required_energy=EnergyLevelEnum.HIGH,
        suitable_for_long_distance=True,
    ),
    SeedIdeaTemplate(
        titles={
            "ru": "Совместный вишлист-рейд и кофе на двоих",
            "en": "Bookstore & Coffee Treasure Hunt",
            "es": "Búsqueda del tesoro en librería y café",
        },
        descriptions={
            "ru": "Даем друг другу 20 минут и небольшой бюджет, чтобы выбрать книгу или милую мелочь.",
            "en": "Give each other 20 minutes in a bookstore to pick a book or small gift for the other.",
            "es": "Tienen 20 minutos en una librería para elegir un libro o detalle para el otro.",
        },
        category=DateCategoryEnum.ROMANTIC,
        required_energy=EnergyLevelEnum.MEDIUM,
        suitable_for_long_distance=False,
    ),
]


async def seed_default_date_ideas(
    db: AsyncSession,
    couple_id: UUID,
    creator_id: UUID,
    lang: LanguageEnum = LanguageEnum.RU,
) -> list[DateIdea]:
    """Populate 14 starter DateIdea records for a newly created couple."""
    lang_code = lang.value if isinstance(lang, LanguageEnum) else str(lang)
    if lang_code not in {"ru", "en", "es"}:
        lang_code = "en"

    ideas: list[DateIdea] = []
    for template in DEFAULT_SEED_IDEAS:
        idea = DateIdea(
            couple_id=couple_id,
            creator_id=creator_id,
            title=template.titles.get(lang_code, template.titles["en"]),
            description=template.descriptions.get(lang_code, template.descriptions["en"]),
            category=template.category,
            required_energy=template.required_energy,
            is_surprise=False,
            suitable_for_long_distance=template.suitable_for_long_distance,
        )
        db.add(idea)
        ideas.append(idea)

    await db.flush()
    return ideas
