"""
Ad template renderer with multiple layout options.
Supports responsive and fixed-size templates.
"""
from typing import Optional

# Template definitions
TEMPLATES = {
    "default": {
        "name": "Default",
        "description": "Versatile template with image, headline, body, and CTA",
    },
    "minimal": {
        "name": "Minimal",
        "description": "Clean design with just headline and CTA",
    },
    "hero": {
        "name": "Hero Image",
        "description": "Large image with overlay text",
    },
    "split": {
        "name": "Split",
        "description": "Image on one side, text on the other",
    },
    "banner": {
        "name": "Banner",
        "description": "Horizontal layout optimized for leaderboard sizes",
    },
}


def get_template_css(width: Optional[int] = None, height: Optional[int] = None) -> str:
    """Base CSS for all templates."""
    return """
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        overflow: hidden;
    }
    .ad-container {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 16px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
    }
    .ad-image { 
        max-width: 100%; 
        max-height: 40%;
        object-fit: contain;
        margin-bottom: 12px; 
        border-radius: 8px; 
    }
    .ad-headline { 
        font-size: clamp(16px, 5vw, 28px); 
        font-weight: bold; 
        margin-bottom: 8px;
        line-height: 1.2;
    }
    .ad-body { 
        font-size: clamp(12px, 3vw, 16px); 
        margin-bottom: 12px; 
        opacity: 0.9;
        line-height: 1.4;
    }
    .ad-cta {
        display: inline-block;
        padding: 10px 24px;
        background: white;
        color: #667eea;
        text-decoration: none;
        border-radius: 25px;
        font-weight: bold;
        font-size: clamp(12px, 3vw, 14px);
        transition: transform 0.2s, box-shadow 0.2s;
    }
    .ad-cta:hover { 
        transform: scale(1.05); 
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    """


def render_default(variant: dict, campaign: dict, width: Optional[int], height: Optional[int]) -> str:
    """Default template - versatile layout."""
    image_html = f'<img class="ad-image" src="{variant.get("image_url")}" alt="" loading="lazy">' if variant.get("image_url") else ''
    body_html = f'<p class="ad-body">{variant.get("body_text")}</p>' if variant.get("body_text") else ''
    
    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>{get_template_css(width, height)}</style>
</head>
<body>
    <div class="ad-container">
        {image_html}
        <h1 class="ad-headline">{variant.get("headline", "")}</h1>
        {body_html}
        <a class="ad-cta" href="{variant.get("cta_url", "#")}" target="_blank">{variant.get("cta_text", "Learn More")}</a>
    </div>
</body>
</html>"""


def render_minimal(variant: dict, campaign: dict, width: Optional[int], height: Optional[int]) -> str:
    """Minimal template - headline and CTA only."""
    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        {get_template_css(width, height)}
        .ad-container {{
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        }}
        .ad-headline {{
            font-size: clamp(20px, 6vw, 36px);
            margin-bottom: 16px;
        }}
        .ad-cta {{
            background: #e94560;
            color: white;
        }}
    </style>
</head>
<body>
    <div class="ad-container">
        <h1 class="ad-headline">{variant.get("headline", "")}</h1>
        <a class="ad-cta" href="{variant.get("cta_url", "#")}" target="_blank">{variant.get("cta_text", "Learn More")}</a>
    </div>
</body>
</html>"""


def render_hero(variant: dict, campaign: dict, width: Optional[int], height: Optional[int]) -> str:
    """Hero template - large background image with overlay."""
    bg_style = f'background-image: url({variant.get("image_url")});' if variant.get("image_url") else ''
    
    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        {get_template_css(width, height)}
        .ad-container {{
            background: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), 
                        url('{variant.get("image_url", "")}');
            background-size: cover;
            background-position: center;
        }}
        .ad-headline {{
            font-size: clamp(24px, 7vw, 42px);
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        }}
        .ad-body {{
            text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        }}
    </style>
</head>
<body>
    <div class="ad-container">
        <h1 class="ad-headline">{variant.get("headline", "")}</h1>
        <p class="ad-body">{variant.get("body_text", "")}</p>
        <a class="ad-cta" href="{variant.get("cta_url", "#")}" target="_blank">{variant.get("cta_text", "Learn More")}</a>
    </div>
