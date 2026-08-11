/**
 * View rendering. Each view returns an HTML string; interaction happens through
 * delegated [data-action] handlers in app.js, so nothing needs re-binding.
 */

import { esc, icons } from './ui.js';
import * as store from './store.js';
import {
  todayISO, addDays, describeDue, describeRepeat, prettyDate, daysBetween, fromISO,
} from './schedule.js';

/**
 * Every view opens with a greeting, and the theme toggle rides along in its
 * top-right corner now that the app has no header bar.
 * `title` and `sub` are trusted HTML — callers escape their own values.
 */
function greetingBlock({ eyebrow, title, sub }) {
  return `
    <div class="greeting">
      <div class="greeting__text">
        ${eyebrow ? `<div class="greeting__eyebrow">${esc(eyebrow)}</div>` : ''}
        <h1>${title}</h1>
        ${sub ? `<p>${sub}</p>` : ''}
      </div>
      <button class="theme-btn" type="button" data-action="toggle-theme"
              title="Switch between dawn and dusk" aria-label="Switch theme">${icons.moon}</button>
    </div>`;
}

/* ------------------------------------------------------------- fragments -- */

function levelCard(state) {
  const info = store.levelInfo(state.profile.xp);
  return `
    <div class="hero-card">
      <div class="level-row">
        <div class="level-badge">${info.level}</div>
        <div class="level-meta">
          <div class="level-title">${esc(info.title)}</div>
          <div class="level-sub">${info.into} / ${info.need} XP to level ${info.level + 1}</div>
        </div>
      </div>
      <div class="xpbar"><div class="xpbar__fill" style="width:${Math.round(info.progress * 100)}%"></div></div>
    </div>`;
}

function chip(cls, iconKey, label) {
  return `<span class="chip ${cls}">${iconKey ? icons[iconKey] : ''}${esc(label)}</span>`;
}

function dailyItem(quest, { showRepeat = true } = {}) {
  const late = quest.dueDate < todayISO();
  const overdueBy = late ? Math.abs(daysBetween(todayISO(), quest.dueDate)) : 0;

  const meta = [
    late
      ? chip('chip--late', 'clock', overdueBy === 1 ? '1 day late' : `${overdueBy} days late`)
      : chip('chip--due', 'clock', describeDue(quest.dueDate)),
    showRepeat ? chip('', 'repeat', describeRepeat(quest.repeat)) : '',
    quest.streak > 0 ? chip('chip--streak', 'flame', `${quest.streak}`) : '',
    chip('chip--xp', 'spark', `${quest.xp} XP`),
  ].filter(Boolean).join('');

  return `
    <article class="quest ${late ? 'is-overdue' : ''}" data-quest-id="${quest.id}">
      <button class="quest__check" type="button" data-action="complete-daily" data-id="${quest.id}"
              aria-label="Complete ${esc(quest.title)}">${icons.check}</button>
      <div class="quest__body">
        <div class="quest__title"><span class="quest__emoji">${quest.icon}</span>${esc(quest.title)}</div>
        ${quest.note ? `<p class="quest__note">${esc(quest.note)}</p>` : ''}
        <div class="quest__meta">${meta}</div>
      </div>
      <button class="quest__more" type="button" data-action="daily-actions" data-id="${quest.id}"
              aria-label="Options">${icons.more}</button>
    </article>`;
}

function ring(progress) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const filled = c * progress;
  return `
    <div class="ring">
      <svg viewBox="0 0 52 52">
        <circle class="ring__track" cx="26" cy="26" r="${r}" fill="none" stroke-width="5"/>
        <circle class="ring__fill" cx="26" cy="26" r="${r}" fill="none" stroke-width="5"
                stroke-dasharray="${filled.toFixed(1)} ${c.toFixed(1)}"/>
      </svg>
      <span class="ring__label">${Math.round(progress * 100)}%</span>
    </div>`;
}

