#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const outDir = path.join(__dirname, '..', 'assets', 'images');

function makeCrcTable() {
  const table = [];

  for (let n = 0; n < 256; n += 1) {
    let c = n;

    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }

    table[n] = c >>> 0;
  }

  return table;
}

const crcTable = makeCrcTable();

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);

  length.writeUInt32BE(data.length, 0);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([length, typeBuffer, data, crc]);
}

function writePng(filename, width, height, draw) {
  const pixels = Buffer.alloc(width * height * 4);
  const image = { width, height, pixels };

  draw(image);

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);

  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);

  fs.writeFileSync(path.join(outDir, filename), png);
}

function hexToRgba(hex, alpha = 255) {
  const value = hex.replace('#', '');

  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
    alpha,
  ];
}

function blendPixel(image, x, y, color, coverage = 1) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height || coverage <= 0) {
    return;
  }

  const index = (y * image.width + x) * 4;
  const sourceAlpha = (color[3] / 255) * Math.min(1, coverage);
  const targetAlpha = image.pixels[index + 3] / 255;
  const outAlpha = sourceAlpha + targetAlpha * (1 - sourceAlpha);

  if (outAlpha === 0) {
    return;
  }

  for (let channel = 0; channel < 3; channel += 1) {
    const source = color[channel] / 255;
    const target = image.pixels[index + channel] / 255;
    image.pixels[index + channel] = Math.round(
      ((source * sourceAlpha + target * targetAlpha * (1 - sourceAlpha)) / outAlpha) * 255,
    );
  }

  image.pixels[index + 3] = Math.round(outAlpha * 255);
}

function clear(image, color) {
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const index = (y * image.width + x) * 4;
      image.pixels[index] = color[0];
      image.pixels[index + 1] = color[1];
      image.pixels[index + 2] = color[2];
      image.pixels[index + 3] = color[3];
    }
  }
}

function fillCircle(image, cx, cy, radius, color) {
  const minX = Math.floor(cx - radius - 1);
  const maxX = Math.ceil(cx + radius + 1);
  const minY = Math.floor(cy - radius - 1);
  const maxY = Math.ceil(cy + radius + 1);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const distance = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const coverage = Math.max(0, Math.min(1, radius + 0.5 - distance));
      blendPixel(image, x, y, color, coverage);
    }
  }
}

function fillRoundRect(image, x, y, width, height, radius, color) {
  const minX = Math.floor(x);
  const maxX = Math.ceil(x + width);
  const minY = Math.floor(y);
  const maxY = Math.ceil(y + height);

  for (let py = minY; py <= maxY; py += 1) {
    for (let px = minX; px <= maxX; px += 1) {
      const nx = Math.max(x + radius, Math.min(px + 0.5, x + width - radius));
      const ny = Math.max(y + radius, Math.min(py + 0.5, y + height - radius));
      const distance = Math.hypot(px + 0.5 - nx, py + 0.5 - ny);
      const coverage = Math.max(0, Math.min(1, radius + 0.5 - distance));
      blendPixel(image, px, py, color, coverage);
    }
  }
}

function fillDrop(image, cx, top, size, color) {
  const radius = size * 0.28;
  const bottom = top + size;

  fillCircle(image, cx, top + size * 0.58, radius, color);

  for (let y = Math.floor(top); y <= bottom; y += 1) {
    const t = (y - top) / size;
    const halfWidth = Math.sin(t * Math.PI) * radius * 0.9;

    for (let x = Math.floor(cx - halfWidth); x <= Math.ceil(cx + halfWidth); x += 1) {
      const edge = Math.abs(x + 0.5 - cx);
      const coverage = Math.max(0, Math.min(1, halfWidth + 0.5 - edge));
      blendPixel(image, x, y, color, coverage);
    }
  }
}

