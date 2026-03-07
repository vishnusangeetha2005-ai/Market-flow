import os
import re
import uuid
import logging
import urllib.request
from PIL import Image, ImageDraw, ImageFont
from typing import Optional

logger = logging.getLogger(__name__)

# Paths relative to the backend/ root (where uvicorn runs)
_BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ASSETS_DIR = os.path.join(_BASE, "assets")
FONTS_DIR = os.path.join(ASSETS_DIR, "fonts")
BANNERS_DIR = os.path.join(_BASE, "generated", "banners")
LOGOS_DIR = os.path.join(_BASE, "generated", "logos")

# Supported placeholder keys → maps to client_data dict keys
# Template authors write  {{phone_number}}  {{website}}  {{business_name}}  {{logo}}
_PLACEHOLDER_PATTERN = re.compile(r"\{\{(\w+)\}\}")


# ── Placeholder resolution ─────────────────────────────────────────────────────

def build_client_data(client) -> dict[str, str]:
    """
    Build a placeholder → value mapping from a Client ORM object.

    Supported placeholders:
        {{business_name}}  →  client.company_name
        {{phone_number}}   →  client.phone
        {{website}}        →  client.website
        {{address}}        →  client.address
        {{logo}}           →  client.logo_url  (used for image fields)
    """
    return {
        "business_name": client.company_name or "",
        "phone_number":  client.phone or "",
        "website":       client.website or "",
        "address":       client.address or "",
        "logo":          client.logo_url or "",
    }


def resolve_placeholders(text: str, client_data: dict[str, str]) -> str:
    """
    Replace {{key}} placeholders in a string with client data values.

    Example:
        "Call / WhatsApp: {{phone_number}}"
        → "Call / WhatsApp: +91 9876543210"
    """
    def _replace(match: re.Match) -> str:
        key = match.group(1)
        return client_data.get(key, match.group(0))  # keep original if key unknown

    return _PLACEHOLDER_PATTERN.sub(_replace, text)


# ── Font helpers ───────────────────────────────────────────────────────────────

def _load_font(font_name: str, font_size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    """Load a TTF font from assets/fonts/ or fall back to PIL default."""
    if font_name:
        font_path = os.path.join(FONTS_DIR, font_name)
        if os.path.exists(font_path):
            try:
                return ImageFont.truetype(font_path, font_size)
            except Exception as exc:
                logger.warning("Could not load font %s: %s", font_name, exc)
    for sys_path in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]:
        if os.path.exists(sys_path):
            try:
                return ImageFont.truetype(sys_path, font_size)
            except Exception:
                pass
    try:
        return ImageFont.load_default(size=font_size)
    except TypeError:
        return ImageFont.load_default()


def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    """Convert #RRGGBB or #RGB to (r, g, b). Falls back to white on error."""
    try:
        h = hex_color.lstrip("#")
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    except Exception:
        return 255, 255, 255


# ── Logo loading ───────────────────────────────────────────────────────────────

def _load_logo(logo_url: str, api_base: str = "http://localhost:8000") -> Optional[Image.Image]:
    """
    Load client logo image from:
    - Local filesystem path (if logo_url points to /static/logos/...)
    - Remote URL (http/https)
    Returns PIL Image or None on failure.
    """
    if not logo_url:
        return None
    try:
        if logo_url.startswith("/static/logos/"):
            filename = logo_url.replace("/static/logos/", "")
            local_path = os.path.join(LOGOS_DIR, filename)
            if os.path.exists(local_path):
                return Image.open(local_path).convert("RGBA")
        if logo_url.startswith("/"):
            url = f"{api_base}{logo_url}"
        else:
            url = logo_url
        with urllib.request.urlopen(url, timeout=5) as resp:
            import io
            return Image.open(io.BytesIO(resp.read())).convert("RGBA")
    except Exception as exc:
        logger.warning("Could not load logo from %s: %s", logo_url, exc)
        return None


# ── Banner renderer ────────────────────────────────────────────────────────────

