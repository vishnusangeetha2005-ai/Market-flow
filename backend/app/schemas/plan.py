from decimal import Decimal
from pydantic import BaseModel


class PlanResponse(BaseModel):
    id: int
    name: str
    ai_token_limit: int
    banner_limit: int
    post_limit: int
    price: Decimal
    description: str

    class Config:
        from_attributes = True
