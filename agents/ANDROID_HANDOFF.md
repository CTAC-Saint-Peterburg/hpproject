# Android: передача другому разработчику

**28.11.2026, UI54:** текущая5.10.0/6000, читать UI54_REPORT.md. MainActivity теперь FrameLayout→WebView, insets на контейнере, bridge HypedDisplay для portrait меню/награды и sensorLandscape игры. Manifest обрабатывает orientation/screenSize/smallestScreenSize/keyboardHidden; onConfigurationChanged не перезагружает игру. Старые записи ниже о свободной ориентации и rotate-overlay больше не описывают актуальный код. Подсказка сохранена отключённой. На телефоне ещё не проверено; ADB пустой, APK/хеш в PORT_STATUS.

**Дополнение 23.11.2026:** новый запрос №50 разрешил адаптацию UI; текущая версия 5.6.0/5600. Пользователь приложил скриншоты работающей игры на телефоне; прежний дефект запуска этим не диагностирован. Проверять новый APK по журналу `mobile/PORT_STATUS.md`, а не старый файл 5.5.0. Игровая ориентация ограничена на уровне JS: портретный экран ставит паузу, меню/обучение допускают портрет, native Activity принудительно не блокируется. Сценарии проверки — `UI50_REPORT.md`.

Состояние на **22.11.2026**. Выбрана лёгкая native WebView-обёртка с локальной игрой. Основной чек-лист — [ANDROID_PACKAGING_PLAN.md](../ANDROID_PACKAGING_PLAN.md), выполненное — [mobile/PORT_STATUS.md](../mobile/PORT_STATUS.md).

## Самая актуальная незакрытая проблема

**Сообщение владельца:** бюджетный телефон с Android 10 показывает загрузку, затем только фон. Модель телефона, версия активного WebView, логи и hash установленного APK пока неизвестны. Пользователь собрал APK сам; нельзя предполагать, что это побайтно тот же артефакт из журнала.

**Гипотезы, не диагноз:** несовместимость WebView/JS, ошибка создания WebGL 2 renderer/GPU, ошибка JS или ресурса после StartupGate. Android 10 сам по себе не доказывает несовместимость. Не понижать Three.js, не менять сцены/эффекты и не отключать загрузку наугад.

Следующая диагностическая задача, когда её поручит разработчик:

1. Получить модель телефона, версию ОС, активный WebView, воспроизводимый APK/его hash. Уточнить, есть ли проблема при наличии сети и при авиарежиме.
2. Подключить USB debugging, подтвердить ключ на телефоне, проверить `adb devices -l`. Не очищать данные приложения ради диагностики без необходимости и согласования.
3. Собрать logcat при запуске: ошибки AndroidRuntime, chromium, JS, GPU/context lost. Например `adb logcat -d -v threadtime > android-startup.log`; перед передачей логов убрать личные данные.
4. Debug-обёртка включает WebView debugging. При доступности подключить Chrome DevTools к WebView и посмотреть console/network: какая ошибка первая, какой ресурс/этап не готов.
5. Проверить поддержку WebGL 2 именно в WebView, успешную загрузку локального TTF/OGG и появление Canvas триптиха. Зафиксировать наблюдение отдельно от предположений.
6. Исправить минимальную подтверждённую проблему совместимости; повторить сценарий на том же телефоне и записать результат в журнал.

ADB-команды выше — диагностические примеры, не утверждение о наличии подключённого телефона. Предыдущий локальный эмулятор Hpgame_Test оставался offline; проверка APK внутри Android не была завершена.

## Что уже есть

- База 5.5.0, versionCode 5500; applicationId пока `com.example.hpgame`, minSdk 24, compileSdk/targetSdk 37. AGP/Gradle и checksum wrapper зафиксированы в шаблоне.
- `mobile/android/MainActivity.kt` — основной источник Activity. `mobile/android-project` — остальные версионируемые native-файлы. Ручная правка только внешнего Android-проекта может быть затёрта следующим android:build.
- WebViewAssetLoader: `https://appassets.androidplatform.net/assets/www/index.html`. Стабильный origin нужен для localStorage.
- INTERNET включён; cleartext/mixed content запрещены. Системные locales передаются в JS до запуска, если доступен document-start script.
- Android-only bootstrap подключает локальный TTF 43 084 байта; покрывает 202 кодовые точки текущих 3D-надписей пяти языков. Лицензии включены. Обычная веб-сборка сохраняет прежний механизм шрифта.
- Генерируемые ресурсы: `app/build/generated/hypedWeb/<id>/www`; файл `hyped-web-assets.path` выбирает sourceSet. В APK — прежний `assets/www`. Старый src/main/assets/www исключён при наличии указателя.
- Каждая полная сборка создаёт свежий каталог без рекурсивного удаления старых данных. Это также не позволяет включить в APK hash-файлы прежних сборок.

