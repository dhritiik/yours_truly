#!/usr/bin/env node
/**
 * One-time migration: converts all .jpg/.jpeg/.png files in `public/` to
 * .webp (keeping transparency for PNGs), then deletes the originals.
 *
 * Skips: favicon.ico, *.svg (already optimal vector format), and anything
 * already .webp.
 *
 * Usage:
 *   node scripts/convert-public-images-to-webp.mjs          # convert + report
 *   node scripts/convert-public-images-to-webp.mjs --dry-run # report only
 */
import { readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const PUBLIC_DIR = path.resolve(import.meta.dirname, "..", "public");
const DRY_RUN = process.argv.includes("--dry-run");
const CONVERTIBLE_EXT = new Set([".jpg", ".jpeg", ".png"]);

async function main() {
  const entries = await readdir(PUBLIC_DIR, { withFileTypes: true });
  const targets = entries
    .filter((e) => e.isFile() && CONVERTIBLE_EXT.has(path.extname(e.name).toLowerCase()))
    .map((e) => e.name);

  if (targets.length === 0) {
    console.log("No .jpg/.jpeg/.png files found in public/.");
    return;
  }

  let totalBefore = 0;
  let totalAfter = 0;
  const renameMap = {}; // old filename -> new filename, for reference updates

  for (const name of targets) {
    const srcPath = path.join(PUBLIC_DIR, name);
    const ext = path.extname(name);
    const base = name.slice(0, -ext.length);
    const destName = `${base}.webp`;
    const destPath = path.join(PUBLIC_DIR, destName);

    const before = (await stat(srcPath)).size;

    if (!DRY_RUN) {
      // quality 82 is a solid default: visually near-lossless for photos,
      // ~25-35% smaller than equivalent JPEG quality; PNGs with transparency
      // keep their alpha channel automatically.
      await sharp(srcPath).webp({ quality: 82 }).toFile(destPath);
    }

    const after = DRY_RUN ? before : (await stat(destPath)).size;
    totalBefore += before;
    totalAfter += after;
    renameMap[name] = destName;

    console.log(
      `${name.padEnd(28)} ${(before / 1024).toFixed(0).padStart(6)} KB -> ${destName.padEnd(28)} ${(after / 1024)
        .toFixed(0)
        .padStart(6)} KB`
    );

    if (!DRY_RUN) {
      await unlink(srcPath);
    }
  }

  console.log("\n--- Summary ---");
  console.log(`Files converted: ${targets.length}`);
  console.log(`Total before:    ${(totalBefore / 1024 / 1024).toFixed(2)} MB`);
  if (!DRY_RUN) {
    console.log(`Total after:     ${(totalAfter / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Saved:           ${(((totalBefore - totalAfter) / totalBefore) * 100).toFixed(1)}%`);
  }

  if (DRY_RUN) {
    console.log("\nDry run only — no files were written or deleted.");
  } else {
    console.log("\nDone. Now update source references from .jpg/.png to .webp:");
    for (const [oldName, newName] of Object.entries(renameMap)) {
      console.log(`  ${oldName} -> ${newName}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
