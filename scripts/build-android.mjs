import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, copyFileSync, readdirSync, realpathSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const project = resolve(process.argv[2] ?? join(process.env.USERPROFILE, 'AndroidStudioProjects/hpgame'));
if (!existsSync(join(project, 'settings.gradle.kts'))) throw new Error('Expected an existing Android project root (not app/)');
const backup = join(root, 'android-backups', 'build-' + Date.now());
const template = join(root, 'mobile/android-project');
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)]);
}
// Explicitly versioned native files only; preserve local SDK paths, keys, and user data.
for (const source of files(template)) {
  const rel = relative(template, source), target = join(project, rel);
  if (existsSync(target)) { mkdirSync(dirname(join(backup, rel)), { recursive: true }); copyFileSync(target, join(backup, rel)); }
  mkdirSync(dirname(target), { recursive: true }); copyFileSync(source, target);
}
const activity = 'app/src/main/java/com/example/hpgame/MainActivity.kt';
mkdirSync(dirname(join(backup, activity)), { recursive: true });
if (existsSync(join(project, activity))) copyFileSync(join(project, activity), join(backup, activity));
copyFileSync(join(root, 'mobile/android/MainActivity.kt'), join(project, activity));
function run(command, args, cwd = root, env = process.env) {
  const result = spawnSync(command, args, { cwd, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed: ${result.status}`);
}
const webOutput = join(backup, 'web');
run(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), 'build', '--mode', 'android', '--outDir', webOutput]);
run(process.execPath, [join(root, 'scripts/sync-android.mjs'), realpathSync(project), webOutput]);
const javaHome = process.env.JAVA_HOME || 'C:\\Program Files\\Android\\Android Studio\\jbr';
if (!existsSync(join(javaHome, 'bin/java.exe'))) throw new Error('Set JAVA_HOME to a compatible JDK');
run(join(javaHome, 'bin/java.exe'), ['-jar', join(project, 'gradle/wrapper/gradle-wrapper.jar'),
  '-p', project, 'assembleDebug', '--console=plain'], project, { ...process.env, JAVA_HOME: javaHome });
const artifact = join(root, 'android-backups', 'artifacts');
mkdirSync(artifact, { recursive: true });
copyFileSync(join(project, 'app/build/outputs/apk/debug/app-debug.apk'), join(artifact, 'HypedPot-5.10.0-debug.apk'));
console.log('Native backup:', backup);
console.log('APK:', join(artifact, 'HypedPot-5.10.0-debug.apk'));