def generate_banner(
    width: int,
    height: int,
    background_color: str,
    fields: list[dict],
    field_values: dict[str, str],
    background_image_path: Optional[str] = None,
    variation: Optional[dict] = None,
    client_data: Optional[dict[str, str]] = None,
) -> str:
    """
    Render a banner PNG using Pillow.

    Args:
        width: Canvas width in pixels.
        height: Canvas height in pixels.
        background_color: Hex background colour (#RRGGBB).
        fields: List of field definition dicts from the BannerTemplate.
                Each field can have:
                  - type: "text" (default) or "image"
                  - default_value: text with {{placeholders}} for auto-fill
                  - name, x, y, font, font_size, color, align, max_chars
                  - For type "image": width, height, source (e.g. "{{logo}}")
        field_values: Explicit overrides mapping field name → text.
                      When empty/missing, default_value is used.
        background_image_path: Optional filesystem path to a background image.
        variation: Optional dict from variation_engine. Overrides bg color,
                   spacing, text alignment.
        client_data: Dict from build_client_data(). Used to resolve
                     {{placeholder}} in default_value and image source.

    Returns:
        Filename (not full path) of the saved PNG, e.g. "abc123.png".
    """
    os.makedirs(BANNERS_DIR, exist_ok=True)

    if client_data is None:
        client_data = {}

    # Apply variation overrides
    effective_bg = background_color
    spacing_offset = 0
    text_align_override = None
    font_weight_override = None

    if variation:
        if variation.get("bg_color"):
            effective_bg = variation["bg_color"]
        spacing_offset = int(variation.get("spacing_offset", 0))
        text_align_override = variation.get("text_align_override")
        font_weight_override = variation.get("font_weight")

    bg_rgb = _hex_to_rgb(effective_bg)
    img = Image.new("RGB", (width, height), color=bg_rgb)

    # Optional background image overlay
    if background_image_path and os.path.exists(background_image_path):
        try:
            bg_img = Image.open(background_image_path).convert("RGB").resize((width, height))
            img.paste(bg_img, (0, 0))
        except Exception as exc:
            logger.warning("Could not load background image %s: %s", background_image_path, exc)

    draw = ImageDraw.Draw(img)

    for field in fields:
        field_type: str = field.get("type", "text")
        name: str = field.get("name", "")
        x: int = int(field.get("x", 50))
        y: int = int(field.get("y", 50))

        # ── Image field (logo) ──
        if field_type == "image":
            source: str = field.get("source", "{{logo}}")
            # Resolve placeholder in source (e.g. "{{logo}}" → actual URL)
            logo_url = resolve_placeholders(source, client_data)
            if not logo_url:
                continue
            logo_img = _load_logo(logo_url)
            if logo_img is None:
                continue
            logo_w = int(field.get("width", 100))
            logo_h = int(field.get("height", 100))
            logo_img = logo_img.resize((logo_w, logo_h), Image.LANCZOS)
            # Paste with alpha mask if RGBA
            if logo_img.mode == "RGBA":
                img.paste(logo_img, (x, y), logo_img)
            else:
                img.paste(logo_img.convert("RGB"), (x, y))
            continue

        # ── Text field ──
        # Determine text: explicit field_values override first, then default_value
        default_value: str = field.get("default_value", "")
        if name and name in field_values and field_values[name]:
            text = str(field_values[name]).strip()
        elif default_value:
            # Resolve {{placeholders}} in default_value
            text = resolve_placeholders(default_value, client_data)
        else:
            continue

        if not text:
            continue

        y = y + spacing_offset  # variation spacing
        font_name: str = field.get("font", "")
        font_size: int = int(field.get("font_size", 48))
        color: str = field.get("color", "#FFFFFF")
        max_chars: int = int(field.get("max_chars", 100))
        align: str = text_align_override or field.get("align", "left")

        # Font weight override
        if font_weight_override == "bold" and font_name and not font_name.lower().endswith("bold.ttf"):
            bold_name = font_name.replace(".ttf", "-Bold.ttf").replace(".TTF", "-Bold.TTF")
            bold_path = os.path.join(FONTS_DIR, bold_name)
            if os.path.exists(bold_path):
                font_name = bold_name

        if len(text) > max_chars:
            text = text[: max_chars - 3] + "..."

        font = _load_font(font_name, font_size)
        anchor_map = {"left": "la", "center": "ma", "right": "ra"}
        anchor = anchor_map.get(align, "la")
        y = max(0, min(height - font_size, y))
        draw.text((x, y), text, fill=_hex_to_rgb(color), font=font, anchor=anchor)

    filename = f"{uuid.uuid4().hex}.png"
    out_path = os.path.join(BANNERS_DIR, filename)
    img.save(out_path, "PNG", optimize=True)
    logger.info("Banner saved: %s", out_path)
    return filename