function epicCard(epic, { expanded = true } = {}) {
  const progress = store.epicProgress(epic);
  const doneCount = epic.steps.filter((s) => s.done).length;
  const complete = Boolean(epic.completedAt);

  const target = epic.targetDate
    ? chip('', 'target', `by ${fromISO(epic.targetDate).getDate()} ${fromISO(epic.targetDate).toLocaleString('en-GB', { month: 'short' })}`)
    : '';

  return `
    <article class="epic ${complete ? 'is-complete' : ''}" data-epic-id="${epic.id}">
      <header class="epic__head">
        <div class="picker-opt__icon" style="width:44px;height:44px">${epic.icon}</div>
        <div class="epic__head-text">
          <h3 class="epic__title">${esc(epic.title)}</h3>
          ${epic.why ? `<p class="epic__why">${esc(epic.why)}</p>` : ''}
          <div class="quest__meta">
            ${chip('', null, `${doneCount} of ${epic.steps.length} steps`)}
            ${target}
            ${complete ? chip('chip--xp', 'spark', 'Complete!') : chip('chip--xp', 'spark', `${epic.xp} XP`)}
          </div>
        </div>
        ${ring(progress)}
        <button class="quest__more" type="button" data-action="epic-actions" data-id="${epic.id}"
                aria-label="Options">${icons.more}</button>
      </header>

      ${expanded ? `
      <div class="epic__steps">
        ${epic.steps.map((step) => `
          <div class="step ${step.done ? 'is-done' : ''}">
            <button class="step__check" type="button" data-action="toggle-step"
                    data-id="${epic.id}" data-step="${step.id}"
                    aria-label="${step.done ? 'Undo' : 'Complete'} ${esc(step.title)}">${icons.check}</button>
            <span class="step__title">${esc(step.title)}</span>
            <button class="step__del" type="button" data-action="delete-step"
                    data-id="${epic.id}" data-step="${step.id}" aria-label="Remove step">${icons.close}</button>
          </div>`).join('')}
        <div class="step-add">
          <input data-new-step="${epic.id}" placeholder="Add a sub-quest…" maxlength="90" />
        </div>
      </div>` : ''}
    </article>`;
}

function empty(art, title, body, actionLabel, action) {
  return `
    <div class="empty">
      <div class="empty__art">${art}</div>
      <h3>${esc(title)}</h3>
      <p>${esc(body)}</p>
      ${actionLabel ? `<button class="btn btn--primary" type="button" data-action="${action}">${icons.plus} ${esc(actionLabel)}</button>` : ''}
    </div>`;
}

/* ------------------------------------------------------------------ today -- */

function greetingLine() {
  const h = new Date().getHours();
  if (h < 5) return 'Still up?';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function today(state) {
  const due = store.dueToday();
  const liveEpics = state.epics.filter((e) => !e.completedAt && e.steps.some((s) => !s.done));

  // The next two days, so nothing lands as a surprise.
  const horizon = addDays(todayISO(), 2);
  const soon = state.dailies
    .filter((q) => q.dueDate > todayISO() && q.dueDate <= horizon)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title));

  const nextSteps = liveEpics.slice(0, 3).map((epic) => {
    const step = epic.steps.find((s) => !s.done);
    return `
      <article class="quest" data-epic-id="${epic.id}">
        <button class="step__check" type="button" style="width:30px;height:30px;border-radius:999px;margin-top:1px"
                data-action="toggle-step" data-id="${epic.id}" data-step="${step.id}"
                aria-label="Complete ${esc(step.title)}">${icons.check}</button>
        <div class="quest__body">
          <div class="quest__title"><span class="quest__emoji">${epic.icon}</span>${esc(step.title)}</div>
          <p class="quest__note">Towards “${esc(epic.title)}”</p>
          <div class="quest__meta">${chip('chip--xp', 'spark', '15 XP')}</div>
        </div>
      </article>`;
  }).join('');

  return `
    ${greetingBlock({
      eyebrow: prettyDate(),
      title: `${greetingLine()}, ${esc(state.profile.name)}.`,
      sub: due.length
        ? `${due.length} quest${due.length === 1 ? '' : 's'} waiting for you today.`
        : 'Your daily quests are all done. Lovely.',
    })}

    ${levelCard(state)}

    <section class="section">
      <div class="section__head">
        <h2>Today's quests</h2>
        <span class="section__count">${due.length}</span>
      </div>
      ${due.length
        ? `<div class="quests">${due.map((q) => dailyItem(q, { showRepeat: false })).join('')}</div>`
        : state.dailies.length
          ? empty('🌾', 'All clear', 'Nothing due today. Rest is part of the quest.', null, null)
          : empty('🧹', 'No daily quests yet', 'Add the small repeating things — the ones you always forget.', 'Add a daily quest', 'new-daily')}
    </section>

    ${soon.length ? `
    <section class="section">
      <div class="section__head">
        <h2>Coming up</h2>
        <span class="section__count">next two days</span>
      </div>
      <div class="quests quests--ahead">${soon.map((q) => dailyItem(q, { showRepeat: false })).join('')}</div>
    </section>` : ''}

    ${nextSteps ? `
    <section class="section">
      <div class="section__head">
        <h2>Next steps on your epics</h2>
        <span class="section__count">${liveEpics.length} in progress</span>
      </div>
      <div class="quests">${nextSteps}</div>
    </section>` : ''}
  `;
}