</body>
</html>"""


def render_split(variant: dict, campaign: dict, width: Optional[int], height: Optional[int]) -> str:
    """Split template - image left, text right."""
    image_html = f'<img src="{variant.get("image_url")}" alt="" style="width:100%;height:100%;object-fit:cover;">' if variant.get("image_url") else '<div style="background:#667eea;width:100%;height:100%;"></div>'
    
    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            overflow: hidden;
        }}
        .ad-container {{
            display: flex;
            width: 100%;
            height: 100vh;
        }}
        .ad-image-side {{
            flex: 1;
            overflow: hidden;
        }}
        .ad-content-side {{
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }}
        .ad-headline {{
            font-size: clamp(16px, 4vw, 24px);
            font-weight: bold;
            margin-bottom: 8px;
        }}
        .ad-body {{
            font-size: clamp(12px, 2.5vw, 14px);
            margin-bottom: 12px;
            opacity: 0.9;
        }}
        .ad-cta {{
            display: inline-block;
            padding: 8px 20px;
            background: white;
            color: #667eea;
            text-decoration: none;
            border-radius: 20px;
            font-weight: bold;
            font-size: clamp(11px, 2.5vw, 13px);
        }}
    </style>
</head>
<body>
    <div class="ad-container">
        <div class="ad-image-side">
            {image_html}
        </div>
        <div class="ad-content-side">
            <h1 class="ad-headline">{variant.get("headline", "")}</h1>
            <p class="ad-body">{variant.get("body_text", "")}</p>
            <a class="ad-cta" href="{variant.get("cta_url", "#")}" target="_blank">{variant.get("cta_text", "Learn More")}</a>
        </div>
    </div>
</body>
</html>"""


def render_banner(variant: dict, campaign: dict, width: Optional[int], height: Optional[int]) -> str:
    """Banner template - horizontal layout for leaderboard/banner sizes."""
    image_html = f'<img src="{variant.get("image_url")}" alt="" style="height:100%;width:auto;max-width:120px;object-fit:contain;margin-right:16px;">' if variant.get("image_url") else ''
    
    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            overflow: hidden;
        }}
        .ad-container {{
            display: flex;
            align-items: center;
            width: 100%;
            height: 100vh;
            padding: 8px 16px;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            color: white;
        }}
        .ad-content {{
            flex: 1;
            display: flex;
            align-items: center;
        }}
        .ad-text {{
            flex: 1;
        }}
        .ad-headline {{
            font-size: clamp(14px, 3vw, 20px);
            font-weight: bold;
            margin-bottom: 4px;
        }}
        .ad-body {{
            font-size: clamp(11px, 2vw, 13px);
            opacity: 0.9;
        }}
        .ad-cta {{
            padding: 8px 20px;
            background: white;
            color: #667eea;
            text-decoration: none;
            border-radius: 20px;
            font-weight: bold;
            font-size: clamp(11px, 2vw, 13px);
            white-space: nowrap;
        }}
    </style>
</head>
<body>
    <div class="ad-container">
        <div class="ad-content">
            {image_html}
            <div class="ad-text">
                <h1 class="ad-headline">{variant.get("headline", "")}</h1>
                <p class="ad-body">{variant.get("body_text", "")}</p>
            </div>
        </div>
        <a class="ad-cta" href="{variant.get("cta_url", "#")}" target="_blank">{variant.get("cta_text", "Learn More")}</a>
    </div>
</body>
</html>"""


# Template renderer mapping
RENDERERS = {
    "default": render_default,
    "minimal": render_minimal,
    "hero": render_hero,
    "split": render_split,
    "banner": render_banner,
}


def render_ad(
    variant: dict, 
    campaign: dict, 
    template: str = "default",
    width: Optional[int] = None,
    height: Optional[int] = None
) -> str:
    """Render an ad creative using the specified template."""
    renderer = RENDERERS.get(template, render_default)
    return renderer(variant, campaign, width, height)


def list_templates() -> list:
    """List all available templates."""
    return [
        {"id": tid, **tdata}
        for tid, tdata in TEMPLATES.items()
    ]
