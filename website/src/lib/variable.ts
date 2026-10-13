import type { Variable } from '../types/contract';

export function variableYaml(name: string, variable: Variable): string {
  return [
    `${name}:`,
    ...Object.entries(variable).map(([key, value]) => {
      const formatted = key === 'description' ? value : JSON.stringify(value);
      return `  ${key}: ${formatted}`;
    }),
  ].join('\n');
}

export function variableNote(variable: Variable): string {
  if (variable.sensitive)
    return 'Чувствительная переменная: default, examples и enum запрещены. Маркер sensitive описывает правила обращения со значением.';
  if (variable.type === 'array')
    return 'Массив содержит только строки. Разделение буквальное: пробелы и пустые элементы сохраняются.';
  if (variable.minimum !== undefined)
    return `Число в диапазоне ${variable.minimum}–${variable.maximum}. Default используется только при отсутствии переменной.`;
  if (variable.enum)
    return 'Значение должно входить в объявленный enum. Регистр и пробелы имеют значение.';
  return 'Значение декодируется строго по правилам типа. Пустая строка считается присутствующим значением.';
}
