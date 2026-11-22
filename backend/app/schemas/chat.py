"""Pydantic schemas for couple real-time chat endpoints."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ChatMessageCreate(BaseModel):
    """Payload to send a new message to partner."""

    body: str = Field(min_length=1, max_length=2000)


class ChatMessageRead(BaseModel):
    """Serialized couple chat message."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    couple_id: UUID
    sender_id: UUID
    sender_name: str
    body: str
    read_at: Optional[datetime] = None
    created_at: datetime


class ChatHistoryResponse(BaseModel):
    """Recent couple chat thread plus unread count for current user."""

    messages: list[ChatMessageRead]
    unread_count: int


class ChatMarkReadResponse(BaseModel):
    """Result after marking partner's unread messages as read."""

    marked_count: int
    unread_count: int
