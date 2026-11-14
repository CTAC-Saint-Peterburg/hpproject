import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (!process.argv[2]) throw new Error('Usage: node scripts/prepare-android.mjs <Android project>');
const target = resolve(process.argv[2]);
const files = ['app/build.gradle.kts', 'app/src/main/AndroidManifest.xml', 'app/src/main/java/com/example/hpgame/MainActivity.kt'];
files.push('gradle.properties', 'app/src/main/res/values/themes.xml', 'app/src/main/res/values-night/themes.xml');
files.push('app/src/main/res/layout/activity_main.xml');
const backup = join(root, 'android-backups', String(Date.now()));
for (const file of files) {
  await mkdir(dirname(join(backup, file)), { recursive: true });
  await copyFile(join(target, file), join(backup, file));
}
await copyFile(join(root, 'mobile/android/MainActivity.kt'), join(target, files[2]));
let gradle = await readFile(join(target, files[0]), 'utf8');
gradle = gradle.replace(/^\s*implementation\(libs\.[^)]+\)\s*$/gm, '');
if (!gradle.includes('androidx.webkit:webkit')) gradle = gradle.replace('dependencies {', 'dependencies {\n    implementation("androidx.webkit:webkit:1.12.1")');
await writeFile(join(target, files[0]), gradle);
let manifest = await readFile(join(target, files[1]), 'utf8');
if (!manifest.includes('android:hardwareAccelerated')) manifest = manifest.replace('<application', '<application android:hardwareAccelerated="true"');
await writeFile(join(target, files[1]), manifest);
for (const file of files.slice(4, 6)) {
  const theme = await readFile(join(target, file), 'utf8');
  await writeFile(join(target, file), theme.replace(/parent="Theme.Material3[^\"]*"/g, 'parent="android:style/Theme.Material.Light.NoActionBar"'));
}
await writeFile(join(target, files[6]), '<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android" android:layout_width="match_parent" android:layout_height="match_parent" />\n');
const propertiesFile = join(target, 'gradle.properties');
const properties = await readFile(propertiesFile, 'utf8');
if (!properties.includes('android.overridePathCheck=true')) await writeFile(propertiesFile, properties + '\nandroid.overridePathCheck=true\n');
console.log(`Wrapper installed. Original files: ${backup}`);
