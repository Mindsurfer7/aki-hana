# Команда B — Character Art & Expressive Illustration

Репозиторий: Mindsurfer7/aki-hana
Ветка: feat/aki-art-characters-06-10
Сцены: watch, hare, squirrel, bear, doubt
Основной файл: art/character-art.js

## Архитектура

Отдельный Canvas 2D painter с глобальным API CharacterArt. Загрузка файла НЕ заменяет старую функцию creature, не меняет таймеры, звуки и глобальные функции рисования и не затрагивает index.html.

Модуль выключен по умолчанию. CharacterArt.setEnabled(true/false) меняет выбранный renderer в реальном времени, без перезагрузки. Адаптер CharacterArt.createAdapter(legacyCreature, getSceneId) направляет в новый рендер только пять указанных сцен, в остальных вызывает оригинальную функцию. Неизвестные виды тоже получают legacy fallback.

Новые животные:
- лиса: округлая морда, белые щеки, веки, брови, мягкие ушки и хвост; сомнение без пугающей гримасы;
- заяц: мягкая шерсть, выразительные глаза, плавно загнутые уши и гибкие лапки;
- белка: пушистый объемный хвост, большие глаза, кисточка уха, живой силуэт;
- медвежонок: большая голова, мягкие щеки и живот, дружелюбные глаза и объемные лапы.

Предметы: фабрики CharacterArt.items.mallet / walnut / stick, методы CharacterArt.props.basket / stool / toolRack. Якоря соответствуют существующим локальным координатам и масштабу. Старые callback-функции P.item также принимаются и привязываются к запястью. Отрисовка предмета идёт после предплечья, но до лапы — рукоятка визуально оказывается в хвате.

## Параметры

CharacterArt.drawCreature(ctx, kind, pose, x, y, scale, options) принимает те же формы параметров, что исходная creature. Используются mode, t, arm, head, run, lean, walk, ear, eye, sad, look, seed, hx, hy, turn, wag, wagSp, item, smile, twitch, tailFlick и т. д. Из options поддерживаются face, rot, alpha, shadow.

Пока намеренно НЕ изменяем реальные анимационные траектории, скорость или физику циклов: только живопись при прежних входных позах.

## Инструкция для интегратора index.html (в ЭТОЙ ветке не выполнять)

1. Перед встроенным script с кодом сказки загрузить внешний classic script:

    <script src="art/character-art.js"></script>

2. После существующих определений персонажей и SCENES (но до boot) включить адаптер, сохранив оригинал:

    const legacyCreature = creature;
    creature = CharacterArt.createAdapter(legacyCreature, () => cur?.def?.id ?? trans?.to?.def?.id ?? null);
    CharacterArt.setEnabled(true);

3. Восстановление старого рисунка: CharacterArt.setEnabled(false). Автоматический откат других сцен происходит даже при включённом новом рендере.

4. После одобрения художественного стиля выборочно заменить ТОЛЬКО callsites предметов в сценах 6–10 на CharacterArt.items.mallet(swing), .stick(length,rot), .walnut() и CharacterArt.props.basket/stool/toolRack. Оригинальные ITEMS и props для других сцен не трогать.

5. При точном сопоставлении сцен во время кроссфейда рекомендуется передавать текущий inst.def.id из renderScene в обёртку: cur указывает на текущий сюжетный кадр, но при переходе могут одновременно рисоваться две сцены. Это задача интегратора, не изменение движений.

Не переносить новых функций прямо в глобальные drawFox/drawBear, не переписывать animate/scene functions.

## Проверка

Без зависимостей: node --test tests/character-art.test.cjs

Сравнение реальных кадров через Playwright:

    npm install --no-save playwright
    npx playwright install chromium
    node tools/character-art-qa.mjs

Скрипт делает five before/after pairs (watch, hare, squirrel, bear, doubt) на настоящем index.html, плюс closeups-before-after.png и poses-before-after.png для всех четырех животных. Результаты сохраняются локально в art/qa и не предназначены для git-коммита. При сравнении важны уши, щеки, лапы, эмоция сомнения, хват инструмента, разные фазы бега/подъёма. Проверить на реальных слабых телефонах отдельно.

## Отдельное наблюдение по кинематике

В сцене bear исходный код независимо рассчитывает arm по R.swing и угол молотка через ITEMS.mallet(1.25 - R.swing * 0.85). Привязка начала ручки к запястью есть, но точка касания головки молотка с табуретом может расходиться из-за независимых кривых. Этот модуль не меняет ни arm, ни R.swing, ни положение табурета; если на серии кадров обнаружен промах, завести отдельную задачу на кинематику.

Производительность: нет дополнительного полноэкранного Canvas, тяжелого blur или новых зависимостей. Время реального кадра на слабых устройствах требует отдельной проверки.
