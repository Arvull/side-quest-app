/** Bottom sheets: the quest-type picker, the two quest editors, confirmations. */

import { esc, icons } from './ui.js';
import { WEEKDAYS } from './schedule.js';
import * as store from './store.js';

const DAILY_ICONS = ['🧹', '🛁', '🪴', '🧺', '🍳', '🛏️', '🚗', '📮', '💊', '🏃', '📚', '🧴', '🗑️', '🐾', '💌'];
const EPIC_ICONS = ['🏔️', '🎹', '✍️', '🌍', '🏡', '💪', '🎓', '🎨', '💰', '🧭', '🌱', '📷', '🚀', '🫶', '🏅'];

let closer = null;

export function closeSheet() {
  if (closer) closer();
}

/** Renders a sheet + scrim and wires up dismissal. `build` returns HTML. */
function openSheet(build, onMount) {
  closeSheet();
  const root = document.getElementById('sheet-root');
  root.innerHTML = `
    <div class="scrim" data-sheet-close></div>
    <section class="sheet" role="dialog" aria-modal="true">
      <div class="sheet__grip"></div>
      ${build()}
    </section>`;

  const sheet = root.querySelector('.sheet');
  const onKey = (e) => { if (e.key === 'Escape') closeSheet(); };

  closer = () => {
    document.removeEventListener('keydown', onKey);
    root.innerHTML = '';
    closer = null;
  };

  document.addEventListener('keydown', onKey);
  root.querySelector('[data-sheet-close]').addEventListener('click', closeSheet);
  root.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeSheet));

  if (onMount) onMount(sheet);

  const focusMe = sheet.querySelector('[data-autofocus]');
  if (focusMe) setTimeout(() => focusMe.focus(), 90);
}

function head(title) {
  return `
    <div class="sheet__head">
      <h2>${esc(title)}</h2>
      <button class="icon-btn" type="button" data-close aria-label="Close">${icons.close}</button>
    </div>`;
}

/* ------------------------------------------------------- type chooser -- */

export function openQuestPicker() {
  openSheet(() => `
    ${head('Post a new quest')}
    <button class="picker-opt" type="button" data-pick="daily">
      <span class="picker-opt__icon">🧹</span>
      <span>
        <span class="picker-opt__title">Daily Quest</span>
        <span class="picker-opt__desc">A task that comes back around — chores, habits, small kindnesses.</span>
      </span>
    </button>
    <button class="picker-opt" type="button" data-pick="epic">
      <span class="picker-opt__icon">🏔️</span>
      <span>
        <span class="picker-opt__title">Epic Quest</span>
        <span class="picker-opt__desc">A big goal, broken into sub-quests you can actually finish.</span>
      </span>
    </button>
  `, (sheet) => {
    sheet.querySelectorAll('[data-pick]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const kind = btn.dataset.pick;
        closeSheet();
        setTimeout(() => (kind === 'daily' ? openDailyEditor() : openEpicEditor()), 120);
      });
    });
  });
}

/* --------------------------------------------------------- daily editor -- */

