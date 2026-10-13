const menu = document.querySelector<HTMLButtonElement>('#menu');
const sidebar = document.querySelector<HTMLElement>('#sidebar');
const toast = document.querySelector<HTMLElement>('#toast');
let toastTimer: ReturnType<typeof setTimeout>;

menu?.addEventListener('click', () => {
  const open = sidebar?.classList.toggle('open') ?? false;
  menu.setAttribute('aria-expanded', String(open));
});

document.addEventListener('click', async (event) => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest<HTMLButtonElement>('[data-copy]');
  if (!button || !toast) return;

  try {
    await navigator.clipboard.writeText(button.dataset.copy ?? '');
    toast.textContent = 'Скопировано';
  } catch {
    toast.textContent = 'Буфер недоступен. Выделите и скопируйте текст.';
  }

  clearTimeout(toastTimer);
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
});
