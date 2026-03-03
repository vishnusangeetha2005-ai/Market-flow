import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.jwt import get_current_client
from app.models.client import Client
from app.models.generated_content import GeneratedContent
from app.schemas.generate import GenerateRequest, GenerateResponse, ContentHistoryResponse
from app.services.openai_service import generate_hook, generate_caption

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/generate", tags=["generate"])


def _build_footer(client: Client) -> str:
    """Build company info footer to append to generated content."""
    parts = []
    if client.company_name:
        parts.append(client.company_name)
    if client.phone:
        parts.append(f"📞 {client.phone}")
    if client.address:
        parts.append(f"📍 {client.address}")
    return " | ".join(parts) if parts else ""


def get_tokens_used_this_month(client: Client, db: Session) -> int:
    import datetime
    now = datetime.datetime.utcnow()
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    used = (
        db.query(GeneratedContent)
        .filter(
            GeneratedContent.client_id == client.id,
            GeneratedContent.created_at >= start,
        )
        .all()
    )
    return sum(g.tokens_used for g in used)


def get_token_limit(client: Client) -> int:
    if client.subscription and client.subscription.plan:
        return client.subscription.plan.ai_token_limit
    return 0


@router.post("/hook", response_model=GenerateResponse)
async def generate_hook_endpoint(
    body: GenerateRequest,
    db: Session = Depends(get_db),
    client: Client = Depends(get_current_client),
):
    limit = get_token_limit(client)
    used = get_tokens_used_this_month(client, db)
    if limit > 0 and used >= limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Token limit reached ({limit} tokens/month). Upgrade your plan.",
        )

    result_text, tokens_used = await generate_hook(body.topic, body.platform, body.tone)

    # Append company details if client has saved them
    company_footer = _build_footer(client)
    if company_footer:
        result_text = f"{result_text}\n\n{company_footer}"

    content = GeneratedContent(
        client_id=client.id,
        type="hook",
        prompt=body.topic,
        result_text=result_text,
        tokens_used=tokens_used,
        platform=body.platform,
    )
    db.add(content)
    db.commit()
    db.refresh(content)

    return GenerateResponse(
        id=content.id,
        type=content.type,
        result_text=content.result_text,
        tokens_used=content.tokens_used,
        tokens_remaining=max(0, limit - used - tokens_used),
        created_at=content.created_at,
    )


@router.post("/caption", response_model=GenerateResponse)
async def generate_caption_endpoint(
    body: GenerateRequest,
    db: Session = Depends(get_db),
    client: Client = Depends(get_current_client),
):
    limit = get_token_limit(client)
    used = get_tokens_used_this_month(client, db)
    if limit > 0 and used >= limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Token limit reached ({limit} tokens/month). Upgrade your plan.",
        )

    result_text, tokens_used = await generate_caption(
        body.topic, body.platform, body.tone, body.include_cta
    )

    # Append company details if client has saved them
    company_footer = _build_footer(client)
    if company_footer:
        result_text = f"{result_text}\n\n{company_footer}"

    content = GeneratedContent(
        client_id=client.id,
        type="caption",
        prompt=body.topic,
        result_text=result_text,
        tokens_used=tokens_used,
        platform=body.platform,
    )
    db.add(content)
    db.commit()
    db.refresh(content)

    return GenerateResponse(
        id=content.id,
        type=content.type,
        result_text=content.result_text,
        tokens_used=content.tokens_used,
        tokens_remaining=max(0, limit - used - tokens_used),
        created_at=content.created_at,
    )


@router.get("/history", response_model=list[ContentHistoryResponse])
async def get_history(
    db: Session = Depends(get_db),
    client: Client = Depends(get_current_client),
):
    items = (
        db.query(GeneratedContent)
        .filter(GeneratedContent.client_id == client.id)
        .order_by(GeneratedContent.created_at.desc())
        .limit(100)
        .all()
    )
    return items


@router.delete("/{content_id}", status_code=204)
async def delete_content(
    content_id: int,
    db: Session = Depends(get_db),
    client: Client = Depends(get_current_client),
):
    content = db.query(GeneratedContent).filter(
        GeneratedContent.id == content_id, GeneratedContent.client_id == client.id
    ).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    db.delete(content)
    db.commit()
