from __future__ import annotations

from typing import Optional

TEMPLATES: dict[str, str] = {}

# --- Default Template ---
TEMPLATES["default"] = """<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:transparent}}
.ad{{width:{width}px;max-width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1)}}
.ad img{{width:100%;height:auto;display:block}}
.ad-content{{padding:20px}}
.ad h2{{font-size:18px;color:#1a1a2e;margin-bottom:8px}}
.ad p{{font-size:14px;color:#555;margin-bottom:16px;line-height:1.5}}
.cta{{display:inline-block;padding:10px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px}}
.cta:hover{{background:#4f46e5}}
</style></head><body>
<div class="ad">
{image_block}
<div class="ad-content">
<h2>{headline}</h2>
<p>{body_text}</p>
<a class="cta" href="{click_url}" target="_blank">{cta_text}</a>
</div></div></body></html>"""

# --- Minimal Template ---
TEMPLATES["minimal"] = """<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:transparent}}
.ad{{width:{width}px;max-width:100%;padding:24px;text-align:center}}
.ad h2{{font-size:20px;color:#111;margin-bottom:12px}}
.ad p{{font-size:14px;color:#666;margin-bottom:16px}}
.cta{{display:inline-block;padding:8px 20px;border:2px solid #111;color:#111;text-decoration:none;border-radius:4px;font-weight:600;font-size:13px}}
.cta:hover{{background:#111;color:#fff}}
</style></head><body>
<div class="ad">
<h2>{headline}</h2>
<p>{body_text}</p>
<a class="cta" href="{click_url}" target="_blank">{cta_text}</a>
</div></body></html>"""

# --- Hero Template ---
TEMPLATES["hero"] = """<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:transparent}}
.ad{{width:{width}px;max-width:100%;height:{height}px;position:relative;border-radius:12px;overflow:hidden;background:#1a1a2e}}
.ad img{{width:100%;height:100%;object-fit:cover;opacity:.6}}
.overlay{{position:absolute;bottom:0;left:0;right:0;padding:32px;background:linear-gradient(transparent,rgba(0,0,0,.8))}}
.overlay h2{{font-size:22px;color:#fff;margin-bottom:8px}}
.overlay p{{font-size:14px;color:rgba(255,255,255,.85);margin-bottom:16px}}
.cta{{display:inline-block;padding:10px 24px;background:#fff;color:#1a1a2e;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px}}
</style></head><body>
<div class="ad">
{image_tag}
<div class="overlay">
<h2>{headline}</h2>
<p>{body_text}</p>
<a class="cta" href="{click_url}" target="_blank">{cta_text}</a>
</div></div></body></html>"""

# --- Split Template ---
TEMPLATES["split"] = """<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:transparent}}
.ad{{width:{width}px;max-width:100%;display:flex;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1);background:#fff}}
.ad-img{{width:45%;min-height:200px;background:#e5e7eb}}
.ad-img img{{width:100%;height:100%;object-fit:cover}}
.ad-content{{flex:1;padding:24px;display:flex;flex-direction:column;justify-content:center}}
.ad h2{{font-size:17px;color:#1a1a2e;margin-bottom:8px}}
.ad p{{font-size:13px;color:#555;margin-bottom:16px;line-height:1.5}}
.cta{{display:inline-block;padding:8px 20px;background:#6366f1;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:13px;align-self:flex-start}}
</style></head><body>
<div class="ad">
<div class="ad-img">{image_tag}</div>
<div class="ad-content">
<h2>{headline}</h2>
<p>{body_text}</p>
<a class="cta" href="{click_url}" target="_blank">{cta_text}</a>
</div></div></body></html>"""

# --- Banner Template ---
TEMPLATES["banner"] = """<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:transparent}}
.ad{{width:{width}px;max-width:100%;height:90px;display:flex;align-items:center;gap:16px;padding:0 20px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:8px;color:#fff}}
.ad h2{{font-size:15px;white-space:nowrap}}
.ad p{{font-size:12px;flex:1;opacity:.9}}
.cta{{display:inline-block;padding:8px 18px;background:#fff;color:#6366f1;text-decoration:none;border-radius:6px;font-weight:700;font-size:12px;white-space:nowrap}}
</style></head><body>
<div class="ad">
<h2>{headline}</h2>
<p>{body_text}</p>
<a class="cta" href="{click_url}" target="_blank">{cta_text}</a>
</div></body></html>"""

TEMPLATE_NAMES = list(TEMPLATES.keys())


def render_ad(
    variant: dict,
    template_name: str = "default",
    width: int = 400,
    height: int = 300,
    click_url: Optional[str] = None,
) -> str:
    """Render an ad variant into HTML using the specified template."""
    tpl = TEMPLATES.get(template_name, TEMPLATES["default"])

    headline = variant.get("headline", "")
    body_text = variant.get("body_text", "")
    image_url = variant.get("image_url", "")
    cta_text = variant.get("cta_text", "Learn More")
    cta_url = click_url or variant.get("cta_url", "#")

    image_tag = f'<img src="{image_url}" alt="">' if image_url else ""
    image_block = f'<img src="{image_url}" alt="">' if image_url else ""

    return tpl.format(
        width=width,
        height=height,
        headline=headline,
        body_text=body_text,
        image_url=image_url,
        image_tag=image_tag,
        image_block=image_block,
        cta_text=cta_text,
        click_url=cta_url,
    )
