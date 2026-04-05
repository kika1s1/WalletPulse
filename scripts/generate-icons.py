#!/usr/bin/env python3
"""Generate professional WalletPulse launcher icons for all Android density buckets.

Design: Purple gradient background with a bold white "W" letter and an integrated
pulse/heartbeat line cutting across the center of the icon.
"""

from PIL import Image, ImageDraw, ImageFont
import math
import os

BASE_DIR = os.path.join(os.path.dirname(__file__), '..', 'android', 'app', 'src', 'main', 'res')

DENSITIES = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
}

ADAPTIVE_SIZE = {
    'mipmap-mdpi': 108,
    'mipmap-hdpi': 162,
    'mipmap-xhdpi': 216,
    'mipmap-xxhdpi': 324,
    'mipmap-xxxhdpi': 432,
}

PRIMARY = (108, 92, 231)        # #6C5CE7
PRIMARY_DARK = (80, 65, 190)    # #5041BE
PRIMARY_DEEPER = (65, 50, 170)  # #4132AA
ACCENT = (162, 155, 254)        # #A29BFE
WHITE = (255, 255, 255)
WHITE_SEMI = (255, 255, 255, 200)


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
    """Apply a vertical gradient."""
    for y in range(y0, y1):
        ratio = (y - y0) / max(1, (y1 - y0 - 1))
        r = int(top_color[0] * (1 - ratio) + bottom_color[0] * ratio)
        g = int(top_color[1] * (1 - ratio) + bottom_color[1] * ratio)
        b = int(top_color[2] * (1 - ratio) + bottom_color[2] * ratio)
        for x in range(x0, x1):
            if mask is None or mask.getpixel((x, y)) > 0:
                img.putpixel((x, y), (r, g, b, 255))


def draw_bold_w(draw, cx, cy, size, color, thickness):
    """Draw a bold stylized W using thick lines."""
    w = int(size * 0.5)
    h = int(size * 0.36)
    t = max(2, int(thickness))

    top_y = cy - h // 2
    bot_y = cy + h // 2

    left = cx - w // 2
    right = cx + w // 2
    mid_left = cx - int(w * 0.15)
    mid_right = cx + int(w * 0.15)
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
    """Draw a heartbeat/pulse line across the icon with sharp peaks."""
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


def draw_circle_bg(img, cx, cy, radius, top_color, bot_color):
    """Draw a gradient-filled circle."""
    for y in range(cy - radius, cy + radius + 1):
        for x in range(cx - radius, cx + radius + 1):
            dx = x - cx
            dy = y - cy
            if dx * dx + dy * dy <= radius * radius:
                ratio = (y - (cy - radius)) / max(1, 2 * radius)
                r = int(top_color[0] * (1 - ratio) + bot_color[0] * ratio)
                g = int(top_color[1] * (1 - ratio) + bot_color[1] * ratio)
                b = int(top_color[2] * (1 - ratio) + bot_color[2] * ratio)
                edge_dist = radius - math.sqrt(dx * dx + dy * dy)
                if edge_dist < 1.5:
                    alpha = int(255 * min(1, edge_dist / 1.5))
                else:
                    alpha = 255
                img.putpixel((x, y), (r, g, b, alpha))


def create_icon(size):
    """Create the standard squircle launcher icon."""
    scale = 4
    s = size * scale
    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    corner_r = int(s * 0.22)
    mask = Image.new('L', (s, s), 0)
    mask_draw = ImageDraw.Draw(mask)
    draw_rounded_rect(mask_draw, (0, 0, s - 1, s - 1), corner_r, 255)

    gradient_fill(img, 0, 0, s, s, PRIMARY, PRIMARY_DEEPER, mask)

    shine = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    shine_draw = ImageDraw.Draw(shine)
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

    small_r = int(s * 0.025)
    dot_color = (255, 255, 255, 180)
    draw.ellipse(
        [cx - small_r, cy + int(s * 0.05) - small_r - int(s * 0.16 * 1.1),
         cx + small_r, cy + int(s * 0.05) + small_r - int(s * 0.16 * 1.1)],
        fill=ACCENT
    )

    result = img.resize((size, size), Image.LANCZOS)
    return result


def create_round_icon(size):
    """Create the round launcher icon."""
    scale = 4
    s = size * scale
    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))

    cx, cy = s // 2, s // 2
    radius = s // 2 - 1

    draw_circle_bg(img, cx, cy, radius, PRIMARY, PRIMARY_DEEPER)

    draw = ImageDraw.Draw(img)

    t = max(3, int(s * 0.055))
    draw_bold_w(draw, cx, cy - int(s * 0.02), s, WHITE, t)

    pulse_lw = max(2, int(s * 0.028))
    draw_pulse_line(draw, cx, cy + int(s * 0.05), s, ACCENT, pulse_lw)

    result = img.resize((size, size), Image.LANCZOS)
    return result


def create_adaptive_foreground(size):
    """Create adaptive icon foreground (centered in safe zone)."""
    scale = 4
    s = size * scale
    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    cx, cy = s // 2, s // 2
    icon_s = int(s * 0.55)

    t = max(3, int(icon_s * 0.055))
    draw_bold_w(draw, cx, cy - int(icon_s * 0.02), icon_s, WHITE, t)

    pulse_lw = max(2, int(icon_s * 0.028))
    draw_pulse_line(draw, cx, cy + int(icon_s * 0.05), icon_s, ACCENT, pulse_lw)

    result = img.resize((size, size), Image.LANCZOS)
    return result


def main():
    print("Generating WalletPulse launcher icons...")

    for density, size in DENSITIES.items():
        out_dir = os.path.join(BASE_DIR, density)
        os.makedirs(out_dir, exist_ok=True)

        icon = create_icon(size)
        icon.save(os.path.join(out_dir, 'ic_launcher.png'), 'PNG', optimize=True)
        print(f"  {density}/ic_launcher.png ({size}x{size})")

        round_icon = create_round_icon(size)
        round_icon.save(os.path.join(out_dir, 'ic_launcher_round.png'), 'PNG', optimize=True)
        print(f"  {density}/ic_launcher_round.png ({size}x{size})")

    for density, size in ADAPTIVE_SIZE.items():
        out_dir = os.path.join(BASE_DIR, density)
        os.makedirs(out_dir, exist_ok=True)

        fg = create_adaptive_foreground(size)
        fg.save(os.path.join(out_dir, 'ic_launcher_foreground.png'), 'PNG', optimize=True)
        print(f"  {density}/ic_launcher_foreground.png ({size}x{size})")

    print("\nAll icons generated successfully!")


if __name__ == '__main__':
    main()