/* ---------------------------------------------------------------- dailies -- */

export function dailies(state) {
  const due = store.dueToday();
  const later = store.upcoming();

  if (!state.dailies.length) {
    return `
      ${greetingBlock({ title: 'Daily quests', sub: 'The small, repeating things.' })}
      ${empty('🧹', 'Your log is empty', 'Bathroom deep clean, water the plants, wash the bedding — whatever keeps coming back around.', 'Add a daily quest', 'new-daily')}`;
  }

  return `
    ${greetingBlock({
      title: 'Daily quests',
      sub: `${state.dailies.length} in the log · ${due.length} due now`,
    })}

    ${due.length ? `
    <section class="section" style="margin-top:6px">
      <div class="section__head"><h2>Due now</h2><span class="section__count">${due.length}</span></div>
      <div class="quests">${due.map((q) => dailyItem(q)).join('')}</div>
    </section>` : ''}

    ${later.length ? `
    <section class="section">
      <div class="section__head"><h2>Coming up</h2><span class="section__count">${later.length}</span></div>
      <div class="quests">${later.map((q) => dailyItem(q)).join('')}</div>
    </section>` : ''}

    <button class="btn btn--ghost btn--block" type="button" data-action="new-daily" style="margin-top:18px">
      ${icons.plus} New daily quest
    </button>`;
}

/* ------------------------------------------------------------------ epics -- */

export function epics(state) {
  const live = state.epics.filter((e) => !e.completedAt);
  const done = state.epics.filter((e) => e.completedAt);

  if (!state.epics.length) {
    return `
      ${greetingBlock({ title: 'Epic quests', sub: 'Big goals, broken into steps.' })}
      ${empty('🏔️', 'No epics yet', 'Pick something that would genuinely change your year, then break it into sub-quests.', 'Begin an epic quest', 'new-epic')}`;
  }

  return `
    ${greetingBlock({
      title: 'Epic quests',
      sub: `${live.length} in progress${done.length ? ` · ${done.length} completed` : ''}`,
    })}

    ${live.map((e) => epicCard(e)).join('')}

    ${done.length ? `
    <section class="section">
      <div class="section__head"><h2>Completed</h2><span class="section__count">${done.length}</span></div>
      ${done.map((e) => epicCard(e, { expanded: false })).join('')}
    </section>` : ''}

    <button class="btn btn--ghost btn--block" type="button" data-action="new-epic" style="margin-top:18px">
      ${icons.plus} New epic quest
    </button>`;
}

/* ----------------------------------------------------------------- hearth -- */

