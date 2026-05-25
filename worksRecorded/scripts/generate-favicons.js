const fs = require("fs/promises");
const path = require("path");
const sharp = require("sharp");

const source = "public/favicon/small_logo.png";
const outputDir = "public/favicon";
const sizes = [16, 32, 48, 180, 192, 512];

function nameForSize(size) {
  return size === 180 ? "apple-touch-icon.png" : `favicon-${size}x${size}.png`;
}

function circleBuffer(size) {
  const buffer = Buffer.alloc(size * size * 4);
  const center = size / 2;
  const radius = size / 2 - 0.5;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x + 0.5 - center;
      const dy = y + 0.5 - center;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const edge = radius - distance;
      const alpha = Math.max(0, Math.min(255, Math.round((edge + 0.5) * 255)));
      const offset = (y * size + x) * 4;

      buffer[offset] = 255;
      buffer[offset + 1] = 255;
      buffer[offset + 2] = 255;
      buffer[offset + 3] = alpha;
    }
  }

  return {
    input: buffer,
    raw: {
      width: size,
      height: size,
      channels: 4,
    },
  };
}

async function createCircularIcon(size, name, trimmedLogo) {
  const logo = await sharp(trimmedLogo)
    .resize({
      width: Math.round(size * 0.88),
      height: Math.round(size * 0.88),
      fit: "contain",
      background: "#ffffff",
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();
  const logoMetadata = await sharp(logo).metadata();
  const left = Math.round((size - (logoMetadata.width || size)) / 2);
  const top = Math.round((size - (logoMetadata.height || size)) / 2);

  const { data, info } = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: logo, left, top }])
    .raw()
    .toBuffer({ resolveWithObject: true });

  const circle = circleBuffer(size).input;
  for (let i = 0; i < data.length; i += 4) {
    data[i + 3] = circle[i + 3];
    if (data[i + 3] === 0) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
    }
  }

  await sharp(data, { raw: info })
    .png()
    .toFile(path.join(outputDir, name));
}

function icoDirEntry(buffer, size, offset) {
  const entry = Buffer.alloc(16);
  entry[0] = size >= 256 ? 0 : size;
  entry[1] = size >= 256 ? 0 : size;
  entry[2] = 0;
  entry[3] = 0;
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(buffer.length, 8);
  entry.writeUInt32LE(offset, 12);
  return entry;
}

async function createIco() {
  const icoSizes = [16, 32, 48];
  const buffers = await Promise.all(
    icoSizes.map((size) => sharp(path.join(outputDir, nameForSize(size))).png().toBuffer())
  );

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(buffers.length, 4);

  let offset = 6 + buffers.length * 16;
  const entries = buffers.map((buffer, index) => {
    const entry = icoDirEntry(buffer, icoSizes[index], offset);
    offset += buffer.length;
    return entry;
  });

  await fs.writeFile(path.join(outputDir, "favicon.ico"), Buffer.concat([header, ...entries, ...buffers]));
  await fs.copyFile(path.join(outputDir, "favicon.ico"), "public/favicon.ico");
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });

  const trimmedLogo = await sharp(source)
    .trim({ background: "#ffffff", threshold: 20 })
    .extend({ top: 3, bottom: 3, left: 3, right: 3, background: "#ffffff" })
    .png()
    .toBuffer();

  for (const size of sizes) {
    await createCircularIcon(size, nameForSize(size), trimmedLogo);
  }

  await createIco();
  console.log("Regenerated circular zoomed favicon assets.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
