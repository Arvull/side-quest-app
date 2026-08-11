/**
 * The quest log itself: state, persistence and every action that mutates it.
 *
 * Everything lives in localStorage — no account, no server, no waiting.
 */

import { todayISO, addDays, nextDue, daysBetween } from './schedule.js';

const KEY = 'side-quest/v1';
const SCHEMA = 1;

/** A knight's progress: village lad at level 1, dragon slayer at level 10. */
export const LEVEL_TITLES = [
  'Villager', 'Squire', 'Footman', 'Sworn Sword', 'Knight',
  'Knight-Errant', 'Champion', 'Banneret', 'Paladin', 'Dragon Slayer',
];

const listeners = new Set();

/* ------------------------------------------------------------ plumbing -- */

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function blank() {
  return {
    schema: SCHEMA,
    profile: { name: 'Adventurer', xp: 0, theme: 'auto', createdAt: new Date().toISOString() },
    dailies: [],
    epics: [],
    log: [],
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw);
    return { ...blank(), ...parsed, profile: { ...blank().profile, ...(parsed.profile || {}) } };
  } catch (err) {
    console.error('Could not read the quest log; starting a blank one.', err);
    return blank();
  }
}

let state = load();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Could not save the quest log', err);
  }
}

function emit() {
  save();
  listeners.forEach((fn) => fn(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getState() {
  return state;
}

/* --------------------------------------------------------------- levels -- */

/** Total XP required to have reached a given level. */
export function xpForLevel(level) {
  return (100 * (level - 1) * level) / 2;
}

export function levelInfo(xp) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const floor = xpForLevel(level);
  const ceil = xpForLevel(level + 1);
  return {
    level,
    title: LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)],
    into: xp - floor,
    need: ceil - floor,
    progress: Math.min(1, (xp - floor) / (ceil - floor)),
  };
}

function grantXP(amount) {
  const before = levelInfo(state.profile.xp).level;
  state.profile.xp = Math.max(0, state.profile.xp + amount);
  const after = levelInfo(state.profile.xp).level;
  return after > before ? after : null;
}

function logEntry(entry) {
  state.log.unshift({ id: uid(), ts: Date.now(), ...entry });
  state.log = state.log.slice(0, 300);
}

/* -------------------------------------------------------------- dailies -- */

export function createDaily(data) {
  const today = todayISO();
  const quest = {
    id: uid(),
    title: data.title.trim(),
    note: (data.note || '').trim(),
    icon: data.icon || '🧹',
    xp: Number(data.xp) || 10,
    repeat: data.repeat || { type: 'daily' },
    anchor: today,
    dueDate: nextDue(data.repeat || { type: 'daily' }, today, today),
    streak: 0,
    bestStreak: 0,
    lastDone: null,
    doneCount: 0,
    createdAt: new Date().toISOString(),
  };
  state.dailies.push(quest);
  emit();
  return quest;
}

export function updateDaily(id, data) {
  const quest = state.dailies.find((q) => q.id === id);
  if (!quest) return;
  Object.assign(quest, {
    title: data.title.trim(),
    note: (data.note || '').trim(),
    icon: data.icon || quest.icon,
    xp: Number(data.xp) || quest.xp,
    repeat: data.repeat || quest.repeat,
  });
  // Re-anchor so "every 3 days" counts from the edit, and re-derive the due date.
  quest.anchor = quest.lastDone || todayISO();
  quest.dueDate = nextDue(quest.repeat, quest.anchor, quest.dueDate < todayISO() ? todayISO() : quest.dueDate);
  emit();
}

export function deleteDaily(id) {
  state.dailies = state.dailies.filter((q) => q.id !== id);
  emit();
}

/**
 * Tick off a recurring quest: award XP, extend the streak, roll the due date.
 * Returns an undo token so the toast can put it all back.
 */
