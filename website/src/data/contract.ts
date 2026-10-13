import example from '../../../examples/openenv.json';
import yaml from '../../../examples/openenv.yaml?raw';
import type { Contract } from '../types/contract';

export const contract: Contract = example as Contract;
export const contractYaml = yaml;
export const contractJson = JSON.stringify(contract, null, 2);
export const variables = Object.entries(contract.variables);

export const filters = [
  { id: 'all', label: 'Все переменные' },
  { id: 'required', label: 'Обязательные' },
  { id: 'sensitive', label: 'Чувствительные' },
  { id: 'defaults', label: 'С defaults' },
];

export const metrics = [
  {
    label: 'DECLARED VARIABLES',
    value: String(variables.length).padStart(2, '0'),
    note: 'В примере Orders service',
  },
  { label: 'VALUE TYPES', value: '05', note: 'Строки, числа, boolean, массивы' },
  { label: 'SERIALIZATIONS', value: '02', note: 'YAML 1.2 / JSON' },
  { label: 'SPECIFICATION', value: contract.openenv, note: 'Initial draft' },
];
