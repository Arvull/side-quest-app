/** Bootstrap: routing, delegated events, theme, install prompt, backups. */

import * as store from './store.js';
import { views } from './views.js';
import { toast, sparkle } from './ui.js';
import {
  openQuestPicker, openDailyEditor, openEpicEditor, openQuestActions, confirmSheet,
} from './sheets.js';

const viewRoot = document.getElementById('view');
const tabbar = document.getElementById('tabbar');

let route = 'today';
let installPrompt = null;

/* ---------------------------------------------------------------- render -- */

function render() {
  const focus = captureFocus();

  viewRoot.innerHTML = views[route](store.getState());
  tabbar.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('is-active', b.dataset.tab === route));

  restoreFocus(focus);
}

/** Keeps the cursor where it was when a keystroke triggers a re-render. */
function captureFocus() {
  const el = document.activeElement;
  if (!el || !viewRoot.contains(el)) return null;
  const key = el.dataset.newStep ? `[data-new-step="${el.dataset.newStep}"]` : el.id ? `#${el.id}` : null;
  if (!key) return null;
  return { key, start: el.selectionStart, end: el.selectionEnd, value: el.value };
}

function restoreFocus(focus) {
  if (!focus) return;
  const el = viewRoot.querySelector(focus.key);
  if (!el) return;
  el.value = focus.value;
  el.focus();
  try { el.setSelectionRange(focus.start, focus.end); } catch { /* not a text input */ }
}

function go(next) {
  if (next === route) {
    viewRoot.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  route = next;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

store.subscribe(render);

/* ------------------------------------------------------------------ theme -- */

function applyTheme() {
  const theme = store.getState().profile.theme;
  if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
}

function cycleTheme() {
  const order = ['auto', 'dawn', 'dusk'];
  const now = store.getState().profile.theme;
  const next = order[(order.indexOf(now) + 1) % order.length];
  store.setTheme(next);
  applyTheme();
  toast(next === 'auto' ? 'Following your device' : next === 'dawn' ? 'Dawn — warm and light' : 'Dusk — lamplit and dark');
}

/* --------------------------------------------------------------- actions -- */

const actions = {
  'quick-add': () => openQuestPicker(),
  'new-daily': () => openDailyEditor(),
  'new-epic': () => openEpicEditor(),
  'toggle-theme': () => cycleTheme(),

  'complete-daily': (el, { id }) => {
    const card = el.closest('.quest');
    card.classList.add('is-done');
    sparkle(el);

    const token = store.completeDaily(id);
    if (!token) return;

    const quest = store.getState().dailies.find((q) => q.id === id);
    const line = quest && quest.streak >= 2
      ? `${quest.title} · ${quest.streak} in a row`
      : `${token.snapshot.title} · +${token.xp} XP`;

    toast(line, { label: 'Undo', onClick: () => store.undoDaily(token) });
    if (token.levelled) celebrateLevel(token.levelled, el);
  },

  'daily-actions': (el, { id }) => {
    const quest = store.getState().dailies.find((q) => q.id === id);
    if (quest) openQuestActions('daily', quest);
  },

  'epic-actions': (el, { id }) => {
    const epic = store.getState().epics.find((e) => e.id === id);
    if (epic) openQuestActions('epic', epic);
  },

  'toggle-step': (el, { id, step }) => {
    const result = store.toggleStep(id, step);
    if (!result) return;
    if (result.done) sparkle(el, result.epicDone ? 22 : 7);
    if (result.epicDone) {
      toast(`Epic complete: ${result.epicTitle} · +${result.xp} XP`);
    } else if (result.done) {
      toast(`Step done · +${result.xp} XP`);
    }
    if (result.levelled) celebrateLevel(result.levelled, el);
  },

  'delete-step': (el, { id, step }) => store.deleteStep(id, step),

  install: () => promptInstall(),
  export: () => exportLog(),
  import: () => importLog(),

  reset: () => confirmSheet({
    title: 'Start a fresh log?',
    body: 'Every quest, streak and XP point will be erased. There is no undo.',
    confirm: 'Erase everything',
    onConfirm: () => { store.resetAll(); toast('A blank page. Off you go.'); },
  }),
};

function celebrateLevel(level, el) {
  const info = store.levelInfo(store.getState().profile.xp);
  setTimeout(() => {
    sparkle(el, 24);
    toast(`Level ${level} — you are now a ${info.title}!`);
  }, 900);
}

/* -------------------------------------------------------------- delegation -- */

document.addEventListener('click', (event) => {
  const tab = event.target.closest('[data-tab]');
  if (tab) return go(tab.dataset.tab);

  const el = event.target.closest('[data-action]');
  if (!el) return;
  const fn = actions[el.dataset.action];
  if (fn) fn(el, el.dataset);
});

/* --------------------------------------------------------- hold to finish -- */

/**
 * Completing a quest takes a short press rather than a tap. A stray thumb on a
 * scrolling list can't tick anything off, and the filling ring makes the wait
 * feel like a deliberate action instead of a delay.
 */
const HOLD_MS = 480;
let holding = null;

function startHold(el) {
  releaseHold(true);
  el.classList.add('is-holding');
  holding = {
    el,
    at: Date.now(),
    timer: setTimeout(() => {
      const target = holding && holding.el;
      holding = null;
      if (!target) return;
      target.classList.remove('is-holding');
      if (navigator.vibrate) navigator.vibrate(12);
      runHoldAction(target);
    }, HOLD_MS),
  };
}

function releaseHold(silent) {
  if (!holding) return;
  clearTimeout(holding.timer);
  holding.el.classList.remove('is-holding');
  const tooQuick = Date.now() - holding.at < HOLD_MS;
  holding = null;
  if (tooQuick && !silent) toast('Hold to complete');
}

function runHoldAction(el) {
  const fn = actions[el.dataset.hold];
  if (fn) fn(el, el.dataset);
}

document.addEventListener('pointerdown', (event) => {
  if (event.button > 0) return;
  const el = event.target.closest('[data-hold]');
  if (el) startHold(el);
});
document.addEventListener('pointerup', () => releaseHold());
document.addEventListener('pointercancel', () => releaseHold(true));

// Keyboard activation is deliberate by nature, so it needs no hold.
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const el = event.target.closest && event.target.closest('[data-hold]');
  if (!el) return;
  event.preventDefault();
  runHoldAction(el);
});

