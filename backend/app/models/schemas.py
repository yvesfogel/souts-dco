"""Pydantic schemas for API request/response validation."""
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


# Auth
class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


# Campaigns
class CampaignCreate(BaseModel):
    name: str
    description: Optional[str] = None
    template: str = "default"
    settings: Optional[dict] = None


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    template: Optional[str] = None
    settings: Optional[dict] = None
    active: Optional[bool] = None


class Campaign(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str]
    template: str
    settings: Optional[dict]
    active: bool
    created_at: datetime
    updated_at: datetime


# Variants
class VariantCreate(BaseModel):
    name: str
    headline: str
    body_text: Optional[str] = None
    cta_text: str = "Learn More"
    cta_url: str
    image_url: Optional[str] = None
    is_default: bool = False
    settings: Optional[dict] = None


class VariantUpdate(BaseModel):
    name: Optional[str] = None
    headline: Optional[str] = None
    body_text: Optional[str] = None
    cta_text: Optional[str] = None
    cta_url: Optional[str] = None
    image_url: Optional[str] = None
    is_default: Optional[bool] = None
    settings: Optional[dict] = None


# Rules
class RuleCondition(BaseModel):
    field: str  # e.g., "weather_temp", "daypart", "geo_country"
    operator: str  # eq, ne, gt, gte, lt, lte, in, not_in, contains
    value: str | int | float | list


class RuleCreate(BaseModel):
    name: str
    variant_id: str
    conditions: list[RuleCondition]
    logic: str = "and"  # "and" or "or"
    priority: int = 0
    active: bool = True


class RuleUpdate(BaseModel):
    name: Optional[str] = None
    variant_id: Optional[str] = None
    conditions: Optional[list[RuleCondition]] = None
    logic: Optional[str] = None
    priority: Optional[int] = None
    active: Optional[bool] = None


# Assets
class AssetUpload(BaseModel):
    campaign_id: str
    name: str
    type: str  # image, video


# Ad serving
class AdRequest(BaseModel):
    campaign_id: str
    format: str = "html"  # html, json
    width: Optional[int] = None
    height: Optional[int] = None