export function openDailyEditor(quest = null) {
  const draft = quest
    ? { ...quest, repeat: { ...quest.repeat, days: [...(quest.repeat.days || [])] } }
    : { title: '', note: '', icon: '🧹', xp: 10, repeat: { type: 'daily', every: 3, days: [new Date().getDay()], day: new Date().getDate() } };

  const r = draft.repeat;
  if (!r.every) r.every = 3;
  if (!r.days || !r.days.length) r.days = [new Date().getDay()];
  if (!r.day) r.day = new Date().getDate();

  openSheet(() => `
    ${head(quest ? 'Edit daily quest' : 'New daily quest')}
    <form id="daily-form" novalidate>
      <div class="field">
        <label class="field__label" for="d-title">Quest</label>
        <input class="input" id="d-title" name="title" data-autofocus placeholder="Bathroom deep clean"
               value="${esc(draft.title)}" maxlength="80" required />
      </div>

      <div class="field">
        <label class="field__label" for="d-note">Notes <span style="text-transform:none;letter-spacing:0">(optional)</span></label>
        <textarea class="textarea" id="d-note" name="note" maxlength="240"
                  placeholder="Tiles, mirror, the bit behind the taps.">${esc(draft.note)}</textarea>
      </div>

      <div class="field">
        <span class="field__label">Marker</span>
        <div class="emoji-grid" data-emoji>
          ${DAILY_ICONS.map((e) => `<button class="emoji-opt ${e === draft.icon ? 'is-active' : ''}" type="button" data-emoji-opt="${e}">${e}</button>`).join('')}
        </div>
      </div>

      <div class="field">
        <span class="field__label">Repeats</span>
        <div class="segmented" data-repeat-type>
          ${[['daily', 'Daily'], ['weekly', 'Weekly'], ['interval', 'Every N'], ['monthly', 'Monthly']]
            .map(([v, l]) => `<button type="button" data-type="${v}" class="${r.type === v ? 'is-active' : ''}">${l}</button>`).join('')}
        </div>
      </div>

      <div class="field" data-panel="weekly" ${r.type === 'weekly' ? '' : 'hidden'}>
        <span class="field__label">On these days</span>
        <div class="daypicker" data-days>
          ${WEEKDAYS.map((d, i) => `<button type="button" data-day="${i}" class="${r.days.includes(i) ? 'is-active' : ''}">${d[0]}</button>`).join('')}
        </div>
      </div>

      <div class="field" data-panel="interval" ${r.type === 'interval' ? '' : 'hidden'}>
        <label class="field__label" for="d-every">Every how many days?</label>
        <input class="input" id="d-every" type="number" min="1" max="365" value="${r.every}" />
      </div>

      <div class="field" data-panel="monthly" ${r.type === 'monthly' ? '' : 'hidden'}>
        <label class="field__label" for="d-day">Day of the month</label>
        <input class="input" id="d-day" type="number" min="1" max="31" value="${r.day}" />
      </div>

      <div class="field">
        <label class="field__label" for="d-xp">Reward</label>
        <select class="select" id="d-xp">
          ${[[5, 'Small — 5 XP'], [10, 'Everyday — 10 XP'], [20, 'Proper effort — 20 XP'], [35, 'Big job — 35 XP']]
            .map(([v, l]) => `<option value="${v}" ${Number(draft.xp) === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>

      <div class="sheet__actions">
        <button class="btn btn--ghost" type="button" data-close>Cancel</button>
        <button class="btn btn--primary" type="submit">${quest ? 'Save quest' : 'Add to log'}</button>
      </div>
    </form>
  `, (sheet) => {
    const state = { icon: draft.icon, type: r.type, days: [...r.days] };

    sheet.querySelector('[data-emoji]').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-emoji-opt]');
      if (!btn) return;
      state.icon = btn.dataset.emojiOpt;
      sheet.querySelectorAll('[data-emoji-opt]').forEach((b) => b.classList.toggle('is-active', b === btn));
    });

    sheet.querySelector('[data-repeat-type]').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-type]');
      if (!btn) return;
      state.type = btn.dataset.type;
      sheet.querySelectorAll('[data-type]').forEach((b) => b.classList.toggle('is-active', b === btn));
      ['weekly', 'interval', 'monthly'].forEach((p) => {
        sheet.querySelector(`[data-panel="${p}"]`).hidden = p !== state.type;
      });
    });

    sheet.querySelector('[data-days]').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-day]');
      if (!btn) return;
      const day = Number(btn.dataset.day);
      state.days = state.days.includes(day) ? state.days.filter((d) => d !== day) : [...state.days, day];
      if (!state.days.length) state.days = [day];
      sheet.querySelectorAll('[data-day]').forEach((b) => b.classList.toggle('is-active', state.days.includes(Number(b.dataset.day))));
    });

    sheet.querySelector('#daily-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const title = sheet.querySelector('#d-title').value.trim();
      if (!title) return sheet.querySelector('#d-title').focus();

      const repeat = { type: state.type };
      if (state.type === 'weekly') repeat.days = state.days;
      if (state.type === 'interval') repeat.every = clamp(sheet.querySelector('#d-every').value, 1, 365, 3);
      if (state.type === 'monthly') repeat.day = clamp(sheet.querySelector('#d-day').value, 1, 31, 1);

      const payload = {
        title,
        note: sheet.querySelector('#d-note').value,
        icon: state.icon,
        xp: Number(sheet.querySelector('#d-xp').value),
        repeat,
      };

      if (quest) store.updateDaily(quest.id, payload);
      else store.createDaily(payload);
      closeSheet();
    });
  });
}

/* ---------------------------------------------------------- epic editor -- */

export function openEpicEditor(epic = null) {
  const draft = epic || { title: '', why: '', icon: '🏔️', targetDate: '', xp: 150 };
  const isNew = !epic;

  openSheet(() => `
    ${head(epic ? 'Edit epic quest' : 'New epic quest')}
    <form id="epic-form" novalidate>
      <div class="field">
        <label class="field__label" for="e-title">The goal</label>
        <input class="input" id="e-title" data-autofocus placeholder="Learn to play the piano"
               value="${esc(draft.title)}" maxlength="90" required />
      </div>

      <div class="field">
        <label class="field__label" for="e-why">Why it matters <span style="text-transform:none;letter-spacing:0">(optional)</span></label>
        <textarea class="textarea" id="e-why" maxlength="240"
                  placeholder="So I can sit down at one and actually play something.">${esc(draft.why || '')}</textarea>
      </div>

      <div class="field">
        <span class="field__label">Marker</span>
        <div class="emoji-grid" data-emoji>
          ${EPIC_ICONS.map((e) => `<button class="emoji-opt ${e === draft.icon ? 'is-active' : ''}" type="button" data-emoji-opt="${e}">${e}</button>`).join('')}
        </div>
      </div>

      ${isNew ? `
      <div class="field">
        <span class="field__label">Sub-quests</span>
        <div data-steps></div>
        <button class="btn btn--ghost btn--sm" type="button" data-add-step style="margin-top:8px">${icons.plus} Add a step</button>
      </div>` : ''}

      <div class="field__row">
        <div class="field">
          <label class="field__label" for="e-date">Target date</label>
          <input class="input" id="e-date" type="date" value="${esc(draft.targetDate || '')}" />
        </div>
        <div class="field">
          <label class="field__label" for="e-xp">Reward</label>
          <select class="select" id="e-xp">
            ${[[100, '100 XP'], [150, '150 XP'], [250, '250 XP'], [500, '500 XP']]
              .map(([v, l]) => `<option value="${v}" ${Number(draft.xp) === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="sheet__actions">
        <button class="btn btn--ghost" type="button" data-close>Cancel</button>
        <button class="btn btn--primary" type="submit">${epic ? 'Save quest' : 'Begin the quest'}</button>
      </div>
    </form>
  `, (sheet) => {
    const state = { icon: draft.icon };

    sheet.querySelector('[data-emoji]').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-emoji-opt]');
      if (!btn) return;
      state.icon = btn.dataset.emojiOpt;
      sheet.querySelectorAll('[data-emoji-opt]').forEach((b) => b.classList.toggle('is-active', b === btn));
    });

    if (isNew) {
      const steps = sheet.querySelector('[data-steps]');
      const addRow = (value = '') => {
        const row = document.createElement('div');
        row.className = 'step-add';
        row.innerHTML = `<input class="step-input" placeholder="A step towards it…" maxlength="90" value="${esc(value)}" />
                         <button class="icon-btn" type="button" data-drop-step aria-label="Remove step">${icons.close}</button>`;
        row.querySelector('[data-drop-step]').addEventListener('click', () => {
          row.remove();
          if (!steps.children.length) addRow();
        });
        row.querySelector('input').addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter') { ev.preventDefault(); addRow(); steps.lastElementChild.querySelector('input').focus(); }
        });
        steps.appendChild(row);
      };
      addRow(); addRow(); addRow();
      sheet.querySelector('[data-add-step]').addEventListener('click', () => {
        addRow();
        steps.lastElementChild.querySelector('input').focus();
      });
    }

    sheet.querySelector('#epic-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const title = sheet.querySelector('#e-title').value.trim();
      if (!title) return sheet.querySelector('#e-title').focus();

      const payload = {
        title,
        why: sheet.querySelector('#e-why').value,
        icon: state.icon,
        targetDate: sheet.querySelector('#e-date').value || null,
        xp: Number(sheet.querySelector('#e-xp').value),
      };

      if (epic) {
        store.updateEpic(epic.id, payload);
      } else {
        payload.steps = [...sheet.querySelectorAll('.step-input')].map((i) => i.value);
        store.createEpic(payload);
      }
      closeSheet();
    });
  });
}

