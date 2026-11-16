"""Real-time WebSocket connection manager and Firebase Cloud Messaging service."""

import logging
import os
from collections import defaultdict
from typing import Any, Optional
from uuid import UUID

import firebase_admin
from fastapi import WebSocket
from firebase_admin import credentials, messaging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.i18n import get_localized_message
from app.models.entities import User

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Tracks active WebSocket connections grouped by couple_id and user_id."""

    def __init__(self) -> None:
        self._connections: dict[UUID, dict[UUID, set[WebSocket]]] = defaultdict(
            lambda: defaultdict(set)
        )

    async def connect(
        self,
        couple_id: UUID,
        user_id: UUID,
        websocket: WebSocket,
    ) -> None:
        """Accept and register an authenticated WebSocket connection."""
        await websocket.accept()
        self._connections[couple_id][user_id].add(websocket)

    def disconnect(
        self,
        couple_id: UUID,
        user_id: UUID,
        websocket: WebSocket,
    ) -> None:
        """Remove a closed WebSocket connection."""
        user_sockets = self._connections.get(couple_id, {}).get(user_id)
        if user_sockets is not None:
            user_sockets.discard(websocket)
            if not user_sockets:
                self._connections[couple_id].pop(user_id, None)
        if couple_id in self._connections and not self._connections[couple_id]:
            self._connections.pop(couple_id, None)

    def is_user_online(self, couple_id: UUID, user_id: UUID) -> bool:
        """Return True if the user currently has at least one active WebSocket."""
        return bool(self._connections.get(couple_id, {}).get(user_id))

    async def send_to_user(
        self,
        couple_id: UUID,
        user_id: UUID,
        event: dict[str, Any],
    ) -> bool:
        """Deliver a JSON payload to all active sockets of a partner; returns True if sent."""
        sockets = list(self._connections.get(couple_id, {}).get(user_id, set()))
        if not sockets:
            return False

        delivered = False
        stale: list[WebSocket] = []
        for ws in sockets:
            try:
                await ws.send_json(event)
                delivered = True
            except Exception:
                stale.append(ws)

        for ws in stale:
            self.disconnect(couple_id, user_id, ws)
        return delivered


manager = ConnectionManager()
_firebase_initialized = False


def _ensure_firebase_app() -> bool:
    """Lazily initialize firebase_admin if credentials path exists."""
    global _firebase_initialized
    if _firebase_initialized:
        return True

    cred_path = settings.FIREBASE_CREDENTIALS_PATH
    if not cred_path or not os.path.exists(cred_path):
        return False

    try:
        if not firebase_admin._apps:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        _firebase_initialized = True
        return True
    except Exception as exc:
        logger.warning("Failed to initialize Firebase Admin SDK: %s", exc)
        return False


def _dispatch_fcm_push(
    fcm_token: Optional[str],
    title: str,
    body: str,
    data_payload: dict[str, str],
) -> None:
    """Send push notification via FCM if configured, otherwise log cleanly."""
    if _ensure_firebase_app() and fcm_token:
        try:
            msg = messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                data=data_payload,
                token=fcm_token,
            )
            response_id = messaging.send(msg)
            logger.info("Sent FCM push message_id=%s", response_id)
            return
        except Exception as exc:
            logger.warning("FCM push failed, falling back to log: %s", exc)

    logger.info(
        "[PUSH_MOCK] token=%s title=%r body=%r data=%s",
        fcm_token or "<no-token>",
        title,
        body,
        data_payload,
    )


async def notify_partner(
    db: AsyncSession,
    couple_id: UUID,
    sender_id: UUID,
    event_type: str,
    payload_dict: dict[str, Any],
    title: Optional[str] = None,
    body: Optional[str] = None,
    title_key: Optional[str] = None,
    body_key: Optional[str] = None,
    message_kwargs: Optional[dict[str, Any]] = None,
) -> tuple[bool, bool]:
    """Broadcast event over WebSocket and dispatch localized push notification to partner.

    Returns (partner_found, partner_online_ws_delivered).
    """
    res = await db.execute(
        select(User).where(
            User.couple_id == couple_id,
            User.id != sender_id,
        )
    )
    partner = res.scalar_one_or_none()
    if partner is None:
        return False, False

    kwargs = message_kwargs or {}
    resolved_title = (
        get_localized_message(title_key, partner.preferred_language, **kwargs)
        if title_key
        else (title or event_type)
    )
    resolved_body = (
        get_localized_message(body_key, partner.preferred_language, **kwargs)
        if body_key
        else (body or "")
    )

    ws_event = {
        "event_type": event_type,
        "sender_id": str(sender_id),
        "title": resolved_title,
        "body": resolved_body,
        "payload": payload_dict,
    }
    ws_delivered = await manager.send_to_user(couple_id, partner.id, ws_event)

    fcm_data = {
        "event_type": event_type,
        "sender_id": str(sender_id),
        **{k: str(v) for k, v in payload_dict.items() if v is not None},
    }
    _dispatch_fcm_push(
        fcm_token=partner.fcm_token,
        title=resolved_title,
        body=resolved_body,
        data_payload=fcm_data,
    )
    return True, ws_delivered
