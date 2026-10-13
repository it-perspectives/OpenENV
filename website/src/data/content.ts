export const overview = {
  label: 'OPEN SPECIFICATION / ENVIRONMENT VARIABLES',
  title: ['У окружения тоже', 'должен быть'],
  accent: 'контракт.',
  description:
    'Имена, типы, ограничения и назначение переменных — в одном открытом формате. Понятно человеку. Проверяемо машиной.',
  flow: [
    {
      label: '01 / DESCRIBE',
      title: 'Опишите окружение',
      description:
        'Версионируйте openenv.yaml рядом с кодом. Типы, defaults и ограничения становятся частью контракта приложения.',
    },
    {
      label: '02 / LINT',
      title: 'Проверьте контракт',
      description:
        'JSON Schema проверяет структуру. Семантический lint проверяет границы, регулярные выражения и согласованность значений.',
    },
    {
      label: '03 / CHECK',
      title: 'Проверьте окружение',
      description:
        'Checker декодирует строки и проверяет значения. Ошибка обнаруживается в CI или при запуске приложения.',
    },
  ],
};

export const intros = {
  contract: {
    label: 'CONTRACT EXPLORER / 01',
    title: 'Окружение, которое можно прочитать.',
    description:
      'Интерактивный пример из репозитория. Выберите переменную, чтобы увидеть её назначение, правила и исходное описание.',
  },
  types: {
    label: 'TYPE SYSTEM / 02',
    title: 'Строки на входе. Типы в контракте.',
    description:
      'Переменные окружения всегда приходят строками. OpenENV задаёт точные правила их интерпретации без скрытого приведения и обрезки пробелов.',
  },
  quickstart: {
    label: 'REFERENCE IMPLEMENTATION / NODE.JS 22+',
    title: 'От описания к проверке.',
    description:
      'Спецификация независима от языка приложения. Reference CLI и библиотека работают на Node.js: используйте их в CI или при запуске сервиса.',
  },
  vscode: {
    label: 'EDITOR INTEGRATION / LOCAL PROTOTYPE',
    title: 'YAML слева. Контракт справа.',
    description:
      'Preview для openenv.yaml по аналогии с Markdown: читаемое представление переменных и диагностика рядом с исходником. Ниже — интерактивная браузерная демонстрация.',
  },
};

export const decodingRules = [
  {
    type: 'string',
    description:
      'Сохраняет значение без изменений, включая пробелы и пустую строку. Длина измеряется в Unicode code points.',
    example: '" hello " → " hello "\nminLength, maxLength, format, pattern',
  },
  {
    type: 'integer',
    description:
      'Десятичное целое в безопасном диапазоне JavaScript. Без ведущих нулей, знака +, дробной части и экспоненты.',
    example: '"8080" → 8080\n"08080" → ошибка',
  },
  {
    type: 'number',
    description:
      'JSON-число: поддерживает дробную часть и экспоненту. Значение должно быть конечным; целые результаты — в безопасном диапазоне.',
    example: '"1.5e2" → 150\n"NaN" → ошибка',
  },
  {
    type: 'boolean',
    description:
      'Только точные строки true и false. Регистр имеет значение. Значения 1, yes и TRUE недопустимы.',
    example: '"true" → true\n"TRUE" → ошибка',
  },
  {
    type: 'array',
    description:
      'Только массив строк. Обязательный delimiter — запятая или ASCII-пробел. Сохраняет порядок, дубликаты и пустые элементы.',
    example: 'delimiter: ","\n"a, b,," → ["a", " b", "", ""]',
  },
];

export const typeNotes = [
  {
    label: 'SECURITY SEMANTICS',
    title: 'ЧУВСТВИТЕЛЬНЫЕ ПЕРЕМЕННЫЕ',
    description:
      'При sensitive: true запрещены default, examples и enum. Контракт не содержит развёрнутых значений. Reference CLI не выводит значения окружения.',
    note: 'Маркер sensitive сам по себе не шифрует данные. Secret stores и управление секретами находятся вне спецификации 0.1.0.',
  },
  {
    label: 'COMPATIBILITY',
    title: 'ДВЕ НЕЗАВИСИМЫЕ ВЕРСИИ',
    description:
      'openenv: 0.1.0 — версия спецификации. info.version: 1.0.0 — версия контракта приложения.',
    note: 'Закрепляйте точную версию спецификации и JSON Schema. Неизвестные поля запрещены; расширения используют префикс x-.',
  },
];

