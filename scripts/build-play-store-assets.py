"""Genera los assets graficos requeridos por Google Play Console."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
OUT = ASSETS / "play-store"
OUT.mkdir(exist_ok=True)

BG = (10, 10, 10)
LIME = (182, 255, 60)
WHITE = (250, 250, 250)
MUTED = (115, 115, 115)


def make_icon_512():
    src = Image.open(ASSETS / "icon.png").convert("RGBA")
    src.resize((512, 512), Image.LANCZOS).save(OUT / "icon-512.png", "PNG")
    print("OK icon-512.png  (512x512)")


def find_font(size: int) -> ImageFont.FreeTypeFont:
    candidates = [
        r"C:\Windows\Fonts\segoeuib.ttf",
        r"C:\Windows\Fonts\arialbd.ttf",
        r"C:\Windows\Fonts\seguibl.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def make_feature_graphic():
    W, H = 1024, 500
    img = Image.new("RGB", (W, H), BG)

    # Soft radial glow centered behind icon (left side)
    glow_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_layer)
    cx, cy = 230, H // 2
    for r in range(360, 0, -8):
        a = int(40 * (1 - r / 360) ** 2)
        glow_draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(182, 255, 60, a))
    img = Image.alpha_composite(img.convert("RGBA"), glow_layer).convert("RGB")

    # Icon on the left (Q logo) on top of glow
    icon = Image.open(ASSETS / "icon.png").convert("RGBA")
    icon_size = 360
    icon = icon.resize((icon_size, icon_size), Image.LANCZOS)
    img_rgba = img.convert("RGBA")
    img_rgba.paste(icon, (60, (H - icon_size) // 2), icon)
    img = img_rgba.convert("RGB")
    draw = ImageDraw.Draw(img)

    title_font = find_font(78)
    sub_font = find_font(42)
    tag_font = find_font(24)

    title_x = 470
    draw.text((title_x, 110), "PRIVADA  ·  ENTRE SOCIOS", fill=LIME, font=tag_font)
    draw.text((title_x, 150), "QUINIELA", fill=WHITE, font=title_font)
    draw.text((title_x, 230), "PADELBOX", fill=LIME, font=title_font)
    draw.text((title_x, 330), "Mundial 2026", fill=(200, 200, 200), font=sub_font)

    img.save(OUT / "feature-graphic.png", "PNG", optimize=True)
    print("OK feature-graphic.png  (1024x500)")


def copy_screenshots():
    src_dir = ROOT.parent / "Captures APP"
    names = ["Capt 1 v2.PNG", "Capt 2 v2.PNG", "Capt 3 v2.PNG", "Capt 4 v2.PNG"]
    for i, n in enumerate(names, 1):
        src = src_dir / n
        if not src.exists():
            print(f"!! falta {src}")
            continue
        dst = OUT / f"screenshot-{i}.png"
        Image.open(src).save(dst, "PNG", optimize=True)
        print(f"OK {dst.name}")


if __name__ == "__main__":
    make_icon_512()
    make_feature_graphic()
    copy_screenshots()
    print(f"\nAssets en: {OUT}")
