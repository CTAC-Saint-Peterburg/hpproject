# Android — подготовка включена в master

Подготовлено 14.11.2026. Android-проект: `C:\Users\стас\AndroidStudioProjects\hpgame`.

## Повторная сборка

Из корня игры:

```powershell
npm.cmd run build:android
npm.cmd run android:sync -- C:\Users\стас\AndroidStudioProjects\hpgame
```

Затем Build/Run в Android Studio либо:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
Set-Location C:\Users\стас\AndroidStudioProjects\hpgame
.\gradlew.bat assembleDebug --console=plain
```

Результат: `app/build/outputs/apk/debug/app-debug.apk` внутри Android-проекта. При подключённом устройстве: `gradlew.bat installDebug`. Build в Studio сам не обновляет JavaScript: сначала выполнить build:android и android:sync.

## Реализация

Vite mode android использует базу `./` и отдельный каталог `dist-android`. Синхронизация заменяет только генерируемый `app/src/main/assets/www`; исходники, node_modules и старые файлы обычного dist в APK не копируются.

`mobile/android/MainActivity.kt` — исходник лёгкой Activity с системным WebView, AndroidX WebKit и локальным HTTPS-origin `https://appassets.androidplatform.net/assets/www/index.html`. Включены JavaScript, DOM Storage и аппаратное ускорение; отдельный Chromium и интернет-разрешение не добавлялись. Удалены лишние UI-зависимости шаблона, темы переведены на платформенные.

Android-сборка включает touch-режим. Скрытие страницы и native onPause ставят игру на паузу; продолжение выполняет игрок. Back ставит раунд на паузу и показывает подтверждение выхода. Учитываются системные отступы экрана.

`node scripts/prepare-android.mjs <проект>` устанавливает обёртку в исходный шаблон hpgame с package com.example.hpgame. Скрипт заменяет Activity/layout и облегчает зависимости/темы, поэтому для обычного обновления игры повторять его не нужно. Перед изменением файлы резервируются в игнорируемый каталог android-backups. Самые первые MainActivity/manifest/Gradle сохранены в `android-backups/1794607100630`, остальные файлы — в последующих резервных копиях.

В gradle.properties добавлен android.overridePathCheck=true для пути с кириллицей. Сборка использует установленный SDK 37 и JDK Android Studio. Android-проект находится вне Git игры; в ветке сохранены Activity и скрипты воспроизведения настройки.

## Проверено и что дальше

Для 3.7.0 прошли обе сборки Vite, Gradle assembleDebug, 231 тест и ESLint изменённых JS-файлов. Debug APK: **3 476 909 байт**, около 3.5 МБ. Размер финального оптимизированного релиза пока не измерен.

Studio запущена, её файлы доступны и настроены. Управление окном недоступно: Computer Use native pipe не подключён. Старые эмуляторы зависали offline; чистый профиль Hpgame_Test в C:\Users\Public\hpgame-avd с программным GPU успешно загрузил Android (ADB device, sys.boot_completed=1). Запуск самой игры внутри WebView и визуальная проверка trainer на телефоне ещё не выполнены.

Далее: подключить телефон или запустить эмулятор, установить APK; проверить WebGL 2, первый офлайн-запуск, звук после касания, оба режима, жесты/перенос, профиль, фон/Back и поворот экрана. Активный раунд пока не восстанавливается после уничтожения процесса/пересоздания Activity; сохраняемый профиль — отдельный механизм. Затем выбрать окончательные applicationId/название/версии, настроить release-подпись и измерить оптимизированный APK/AAB.
