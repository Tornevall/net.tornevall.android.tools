from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

base = Path(__file__).resolve().parent
sizes = [16, 32, 48, 128]

for size in sizes:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    pad = max(1, size // 16)
    radius = max(3, size // 5)
    bg = (15, 23, 42, 255)
    bg2 = (30, 41, 59, 255)
    accent = (249, 115, 22, 255)
    blue = (56, 189, 248, 255)

    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=bg)
    draw.rounded_rectangle((pad, pad, size - 1 - pad, size - 1 - pad), radius=max(2, radius - pad), outline=bg2, width=max(1, size // 32))

    draw.line((int(size * 0.16), int(size * 0.68), int(size * 0.72), int(size * 0.34)), fill=blue, width=max(1, size // 12))
    r = max(2, size // 7)
    cx, cy = int(size * 0.78), int(size * 0.38)
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=accent)

    font_size = max(7, int(size * 0.34))
    try:
        font = ImageFont.truetype("DejaVuSans-Bold.ttf", font_size)
    except Exception:
        font = ImageFont.load_default()

    text = "TN"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    tx = int(size * 0.18)
    if tx + tw > size - r * 2:
        tx = max(1, size - r * 2 - tw)
    draw.text((tx, int(size * 0.18)), text, font=font, fill=(255, 255, 255, 255))

    if size >= 96:
        try:
            label_font = ImageFont.truetype("DejaVuSans.ttf", int(size * 0.11))
        except Exception:
            label_font = ImageFont.load_default()
        label = "Social Media Tools"
        lb = draw.textbbox((0, 0), label, font=label_font)
        lw = lb[2] - lb[0]
        draw.text(((size - lw) / 2, size * 0.76), label, font=label_font, fill=(203, 213, 225, 255))

    out_path = base / f"icon{size}.png"
    img.save(out_path)
    print(out_path)

