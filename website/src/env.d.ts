/// <reference types="astro/client" />

declare module '*generated/validator.js' {
  export function parseSpec(source: string, options?: { format?: 'yaml' | 'json' }): unknown;
  export function lintSpec(spec: unknown): import('./types/contract').LintResult;
}