## Подготовка другого Windows-компьютера

1. Получить актуальную ветку репозитория и tag стабильной базы. Проверить `git status`; не работать поверх чужих незакоммиченных изменений.
2. Установить подходящий Node.js и Android Studio с SDK/JDK под версии шаблона. В исходной среде использовался Node 24.11.1. Пути `C:\Users\стас\...` — только пример машины владельца, не универсальная настройка.
3. В репозитории есть **yarn.lock v1**, package-lock.json отсутствует. Для воспроизведения использовать Yarn Classic и `yarn install --frozen-lockfile`; не создавать второй lockfile и не обновлять зависимости без причины. Проверить совместимость установленного Node с package.json зависимостей. Npm-команды запуска скриптов можно использовать после установки через Yarn.
4. Для нового внешнего Android-проекта скопировать шаблон `mobile/android-project` в отдельную пустую папку. Открыть её как корень проекта в Studio. Настроить местный Android SDK (`local.properties`) и Gradle JDK. Не копировать local.properties другого разработчика.
5. До первой автоматической сборки создать каталог Activity и скопировать MainActivity.kt, как в примере ниже: шаблон отдельно содержит ресурсы/Gradle, Activity хранится в другом месте репозитория.
6. Передать android:build **корень Android-проекта**, не подпапку app. Скрипт Windows-ориентирован; портирование скрипта на macOS/Linux — отдельная задача.

Пример из корня клона; путь выбрать свой и использовать пустой каталог назначения:

```powershell
$androidProject = 'C:\dev\hpgame-android'
New-Item -ItemType Directory -Force -Path $androidProject | Out-Null
Copy-Item -Path '.\mobile\android-project\*' -Destination $androidProject -Recurse
$activityDir = Join-Path $androidProject 'app\src\main\java\com\example\hpgame'
New-Item -ItemType Directory -Force -Path $activityDir | Out-Null
Copy-Item -LiteralPath '.\mobile\android\MainActivity.kt' -Destination $activityDir
# Теперь открыть $androidProject в Android Studio и настроить SDK/JDK.
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
npm.cmd run android:build -- "$androidProject"
```

Этот пример в текущей задаче не запускался на новом компьютере. Не выполнять копирование поверх проекта с чужими ручными изменениями без сравнения.

Команда android:build сохраняет резервные копии известных native-файлов, копирует версионируемый шаблон, делает свежую Vite Android-сборку, синхронизирует её и вызывает Gradle assembleDebug. Для обычного обновления не применять старый prepare-android.mjs. При изменении native-кода сначала обновлять источник в репозитории.

Результаты: `app/build/outputs/apk/debug/app-debug.apk` во внешнем проекте и `android-backups/artifacts/HypedPot-5.5.0-debug.apk` в репозитории (игнорируется Git). После Gradle Clean generated-каталог может исчезнуть — повторить android:build. Обычный Build в Studio не пересобирает изменённый JavaScript.

## Что не передаётся через Git

Локальный профиль WebView, данные браузера владельца, SDK, Gradle-кеш, подключение телефона, Android Studio с открытыми окнами, APK в android-backups и аккаунты сервисов не появляются у друга автоматически. Для тестов использовать отдельный профиль; не выдавать его за профиль владельца.

Шрифт уже лежит в Git — Python/fontTools не нужны для обычной сборки. При изменении набора 3D-текста следовать `mobile/web/fonts/README.md` и пересобирать поднабор. Не рассчитывать на временный portable Python из android-backups: он не входит в репозиторий.

## Последующие этапы

Реклама Unity LevelPlay за 2000 постоянных stones, Firebase Auth/Firestore, серверные callback, release-подпись и публикация пока только в плане. Не создавать аккаунты, не подключать биллинг и не заявлять эти функции готовыми. Сначала устранить/диагностировать текущий запуск и завершить приёмку на устройстве.