export function completeDaily(id) {
  const quest = state.dailies.find((q) => q.id === id);
  if (!quest) return null;

  const snapshot = { ...quest };
  const today = todayISO();

  // A streak survives if the previous completion was on or after the last due date.
  const kept = quest.lastDone && daysBetween(quest.lastDone, today) <= expectedGap(quest);
  quest.streak = kept ? quest.streak + 1 : 1;
  quest.bestStreak = Math.max(quest.bestStreak || 0, quest.streak);
  quest.lastDone = today;
  quest.doneCount = (quest.doneCount || 0) + 1;
  quest.anchor = today;
  quest.dueDate = nextDue(quest.repeat, today, addDays(today, 1));

  const levelled = grantXP(quest.xp);
  logEntry({ kind: 'daily', refId: quest.id, title: quest.title, icon: quest.icon, xp: quest.xp });

  emit();
  return { questId: id, snapshot, xp: quest.xp, levelled };
}

export function undoDaily(token) {
  if (!token) return;
  const idx = state.dailies.findIndex((q) => q.id === token.questId);
  if (idx === -1) return;
  state.dailies[idx] = token.snapshot;
  state.profile.xp = Math.max(0, state.profile.xp - token.xp);
  state.log = state.log.filter((e) => !(e.kind === 'daily' && e.refId === token.questId && Date.now() - e.ts < 60000));
  emit();
}

/** How many days may pass between completions before a streak lapses. */
function expectedGap(quest) {
  switch (quest.repeat.type) {
    case 'daily': return 1;
    case 'interval': return Math.max(1, quest.repeat.every || 2);
    case 'weekly': return 7;
    case 'monthly': return 31;
    default: return 1;
  }
}

/** Quests wanted today or already overdue, most-overdue first. */
export function dueToday(list = state.dailies) {
  const today = todayISO();
  return list
    .filter((q) => q.dueDate <= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title));
}

