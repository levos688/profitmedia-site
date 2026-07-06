import sharp from 'sharp';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('public/images');

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full);
      continue;
    }
    if (!/\.jpe?g$/i.test(entry.name)) continue;
    const out = full.replace(/\.jpe?g$/i, '.webp');
    const info = await stat(full);
    const outInfo = await stat(out).catch(() => null);
    if (outInfo && outInfo.mtimeMs >= info.mtimeMs) continue;
    await sharp(full).webp({ quality: 82 }).toFile(out);
    console.log('webp:', path.relative(root, out));
  }
}

await walk(root);
