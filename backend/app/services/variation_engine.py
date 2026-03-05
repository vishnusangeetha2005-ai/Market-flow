"""
Banner Variation Engine
-----------------------
Provides two things:

1. Monthly color palettes — every 30-day cycle the whole platform
   switches to a new color theme (blue → purple → orange ...).

2. Per-client variation — even when 30 clients use the same template
   on the same day, each one gets a visually unique rendered banner.
   The variation is deterministic (seeded by client_id + date) so the
   same client always gets the same banner if re-rendered on the same day.
"""

import random
import colorsys
import datetime
from typing import Optional


# ── Monthly palettes (12 months × 12 themes, cycling) ────────────────────────

MONTHLY_PALETTES = [
    {"name": "Blue",    "bg": "#0a1628", "accent": "#1e90ff", "gradient": "#0047ab", "button": "#1565c0"},
    {"name": "Purple",  "bg": "#1a0a2e", "accent": "#9b59b6", "gradient": "#6c3483", "button": "#7d3c98"},
    {"name": "Orange",  "bg": "#1c0f00", "accent": "#e67e22", "gradient": "#a04000", "button": "#d35400"},
    {"name": "Green",   "bg": "#0a1f0a", "accent": "#27ae60", "gradient": "#1e8449", "button": "#196f3d"},
    {"name": "Red",     "bg": "#1f0a0a", "accent": "#e74c3c", "gradient": "#922b21", "button": "#c0392b"},
    {"name": "Teal",    "bg": "#0a1f1f", "accent": "#1abc9c", "gradient": "#148f77", "button": "#0e6655"},
    {"name": "Gold",    "bg": "#1f1800", "accent": "#f1c40f", "gradient": "#b7950b", "button": "#9a7d0a"},
    {"name": "Pink",    "bg": "#1f0a1a", "accent": "#e91e63", "gradient": "#880e4f", "button": "#c2185b"},
    {"name": "Indigo",  "bg": "#0a0a1f", "accent": "#3f51b5", "gradient": "#1a237e", "button": "#283593"},
    {"name": "Cyan",    "bg": "#001f2a", "accent": "#00bcd4", "gradient": "#00838f", "button": "#00695c"},
    {"name": "Amber",   "bg": "#1f1000", "accent": "#ff8f00", "gradient": "#e65100", "button": "#bf360c"},
    {"name": "Lime",    "bg": "#0f1f00", "accent": "#8bc34a", "gradient": "#33691e", "button": "#558b2f"},
]

# Fixed epoch for palette cycling (month 0 = Jan 2025 → Blue)
_PALETTE_EPOCH = datetime.date(2025, 1, 1)


def get_monthly_palette(ref_date: Optional[datetime.date] = None) -> dict:
    """Return the active monthly color palette for a given date."""
    if ref_date is None:
        ref_date = datetime.date.today()
    months_elapsed = (
        (ref_date.year - _PALETTE_EPOCH.year) * 12
        + (ref_date.month - _PALETTE_EPOCH.month)
    )
    return MONTHLY_PALETTES[months_elapsed % len(MONTHLY_PALETTES)]


# ── Per-client variation ──────────────────────────────────────────────────────

_GRADIENT_DIRECTIONS = [
    "to bottom",
    "to right",
    "to bottom right",
    "to top right",
    "135deg",
    "45deg",
    "to bottom left",
    "to top left",
]

_TEXT_ALIGNS = ["left", "center", "right"]
_FONT_WEIGHTS = ["normal", "bold"]


def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    try:
        h = hex_color.lstrip("#")
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    except Exception:
        return 128, 128, 128


def _rgb_to_hex(r: int, g: int, b: int) -> str:
    return f"#{r:02x}{g:02x}{b:02x}"


def _shade_color(hex_color: str, factor: float) -> str:
    """Lighten or darken a hex color by multiplying HSV value by factor."""
    r, g, b = _hex_to_rgb(hex_color)
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    v = max(0.05, min(0.95, v * factor))
    nr, ng, nb = colorsys.hsv_to_rgb(h, s, v)
    return _rgb_to_hex(int(nr * 255), int(ng * 255), int(nb * 255))


def generate_client_variation(
    client_id: int,
    ref_date: Optional[datetime.date] = None,
    base_palette: Optional[dict] = None,
) -> dict:
    """
    Generate a deterministic visual variation for a specific client on a
    specific date. Seeded by client_id + date so it's unique per client
    but reproducible (same client same day → same variation).

    Returns a dict consumed by image_service.generate_banner().
    """
    if ref_date is None:
        ref_date = datetime.date.today()

    # Deterministic seed: unique per (client, day)
    seed = int(f"{client_id}{ref_date.strftime('%Y%m%d')}")
    rng = random.Random(seed)

    # Background shade: ±25% brightness variation
    shade_factor = rng.uniform(0.75, 1.25)

    # Slightly shift the accent hue (−20 to +20 degrees on the color wheel)
    hue_shift = rng.uniform(-20, 20) / 360.0

    # Spacing: shift all text fields up or down by −15..+15 px
    spacing_offset = rng.randint(-15, 15)

    # Pick random text alignment override (None = keep template default)
    text_align_override = rng.choice(_TEXT_ALIGNS + [None, None])  # 50% chance keep default

    # Font weight override
    font_weight = rng.choice(_FONT_WEIGHTS + ["normal", "normal"])  # bias toward normal

    # Gradient direction for CSS preview (used by frontend)
    gradient_direction = rng.choice(_GRADIENT_DIRECTIONS)

    # Override background with shaded palette color
    bg_base = base_palette["bg"] if base_palette else "#1a1a2e"
    accent_base = base_palette["accent"] if base_palette else "#e67e22"
    button_base = base_palette["button"] if base_palette else "#d35400"

    bg_varied = _shade_color(bg_base, shade_factor)

    # Shift accent hue
    ar, ag, ab = _hex_to_rgb(accent_base)
    ah, as_, av = colorsys.rgb_to_hsv(ar / 255, ag / 255, ab / 255)
    ah = (ah + hue_shift) % 1.0
    nar, nag, nab = colorsys.hsv_to_rgb(ah, as_, av)
    accent_varied = _rgb_to_hex(int(nar * 255), int(nag * 255), int(nab * 255))

    # CTA button color variation
    button_varied = _shade_color(button_base, rng.uniform(0.8, 1.2))

    return {
        "bg_color": bg_varied,
        "accent_color": accent_varied,
        "button_color": button_varied,
        "gradient_direction": gradient_direction,
        "spacing_offset": spacing_offset,
        "text_align_override": text_align_override,
        "font_weight": font_weight,
        "shade_factor": shade_factor,
    }
