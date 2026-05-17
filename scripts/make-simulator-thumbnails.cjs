const fs = require("fs/promises");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(process.cwd(), "public", "simulator");
const MAX_SIZE = 480;
const QUALITY = 76;

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function checkerboardSvg(width, height, size = 24) {
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="checker" width="${size * 2}" height="${size * 2}" patternUnits="userSpaceOnUse">
          <rect width="${size * 2}" height="${size * 2}" fill="#f7f7f7"/>
          <rect x="0" y="0" width="${size}" height="${size}" fill="#d7d7d7"/>
          <rect x="${size}" y="${size}" width="${size}" height="${size}" fill="#d7d7d7"/>
        </pattern>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#checker)"/>
    </svg>
  `;
}

async function main() {
  const files = await walk(ROOT);
  const overlayFiles = files.filter((file) => file.endsWith("-overlay.png"));

  console.log(`오버레이 이미지 ${overlayFiles.length}개 발견`);

  for (const overlayPath of overlayFiles) {
    const folderPath = path.dirname(overlayPath);
    const folderName = path.basename(folderPath);
    const outputPath = path.join(folderPath, `${folderName}-thumbnail.webp`);

    const meta = await sharp(overlayPath).metadata();

    if (!meta.width || !meta.height) {
      console.warn(`건너뜀: ${overlayPath}`);
      continue;
    }

    const resizeOption =
      meta.width >= meta.height
        ? { width: MAX_SIZE, withoutEnlargement: true }
        : { height: MAX_SIZE, withoutEnlargement: true };

    const resizedOverlay = await sharp(overlayPath)
      .resize(resizeOption)
      .png()
      .toBuffer({ resolveWithObject: true });

    const width = resizedOverlay.info.width;
    const height = resizedOverlay.info.height;

    const checker = Buffer.from(checkerboardSvg(width, height));

    await sharp(checker)
      .composite([
        {
          input: resizedOverlay.data,
          left: 0,
          top: 0,
        },
      ])
      .webp({ quality: QUALITY, effort: 6 })
      .toFile(outputPath);

    console.log(`생성 완료: ${path.relative(process.cwd(), outputPath)}`);
  }

  console.log("썸네일 생성 완료!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});