from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.jwt import get_current_owner
from app.models.plan import Plan
from app.schemas.plan import PlanResponse

router = APIRouter(prefix="/plans", tags=["plans"])


@router.get("", response_model=list[PlanResponse])
async def list_plans(
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_owner),
):
    return db.query(Plan).all()
