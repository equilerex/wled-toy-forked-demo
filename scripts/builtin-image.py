"""Draws public/assets/image.jpg, the built-in image texture: a smooth hue sweep with a few bright shapes.

The hue runs along x so a strip sampling one row gets the whole rainbow, and the shapes are large enough to
survive a 16x16 matrix. Needs numpy and Pillow: python3 scripts/builtin-image.py
"""
import colorsys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

W, H = 1024, 640
x, y = np.meshgrid(np.linspace(0, 1, W), np.linspace(0, 1, H))

hue = (x + 0.12 * np.sin(y * np.pi * 2)) % 1
value = 0.55 + 0.45 * np.cos((y - 0.5) * np.pi)
hsv_to_rgb = np.vectorize(colorsys.hsv_to_rgb)
base = np.stack(hsv_to_rgb(hue, 0.9, value), axis=-1)
image = Image.fromarray((base * 255).astype(np.uint8))

shapes = Image.new('RGB', (W, H))
draw = ImageDraw.Draw(shapes)
draw.ellipse((120, 110, 360, 350), fill=(255, 244, 214))
draw.polygon([(512, 90), (650, 330), (374, 330)], fill=(255, 255, 255))
draw.rectangle((700, 150, 900, 350), fill=(120, 255, 240))
for i in range(8):
    draw.ellipse((90 + i * 115, 470, 150 + i * 115, 530), fill=(255, 255, 255))
glow = shapes.filter(ImageFilter.GaussianBlur(18))
image = Image.fromarray(np.clip(np.asarray(image, dtype=np.int32) + np.asarray(glow, dtype=np.int32) // 2 + np.asarray(shapes, dtype=np.int32), 0, 255).astype(np.uint8))

image.save(Path(__file__).parent.parent / 'public/assets/image.jpg', quality=88)
