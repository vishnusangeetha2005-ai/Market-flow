import logging
import random
from app.config import settings

logger = logging.getLogger(__name__)


def _is_valid_key() -> bool:
    """Check if the API key looks like a real OpenAI key."""
    key = settings.OPENAI_API_KEY or ""
    return key.startswith("sk-") and len(key) > 30 and "your" not in key.lower()


# ── Realistic mock templates ──────────────────────────────────────────────────

_HOOK_TEMPLATES = [
    "Stop scrolling — {topic} is exactly what you've been waiting for. 🔥",
    "What if I told you {topic} could change everything? Here's why you need it NOW. 👇",
    "Everyone's talking about {topic} — and for good reason. Don't be the last to know. 🚀",
    "This is your sign to check out {topic}. Your {platform} feed will never be the same. ✨",
    "Ready to level up? {topic} is the game-changer you didn't know you needed. 💥",
    "Warning: {topic} is seriously addictive. Don't say we didn't warn you. 😍",
    "The secret's out — {topic} is the best thing to hit {platform} this season. 🌟",
    "You've been looking for this. {topic} — finally here, and it's everything. 🎯",
]

_CAPTION_TEMPLATES_PROFESSIONAL = [
    """{topic}

We're proud to bring you something truly exceptional. Our commitment to quality and excellence shines through every detail.

Whether you're looking for performance, style, or value — this delivers on all fronts. Trusted by thousands, designed for you.

✅ Premium quality
✅ Unmatched value
✅ Customer satisfaction guaranteed

Follow us for more updates and exclusive offers.

#{tag1} #{tag2} #{tag3} #quality #premium #excellence""",

    """{topic}

Innovation meets perfection. We've crafted this with you in mind — every detail carefully considered, every feature purposefully designed.

Our team has worked tirelessly to bring you a product that not only meets but exceeds your expectations.

💼 Professional grade
🌟 Industry leading
🎯 Results driven

Stay tuned for more exciting updates.

#{tag1} #{tag2} #{tag3} #business #professional #innovation""",
]

_CAPTION_TEMPLATES_CASUAL = [
    """{topic} 😍

Okay, we're OBSESSED and you will be too! This is literally everything we've been dreaming of and more.

Swipe to see why everyone is going crazy over this right now 👀

Tag a friend who NEEDS to see this! ⬇️

#{tag1} #{tag2} #{tag3} #viral #trending #musthave""",

    """{topic} 🙌

Not gonna lie — this completely blew our minds! We didn't think it could get any better, but here we are.

Drop a ❤️ if you're as excited as we are!

#{tag1} #{tag2} #{tag3} #love #amazing #everyday""",
]

_CAPTION_TEMPLATES_ENERGETIC = [
    """{topic} 🚀🔥

THE WAIT IS OVER! We've been building up to this moment and it's FINALLY HERE!

This is the one you've been waiting for. Big energy. Bigger results. Zero compromises.

💪 Push your limits
⚡ Feel the difference
🏆 Be the best

Don't wait — grab yours NOW before it's gone!

#{tag1} #{tag2} #{tag3} #motivation #hustle #winning""",
]

_CAPTION_TEMPLATES_HUMOROUS = [
    """{topic} 😂

Plot twist: we made it even better. Your wallet might not forgive us, but your life will.

POV: You discovering this for the first time 👀

Send this to someone who needs an intervention (aka this product in their life) 😅

#{tag1} #{tag2} #{tag3} #funny #relatable #lol""",
]

_CAPTION_TEMPLATES_INSPIRATIONAL = [
    """{topic} ✨

Every great journey begins with a single step. This is yours.

We believe in the power of small changes that lead to extraordinary results. This isn't just a product — it's a statement about who you are and who you're becoming.

🌱 Grow every day
💫 Believe in yourself
🎯 Chase your dreams

Your best chapter starts now.

#{tag1} #{tag2} #{tag3} #inspiration #motivation #mindset""",
]

_TONE_TEMPLATES = {
    "professional": _CAPTION_TEMPLATES_PROFESSIONAL,
    "casual": _CAPTION_TEMPLATES_CASUAL,
    "energetic": _CAPTION_TEMPLATES_ENERGETIC,
    "humorous": _CAPTION_TEMPLATES_HUMOROUS,
    "inspirational": _CAPTION_TEMPLATES_INSPIRATIONAL,
}

