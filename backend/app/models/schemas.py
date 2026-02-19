from __future__ import annotations

from pydantic import BaseModel
from typing import Optional


# --- Auth ---
class UserAuth(BaseModel):
    email: str
    password: str


# --- Campaigns ---
class CampaignCreate(BaseModel):
    name: str
    description: Optional[str] = None
    template: Optional[str] = "default"
    status: Optional[str] = "draft"
    ab_test_mode: Optional[str] = "off"
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    template: Optional[str] = None
    status: Optional[str] = None
    ab_test_mode: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None


# --- Variants ---
class VariantCreate(BaseModel):
    name: Optional[str] = None
    headline: Optional[str] = None
    body_text: Optional[str] = None
    image_url: Optional[str] = None
    cta_text: Optional[str] = None
    cta_url: Optional[str] = None
    is_default: Optional[bool] = False
    is_control: Optional[bool] = False
    weight: Optional[float] = 1.0


class VariantUpdate(BaseModel):
    name: Optional[str] = None
    headline: Optional[str] = None
    body_text: Optional[str] = None
    image_url: Optional[str] = None
    cta_text: Optional[str] = None
    cta_url: Optional[str] = None
    is_default: Optional[bool] = None
    is_control: Optional[bool] = None
    weight: Optional[float] = None


# --- Rules ---
class RuleCreate(BaseModel):
    variant_id: str
    signal: str
    operator: str
    value: str
    priority: Optional[int] = 0


class RuleUpdate(BaseModel):
    variant_id: Optional[str] = None
    signal: Optional[str] = None
    operator: Optional[str] = None
    value: Optional[str] = None
    priority: Optional[int] = None


# --- Pools ---
class PoolUpsert(BaseModel):
    values: list[str]


# --- API Keys ---
class APIKeyCreate(BaseModel):
    name: str
    scopes: list[str] = ["serve", "read"]
    expires_at: Optional[str] = None


class APIKeyUpdate(BaseModel):
    name: Optional[str] = None
    scopes: Optional[list[str]] = None


# --- Analytics ---
class ClickEvent(BaseModel):
    campaign_id: str
    variant_id: str
    url: Optional[str] = None


class ImpressionEvent(BaseModel):
    campaign_id: str
    variant_id: str
    signals: Optional[dict] = None
