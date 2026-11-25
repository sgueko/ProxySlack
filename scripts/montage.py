#!/usr/bin/env python3
"""Compose the presentation image only from real Chromium screenshots."""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1] / 'screenshots'
names = ['01-popup.png', '03-create-profile.png', '05-active-profile.png', '07-settings.png', '09-light-theme.png']
images = []
for name in names:
    image = Image.open(root / name).convert('RGB')
    image.thumbnail((420, 760))
    images.append(image)
canvas = Image.new('RGB', (2220, 830), '#eaf2f4')
draw = ImageDraw.Draw(canvas)
for i, (name, image) in enumerate(zip(names, images)):
    x = 20 + i * 440
    canvas.paste(image, (x, 40))
    draw.text((x, 12), name.removesuffix('.png').replace('-', ' ').title(), fill='#19343c')
canvas.save(root / 'overview.png', optimize=True)