function fillPolygon(image, points, color) {
  const minY = Math.floor(Math.min(...points.map((point) => point[1])));
  const maxY = Math.ceil(Math.max(...points.map((point) => point[1])));

  for (let y = minY; y <= maxY; y += 1) {
    const intersections = [];

    for (let i = 0; i < points.length; i += 1) {
      const a = points[i];
      const b = points[(i + 1) % points.length];

      if ((a[1] <= y + 0.5 && b[1] > y + 0.5) || (b[1] <= y + 0.5 && a[1] > y + 0.5)) {
        const t = (y + 0.5 - a[1]) / (b[1] - a[1]);
        intersections.push(a[0] + t * (b[0] - a[0]));
      }
    }

    intersections.sort((a, b) => a - b);

    for (let i = 0; i < intersections.length; i += 2) {
      const start = Math.floor(intersections[i]);
      const end = Math.ceil(intersections[i + 1]);

      for (let x = start; x <= end; x += 1) {
        blendPixel(image, x, y, color);
      }
    }
  }
}

function drawMark(image, options = {}) {
  const size = Math.min(image.width, image.height);
  const scale = size / 1024;
  const center = image.width / 2;
  const top = image.height / 2 - 310 * scale;
  const tubeWidth = 260 * scale;
  const tubeHeight = 560 * scale;
  const tubeX = center - tubeWidth / 2;
  const tubeY = top + 120 * scale;
  const dark = hexToRgba(options.monochrome ? '#111827' : '#0f766e');
  const teal = hexToRgba(options.monochrome ? '#111827' : '#14b8a6');
  const water = hexToRgba(options.monochrome ? '#111827' : '#67e8f9');
  const white = hexToRgba('#ffffff');

  fillCircle(image, center, image.height / 2, 372 * scale, teal);
  fillCircle(image, center, image.height / 2, 312 * scale, white);
  fillDrop(image, center, image.height / 2 - 260 * scale, 360 * scale, water);
  fillRoundRect(image, tubeX, tubeY, tubeWidth, tubeHeight, 72 * scale, dark);
  fillRoundRect(
    image,
    tubeX + 42 * scale,
    tubeY + 90 * scale,
    tubeWidth - 84 * scale,
    tubeHeight - 132 * scale,
    46 * scale,
    white,
  );
  fillRoundRect(
    image,
    tubeX + 62 * scale,
    tubeY + 265 * scale,
    tubeWidth - 124 * scale,
    190 * scale,
    36 * scale,
    water,
  );
  fillRoundRect(image, tubeX - 28 * scale, tubeY - 18 * scale, tubeWidth + 56 * scale, 76 * scale, 30 * scale, dark);
  fillCircle(image, center - 58 * scale, tubeY + 358 * scale, 15 * scale, white);
  fillCircle(image, center + 48 * scale, tubeY + 322 * scale, 12 * scale, white);
}

function drawFullIcon(image) {
  clear(image, hexToRgba('#e6f4fe'));
  fillCircle(image, image.width * 0.15, image.height * 0.16, image.width * 0.28, hexToRgba('#ccfbf1', 220));
  fillCircle(image, image.width * 0.87, image.height * 0.86, image.width * 0.32, hexToRgba('#bae6fd', 220));
  drawMark(image);
}

function drawForeground(image) {
  clear(image, [0, 0, 0, 0]);
  drawMark(image);
}

function drawBackground(image) {
  clear(image, hexToRgba('#e6f4fe'));
  fillCircle(image, image.width * 0.16, image.height * 0.18, image.width * 0.32, hexToRgba('#ccfbf1'));
  fillCircle(image, image.width * 0.85, image.height * 0.82, image.width * 0.34, hexToRgba('#bae6fd'));
}

function drawSplash(image) {
  clear(image, hexToRgba('#ffffff'));
  drawMark(image);
}

function drawFavicon(image) {
  clear(image, hexToRgba('#e6f4fe'));
  fillCircle(image, image.width / 2, image.height / 2, image.width * 0.42, hexToRgba('#14b8a6'));
  fillDrop(image, image.width / 2, image.height * 0.2, image.height * 0.48, hexToRgba('#ffffff'));
}

function drawMonochrome(image) {
  clear(image, [0, 0, 0, 0]);
  drawMark(image, { monochrome: true });
}

writePng('icon.png', 1024, 1024, drawFullIcon);
writePng('splash-icon.png', 1024, 1024, drawSplash);
writePng('android-icon-background.png', 512, 512, drawBackground);
writePng('android-icon-foreground.png', 512, 512, drawForeground);
writePng('android-icon-monochrome.png', 432, 432, drawMonochrome);
writePng('favicon.png', 48, 48, drawFavicon);

console.log('Generated Aquarium Water Log brand assets.');
