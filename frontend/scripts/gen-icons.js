/*
 * Generates every platform icon asset from assets/custom-app-icon.png.
 *
 *   npm run gen:icons
 *
 * Outputs, all written into assets/:
 *   icon.png                      iOS app icon (1024x1024, no alpha channel)
 *   adaptive-icon.png             Android adaptive foreground layer
 *   adaptive-icon-monochrome.png  Android 13+ themed icon layer
 *   splash-icon.png               launch screen artwork
 *   favicon.png                   web favicon
 *
 * After running this, regenerate the native projects so the asset catalogues
 * pick the new files up:  npm run build:ios
 *
 * Depends on jimp-compact, which is present as a transitive dependency of the
 * Expo CLI tooling rather than a direct one — if a future dependency bump drops
 * it, add it to devDependencies.
 */
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const Jimp = require('jimp-compact');

const ASSETS = path.resolve(__dirname, '..', 'assets');
const SOURCE = path.join(ASSETS, 'custom-app-icon.png');

const CANVAS = 1024;
const BLACK = 0x000000ff;
const TRANSPARENT = 0x00000000;

/* Pixels this bright count as artwork rather than background. */
const ARTWORK_LUMINANCE = 60;
/* Connected blobs smaller than this are stray specks in the grunge texture. */
const MIN_BLOB_PIXELS = 200;

/* Android adaptive icons: the layer is 108dp, but only the centre 66dp is
 * guaranteed visible under every mask shape (circle, squircle, rounded square),
 * so keep all artwork inside a circle of that radius. */
const ANDROID_SAFE_RADIUS = (66 / 108 / 2) * CANVAS;

/* Splash artwork width, in source pixels, before it is centred on the canvas. */
const SPLASH_ARTWORK_WIDTH = 560;
/* Breathing room around the artwork in the favicon crop. */
const FAVICON_MARGIN = 1.18;
const FAVICON_SIZE = 256;

function luminance(data, idx) {
  return 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
}

/**
 * Locates the artwork within the source: its bounding box and the largest
 * distance from that box's centre to any artwork pixel. Isolated specks are
 * discarded so a stray fleck cannot inflate the bounds.
 */
function measureArtwork(image) {
  const { width, height, data } = image.bitmap;
  const bright = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    if (luminance(data, i * 4) > ARTWORK_LUMINANCE) {
      bright[i] = 1;
    }
  }

  /* Flood-fill each blob, keeping only those big enough to be real artwork. */
  const blob = new Int32Array(width * height).fill(-1);
  const kept = [];
  const stack = [];
  for (let seed = 0; seed < width * height; seed++) {
    if (bright[seed] === 0 || blob[seed] >= 0) {
      continue;
    }
    const id = kept.length;
    const members = [];
    blob[seed] = id;
    stack.push(seed);
    while (stack.length > 0) {
      const p = stack.pop();
      members.push(p);
      const px = p % width;
      const py = (p - px) / width;
      const neighbours = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dx, dy] of neighbours) {
        const nx = px + dx;
        const ny = py + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
          continue;
        }
        const q = ny * width + nx;
        if (bright[q] === 1 && blob[q] < 0) {
          blob[q] = id;
          stack.push(q);
        }
      }
    }
    kept.push(members.length >= MIN_BLOB_PIXELS ? members : []);
  }

  const pixels = kept.flat();
  if (pixels.length === 0) {
    throw new Error('no artwork found in source image');
  }

  let x0 = width;
  let x1 = -1;
  let y0 = height;
  let y1 = -1;
  for (const p of pixels) {
    const px = p % width;
    const py = (p - px) / width;
    x0 = Math.min(x0, px);
    x1 = Math.max(x1, px);
    y0 = Math.min(y0, py);
    y1 = Math.max(y1, py);
  }

  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  let radius = 0;
  for (const p of pixels) {
    const px = p % width;
    const py = (p - px) / width;
    radius = Math.max(radius, Math.hypot(px - cx, py - cy));
  }

  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, cx, cy, radius };
}

