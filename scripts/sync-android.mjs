import { mkdir, readFile, copyFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const project = resolve(process.argv[2] ?? join(root, '..', '..', 'AndroidStudioProjects', 'hpgame'));
const source = resolve(process.argv[3] ?? join(root, 'dist-android'));
const assetsRoot = join(project, 'app', 'build', 'generated', 'hypedWeb', String(Date.now()));
const destination = join(assetsRoot, 'www');
await readFile(join(project, 'app', 'src', 'main', 'AndroidManifest.xml'));
const html = await readFile(join(source, 'index.html'), 'utf8');
if (!html.includes('./assets/') || html.includes('localhost:5173')) throw new Error('Run npm run build:android first');
if (!destination.startsWith(project + '/') && !destination.startsWith(project + '\\')) throw new Error('Invalid destination');
// A fresh generated root avoids deleting or packaging any previous build files.
async function copyTree(from, to) {
  await mkdir(to, { recursive: true });
  for (const entry of await readdir(from, { withFileTypes: true })) {
    if (entry.isDirectory()) await copyTree(join(from, entry.name), join(to, entry.name));
    else await copyFile(join(from, entry.name), join(to, entry.name));
  }
}
await copyTree(source, destination);
await writeFile(join(project, 'hyped-web-assets.path'), relative(project, assetsRoot).replaceAll('\\', '/'));
console.log(`Android web assets: ${destination}`);
