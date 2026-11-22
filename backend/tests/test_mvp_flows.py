"""Integration tests covering pairing, surprise masking, cycle engine, and Smart Dice."""

from datetime import date, datetime, timedelta, timezone

import httpx


async def _register_and_pair_couple(
    client: httpx.AsyncClient,
) -> tuple[dict[str, str], dict[str, str], str]:
    """Helper registering Partner A (ru, female) and Partner B (en, male) and pairing them."""
    reg_a = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "anna@example.com",
            "password": "StrongPassword123",
            "name": "Anna",
            "gender_role": "female",
            "preferred_language": "ru",
        },
    )
    assert reg_a.status_code == 201, reg_a.text
    token_a = reg_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    invite_res = await client.get("/api/v1/couple/invite-info", headers=headers_a)
    assert invite_res.status_code == 200
    invite_code = invite_res.json()["invite_code"]
    assert len(invite_code) == 6
    assert invite_res.json()["qr_payload"] == f"couplesapp://pair?code={invite_code}"

    reg_b = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "bob@example.com",
            "password": "StrongPassword123",
            "name": "Bob",
            "gender_role": "male",
            "preferred_language": "en",
        },
    )
    assert reg_b.status_code == 201, reg_b.text
    token_b = reg_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    join_res = await client.post(
        "/api/v1/couple/join",
        headers=headers_b,
        json={"invite_code": invite_code},
    )
    assert join_res.status_code == 200, join_res.text
    assert len(join_res.json()["partners"]) == 2
    return headers_a, headers_b, invite_code


async def test_couple_pairing_countdown_and_asymmetric_scenario(
    client: httpx.AsyncClient,
) -> None:
    """Verify QR/code pairing, 10-day countdown timer, and asymmetric evening lock-in."""
    headers_a, headers_b, _ = await _register_and_pair_couple(client)

    target_dt = datetime.now(timezone.utc) + timedelta(days=10, minutes=10)
    profile_res = await client.put(
        "/api/v1/couple/relationship-profile",
        headers=headers_a,
        json={
            "relationship_format": "long_distance",
            "onboarding_quiz_data": {"weekend_vibe": "cozy"},
            "next_meeting_datetime": target_dt.isoformat(),
        },
    )
    assert profile_res.status_code == 200, profile_res.text

    dash_b = await client.get("/api/v1/couple/dashboard", headers=headers_b)
    assert dash_b.status_code == 200
    dash_data = dash_b.json()
    assert dash_data["relationship_format"] == "long_distance"
    assert dash_data["countdown"] is not None
    assert dash_data["countdown"]["days"] == 10
    assert dash_data["countdown"]["is_past"] is False

    # Partner A selects a seeded idea for tonight
    ideas_res = await client.get("/api/v1/ideas/dates", headers=headers_a)
    assert ideas_res.status_code == 200
    ideas = ideas_res.json()
    assert len(ideas) >= 12

    chosen_id = ideas[0]["id"]
    lock_res = await client.post(
        f"/api/v1/ideas/dates/{chosen_id}/select-for-tonight",
        headers=headers_a,
    )
    assert lock_res.status_code == 200
    assert lock_res.json()["active_evening_scenario"]["id"] == chosen_id

    dash_b_after = (await client.get("/api/v1/couple/dashboard", headers=headers_b)).json()
    assert dash_b_after["active_evening_scenario"]["id"] == chosen_id

    clear_res = await client.delete("/api/v1/ideas/dates/active-scenario", headers=headers_b)
    assert clear_res.status_code == 200
    assert clear_res.json()["active_evening_scenario"] is None