/** Writes a Jimp image as a PNG with no alpha channel (colour type 2, truecolour). */
function writeOpaquePng(image, file) {
  const { width, height, data } = image.bitmap;
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 3);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      const dst = rowStart + 1 + x * 3;
      raw[dst] = data[src];
      raw[dst + 1] = data[src + 1];
      raw[dst + 2] = data[src + 2];
    }
  }

  const chunk = (type, payload) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(payload.length, 0);
    head.write(type, 4, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(Buffer.concat([head.subarray(4), payload])) >>> 0, 0);
    return Buffer.concat([head, payload, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour, no alpha
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]));
}

/** The artwork alone, scaled by `scale` and centred on an opaque black square. */
function centredOnBlack(source, art, scale) {
  const w = Math.round(art.w * scale);
  const h = Math.round(art.h * scale);
  const cropped = source.clone().crop(art.x, art.y, art.w, art.h).resize(w, h, Jimp.RESIZE_BICUBIC);
  const out = new Jimp(CANVAS, CANVAS, BLACK);
  out.composite(cropped, Math.round((CANVAS - w) / 2), Math.round((CANVAS - h) / 2));
  return out;
}

async function main() {
  const source = await Jimp.read(SOURCE);
  const { width, height } = source.bitmap;
  if (width !== CANVAS || height !== CANVAS) {
    throw new Error(`expected a ${CANVAS}x${CANVAS} source, got ${width}x${height}`);
  }

  const art = measureArtwork(source);
  console.log(`artwork ${art.w}x${art.h} at (${art.x}, ${art.y}), radius ${art.radius.toFixed(1)}`);

  /* iOS app icon — the source exactly as authored, flattened onto black so that
   * no alpha channel survives; App Store validation rejects icons that have one. */
  const ios = new Jimp(CANVAS, CANVAS, BLACK);
  ios.composite(source, 0, 0);
  writeOpaquePng(ios, path.join(ASSETS, 'icon.png'));

  /* Android adaptive foreground — shrunk until no artwork pixel can leave the
   * safe circle, and recentred, since the mask makes an off-centre mark obvious. */
  const androidScale = Math.min(1, ANDROID_SAFE_RADIUS / art.radius);
  const android = centredOnBlack(source, art, androidScale);
  await android.writeAsync(path.join(ASSETS, 'adaptive-icon.png'));
  console.log(`adaptive-icon scale ${androidScale.toFixed(3)}`);

  /* Android 13+ themed icon — same geometry, but the glyph becomes an alpha mask
   * on transparent so the system can tint it to the user's wallpaper palette. */
  const monoArt = android.clone();
  monoArt.scan(0, 0, CANVAS, CANVAS, function toAlphaMask(x, y, idx) {
    const alpha = Math.round(luminance(this.bitmap.data, idx));
    this.bitmap.data[idx] = 255;
    this.bitmap.data[idx + 1] = 255;
    this.bitmap.data[idx + 2] = 255;
    this.bitmap.data[idx + 3] = alpha;
  });
  const mono = new Jimp(CANVAS, CANVAS, TRANSPARENT);
  mono.composite(monoArt, 0, 0);
  await mono.writeAsync(path.join(ASSETS, 'adaptive-icon-monochrome.png'));

  /* Splash — same centring, a little larger; sits on the black splash background. */
  const splash = centredOnBlack(source, art, SPLASH_ARTWORK_WIDTH / art.w);
  await splash.writeAsync(path.join(ASSETS, 'splash-icon.png'));

  /* Web favicon — cropped tight around the artwork so the mark stays legible
   * once the browser has scaled it down to 16px. */
  const side = Math.round(Math.max(art.w, art.h) * FAVICON_MARGIN);
  const favicon = source
    .clone()
    .crop(Math.round(art.cx - side / 2), Math.round(art.cy - side / 2), side, side)
    .resize(FAVICON_SIZE, FAVICON_SIZE, Jimp.RESIZE_BICUBIC);
  await favicon.writeAsync(path.join(ASSETS, 'favicon.png'));

  console.log('wrote icon, adaptive-icon, adaptive-icon-monochrome, splash-icon, favicon');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
