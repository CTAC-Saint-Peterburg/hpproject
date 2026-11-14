import { cp, mkdir, readFile, rm } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const project = resolve(process.argv[2] ?? join(root, '..', '..', 'AndroidStudioProjects', 'hpgame'));
const source = join(root, 'dist-android');
const destination = join(project, 'app', 'src', 'main', 'assets', 'www');
await readFile(join(project, 'app', 'src', 'main', 'AndroidManifest.xml'));
const html = await readFile(join(source, 'index.html'), 'utf8');
if (!html.includes('./assets/') || html.includes('localhost:5173')) throw new Error('Run npm run build:android first');
if (!destination.startsWith(project + '/') && !destination.startsWith(project + '\\')) throw new Error('Invalid destination');
// Only replace the known generated web asset folder inside the selected project.
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true });
console.log(`Android web assets: ${destination}`);
