import { parseSpec, lintSpec } from '../generated/validator.js';
import type { Contract, Diagnostic, LintResult, Variable } from '../types/contract';

function setText(root: ParentNode, selector: string, text: string) {
  const element = root.querySelector(selector);
  if (element) element.textContent = text;
}

function rules(variable: Variable): string {
  const values = [variable.required ? 'required' : 'optional'];
  if (variable.deprecated) values.push('deprecated');
  for (const [key, value] of Object.entries(variable)) {
    if (['default', 'examples', 'enum'].includes(key) && variable.sensitive) continue;
    if (
      [
        'default',
        'examples',
        'enum',
        'delimiter',
        'format',
        'pattern',
        'minimum',
        'maximum',
        'minLength',
        'maxLength',
      ].includes(key)
    ) {
      values.push(`${key}: ${JSON.stringify(value)}`);
    }
  }
  return values.join(' · ');
}

class LivePreview extends HTMLElement {
  private timer?: ReturnType<typeof setTimeout>;
  private controller?: AbortController;

  connectedCallback() {
    const source = this.querySelector<HTMLTextAreaElement>('[data-source]');
    if (!source) return;
    const initial = source.value;
    this.controller = new AbortController();
    const options = { signal: this.controller.signal };

    source.addEventListener(
      'input',
      () => {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.update(source.value), 200);
      },
      options,
    );
    this.querySelector('[data-reset]')?.addEventListener(
      'click',
      () => {
        source.value = initial;
        this.update(source.value);
      },
      options,
    );
    this.querySelector('[data-break]')?.addEventListener(
      'click',
      () => {
        source.value = initial.replace('default: 8080', 'default: 70000');
        this.update(source.value);
      },
      options,
    );
    this.update(initial);
  }

  disconnectedCallback() {
    clearTimeout(this.timer);
    this.controller?.abort();
  }

  private clone(selector: string): DocumentFragment {
    const template = this.querySelector<HTMLTemplateElement>(selector);
    if (!template) throw new Error(`Missing preview template: ${selector}`);
    return template.content.cloneNode(true) as DocumentFragment;
  }

  private diagnostic(item: Diagnostic): DocumentFragment {
    const fragment = this.clone('[data-diagnostic-template]');
    setText(fragment, '[data-code]', `${item.code} · ${item.path}`);
    setText(fragment, '[data-message]', item.message);
    return fragment;
  }

  private update(source: string) {
    clearTimeout(this.timer);
    let spec: unknown;
    let result: LintResult;
    try {
      spec = parseSpec(source);
      result = lintSpec(spec);
    } catch (error) {
      const failure = error as { code?: string; message?: string };
      result = {
        valid: false,
        diagnostics: [
          {
            code: failure.code ?? 'PARSE',
            path: '/',
            message: failure.message ?? 'Unable to parse the contract.',
          },
        ],
      };
    }

    const preview = this.querySelector<HTMLElement>('[data-preview]');
    const status = this.querySelector<HTMLElement>('[data-status]');
    if (!preview || !status) return;
    status.textContent = result.valid ? 'VALID CONTRACT' : 'CONTRACT ERROR';
    status.classList.toggle('invalid', !result.valid);
    const content = document.createDocumentFragment();
    const header = this.clone('[data-header-template]');

    if (!result.valid) {
      setText(header, '[data-label]', 'LIVE DIAGNOSTICS');
      setText(header, '[data-title]', 'Проверьте контракт');
      setText(header, '[data-description]', 'Preview появится после исправления ошибок.');
      content.append(header, ...result.diagnostics.map((item) => this.diagnostic(item)));
    } else {
      const contract = spec as Contract;
      setText(header, '[data-label]', `CONTRACT / ${contract.openenv}`);
      setText(header, '[data-title]', contract.info.title);
      setText(
        header,
        '[data-description]',
        `v${contract.info.version} · ${Object.keys(contract.variables).length} variables`,
      );
      content.append(header, ...result.diagnostics.map((item) => this.diagnostic(item)));

      for (const [name, variable] of Object.entries(contract.variables)) {
        const card = this.clone('[data-card-template]');
        setText(card, '[data-name]', name);
        setText(card, '[data-badge]', variable.sensitive ? 'SENSITIVE' : variable.type);
        card.querySelector('[data-badge]')?.classList.toggle('orange', Boolean(variable.sensitive));
        setText(card, '[data-description]', variable.description);
        setText(card, '[data-rules]', rules(variable));
        content.append(card);
      }
    }

    preview.replaceChildren(content);
  }
}

customElements.define('live-preview', LivePreview);
