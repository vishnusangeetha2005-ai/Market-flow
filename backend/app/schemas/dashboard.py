from pydantic import BaseModel
from typing import List, Optional
from decimal import Decimal


class RevenueDataPoint(BaseModel):
    month: str
    revenue: float


class OwnerStatsResponse(BaseModel):
    total_clients: int
    active_clients: int
    suspended_clients: int
    locked_clients: int
    total_revenue: float
    monthly_revenue: float
    total_ai_tokens_used: int
    scheduled_posts: int
    failed_posts: int
    total_banners: int
    revenue_chart: List[RevenueDataPoint]
    subscription_breakdown: dict


class ClientStatsResponse(BaseModel):
    posts_published: int
    posts_scheduled: int
    posts_failed: int
    banners_generated: int
    tokens_used: int
    tokens_limit: int
    plan_name: str
    subscription_status: str
    subscription_end_date: Optional[str]
