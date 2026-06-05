/**
 * Watermark removal using sharp (fast Node.js image processor).
 * Covers the Zillow/Trulia 4-pointed sparkle ✦ in the bottom-right corner
 * by sampling a patch of pixels from just above/left of the watermark area
 * and compositing it over the mark.
 */

let sharp;
try { sharp = require('sharp'); } catch (_) { sharp = null; }

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Remove the bottom-right sparkle watermark from an image file (in-place).
 * Uses sharp if available, otherwise falls back to Python/Pillow.
 */
async function removeWatermark(filepath) {
  if (sharp) {
    return removeWithSharp(filepath);
  }
  return removeWithPython(filepath);
}

async function removeWithSharp(filepath) {
  const image = sharp(filepath);
  const meta = await image.metadata();
  const { width, height } = meta;

  // Watermark region: bottom-right corner, roughly 54x54px
  const WM = 54;
  const left = width - WM;
  const top  = height - WM;

  // Extract a patch from just above the watermark (same width, same height)
  const patch = await sharp(filepath)
    .extract({ left, top: top - WM, width: WM, height: WM })
    .toBuffer();

  // Composite the patch over the watermark region
  await sharp(filepath)
    .composite([{ input: patch, left, top }])
    .toFile(filepath + '.tmp');

  fs.renameSync(filepath + '.tmp', filepath);
  return { ok: true, method: 'sharp' };
}

function removeWithPython(filepath) {
  const script = `
import sys
from PIL import Image
import numpy as np

path = sys.argv[1]
img = Image.open(path).convert('RGBA')
arr = np.array(img, dtype=np.float32)
h, w = arr.shape[:2]

WM = 60  # watermark region size in px

# Sample a reference patch from just above the watermark
ref = arr[h - WM*2 : h - WM, w - WM : w].copy()

# Detect the sparkle: white pixels (R,G,B all > 200) in the corner
corner = arr[h - WM : h, w - WM : w]
mask = (corner[:,:,0] > 180) & (corner[:,:,1] > 180) & (corner[:,:,2] > 180) & (corner[:,:,3] > 100)

# Replace masked pixels with the reference patch pixels
for c in range(4):
    corner[:,:,c][mask] = ref[:,:,c][mask]

arr[h - WM : h, w - WM : w] = corner

result = Image.fromarray(arr.astype(np.uint8), 'RGBA').convert('RGB')
result.save(path, quality=95)
print('ok')
`.trim();

  const scriptPath = filepath + '.wm.py';
  fs.writeFileSync(scriptPath, script);
  try {
    execSync(`python3 "${scriptPath}" "${filepath}"`, { timeout: 30000 });
    return { ok: true, method: 'python' };
  } finally {
    try { fs.unlinkSync(scriptPath); } catch (_) {}
  }
}

module.exports = { removeWatermark };
