class ContractExplorer extends HTMLElement {
  connectedCallback() {
    const rows = [...this.querySelectorAll<HTMLTableRowElement>('[data-variable]')];
    const details = [...this.querySelectorAll<HTMLElement>('[data-detail]')];
    const filters = [...this.querySelectorAll<HTMLButtonElement>('[data-filter]')];
    const search = this.querySelector<HTMLInputElement>('[data-search]');
    const empty = this.querySelector<HTMLElement>('[data-empty]');
    const count = this.querySelector<HTMLElement>('[data-count]');
    let filter = 'all';

    const update = () => {
      const query = search?.value.toLowerCase() ?? '';
      let visible = 0;

      for (const row of rows) {
        const matchesQuery = row.dataset.searchText?.includes(query) ?? false;
        const matchesFilter =
          filter === 'all' ||
          (filter === 'required' && row.dataset.required === 'true') ||
          (filter === 'sensitive' && row.dataset.sensitive === 'true') ||
          (filter === 'defaults' && row.dataset.default === 'true');
        row.hidden = !(matchesQuery && matchesFilter);
        if (!row.hidden) visible++;
      }

      if (empty) empty.hidden = visible > 0;
      if (count)
        count.textContent = `${String(visible).padStart(2, '0')} VARIABLES / EXAMPLE CONTRACT`;
    };

    search?.addEventListener('input', update);
    filters.forEach((button) =>
      button.addEventListener('click', () => {
        filter = button.dataset.filter ?? 'all';
        filters.forEach((item) => {
          const active = item === button;
          item.classList.toggle('active', active);
          item.setAttribute('aria-pressed', String(active));
        });
        update();
      }),
    );

    this.addEventListener('click', (event) => {
      if (!(event.target instanceof Element)) return;
      if (event.target.closest('[data-copy]')) return;
      const row = event.target.closest<HTMLTableRowElement>('[data-variable]');
      if (!row) return;

      rows.forEach((item) => {
        const active = item === row;
        item.classList.toggle('selected', active);
        item.querySelector('[data-select]')?.setAttribute('aria-pressed', String(active));
      });
      details.forEach((detail) => {
        detail.hidden = detail.dataset.detail !== row.dataset.variable;
      });
    });
  }
}

customElements.define('contract-explorer', ContractExplorer);