_PLATFORM_TAGS = {
    "instagram": ["instagram", "reels", "explore"],
    "facebook": ["facebook", "facebookmarketing", "socialmedia"],
    "linkedin": ["linkedin", "business", "networking"],
    "twitter": ["twitter", "trending", "viral"],
    "general": ["marketing", "digital", "brand"],
}


def _make_tags(topic: str, platform: str) -> dict:
    words = [w.strip().lower().replace(" ", "") for w in topic.split() if len(w) > 3]
    platform_tags = _PLATFORM_TAGS.get(platform, _PLATFORM_TAGS["general"])
    tag1 = words[0] if words else "marketing"
    tag2 = words[1] if len(words) > 1 else platform_tags[0]
    tag3 = platform_tags[1] if len(platform_tags) > 1 else "brand"
    return {"tag1": tag1, "tag2": tag2, "tag3": tag3}


def _mock_hook(topic: str, platform: str, tone: str) -> str:
    template = random.choice(_HOOK_TEMPLATES)
    return template.format(topic=topic, platform=platform, tone=tone)


def _mock_caption(topic: str, platform: str, tone: str, include_cta: bool) -> str:
    templates = _TONE_TEMPLATES.get(tone, _CAPTION_TEMPLATES_PROFESSIONAL)
    template = random.choice(templates)
    tags = _make_tags(topic, platform)
    text = template.format(topic=topic, **tags)
    if include_cta:
        text += "\n\n👉 Click the link in bio to learn more!"
    return text


# ── Public API ────────────────────────────────────────────────────────────────

async def generate_hook(topic: str, platform: str, tone: str) -> tuple[str, int]:
    if _is_valid_key():
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            prompt = (
                f"Write a compelling marketing hook for {platform} about: {topic}. "
                f"Tone: {tone}. Keep it under 2 sentences. Be punchy and attention-grabbing."
            )
            response = await client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=150,
            )
            text = response.choices[0].message.content or ""
            tokens = response.usage.total_tokens if response.usage else 100
            return text, tokens
        except Exception as e:
            logger.warning("OpenAI failed, using mock: %s", e)

    return _mock_hook(topic, platform, tone), 50


async def generate_caption(
    topic: str, platform: str, tone: str, include_cta: bool
) -> tuple[str, int]:
    if _is_valid_key():
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            cta_instruction = "Include a strong call-to-action at the end." if include_cta else "No CTA needed."
            prompt = (
                f"Write a {platform} post caption about: {topic}. "
                f"Tone: {tone}. {cta_instruction} "
                f"Include relevant hashtags. 150-200 words."
            )
            response = await client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=300,
            )
            text = response.choices[0].message.content or ""
            tokens = response.usage.total_tokens if response.usage else 120
            return text, tokens
        except Exception as e:
            logger.warning("OpenAI failed, using mock: %s", e)

    return _mock_caption(topic, platform, tone, include_cta), 80


async def select_banner_for_business(business_type: str, templates: list) -> int:
    """
    AI picks the best banner template index for the given business type.
    Returns the index of the best matching template.
    Fallback: returns 0 (first template).
    """
    if not templates:
        return 0

    template_list = "\n".join(
        f"{i}. {t.name} — {t.description or 'No description'}"
        for i, t in enumerate(templates)
    )

    if _is_valid_key():
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            prompt = (
                f"A business of type '{business_type}' needs to post a marketing banner today.\n"
                f"Available banner templates:\n{template_list}\n\n"
                f"Which template number (0-indexed) is the best fit for this business type? "
                f"Reply with ONLY the number, nothing else."
            )
            response = await client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=5,
            )
            text = (response.choices[0].message.content or "0").strip()
            idx = int(text)
            if 0 <= idx < len(templates):
                return idx
        except Exception as e:
            logger.warning("AI banner select failed, using fallback: %s", e)

    # Fallback: pick based on hash of business_type for consistency
    return hash(business_type or "default") % len(templates)


async def generate_banner_image(prompt: str) -> str:
    if _is_valid_key():
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            response = await client.images.generate(
                model="dall-e-3",
                prompt=f"Professional digital marketing banner: {prompt}. Clean, modern design.",
                size="1792x1024",
                quality="standard",
                n=1,
            )
            return response.data[0].url or ""
        except Exception as e:
            logger.warning("OpenAI image failed, using placeholder: %s", e)

    return "https://placehold.co/1200x630/1a1a2e/white?text=Banner+Preview"
