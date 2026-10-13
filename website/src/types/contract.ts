export interface Variable {
  description: string;
  type: 'string' | 'integer' | 'number' | 'boolean' | 'array';
  required?: boolean;
  sensitive?: boolean;
  deprecated?: boolean;
  default?: string | number | boolean | string[];
  examples?: unknown[];
  enum?: unknown[];
  delimiter?: ' ' | ',';
  format?: string;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
}

export interface Contract {
  openenv: string;
  info: { title: string; version: string; description?: string };
  variables: Record<string, Variable>;
}

export interface Diagnostic {
  severity?: 'error' | 'warning';
  code: string;
  path: string;
  message: string;
}

export interface LintResult {
  valid: boolean;
  diagnostics: Diagnostic[];
}
