import os
import uuid
import logging
from PIL import Image, ImageDraw, ImageFont

logger = logging.getLogger(__name__)

# Paths relative to the backend/ root (where uvicorn runs)
_BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ASSETS_DIR = os.path.join(_BASE, "assets")
FONTS_DIR = os.path.join(ASSETS_DIR, "fonts")
BANNERS_DIR = os.path.join(_BASE, "generated", "banners")


def _load_font(font_name: str, font_size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    """Load a TTF font from assets/fonts/ or fall back to PIL default."""
    if font_name:
        font_path = os.path.join(FONTS_DIR, font_name)
        if os.path.exists(font_path):
            try:
                return ImageFont.truetype(font_path, font_size)
            except Exception as exc:
                logger.warning("Could not load font %s: %s", font_name, exc)
    # Try system DejaVu (available on most Linux containers)
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


def generate_banner(
    width: int,
    height: int,
    background_color: str,
    fields: list[dict],
    field_values: dict[str, str],
    background_image_path: str | None = None,
) -> str:
    """
    Render a banner PNG using Pillow.

    Args:
        width: Canvas width in pixels.
        height: Canvas height in pixels.
        background_color: Hex background colour (#RRGGBB).
        fields: List of field definition dicts from the BannerTemplate.
        field_values: Mapping of field name → text the client entered.
        background_image_path: Optional filesystem path to a background image.

    Returns:
        Filename (not full path) of the saved PNG, e.g. "abc123.png".
    """
    os.makedirs(BANNERS_DIR, exist_ok=True)

    bg_rgb = _hex_to_rgb(background_color)
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
        name: str = field.get("name", "")
        text: str = str(field_values.get(name, "")).strip()
        if not text:
            continue

        x: int = int(field.get("x", 50))
        y: int = int(field.get("y", 50))
        font_name: str = field.get("font", "")
        font_size: int = int(field.get("font_size", 48))
        color: str = field.get("color", "#FFFFFF")
        align: str = field.get("align", "left")
        max_chars: int = int(field.get("max_chars", 100))

        # Enforce character limit
        if len(text) > max_chars:
            text = text[: max_chars - 3] + "..."

        font = _load_font(font_name, font_size)

        # Pillow anchor mapping
        anchor_map = {"left": "la", "center": "ma", "right": "ra"}
        anchor = anchor_map.get(align, "la")

        draw.text((x, y), text, fill=_hex_to_rgb(color), font=font, anchor=anchor)

    filename = f"{uuid.uuid4().hex}.png"
    out_path = os.path.join(BANNERS_DIR, filename)
    img.save(out_path, "PNG", optimize=True)
    logger.info("Banner saved: %s", out_path)
    return filename
