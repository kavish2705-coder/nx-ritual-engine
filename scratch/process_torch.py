import os
from PIL import Image

def process_image():
    # Paths
    artifact_dir = r"C:\Users\kavis\.gemini\antigravity-ide\brain\61473d0f-977d-420f-b961-b6de4b823a75"
    input_path = os.path.join(artifact_dir, "media__1781553005928.png")
    output_dir = r"c:\Users\kavis\Antigravity\nx\public"
    
    output_full_path = os.path.join(output_dir, "silver-blue-torch.png")
    output_base_path = os.path.join(output_dir, "silver-torch-base.png")

    if not os.path.exists(input_path):
        print(f"Error: Input file not found at {input_path}")
        return

    # Load image
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size
    print(f"Loaded image size: {width}x{height}")

    # 1. First, create the full silver-blue image
    img_full = img.copy()
    pixels_full = img_full.load()
    
    # We find the boundary between flame and base by analyzing vertical opacity and color
    # The cup lip is around y = height * 0.28
    flame_boundary = int(height * 0.28)

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels_full[x, y]
            if a == 0:
                continue

            # Flame Part (Top)
            if y < flame_boundary:
                # Turn warm flame (orange/yellow/red) to bright blue/cyan
                # Swap red and blue channels, keeping green
                new_r = int(b * 0.3)
                new_g = g
                new_b = r
                
                # Boost brightness of the flame a bit
                new_g = min(255, int(new_g * 1.1))
                new_b = min(255, int(new_b * 1.1))
                
                pixels_full[x, y] = (new_r, new_g, new_b, a)
            
            # Torch Base Part (Bottom)
            else:
                # Convert bronze/brown metal to bright silver steel
                gray = int(0.299 * r + 0.587 * g + 0.114 * b)
                
                # Brighten for metallic silver look
                silver = int(gray * 1.25)
                silver = min(255, max(0, silver))
                
                # Add a tiny hint of blue tint to the silver metal
                silver_r = min(255, int(silver * 0.95))
                silver_g = min(255, int(silver * 0.98))
                silver_b = silver
                
                pixels_full[x, y] = (silver_r, silver_g, silver_b, a)

    os.makedirs(output_dir, exist_ok=True)
    img_full.save(output_full_path, "PNG")
    print(f"Saved full silver-blue torch to {output_full_path}")

    # 2. Second, create the base-only image (transparent flame region)
    img_base = img.copy()
    pixels_base = img_base.load()

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels_base[x, y]
            if a == 0:
                continue

            # Flame Part (Top) -> Set to fully transparent
            if y < flame_boundary:
                pixels_base[x, y] = (0, 0, 0, 0)
            
            # Torch Base Part (Bottom) -> Silver metal
            else:
                gray = int(0.299 * r + 0.587 * g + 0.114 * b)
                silver = int(gray * 1.25)
                silver = min(255, max(0, silver))
                silver_r = min(255, int(silver * 0.95))
                silver_g = min(255, int(silver * 0.98))
                silver_b = silver
                pixels_base[x, y] = (silver_r, silver_g, silver_b, a)

    img_base.save(output_base_path, "PNG")
    print(f"Saved silver torch base (transparent flame) to {output_base_path}")

if __name__ == "__main__":
    process_image()
