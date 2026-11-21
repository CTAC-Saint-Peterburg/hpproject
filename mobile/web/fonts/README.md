# Локальный шрифт Android

HypedPotAndroid.ttf — поднабор Noto Sans SC Regular (wght=400) и Noto Sans Symbols 2 с оригинальным геометрическим символом круговой стрелки U+21BB. Содержит 202 кодовые точки: все символы игровых 3D-надписей пяти переводов стабильной версии 5.5.0, символы рецепта и ASCII. Размер 43 084 байта. Это не универсальный шрифт произвольного пользовательского текста.

Источники Google Fonts (SIL OFL 1.1), загружены 21.11.2026:

- https://github.com/google/fonts/tree/main/ofl/notosanssc
- https://github.com/google/fonts/tree/main/ofl/notosanssymbols2

Лицензии сохранены рядом и включаются в Android www/licenses. Производный шрифт переименован в Hyped Pot Android. Воспроизведение: `python mobile/build-font.py <NotoSansSC[wght].ttf> <NotoSansSymbols2-Regular.ttf>` с fontTools; инструмент сборки проверяет покрытие глифов.

Подключается через Vite Android-only bootstrap и configureTextBuilder до первого вызова Troika. Веб-сборка стабильной игры не меняет шрифт. При добавлении новых 3D-текстов в будущих версиях нужно пересобрать поднабор и повторить офлайн-проверку, иначе возможен запрос fallback в сеть.
