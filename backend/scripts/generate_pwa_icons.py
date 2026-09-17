import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_pwa_icon(size: int, is_maskable: bool = False, is_apple: bool = False) -> Image.Image:
    # High resolution canvas for super-sampling (antialiasing)
    scale = 4
    canvas_size = size * scale
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Padding
    pad = int(canvas_size * (0.18 if is_maskable else 0.08))
    box = [pad, pad, canvas_size - pad, canvas_size - pad]

    # Rounded rectangle radius
    radius = int(canvas_size * (0.24 if not is_maskable else 0.0))

    # Background gradient
    # Top-left indigo (#4f46e5) to bottom-right deep violet (#7c3aed -> #312e81)
    c_top = (79, 70, 229, 255)      # #4f46e5
    c_mid = (124, 58, 237, 255)     # #7c3aed
    c_bot = (30, 27, 75, 255)       # #1e1b4b

    # Draw gradient in the shape
    # Create mask for rounded squircle
    mask = Image.new("L", (canvas_size, canvas_size), 0)
    mask_draw = ImageDraw.Draw(mask)
    if is_maskable:
        mask_draw.rectangle([0, 0, canvas_size, canvas_size], fill=255)
    else:
        mask_draw.rounded_rectangle(box, radius=radius, fill=255)

    # Base gradient image
    gradient = Image.new("RGBA", (canvas_size, canvas_size))
    g_draw = ImageDraw.Draw(gradient)
    for y in range(canvas_size):
        ratio = y / canvas_size
        if ratio < 0.5:
            local_r = ratio * 2
            r = int(c_top[0] * (1 - local_r) + c_mid[0] * local_r)
            g = int(c_top[1] * (1 - local_r) + c_mid[1] * local_r)
            b = int(c_top[2] * (1 - local_r) + c_mid[2] * local_r)
        else:
            local_r = (ratio - 0.5) * 2
            r = int(c_mid[0] * (1 - local_r) + c_bot[0] * local_r)
            g = int(c_mid[1] * (1 - local_r) + c_bot[1] * local_r)
            b = int(c_mid[2] * (1 - local_r) + c_bot[2] * local_r)
        g_draw.line([(0, y), (canvas_size, y)], fill=(r, g, b, 255))

    # Paste gradient using mask
    img.paste(gradient, (0, 0), mask)

    # Draw subtle glossy inner glow / border
    glow_layer = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_layer)
    if not is_maskable:
        glow_draw.rounded_rectangle(box, radius=radius, outline=(255, 255, 255, 60), width=int(4 * scale))
        glow_draw.arc([box[0], box[1], box[2], box[1] + radius * 2], 180, 360, fill=(255, 255, 255, 90), width=int(3 * scale))

    img = Image.alpha_composite(img, glow_layer)

    # Icon Center Graphic: Student Cap + Rupee Symbol or Bold Modern ₹ FinStudent Emblem
    # Let's draw high-precision vector shapes on a separate overlay
    overlay = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    o_draw = ImageDraw.Draw(overlay)

    cx = canvas_size / 2
    cy = canvas_size / 2

    # Draw sleek Rupee (₹) symbol in crisp white with smooth geometric lines
    # Center bounds
    rupee_scale = canvas_size * 0.42
    top_y = cy - rupee_scale * 0.48
    line_w = int(canvas_size * 0.046)

    # Horizontal Bar 1 (Top bar)
    bar1_left = cx - rupee_scale * 0.38
    bar1_right = cx + rupee_scale * 0.38
    o_draw.line([(bar1_left, top_y), (bar1_right, top_y)], fill=(255, 255, 255, 255), width=line_w)

    # Horizontal Bar 2 (Middle bar)
    bar2_y = top_y + rupee_scale * 0.22
    o_draw.line([(bar1_left, bar2_y), (cx + rupee_scale * 0.28, bar2_y)], fill=(255, 255, 255, 255), width=line_w)

    # Upper Semi-Circle / Arc for R loop
    arc_box = [
        cx - rupee_scale * 0.25,
        top_y,
        cx + rupee_scale * 0.36,
        top_y + rupee_scale * 0.50
    ]
    o_draw.arc(arc_box, -90, 90, fill=(255, 255, 255, 255), width=line_w)

    # Vertical Stem connecting bars
    stem_x = cx - rupee_scale * 0.16
    o_draw.line([(stem_x, top_y), (stem_x, top_y + rupee_scale * 0.50)], fill=(255, 255, 255, 255), width=line_w)

    # Diagonal downward leg
    diag_start_x = cx - rupee_scale * 0.05
    diag_start_y = top_y + rupee_scale * 0.50
    diag_end_x = cx + rupee_scale * 0.38
    diag_end_y = top_y + rupee_scale * 0.98
    o_draw.line([(diag_start_x, diag_start_y), (diag_end_x, diag_end_y)], fill=(255, 255, 255, 255), width=line_w)

    # Upward trending financial growth arrow in vibrant emerald green (#10b981 / #34d399)
    # Small circular indicator in top right
    dot_x = cx + rupee_scale * 0.44
    dot_y = top_y - rupee_scale * 0.10
    dot_r = int(canvas_size * 0.038)
    o_draw.ellipse([dot_x - dot_r, dot_y - dot_r, dot_x + dot_r, dot_y + dot_r], fill=(52, 211, 153, 255))

    # Growth spark / arrow
    sparkle_len = int(canvas_size * 0.06)
    o_draw.line([(dot_x - sparkle_len, dot_y), (dot_x + sparkle_len, dot_y)], fill=(52, 211, 153, 200), width=int(2.5 * scale))
    o_draw.line([(dot_x, dot_y - sparkle_len), (dot_x, dot_y + sparkle_len)], fill=(52, 211, 153, 200), width=int(2.5 * scale))

    # Apply overlay
    img = Image.alpha_composite(img, overlay)

    # Downsample with high-quality Lanczos resampling
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

if __name__ == "__main__":
    public_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "public"))
    os.makedirs(public_dir, exist_ok=True)

    # 1. 512x512 PWA Icon
    icon_512 = create_pwa_icon(512, is_maskable=False)
    icon_512.save(os.path.join(public_dir, "pwa-512x512.png"), "PNG")
    print("Saved pwa-512x512.png")

    # 2. 192x192 PWA Icon
    icon_192 = create_pwa_icon(192, is_maskable=False)
    icon_192.save(os.path.join(public_dir, "pwa-192x192.png"), "PNG")
    print("Saved pwa-192x192.png")

    # 3. 512x512 Maskable Icon (safe zone padded for Android adaptive launcher)
    icon_maskable = create_pwa_icon(512, is_maskable=True)
    icon_maskable.save(os.path.join(public_dir, "maskable-icon-512x512.png"), "PNG")
    print("Saved maskable-icon-512x512.png")

    # 4. Apple Touch Icon (180x180)
    icon_apple = create_pwa_icon(180, is_apple=True)
    icon_apple.save(os.path.join(public_dir, "apple-touch-icon.png"), "PNG")
    print("Saved apple-touch-icon.png")

    # 5. Favicon PNG (64x64)
    icon_64 = create_pwa_icon(64)
    icon_64.save(os.path.join(public_dir, "favicon-64.png"), "PNG")
    print("Saved favicon-64.png")
