from PIL import Image
import os

INPUT = "velvet-vault-split.png"

OUT_NAMES = [
    "arrival.webp",
    "initiation.webp",
    "vip.webp",
    "promotions.webp",
    "wallet.webp",
    "livechat.webp",
]


def main():
    img = Image.open(INPUT).convert("RGB")
    width, height = img.size

    cols = 2
    rows = 3

    cell_w = width // cols
    cell_h = height // rows

    os.makedirs("images/bg", exist_ok=True)

    index = 0
    for r in range(rows):
        for c in range(cols):
            left = c * cell_w
            top = r * cell_h
            right = (c + 1) * cell_w
            bottom = (r + 1) * cell_h

            crop = img.crop((left, top, right, bottom))
            out_path = os.path.join("images/bg", OUT_NAMES[index])
            crop.save(out_path, "WEBP", quality=92, method=6)
            print("Saved:", out_path)
            index += 1

    print("All backgrounds created successfully.")


if __name__ == "__main__":
    main()