// "Add a sub-quest" inputs inside epic cards.
document.addEventListener('keydown', (event) => {
  const input = event.target.closest('[data-new-step]');
  if (!input || event.key !== 'Enter') return;
  event.preventDefault();
  const value = input.value.trim();
  if (!value) return;
  input.value = '';
  store.addStep(input.dataset.newStep, value);
});

document.addEventListener('change', (event) => {
  const input = event.target.closest('[data-action-input="set-name"]');
  if (input) store.setName(input.value);
});

/* ----------------------------------------------------------------- backup -- */

function exportLog() {
  const blob = new Blob([store.exportJSON()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `side-quest-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Quest log saved');
}

function importLog() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      store.importJSON(await file.text());
      applyTheme();
      toast('Quest log restored');
    } catch (err) {
      toast(err.message || 'That file could not be read');
    }
  });
  input.click();
}

/* ---------------------------------------------------------------- install -- */

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
});

async function promptInstall() {
  if (installPrompt) {
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    installPrompt = null;
    toast(outcome === 'accepted' ? 'Installing — see you on the home screen' : 'No bother, maybe later');
    return;
  }

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  confirmSheet({
    title: standalone ? 'Already installed' : 'Install Side Quest',
    body: standalone
      ? 'You are running the installed app right now.'
      : isIOS
        ? 'Tap the Share button in Safari, then choose "Add to Home Screen".'
        : 'Open your browser menu and choose "Install app" or "Add to Home screen".',
    confirm: 'Got it',
    onConfirm: () => {},
  });
}

/* ------------------------------------------------------------------- boot -- */

applyTheme();
render();

// A day can tick over while the app sits open in the background.
let lastDay = new Date().getDate();
setInterval(() => {
  const day = new Date().getDate();
  if (day !== lastDay) { lastDay = day; render(); }
}, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });

/* ------------------------------------------------------------ self-update -- */

/**
 * Keeps the installed app current on its own: it checks for a new version
 * every time you bring the app to the foreground, offers a one-tap refresh
 * when one is waiting, and applies it silently on the next cold start
 * regardless. Re-adding to the home screen is never needed.
 */
function watchForUpdates(reg) {
  const offer = (worker) => {
    toast('A new version is ready', {
      label: 'Refresh',
      onClick: () => worker.postMessage({ type: 'SKIP_WAITING' }),
    });
  };

  if (reg.waiting) offer(reg.waiting);

  reg.addEventListener('updatefound', () => {
    const incoming = reg.installing;
    if (!incoming) return;
    incoming.addEventListener('statechange', () => {
      // No controller means this is the very first install, not an update.
      if (incoming.state === 'installed' && navigator.serviceWorker.controller) offer(incoming);
    });
  });

  let lastCheck = 0;
  const check = () => {
    if (document.hidden || Date.now() - lastCheck < 60000) return;
    lastCheck = Date.now();
    reg.update().catch(() => {});
  };
  document.addEventListener('visibilitychange', check);
  check();

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    location.reload();
  });
}

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(watchForUpdates)
      .catch((err) => console.warn('Offline mode unavailable', err));
  });
}
