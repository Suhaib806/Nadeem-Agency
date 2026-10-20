import os
import sys
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
import numpy as np
from rembg import remove, new_session

input_path = r"C:\Users\LAPTOP INSIDE\.gemini\antigravity-ide\brain\243004a6-a286-4c0b-8c29-403d1188b1a1\.user_uploaded\media_1792493228214.jpg"
output_artifacts = r"C:\Users\LAPTOP INSIDE\.gemini\antigravity-ide\brain\243004a6-a286-4c0b-8c29-403d1188b1a1\kikis_pin_pop_jar.jpg"
output_public = r"c:\Users\LAPTOP INSIDE\Downloads\Nadeem-Agency-Order-Automation-main\public\products\kikis-pin-pop-jar.jpg"
output_uploads = r"c:\Users\LAPTOP INSIDE\Downloads\Nadeem-Agency-Order-Automation-main\public\uploads\products\kikis-pin-pop-jar.jpg"

print(f"Loading input: {input_path}")
img = Image.open(input_path).convert("RGB")

# 1. Remove background
print("Removing background with rembg...")
session = new_session("u2net")
nobg = remove(img, session=session)

# 2. Find bounding box of the non-transparent content
bbox = nobg.getbbox()
if bbox:
    nobg_cropped = nobg.crop(bbox)
else:
    nobg_cropped = nobg

# 3. Enhance colors & clarity
rgb_part = nobg_cropped.convert("RGB")
alpha_part = nobg_cropped.split()[3]

# Contrast and brightness
enhancer = ImageEnhance.Contrast(rgb_part)
rgb_part = enhancer.enhance(1.12)
enhancer = ImageEnhance.Color(rgb_part)
rgb_part = enhancer.enhance(1.18)
enhancer = ImageEnhance.Sharpness(rgb_part)
rgb_part = enhancer.enhance(1.25)

nobg_enhanced = Image.merge("RGBA", (*rgb_part.split(), alpha_part))

# 4. Target canvas: 1024 x 1024 square pure white
canvas_size = 1024
final_img = Image.new("RGBA", (canvas_size, canvas_size), (255, 255, 255, 255))

# Scale jar to fit nicely in 1024x1024 (e.g. height around 860px)
target_height = 840
aspect = nobg_enhanced.width / nobg_enhanced.height
target_width = int(target_height * aspect)

jar_resized = nobg_enhanced.resize((target_width, target_height), Image.Resampling.LANCZOS)

# Position jar centered horizontally, placed near the bottom with room for ground shadow
x_pos = (canvas_size - target_width) // 2
y_pos = 920 - target_height # base at y=920

# 5. Create subtle realistic soft studio ground shadow
shadow = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
from PIL import ImageDraw
draw = ImageDraw.Draw(shadow)

# Elliptical ground contact shadow
shadow_w = int(target_width * 0.85)
shadow_h = 36
shadow_x0 = (canvas_size - shadow_w) // 2
shadow_y0 = y_pos + target_height - 18
shadow_x1 = shadow_x0 + shadow_w
shadow_y1 = shadow_y0 + shadow_h

draw.ellipse([shadow_x0, shadow_y0, shadow_x1, shadow_y1], fill=(40, 40, 40, 90))
shadow = shadow.filter(ImageFilter.GaussianBlur(14))

# Broader ambient ground shadow
ambient_shadow = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
draw_ambient = ImageDraw.Draw(ambient_shadow)
amb_w = int(target_width * 0.95)
amb_h = 50
draw_ambient.ellipse(
    [(canvas_size - amb_w) // 2, shadow_y0 - 5, (canvas_size + amb_w) // 2, shadow_y0 + amb_h],
    fill=(60, 60, 60, 45)
)
ambient_shadow = ambient_shadow.filter(ImageFilter.GaussianBlur(26))

# Composite shadow then jar
final_img.paste(ambient_shadow, (0, 0), ambient_shadow)
final_img.paste(shadow, (0, 0), shadow)
final_img.paste(jar_resized, (x_pos, y_pos), jar_resized)

# Save as high-quality JPEG
rgb_final = final_img.convert("RGB")
rgb_final.save(output_artifacts, "JPEG", quality=95)
rgb_final.save(output_public, "JPEG", quality=95)
rgb_final.save(output_uploads, "JPEG", quality=95)

print(f"Saved enhanced packshot to:")
print(f"  {output_artifacts}")
print(f"  {output_public}")
print(f"  {output_uploads}")