export const quickstartSteps = [
  {
    number: '01',
    title: 'Подготовьте инструменты',
    description: 'Команды работают из checkout репозитория. npm-публикация не предполагается.',
    commands: [
      'git clone https://github.com/it-perspectives/OpenENV.git',
      'cd OpenENV && npm ci --ignore-scripts',
    ],
  },
  {
    number: '02',
    title: 'Проверьте описание',
    description: 'Поля, типы, defaults, examples, enum и согласованность ограничений.',
    commands: ['node bin/openenv.js lint examples/openenv.yaml --warnings-as-errors'],
  },
  {
    number: '03',
    title: 'Проверьте значения',
    description:
      'Node.js загружает ваш локальный .env. Checker проверяет наличие, декодирование и ограничения.',
    commands: ['node --env-file=.env bin/openenv.js check ./openenv.yaml'],
  },
];

export const runtimeExample = `import { readFileSync } from 'node:fs';
import { parseSpec, checkEnvironment } from '@it-perspectives/openenv';

const spec = parseSpec(readFileSync('./openenv.yaml', 'utf8'));
const result = checkEnvironment(spec, process.env);

if (!result.valid) {
  throw new Error(JSON.stringify(result.diagnostics));
}
const config = result.values; // Typed values and resolved defaults.`;

export const solutionBoundaries = [
  {
    label: 'SPECIFICATION',
    title: 'Общий формат',
    description:
      'YAML 1.2 и JSON. Типы, правила декодирования, ограничения, defaults и чувствительность.',
  },
  {
    label: 'JSON SCHEMA',
    title: 'Поддержка редакторов',
    description:
      'Draft 2020-12 для проверки структуры и автодополнения. Семантические проверки дополняет linter.',
  },
  {
    label: 'REFERENCE TOOLS',
    title: 'CLI и JavaScript API',
    description:
      'parseSpec, lintSpec и checkEnvironment. Загрузка секретов, профили и интерполяция находятся вне версии 0.1.0.',
  },
];

export const previewFeatures = [
  {
    label: '01 / OPEN BESIDE',
    title: 'Как Markdown',
    description:
      'Команда OpenENV: Open Preview to the Side, кнопка в заголовке редактора и shortcut для openenv.yaml, .yml и .json.',
  },
  {
    label: '02 / LIVE UPDATE',
    title: 'Без сохранения файла',
    description:
      'Изменения TextDocument обновляют preview с небольшой задержкой. Парсер и linter — те же, что у CLI.',
  },
  {
    label: '03 / CONTRACT ONLY',
    title: 'Без значений окружения',
    description:
      'Таблица типов, описаний и правил. Расширение не читает .env и не запускает команды из workspace.',
  },
];

export const notes = {
  presence:
    'required: true проверяет наличие. minLength: 1 запрещает пустую строку. Это независимые правила: пустой массив удовлетворяет required.',
  cliExitCodes:
    'CLI возвращает диагностику и код завершения: 0 — успех, 1 — ошибка контракта или окружения, 2 — ошибка файла или использования. Значения окружения в отчёт не попадают.',
  runtimeIntegration:
    'После публикации пакета библиотеку можно установить как production dependency. Приложение выбирает источник значений и решает, как обработать ошибку.',
  previewPrototype:
    'Прототип предназначен для локального запуска Extension Development Host. Публикация в VS Code Marketplace — отдельный шаг.',
  previewArchitecture:
    'TextDocument → parseSpec → lintSpec → модель preview → WebviewPanel. JSON Schema отвечает за структуру; linter добавляет семантические проверки. Webview отображает валидный контракт или диагностику текущей редакции.',
};
