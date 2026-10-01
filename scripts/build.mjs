import { copyFile, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const runtimeFiles = ['index.html', 'app.js', 'styles.css', 'lessons.json', 'LICENSE'];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await Promise.all(runtimeFiles.map((filename) => copyFile(resolve(root, filename), resolve(dist, filename))));