export function hearth(state) {
  const info = store.levelInfo(state.profile.xp);
  const s = store.stats();
  const recent = state.log.slice(0, 6);

  return `
    ${greetingBlock({
      eyebrow: `Level ${info.level}`,
      title: esc(info.title),
      sub: `${state.profile.xp} XP earned since you started.`,
    })}

    ${levelCard(state)}

    <section class="section">
      <div class="section__head"><h2>Your tally</h2></div>
      <div class="stat-grid">
        <div class="stat"><div class="stat__value">${s.dailyDone}</div><div class="stat__label">Dailies completed</div></div>
        <div class="stat"><div class="stat__value">${s.stepsDone}</div><div class="stat__label">Sub-quests done</div></div>
        <div class="stat"><div class="stat__value">${s.currentStreak}</div><div class="stat__label">Best live streak</div></div>
        <div class="stat"><div class="stat__value">${s.bestStreak}</div><div class="stat__label">Longest ever streak</div></div>
        <div class="stat"><div class="stat__value">${s.epicsLive}</div><div class="stat__label">Epics in progress</div></div>
        <div class="stat"><div class="stat__value">${s.epicsDone}</div><div class="stat__label">Epics completed</div></div>
      </div>
    </section>

    ${recent.length ? `
    <section class="section">
      <div class="section__head"><h2>Recently</h2></div>
      <div class="quests">
        ${recent.map((e) => `
          <div class="quest" style="padding:11px 14px">
            <span class="quest__emoji" style="font-size:19px;margin-top:2px">${e.icon || '✨'}</span>
            <div class="quest__body">
              <div class="quest__title" style="font-size:14px">${esc(e.title)}</div>
              <div class="quest__note">${esc(agoLabel(e.ts))} · +${e.xp} XP</div>
            </div>
          </div>`).join('')}
      </div>
    </section>` : ''}

    <section class="section">
      <div class="section__head"><h2>Your log</h2></div>
      <div class="field" style="margin-bottom:12px">
        <label class="field__label" for="h-name">Name</label>
        <input class="input" id="h-name" value="${esc(state.profile.name)}" maxlength="24" data-action-input="set-name" />
      </div>
      <button class="list-row" type="button" data-action="toggle-theme">
        <span class="list-row__icon">${icons.spark}</span>
        <span class="list-row__text">
          <span class="list-row__title">Appearance</span>
          <span class="list-row__desc">${themeLabel(state.profile.theme)}</span>
        </span>
        <span class="list-row__icon">${icons.chevron}</span>
      </button>
      <button class="list-row" type="button" data-action="install">
        <span class="list-row__icon">${icons.install}</span>
        <span class="list-row__text">
          <span class="list-row__title">Install Side Quest</span>
          <span class="list-row__desc">Add it to your home screen or desktop.</span>
        </span>
        <span class="list-row__icon">${icons.chevron}</span>
      </button>
      <button class="list-row" type="button" data-action="export">
        <span class="list-row__icon">${icons.download}</span>
        <span class="list-row__text">
          <span class="list-row__title">Export quest log</span>
          <span class="list-row__desc">Save a backup file you can carry to another device.</span>
        </span>
        <span class="list-row__icon">${icons.chevron}</span>
      </button>
      <button class="list-row" type="button" data-action="import">
        <span class="list-row__icon">${icons.upload}</span>
        <span class="list-row__text">
          <span class="list-row__title">Import quest log</span>
          <span class="list-row__desc">Restore from a backup file.</span>
        </span>
        <span class="list-row__icon">${icons.chevron}</span>
      </button>
      <button class="list-row" type="button" data-action="reset">
        <span class="list-row__icon" style="color:var(--rose)">${icons.trash}</span>
        <span class="list-row__text">
          <span class="list-row__title" style="color:var(--rose)">Start a fresh log</span>
          <span class="list-row__desc">Erases every quest and all your XP.</span>
        </span>
      </button>
    </section>

    <p class="note-line">Everything lives on this device only.<br/>No account, no cloud, no one watching.</p>`;
}

function themeLabel(theme) {
  if (theme === 'dawn') return 'Dawn — warm and light';
  if (theme === 'dusk') return 'Dusk — lamplit and dark';
  return 'Follows your device';
}

function agoLabel(ts) {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export const views = { today, dailies, epics, hearth };
