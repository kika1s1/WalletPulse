#!/usr/bin/env python3
"""Generate a high-resolution WalletPulse logo banner for README."""

from PIL import Image, ImageDraw, ImageFont
import math
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets')
os.makedirs(OUT_DIR, exist_ok=True)

PRIMARY = (108, 92, 231)
PRIMARY_DARK = (80, 65, 190)
PRIMARY_DEEPER = (65, 50, 170)
ACCENT = (162, 155, 254)
WHITE = (255, 255, 255)


def draw_rounded_rect(draw, xy, radius, fill):
    x0, y0, x1, y1 = xy
    r = min(radius, (x1 - x0) // 2, (y1 - y0) // 2)
    draw.rectangle([x0 + r, y0, x1 - r, y1], fill=fill)
    draw.rectangle([x0, y0 + r, x1, y1 - r], fill=fill)
    draw.pieslice([x0, y0, x0 + 2*r, y0 + 2*r], 180, 270, fill=fill)
    draw.pieslice([x1 - 2*r, y0, x1, y0 + 2*r], 270, 360, fill=fill)
    draw.pieslice([x0, y1 - 2*r, x0 + 2*r, y1], 90, 180, fill=fill)
    draw.pieslice([x1 - 2*r, y1 - 2*r, x1, y1], 0, 90, fill=fill)


def gradient_fill(img, x0, y0, x1, y1, top_color, bottom_color, mask=None):
    for y in range(y0, y1):
        ratio = (y - y0) / max(1, (y1 - y0 - 1))
        r = int(top_color[0] * (1 - ratio) + bottom_color[0] * ratio)
        g = int(top_color[1] * (1 - ratio) + bottom_color[1] * ratio)
        b = int(top_color[2] * (1 - ratio) + bottom_color[2] * ratio)
        for x in range(x0, x1):
            if mask is None or mask.getpixel((x, y)) > 0:
                img.putpixel((x, y), (r, g, b, 255))


def draw_bold_w(draw, cx, cy, size, color, thickness):
    w = int(size * 0.5)
    h = int(size * 0.36)
    t = max(2, int(thickness))
    top_y = cy - h // 2
    bot_y = cy + h // 2
    left = cx - w // 2
    right = cx + w // 2
    mid_bot = cy + int(h * 0.1)
    points_w = [
        (left, top_y),
        (left + int(w * 0.18), bot_y),
        (cx, mid_bot),
        (right - int(w * 0.18), bot_y),
        (right, top_y),
    ]
    for i in range(len(points_w) - 1):
        draw.line([points_w[i], points_w[i + 1]], fill=color, width=t)
        for offset in range(-t // 2, t // 2 + 1):
            p0 = (points_w[i][0] + offset, points_w[i][1])
            p1 = (points_w[i + 1][0] + offset, points_w[i + 1][1])
            draw.line([p0, p1], fill=color, width=1)


def draw_pulse_line(draw, cx, cy, size, color, width):
    w = int(size * 0.65)
    h = int(size * 0.16)
    lw = max(2, int(width))
    left_x = cx - w // 2
    right_x = cx + w // 2
    seg = w / 10.0
    points = [
        (left_x, cy),
        (left_x + seg * 2.5, cy),
        (left_x + seg * 3.2, cy + int(h * 0.5)),
        (left_x + seg * 4.0, cy - int(h * 1.1)),
        (left_x + seg * 4.8, cy + int(h * 0.8)),
        (left_x + seg * 5.5, cy - int(h * 0.45)),
        (left_x + seg * 6.2, cy + int(h * 0.2)),
        (left_x + seg * 7.5, cy),
        (right_x, cy),
    ]
    for i in range(len(points) - 1):
        draw.line([points[i], points[i + 1]], fill=color, width=lw)


def create_logo_icon(size):
    s = size
    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    corner_r = int(s * 0.22)
    mask = Image.new('L', (s, s), 0)
    mask_draw = ImageDraw.Draw(mask)
    draw_rounded_rect(mask_draw, (0, 0, s - 1, s - 1), corner_r, 255)
    gradient_fill(img, 0, 0, s, s, PRIMARY, PRIMARY_DEEPER, mask)

    for y in range(s // 2):
        alpha = int(25 * (1 - y / (s // 2)))
        for x in range(s):
            if mask.getpixel((x, y)) > 0:
                px = img.getpixel((x, y))
                nr = min(255, px[0] + alpha)
                ng = min(255, px[1] + alpha)
                nb = min(255, px[2] + alpha)
                img.putpixel((x, y), (nr, ng, nb, px[3]))

    cx, cy = s // 2, s // 2
    draw = ImageDraw.Draw(img)
    t = max(3, int(s * 0.055))
    draw_bold_w(draw, cx, cy - int(s * 0.02), s, WHITE, t)
    pulse_lw = max(2, int(s * 0.028))
    draw_pulse_line(draw, cx, cy + int(s * 0.05), s, ACCENT, pulse_lw)

    return img


def main():
    print("Generating README logo assets...")

    icon_size = 512
    icon = create_logo_icon(icon_size)
    icon.save(os.path.join(OUT_DIR, 'logo.png'), 'PNG', optimize=True)
    print(f"  assets/logo.png ({icon_size}x{icon_size})")

    banner_w, banner_h = 800, 200
    banner = Image.new('RGBA', (banner_w, banner_h), (0, 0, 0, 0))

    icon_h = 160
    small_icon = icon.resize((icon_h, icon_h), Image.LANCZOS)
    icon_x = (banner_w - icon_h) // 2
    icon_y = (banner_h - icon_h) // 2 - 10
    banner.paste(small_icon, (icon_x, icon_y), small_icon)

    banner.save(os.path.join(OUT_DIR, 'banner.png'), 'PNG', optimize=True)
    print(f"  assets/banner.png ({banner_w}x{banner_h})")

    print("Done!")


if __name__ == '__main__':
    main()
