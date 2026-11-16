"""Localization strings and helper utilities for per-partner messaging."""

from app.models.enums import LanguageEnum

LOCALIZED_MESSAGES: dict[str, dict[str, str]] = {
    "ru": {
        "surprise_date_title": "✨ Секретное свидание-сюрприз",
        "surprise_date_description": "Твой партнер подготовил сюрприз! Детали скрыты.",
        "evening_scenario_locked": "Половинка выбрала сценарий на вечер: {title}! Муки выбора отменяются.",
        "status_going_home": "Я еду домой! 🏠",
        "status_high_energy": "У меня куча энергии! Давай придумаем что-то классное ⚡",
        "status_tired": "Я сегодня без сил, хочется уюта и отдыха 🔋",
        "status_hungry": "Очень хочется вкусняшек! Пора поесть 🍕",
        "status_need_hugs": "Мне срочно нужны обнимашки ❤️",
        "status_busy": "Сейчас в запаре, освобожусь позже 💻",
        "surprise_requested_title": "Партнер хочет сюрприз! 🎁",
        "surprise_requested_body": "Подсказка: {hint}",
        "surprise_requested_no_hint": "Самое время порадовать любимого человека!",
        "cycle_menstrual_wellbeing": "Низкий уровень энергии, возможны спазмы, важны тепло и забота.",
        "cycle_menstrual_food": "Теплая еда, темный шоколад, блюда богатые железом, травяной чай",
        "cycle_follicular_wellbeing": "Энергия растет, отличное настроение и открытость новому опыту.",
        "cycle_follicular_food": "Свежие салаты, легкий белок, ферментированные продукты",
        "cycle_ovulation_wellbeing": "Пик энергии, высокая социальная и романтическая активность.",
        "cycle_ovulation_food": "Легкие закуски, ягоды, больше воды и свежих овощей",
        "cycle_luteal_wellbeing": "Плавный спад энергии, повышенная чувствительность и потребность в уюте.",
        "cycle_luteal_food": "Сложные углеводы, продукты с магнием, уютные перекусы",
    },
    "en": {
        "surprise_date_title": "✨ Secret Surprise Date",
        "surprise_date_description": "Your partner prepared a surprise! Details are hidden.",
        "evening_scenario_locked": "Your partner chose tonight's plan: {title}! Decision fatigue is cancelled.",
        "status_going_home": "I'm heading home! 🏠",
        "status_high_energy": "I'm full of energy! Let's do something fun ⚡",
        "status_tired": "Low on battery today, craving coziness and rest 🔋",
        "status_hungry": "Really craving something delicious! Time to eat 🍕",
        "status_need_hugs": "I urgently need hugs ❤️",
        "status_busy": "Swamped right now, I'll be free later 💻",
        "surprise_requested_title": "Your partner wants a surprise! 🎁",
        "surprise_requested_body": "Hint: {hint}",
        "surprise_requested_no_hint": "Great moment to surprise your favorite person!",
        "cycle_menstrual_wellbeing": "Low energy, possible cramps, comfort and warmth are key.",
        "cycle_menstrual_food": "Warm meals, dark chocolate, iron-rich foods, herbal tea",
        "cycle_follicular_wellbeing": "Rising energy, great mood, open to new experiences.",
        "cycle_follicular_food": "Fresh salads, lean proteins, fermented foods",
        "cycle_ovulation_wellbeing": "Peak energy, high social and romantic drive.",
        "cycle_ovulation_food": "Light snacks, berries, plenty of hydration",
        "cycle_luteal_wellbeing": "Winding down, heightened sensitivity, craving comfort.",
        "cycle_luteal_food": "Complex carbs, magnesium-rich foods, comfort snacks",
    },
    "es": {
        "surprise_date_title": "✨ Cita Sorpresa Secreta",
        "surprise_date_description": "¡Tu pareja preparó una sorpresa! Los detalles están ocultos.",
        "evening_scenario_locked": "Tu pareja eligió el plan de esta noche: {title}. ¡Sin fatiga de decisión!",
        "status_going_home": "¡Voy camino a casa! 🏠",
        "status_high_energy": "¡Tengo mucha energía! Hagamos algo genial ⚡",
        "status_tired": "Sin batería hoy, necesito descanso y calma 🔋",
        "status_hungry": "¡Tengo mucha hambre! Hora de comer algo rico 🍕",
        "status_need_hugs": "Necesito abrazos urgentemente ❤️",
        "status_busy": "Estoy muy ocupado ahora, luego me libero 💻",
        "surprise_requested_title": "¡Tu pareja quiere una sorpresa! 🎁",
        "surprise_requested_body": "Pista: {hint}",
        "surprise_requested_no_hint": "¡Momento perfecto para sorprender a tu persona favorita!",
        "cycle_menstrual_wellbeing": "Energía baja, posibles cólicos, el confort y el calor son clave.",
        "cycle_menstrual_food": "Comida caliente, chocolate negro, alimentos ricos en hierro",
        "cycle_follicular_wellbeing": "Energía en aumento, buen ánimo y apertura a nuevas experiencias.",
        "cycle_follicular_food": "Ensaladas frescas, proteínas ligeras, alimentos fermentados",
        "cycle_ovulation_wellbeing": "Pico de energía, alta vitalidad social y romántica.",
        "cycle_ovulation_food": "Snacks ligeros, frutos rojos, buena hidratación",
        "cycle_luteal_wellbeing": "Energía bajando, mayor sensibilidad y necesidad de confort.",
        "cycle_luteal_food": "Carbohidratos complejos, alimentos con magnesio, snacks reconfortantes",
    },
}


def get_localized_message(
    key: str,
    lang: LanguageEnum | str,
    **kwargs: object,
) -> str:
    """Return a formatted localized string for the target language."""
    lang_code = lang.value if isinstance(lang, LanguageEnum) else str(lang)
    catalog = LOCALIZED_MESSAGES.get(lang_code, LOCALIZED_MESSAGES["en"])
    template = catalog.get(key) or LOCALIZED_MESSAGES["en"].get(key, key)
    if kwargs:
        return template.format(**kwargs)
    return template