/* ------------------------------------------------------- quest actions -- */

export function openQuestActions(kind, item) {
  openSheet(() => `
    ${head(item.title)}
    <button class="list-row" type="button" data-act="edit">
      <span class="list-row__icon">${icons.edit}</span>
      <span class="list-row__text"><span class="list-row__title">Edit quest</span></span>
    </button>
    <button class="list-row" type="button" data-act="delete">
      <span class="list-row__icon" style="color:var(--rose)">${icons.trash}</span>
      <span class="list-row__text"><span class="list-row__title" style="color:var(--rose)">Abandon quest</span>
      <span class="list-row__desc">Removes it from the log for good.</span></span>
    </button>
  `, (sheet) => {
    sheet.querySelector('[data-act="edit"]').addEventListener('click', () => {
      closeSheet();
      setTimeout(() => (kind === 'daily' ? openDailyEditor(item) : openEpicEditor(item)), 120);
    });
    sheet.querySelector('[data-act="delete"]').addEventListener('click', () => {
      closeSheet();
      setTimeout(() => confirmSheet({
        title: 'Abandon this quest?',
        body: `“${item.title}” will be removed from your log. This cannot be undone.`,
        confirm: 'Abandon it',
        onConfirm: () => (kind === 'daily' ? store.deleteDaily(item.id) : store.deleteEpic(item.id)),
      }), 120);
    });
  });
}

export function confirmSheet({ title, body, confirm, onConfirm }) {
  openSheet(() => `
    ${head(title)}
    <p style="color:var(--ink-soft);font-size:14.5px">${esc(body)}</p>
    <div class="sheet__actions">
      <button class="btn btn--ghost" type="button" data-close>Keep it</button>
      <button class="btn btn--danger" type="button" data-confirm>${esc(confirm)}</button>
    </div>
  `, (sheet) => {
    sheet.querySelector('[data-confirm]').addEventListener('click', () => {
      onConfirm();
      closeSheet();
    });
  });
}

function clamp(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}
