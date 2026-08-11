/** Small shared UI bits: icons, escaping, toasts, sparkles. */

export function esc(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const S = (d, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;

export const icons = {
  check: S('<path d="m5 12.5 4.5 4.5L19 7"/>'),
  more: S('<circle cx="12" cy="5.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="18.5" r="1.4" fill="currentColor" stroke="none"/>'),
  close: S('<path d="M6 6l12 12M18 6L6 18"/>'),
  plus: S('<path d="M12 5.5v13M5.5 12h13"/>'),
  flame: S('<path d="M12 3s4.5 3.6 4.5 7.5a4.5 4.5 0 0 1-9 0C7.5 8.9 9 7.5 9 7.5S9.4 10 11 10c1.2 0 1.6-1.1 1.6-2.2C12.6 6 12 4.6 12 3z"/><path d="M12 21a6 6 0 0 0 6-6c0-1.2-.3-2.3-.8-3.3"/><path d="M6.8 11.7A6.7 6.7 0 0 0 6 15a6 6 0 0 0 6 6"/>'),
  spark: S('<path d="M12 3.5l1.9 4.9 4.9 1.9-4.9 1.9L12 17.1l-1.9-4.9L5.2 10.3l4.9-1.9L12 3.5z"/>'),
  clock: S('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/>'),
  repeat: S('<path d="M4 9a5 5 0 0 1 5-5h9"/><path d="m15 1.5 3 2.5-3 2.5"/><path d="M20 15a5 5 0 0 1-5 5H6"/><path d="m9 22.5-3-2.5 3-2.5"/>'),
  chevron: S('<path d="m9 5.5 6.5 6.5L9 18.5"/>'),
  trash: S('<path d="M4.5 6.5h15M9.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v1.5"/><path d="M6.5 6.5 7.4 19a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-12.5"/>'),
  edit: S('<path d="M4.5 19.5h4L19 9a2.1 2.1 0 0 0-3-3L5.5 16.5v3z"/>'),
  download: S('<path d="M12 4v10"/><path d="m8 10.5 4 4 4-4"/><path d="M4.5 19.5h15"/>'),
  upload: S('<path d="M12 15V5"/><path d="m8 8.5 4-4 4 4"/><path d="M4.5 19.5h15"/>'),
  install: S('<rect x="6" y="2.8" width="12" height="18.4" rx="2.6"/><path d="M11 5.5h2"/><path d="M12 10v5.5"/><path d="m9.8 13.3 2.2 2.2 2.2-2.2"/>'),
  target: S('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor"/>'),
  moon: S('<path d="M20 13.5A8 8 0 1 1 10.5 4a6.6 6.6 0 0 0 9.5 9.5z"/>'),
};

/* ---------------------------------------------------------------- toast -- */

let toastTimer = null;

/** Undo needs a generous, visible window; a plain message can go quietly. */
const UNDO_MS = 7000;
const PLAIN_MS = 2800;

export function toast(message, action) {
  const root = document.getElementById('toast-root');
  root.innerHTML = '';
  clearTimeout(toastTimer);

  const life = action ? UNDO_MS : PLAIN_MS;
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span class="toast__text">${esc(message)}</span>` +
    (action
      ? `<button class="toast__action" type="button">${esc(action.label)}</button>` +
        `<span class="toast__bar" style="--dur:${life}ms"></span>`
      : '');

  if (action) {
    el.querySelector('.toast__action').addEventListener('click', () => {
      action.onClick();
      dismiss(el);
    });
  }

  root.appendChild(el);
  toastTimer = setTimeout(() => dismiss(el), life);
}

function dismiss(el) {
  el.classList.add('is-leaving');
  setTimeout(() => el.remove(), 240);
}

/* ------------------------------------------------------------- sparkles -- */

const CONFETTI = ['✨', '🌿', '⭐️', '🍃', '💫'];

/** A gentle puff of sparkles from an element — the cosy version of confetti. */
export function sparkle(fromEl, count = 9) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const root = document.getElementById('spark-root');
  const box = fromEl.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;

  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    s.className = 'spark';
    s.textContent = CONFETTI[Math.floor(Math.random() * CONFETTI.length)];
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    s.style.setProperty('--dx', `${(Math.random() - 0.5) * 190}px`);
    s.style.setProperty('--dy', `${-60 - Math.random() * 130}px`);
    s.style.setProperty('--rot', `${(Math.random() - 0.5) * 220}deg`);
    s.style.animationDelay = `${Math.random() * 130}ms`;
    root.appendChild(s);
    setTimeout(() => s.remove(), 1250);
  }
}