async def test_surprise_masking_for_gifts_and_dates_and_couple_isolation(
    client: httpx.AsyncClient,
) -> None:
    """Verify gift reservation privacy, date surprise masking, and cross-couple isolation."""
    headers_a, headers_b, _ = await _register_and_pair_couple(client)

    # Partner A creates a GiftIdea; Partner B reserves it
    gift_res = await client.post(
        "/api/v1/ideas/gifts",
        headers=headers_a,
        json={
            "title": "Silk Pajamas",
            "direct_url": "https://example.com/silk-pajamas",
            "price_estimate": 120.50,
            "priority": 5,
        },
    )
    assert gift_res.status_code == 201, gift_res.text
    gift_id = gift_res.json()["id"]
    assert gift_res.json()["is_reserved_by_partner"] is None

    reserve_res = await client.patch(
        f"/api/v1/ideas/gifts/{gift_id}/reserve",
        headers=headers_b,
        json={"is_reserved_by_partner": True},
    )
    assert reserve_res.status_code == 200
    assert reserve_res.json()["is_reserved_by_partner"] is True

    # Partner A still must NOT see reservation status
    gifts_for_a = (
        await client.get("/api/v1/ideas/gifts?filter_by=mine", headers=headers_a)
    ).json()
    assert len(gifts_for_a) == 1
    assert gifts_for_a[0]["is_reserved_by_partner"] is None

    # Partner B sees True
    gifts_for_b = (
        await client.get("/api/v1/ideas/gifts?filter_by=partner", headers=headers_b)
    ).json()
    assert len(gifts_for_b) == 1
    assert gifts_for_b[0]["is_reserved_by_partner"] is True

    # Partner B creates a surprise DateIdea
    surprise_res = await client.post(
        "/api/v1/ideas/dates",
        headers=headers_b,
        json={
            "title": "Hot Air Balloon Sunrise",
            "description": "Pickup at 5:30 AM at the lakeside",
            "category": "romantic",
            "required_energy": "medium",
            "is_surprise": True,
            "suitable_for_long_distance": False,
        },
    )
    assert surprise_res.status_code == 201
    surprise_id = surprise_res.json()["id"]
    assert surprise_res.json()["title"] == "Hot Air Balloon Sunrise"

    # Partner A sees masked title & description in Russian
    dates_for_a = (await client.get("/api/v1/ideas/dates", headers=headers_a)).json()
    masked = next(d for d in dates_for_a if d["id"] == surprise_id)
    assert masked["is_surprise"] is True
    assert masked["title"] == "✨ Секретное свидание-сюрприз"
    assert masked["description"] == "Твой партнер подготовил сюрприз! Детали скрыты."
    assert "Balloon" not in masked["title"]

    # Third user in a separate couple cannot view or modify Anna & Bob's items
    reg_c = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "outsider@example.com",
            "password": "StrongPassword123",
            "name": "Outsider",
            "gender_role": "partner",
            "preferred_language": "en",
        },
    )
    headers_c = {"Authorization": f"Bearer {reg_c.json()['access_token']}"}
    assert (
        await client.patch(f"/api/v1/ideas/gifts/{gift_id}/reserve", headers=headers_c)
    ).status_code == 404
    assert (
        await client.delete(f"/api/v1/ideas/dates/{surprise_id}", headers=headers_c)
    ).status_code == 404


async def test_adaptive_female_cycle_floating_window(
    client: httpx.AsyncClient,
) -> None:
    """Verify WMA calculation, floating window bounds, and menstrual phase exclusions."""
    headers_a, headers_b, _ = await _register_and_pair_couple(client)

    today = date.today()
    s4 = today - timedelta(days=2)  # Day 3 of cycle
    s3 = s4 - timedelta(days=29)
    s2 = s3 - timedelta(days=30)
    s1 = s2 - timedelta(days=28)

    for start in (s1, s2, s3, s4):
        res = await client.post(
            "/api/v1/cycle/period-start",
            headers=headers_a,
            json={"start_date": start.isoformat(), "period_duration_days": 5},
        )
        assert res.status_code == 201, res.text

    status_res = await client.get("/api/v1/cycle/status", headers=headers_b)
    assert status_res.status_code == 200
    status_data = status_res.json()

    # WMA of [28, 30, 29] with weights [1, 2, 3] = (28 + 60 + 87) / 6 = 29.17
    assert status_data["current_phase"] == "menstrual"
    assert status_data["day_of_cycle"] == 3
    assert abs(status_data["expected_cycle_length_wma"] - 29.17) < 0.01

    expected_center = s4 + timedelta(days=29)
    window = status_data["next_period_floating_window"]
    assert window["center"] == expected_center.isoformat()
    assert window["start"] == (expected_center - timedelta(days=1)).isoformat()
    assert window["end"] == (expected_center + timedelta(days=1)).isoformat()

    rules = status_data["dice_filter_rules"]
    assert rules["allowed_energy"] == ["low"]
    assert set(rules["excluded_categories"]) == {"extreme", "active"}

    # Daily manual override
    obs_res = await client.put(
        "/api/v1/cycle/daily-observation",
        headers=headers_a,
        json={
            "wellbeing_description": "Need warmth and quiet evening",
            "food_preferences": ["soup", "dark chocolate"],
            "desired_love_language": "acts_of_service",
            "symptom_tags": ["fatigue"],
        },
    )
    assert obs_res.status_code == 200
    assert obs_res.json()["wellbeing_summary"] == "Need warmth and quiet evening"
    assert obs_res.json()["food_preferences"] == ["soup", "dark chocolate"]


