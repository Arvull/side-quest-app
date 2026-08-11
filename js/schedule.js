/**
 * Date + repeat-rule helpers.
 *
 * Dates are handled as local "YYYY-MM-DD" strings so a quest due "today" means
 * today where the adventurer is standing, not in UTC.
 */

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO() {
  return toISO(new Date());
}

export function addDays(iso, n) {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function daysBetween(isoA, isoB) {
  const ms = fromISO(isoB).getTime() - fromISO(isoA).getTime();
  return Math.round(ms / 86400000);
}

/** Does `iso` satisfy the repeat rule, given the quest's anchor (start) date? */
export function matchesRule(repeat, iso, anchor) {
  const date = fromISO(iso);
  switch (repeat.type) {
    case 'daily':
      return true;

    case 'interval': {
      const every = Math.max(1, repeat.every || 2);
      const diff = daysBetween(anchor, iso);
      return diff >= 0 && diff % every === 0;
    }

    case 'weekly': {
      const days = repeat.days && repeat.days.length ? repeat.days : [date.getDay()];
      return days.includes(date.getDay());
    }

    case 'monthly': {
      const wanted = Math.max(1, Math.min(31, repeat.day || 1));
      const lastOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      // A quest set for the 31st still comes round in February.
      return date.getDate() === Math.min(wanted, lastOfMonth);
    }

    default:
      return true;
  }
}

/**
 * First date on or after `startISO` that matches the rule.
 * Scans a bounded window so a nonsense rule can never spin forever.
 */
export function nextDue(repeat, anchor, startISO) {
  let cursor = startISO;
  for (let i = 0; i < 400; i++) {
    if (matchesRule(repeat, cursor, anchor)) return cursor;
    cursor = addDays(cursor, 1);
  }
  return startISO;
}

export function describeRepeat(repeat) {
  switch (repeat.type) {
    case 'daily':
      return 'Every day';
    case 'interval': {
      const n = Math.max(1, repeat.every || 2);
      return n === 1 ? 'Every day' : `Every ${n} days`;
    }
    case 'weekly': {
      const days = (repeat.days || []).slice().sort();
      if (days.length === 0) return 'Weekly';
      if (days.length === 7) return 'Every day';
      if (days.length === 5 && days.join() === '1,2,3,4,5') return 'Weekdays';
      if (days.length === 2 && days.join() === '0,6') return 'Weekends';
      return days.map((d) => WEEKDAYS[d]).join(', ');
    }
    case 'monthly': {
      const d = Math.max(1, Math.min(31, repeat.day || 1));
      return `Monthly on the ${ordinal(d)}`;
    }
    default:
      return 'Repeating';
  }
}

export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Human phrasing for a due date, relative to today. */
export function describeDue(iso) {
  const diff = daysBetween(todayISO(), iso);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0) return `${Math.abs(diff)} days ago`;
  if (diff < 7) return WEEKDAYS[fromISO(iso).getDay()];
  if (diff < 14) return 'Next week';
  const d = fromISO(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

export function prettyDate(date = new Date()) {
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return `${names[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}
