import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.jwt import get_current_owner
from app.models.subscription import Subscription
from app.models.client import Client
from app.models.plan import Plan
from app.schemas.subscription import SubscriptionCreate, SubscriptionUpdate, SubscriptionResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


@router.get("", response_model=list[SubscriptionResponse])
async def list_subscriptions(
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_owner),
):
    subs = db.query(Subscription).all()
    result = []
    for s in subs:
        r = SubscriptionResponse(
            id=s.id,
            client_id=s.client_id,
            plan_id=s.plan_id,
            status=s.status,
            payment_status=s.payment_status,
            start_date=s.start_date,
            end_date=s.end_date,
            created_at=s.created_at,
            client_name=s.client.name if s.client else None,
            plan_name=s.plan.name if s.plan else None,
        )
        result.append(r)
    return result


@router.post("", response_model=SubscriptionResponse, status_code=201)
async def create_subscription(
    body: SubscriptionCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_owner),
):
    client = db.query(Client).filter(Client.id == body.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    plan = db.query(Plan).filter(Plan.id == body.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    existing = db.query(Subscription).filter(Subscription.client_id == body.client_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Client already has a subscription")

    sub = Subscription(
        client_id=body.client_id,
        plan_id=body.plan_id,
        payment_status=body.payment_status,
        start_date=body.start_date,
        end_date=body.end_date,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return SubscriptionResponse(
        id=sub.id,
        client_id=sub.client_id,
        plan_id=sub.plan_id,
        status=sub.status,
        payment_status=sub.payment_status,
        start_date=sub.start_date,
        end_date=sub.end_date,
        created_at=sub.created_at,
        client_name=client.name,
        plan_name=plan.name,
    )


@router.put("/{sub_id}", response_model=SubscriptionResponse)
async def update_subscription(
    sub_id: int,
    body: SubscriptionUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_owner),
):
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    if body.plan_id:
        sub.plan_id = body.plan_id
    if body.status:
        sub.status = body.status
    if body.payment_status:
        sub.payment_status = body.payment_status
    if body.end_date:
        sub.end_date = body.end_date
    db.commit()
    db.refresh(sub)
    return SubscriptionResponse(
        id=sub.id,
        client_id=sub.client_id,
        plan_id=sub.plan_id,
        status=sub.status,
        payment_status=sub.payment_status,
        start_date=sub.start_date,
        end_date=sub.end_date,
        created_at=sub.created_at,
        client_name=sub.client.name if sub.client else None,
        plan_name=sub.plan.name if sub.plan else None,
    )


@router.get("/{sub_id}", response_model=SubscriptionResponse)
async def get_subscription(
    sub_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_owner),
):
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return SubscriptionResponse(
        id=sub.id,
        client_id=sub.client_id,
        plan_id=sub.plan_id,
        status=sub.status,
        payment_status=sub.payment_status,
        start_date=sub.start_date,
        end_date=sub.end_date,
        created_at=sub.created_at,
        client_name=sub.client.name if sub.client else None,
        plan_name=sub.plan.name if sub.plan else None,
    )