async def test_smart_dice_real_time_calibration_and_override(
    client: httpx.AsyncClient,
) -> None:
    """Verify Dice blocks HIGH/EXTREME in Menstrual/Tired state and unlocks on high_energy."""
    headers_a, headers_b, _ = await _register_and_pair_couple(client)

    # Add a HIGH energy romantic idea so it can be unlocked by high_energy override
    # even while menstrual phase excludes EXTREME and ACTIVE categories
    high_romantic = await client.post(
        "/api/v1/ideas/dates",
        headers=headers_b,
        json={
            "title": "Midnight Rooftop Dancing",
            "description": "High-energy romantic night out",
            "category": "romantic",
            "required_energy": "high",
            "is_surprise": False,
        },
    )
    assert high_romantic.status_code == 201

    # Put couple into Menstrual Phase (Day 2)
    await client.post(
        "/api/v1/cycle/period-start",
        headers=headers_a,
        json={"start_date": (date.today() - timedelta(days=1)).isoformat()},
    )

    # Roll 10 times: ZERO high energy and ZERO extreme/active categories allowed
    for _ in range(10):
        roll_res = await client.post("/api/v1/interactions/roll-dice", headers=headers_b)
        assert roll_res.status_code == 200, roll_res.text
        winner = roll_res.json()["winning_idea"]
        assert winner["required_energy"] != "high"
        assert winner["category"] not in {"extreme", "active"}

    # Also check tired status explicitly blocks HIGH and EXTREME
    tired_res = await client.post(
        "/api/v1/interactions/status",
        headers=headers_b,
        json={"status": "tired"},
    )
    assert tired_res.status_code == 200
    assert tired_res.json()["user"]["current_energy_modifier"] == "low"

    for _ in range(10):
        roll_res = await client.post("/api/v1/interactions/roll-dice", headers=headers_a)
        winner = roll_res.json()["winning_idea"]
        assert winner["required_energy"] != "high"
        assert winner["category"] not in {"extreme", "active"}

    # Clear tired by moving Partner B to hungry, and Partner A clicks high_energy override
    await client.post(
        "/api/v1/interactions/status",
        headers=headers_b,
        json={"status": "hungry"},
    )
    high_res = await client.post(
        "/api/v1/interactions/status",
        headers=headers_a,
        json={"status": "high_energy"},
    )
    assert high_res.status_code == 200
    assert high_res.json()["user"]["current_energy_modifier"] == "high"

    # Roll until we observe HIGH energy unlocked (and calibration cap == high)
    saw_high_energy = False
    for _ in range(40):
        roll_res = await client.post("/api/v1/interactions/roll-dice", headers=headers_a)
        assert roll_res.status_code == 200
        body = roll_res.json()
        assert body["calibration_explanation"]["applied_energy_cap"] == "high"
        if body["winning_idea"]["required_energy"] == "high":
            saw_high_energy = True
            break

    assert saw_high_energy, "Expected HIGH energy date idea to unlock after high_energy override"


async def test_couple_chat_messages_and_unread_count(client: httpx.AsyncClient) -> None:
    """Verify paired couple chat persistence, unread counter increments, and read-marking."""
    headers_a, headers_b, _invite_code = await _register_and_pair_couple(client)

    send_1 = await client.post(
        "/api/v1/chat/messages",
        headers=headers_a,
        json={"body": "Miss you today!"},
    )
    assert send_1.status_code == 201, send_1.text
    assert send_1.json()["sender_name"] == "Anna"

    send_2 = await client.post(
        "/api/v1/chat/messages",
        headers=headers_a,
        json={"body": "Want sushi tonight?"},
    )
    assert send_2.status_code == 201, send_2.text

    inbox_b = await client.get("/api/v1/chat/messages", headers=headers_b)
    assert inbox_b.status_code == 200, inbox_b.text
    data_b = inbox_b.json()
    assert data_b["unread_count"] == 2
    assert [m["body"] for m in data_b["messages"]] == [
        "Miss you today!",
        "Want sushi tonight?",
    ]

    # Sender A sees 0 unread from self
    inbox_a = await client.get("/api/v1/chat/messages", headers=headers_a)
    assert inbox_a.status_code == 200
    assert inbox_a.json()["unread_count"] == 0

    mark_res = await client.post("/api/v1/chat/messages/read", headers=headers_b)
    assert mark_res.status_code == 200, mark_res.text
    assert mark_res.json()["marked_count"] == 2
    assert mark_res.json()["unread_count"] == 0

    inbox_b_after = await client.get("/api/v1/chat/messages", headers=headers_b)
    assert inbox_b_after.status_code == 200
    assert inbox_b_after.json()["unread_count"] == 0
