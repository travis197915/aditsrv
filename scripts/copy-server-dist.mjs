import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const distDir = join(root, 'dist');
const source = join(root, 'server', 'spa-server.mjs');
const target = join(distDir, 'server-dist.mjs');

if (!existsSync(distDir)) {
  console.error('dist/ does not exist — run vite build first.');
  process.exit(1);
}

mkdirSync(distDir, { recursive: true });
copyFileSync(source, target);
console.log(`Created ${target}`);
