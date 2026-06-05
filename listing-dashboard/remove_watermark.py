#!/usr/bin/env python3
"""
Remove the bottom-right sparkle watermark (✦) from listing photos.
Usage:
  python3 remove_watermark.py photo.jpg
  python3 remove_watermark.py *.jpg
  python3 remove_watermark.py /path/to/folder/
"""
import sys, os, glob
from PIL import Image
import numpy as np


def remove_watermark(path, wm_size=65):
    """
    Patches the bottom-right corner (wm_size x wm_size px) by replacing
    bright/white sparkle pixels with a sampled patch from just above it.
    Works on any image with a light-colored corner watermark.
    """
    img = Image.open(path).convert('RGBA')
    arr = np.array(img, dtype=np.float32)
    h, w = arr.shape[:2]

    # The patch we'll use as replacement (same size, directly above the watermark)
    ref = arr[h - wm_size*2 : h - wm_size, w - wm_size : w].copy()

    # The watermark corner
    corner = arr[h - wm_size : h, w - wm_size : w].copy()

    # Detect sparkle: bright pixels significantly lighter than surroundings
    # The sparkle is white/near-white against any background
    brightness = corner[:, :, :3].mean(axis=2)
    ref_brightness = ref[:, :, :3].mean(axis=2)
    avg_bg = ref_brightness.mean()

    # Mask: pixels brighter than background by more than 40 and brighter than 180
    mask = (brightness > min(avg_bg + 40, 200)) & (brightness > 170) & (corner[:, :, 3] > 50)

    # Also grab a 10px soft border around the mask for smoother blending
    from PIL import ImageFilter
    mask_img = Image.fromarray((mask * 255).astype(np.uint8))
    soft_mask = np.array(mask_img.filter(ImageFilter.GaussianBlur(radius=3))) / 255.0

    # Blend: replace masked pixels with reference
    for c in range(4):
        corner[:, :, c] = corner[:, :, c] * (1 - soft_mask) + ref[:, :, c] * soft_mask

    arr[h - wm_size : h, w - wm_size : w] = corner

    result = Image.fromarray(arr.astype(np.uint8), 'RGBA').convert('RGB')

    # Save — preserve original format
    ext = os.path.splitext(path)[1].lower()
    save_kwargs = {'quality': 95, 'subsampling': 0} if ext in ('.jpg', '.jpeg') else {}
    result.save(path, **save_kwargs)
    print(f'  ✓  {os.path.basename(path)}')


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    targets = []
    for arg in sys.argv[1:]:
        if os.path.isdir(arg):
            for ext in ('*.jpg', '*.jpeg', '*.png', '*.webp'):
                targets.extend(glob.glob(os.path.join(arg, ext)))
                targets.extend(glob.glob(os.path.join(arg, ext.upper())))
        else:
            targets.extend(glob.glob(arg))

    if not targets:
        print('No image files found.')
        sys.exit(1)

    print(f'Removing watermarks from {len(targets)} photo(s)...')
    for p in sorted(set(targets)):
        try:
            remove_watermark(p)
        except Exception as e:
            print(f'  ✗  {os.path.basename(p)}: {e}')

    print('Done.')


if __name__ == '__main__':
    main()
