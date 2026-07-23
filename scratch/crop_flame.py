import os
from PIL import Image

def process_flame():
    input_path = r"C:\Users\kavis\.gemini\antigravity-ide\brain\99129cdb-f37c-4284-9671-7403b7dc25fe\media__1781612240823.png"
    output_dir = r"c:\Users\kavis\Antigravity\nx\public"

    if not os.path.exists(input_path):
        print(f"Error: Input file not found at {input_path}")
        return

    # Load image
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size
    print(f"Original sheet size: {width}x{height}")

    # Crop the top-left flame
    # The top-left flame is in the first row, left column.
    # Let's crop from x=20 to x=320, and y=20 to y=220 (height = 200)
    crop_box = (25, 25, 315, 215)
    flame_cropped = img.crop(crop_box)
    c_w, c_h = flame_cropped.size
    print(f"Cropped flame size: {c_w}x{c_h}")

    # Process pixels for transparent blue flame
    blue_flame = Image.new("RGBA", (c_w, c_h))
    red_flame = Image.new("RGBA", (c_w, c_h))
    
    pixels_in = flame_cropped.load()
    pixels_blue = blue_flame.load()
    pixels_red = red_flame.load()

    for y in range(c_h):
        for x in range(c_w):
            r, g, b, a = pixels_in[x, y]
            
            # Brightness determines alpha
            # Since background is black, max(r,g,b) is a good measure of flame density
            brightness = max(r, g, b)
            
            if brightness < 15:
                # Fully transparent background pixels
                pixels_blue[x, y] = (0, 0, 0, 0)
                pixels_red[x, y] = (0, 0, 0, 0)
                continue

            # Boost alpha curve for nice edge glowing blending
            alpha = int(pow(brightness / 255.0, 0.65) * 255.0)
            alpha = min(255, max(0, alpha))

            # Un-premultiply colors to recover full pixel brightness
            factor = 255.0 / brightness
            r_un = min(255, int(r * factor))
            g_un = min(255, int(g * factor))
            b_un = min(255, int(b * factor))

            # BLUE FLAME: keep original blue/cyan tones
            pixels_blue[x, y] = (r_un, g_un, b_un, alpha)

            # RED FLAME: shift cyan/blue hue to bloody crimson-red/orange
            # Swapping channels:
            # Blue -> Red
            # Green -> low green/orange
            new_r = b_un
            new_g = int(g_un * 0.3)  # Keep some green for orange highlights
            new_b = r_un
            pixels_red[x, y] = (new_r, new_g, new_b, alpha)

    os.makedirs(output_dir, exist_ok=True)
    blue_flame_path = os.path.join(output_dir, "blue-flame.png")
    red_flame_path = os.path.join(output_dir, "red-flame.png")

    blue_flame.save(blue_flame_path, "PNG")
    red_flame.save(red_flame_path, "PNG")
    print(f"Saved transparent blue flame to {blue_flame_path}")
    print(f"Saved transparent red flame to {red_flame_path}")

if __name__ == "__main__":
    process_flame()