export function upcoming(list = state.dailies) {
  const today = todayISO();
  return list
    .filter((q) => q.dueDate > today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

/* ---------------------------------------------------------------- epics -- */

export function createEpic(data) {
  const epic = {
    id: uid(),
    title: data.title.trim(),
    why: (data.why || '').trim(),
    icon: data.icon || '🏔️',
    targetDate: data.targetDate || null,
    xp: Number(data.xp) || 150,
    steps: (data.steps || [])
      .map((s) => (typeof s === 'string' ? s : s.title))
      .map((t) => t.trim())
      .filter(Boolean)
      .map((title) => ({ id: uid(), title, done: false, doneAt: null })),
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
  state.epics.push(epic);
  emit();
  return epic;
}

export function updateEpic(id, data) {
  const epic = state.epics.find((e) => e.id === id);
  if (!epic) return;
  Object.assign(epic, {
    title: data.title.trim(),
    why: (data.why || '').trim(),
    icon: data.icon || epic.icon,
    targetDate: data.targetDate || null,
    xp: Number(data.xp) || epic.xp,
  });
  emit();
}

export function deleteEpic(id) {
  state.epics = state.epics.filter((e) => e.id !== id);
  emit();
}

export function addStep(epicId, title) {
  const epic = state.epics.find((e) => e.id === epicId);
  if (!epic || !title.trim()) return;
  epic.steps.push({ id: uid(), title: title.trim(), done: false, doneAt: null });
  epic.completedAt = null;
  emit();
}

export function deleteStep(epicId, stepId) {
  const epic = state.epics.find((e) => e.id === epicId);
  if (!epic) return;
  epic.steps = epic.steps.filter((s) => s.id !== stepId);
  emit();
}

/** Toggle a sub-quest. Finishing the last one completes the epic (and pays out). */
export function toggleStep(epicId, stepId) {
  const epic = state.epics.find((e) => e.id === epicId);
  if (!epic) return null;
  const step = epic.steps.find((s) => s.id === stepId);
  if (!step) return null;

  step.done = !step.done;
  step.doneAt = step.done ? new Date().toISOString() : null;

  let xp = 0;
  let epicDone = false;
  let levelled = null;

  if (step.done) {
    xp = 15;
    levelled = grantXP(xp);
    logEntry({ kind: 'step', refId: epic.id, title: step.title, icon: epic.icon, xp });
  } else {
    grantXP(-15);
  }

  const allDone = epic.steps.length > 0 && epic.steps.every((s) => s.done);
  if (allDone && !epic.completedAt) {
    epic.completedAt = new Date().toISOString();
    epicDone = true;
    levelled = grantXP(epic.xp) || levelled;
    logEntry({ kind: 'epic', refId: epic.id, title: epic.title, icon: epic.icon, xp: epic.xp });
    xp += epic.xp;
  } else if (!allDone && epic.completedAt) {
    epic.completedAt = null;
    grantXP(-epic.xp);
  }

  emit();
  return { done: step.done, xp, epicDone, levelled, epicTitle: epic.title };
}

export function epicProgress(epic) {
  if (!epic.steps.length) return 0;
  return epic.steps.filter((s) => s.done).length / epic.steps.length;
}

/* -------------------------------------------------------------- profile -- */

export function setTheme(theme) {
  state.profile.theme = theme;
  emit();
}

export function setName(name) {
  state.profile.name = name.trim() || 'Adventurer';
  emit();
}

export function stats() {
  const dailyDone = state.dailies.reduce((n, q) => n + (q.doneCount || 0), 0);
  const stepsDone = state.epics.reduce((n, e) => n + e.steps.filter((s) => s.done).length, 0);
  const best = state.dailies.reduce((n, q) => Math.max(n, q.bestStreak || 0), 0);
  const live = state.dailies.reduce((n, q) => Math.max(n, q.streak || 0), 0);
  return {
    dailyDone,
    stepsDone,
    bestStreak: best,
    currentStreak: live,
    epicsDone: state.epics.filter((e) => e.completedAt).length,
    epicsLive: state.epics.filter((e) => !e.completedAt).length,
  };
}

/* ------------------------------------------------------------- transfer -- */

export function exportJSON() {
  return JSON.stringify(state, null, 2);
}

export function importJSON(text) {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.dailies)) {
    throw new Error('That file does not look like a Side Quest log.');
  }
  state = { ...blank(), ...parsed, profile: { ...blank().profile, ...(parsed.profile || {}) } };
  emit();
}

export function resetAll() {
  state = blank();
  emit();
}

/* ----------------------------------------------------------------- seed -- */

/** A first-run log, so the app never opens as a blank page. */
function seed() {
  const s = blank();
  const today = todayISO();

  s.dailies = [
    mkDaily('Water the plants', 'The fern by the window is dramatic about this.', '🪴', 5, { type: 'daily' }, today),
    mkDaily('Bathroom deep clean', 'Tiles, mirror, the bit behind the taps.', '🛁', 25, { type: 'weekly', days: [6] }, today),
    mkDaily('Wash the bedding', '', '🛏️', 20, { type: 'interval', every: 10 }, today),
    mkDaily('Pay the bills', 'Check the direct debits went through.', '📮', 15, { type: 'monthly', day: 1 }, today),
  ];

  s.epics = [{
    id: uid(),
    title: 'Learn to play the piano',
    why: 'So I can sit down at one and actually play something.',
    icon: '🎹',
    targetDate: null,
    xp: 200,
    steps: [
      { id: uid(), title: 'Find a teacher or a course', done: true, doneAt: new Date().toISOString() },
      { id: uid(), title: 'Practise 15 minutes, 5 days a week', done: false, doneAt: null },
      { id: uid(), title: 'Learn one whole piece by heart', done: false, doneAt: null },
      { id: uid(), title: 'Play it for someone else', done: false, doneAt: null },
    ],
    createdAt: new Date().toISOString(),
    completedAt: null,
  }];

  s.profile.xp = 15;
  return s;
}

function mkDaily(title, note, icon, xp, repeat, today) {
  return {
    id: uid(),
    title, note, icon, xp, repeat,
    anchor: today,
    dueDate: nextDue(repeat, today, today),
    streak: 0,
    bestStreak: 0,
    lastDone: null,
    doneCount: 0,
    createdAt: new Date().toISOString(),
  };
}