def generate_banner_bytes(
    width: int,
    height: int,
    background_color: str,
    fields: list[dict],
    field_values: dict[str, str],
    background_image_path: Optional[str] = None,
    variation: Optional[dict] = None,
    client_data: Optional[dict[str, str]] = None,
    logo_bytes: Optional[bytes] = None,
) -> bytes:
    """Same as generate_banner but returns PNG bytes instead of saving to file."""
    import io as _io

    if client_data is None:
        client_data = {}

    effective_bg = background_color
    spacing_offset = 0
    text_align_override = None
    font_weight_override = None

    if variation:
        if variation.get("bg_color"):
            effective_bg = variation["bg_color"]
        spacing_offset = int(variation.get("spacing_offset", 0))
        text_align_override = variation.get("text_align_override")
        font_weight_override = variation.get("font_weight")

    bg_rgb = _hex_to_rgb(effective_bg)
    img = Image.new("RGB", (width, height), color=bg_rgb)

    if background_image_path and os.path.exists(background_image_path):
        try:
            bg_img = Image.open(background_image_path).convert("RGB").resize((width, height))
            img.paste(bg_img, (0, 0))
        except Exception as exc:
            logger.warning("Could not load background image %s: %s", background_image_path, exc)

    draw = ImageDraw.Draw(img)

    for field in fields:
        field_type: str = field.get("type", "text")
        name: str = field.get("name", "")
        x: int = int(field.get("x", 50))
        y: int = int(field.get("y", 50))

        if field_type == "image":
            logo_img = None
            if logo_bytes:
                try:
                    logo_img = Image.open(_io.BytesIO(logo_bytes)).convert("RGBA")
                except Exception:
                    pass
            if logo_img is None:
                source: str = field.get("source", "{{logo}}")
                logo_url = resolve_placeholders(source, client_data)
                logo_img = _load_logo(logo_url) if logo_url else None
            if logo_img is None:
                continue
            logo_w = int(field.get("width", 100))
            logo_h = int(field.get("height", 100))
            logo_img = logo_img.resize((logo_w, logo_h), Image.LANCZOS)
            if logo_img.mode == "RGBA":
                img.paste(logo_img, (x, y), logo_img)
            else:
                img.paste(logo_img.convert("RGB"), (x, y))
            continue

        default_value: str = field.get("default_value", "")
        if name and name in field_values and field_values[name]:
            text = str(field_values[name]).strip()
        elif default_value:
            text = resolve_placeholders(default_value, client_data)
        else:
            continue

        if not text:
            continue

        y = y + spacing_offset
        font_name: str = field.get("font", "")
        font_size: int = int(field.get("font_size", 48))
        color: str = field.get("color", "#FFFFFF")
        max_chars: int = int(field.get("max_chars", 100))
        align: str = text_align_override or field.get("align", "left")

        if font_weight_override == "bold" and font_name and not font_name.lower().endswith("bold.ttf"):
            bold_name = font_name.replace(".ttf", "-Bold.ttf").replace(".TTF", "-Bold.TTF")
            bold_path = os.path.join(FONTS_DIR, bold_name)
            if os.path.exists(bold_path):
                font_name = bold_name

        if len(text) > max_chars:
            text = text[: max_chars - 3] + "..."

        font = _load_font(font_name, font_size)
        anchor_map = {"left": "la", "center": "ma", "right": "ra"}
        anchor = anchor_map.get(align, "la")
        y = max(0, min(height - font_size, y))
        draw.text((x, y), text, fill=_hex_to_rgb(color), font=font, anchor=anchor)

    buf = _io.BytesIO()
    img.save(buf, "PNG", optimize=True)
    return buf.getvalue()
