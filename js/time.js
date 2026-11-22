/* ============================================================
   Tempo — time & schedule helpers
   ============================================================ */

import { DAYS, MONTHS, MONTHS_SHORT, pad } from './data.js';

/* ── basic parsing ─────────────────────────────────────────── */
export function toMin(t) {
  if (typeof t !== 'string') return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function nowMin(d = new Date()) {
  return d.getHours() * 60 + d.getMinutes();
}

export function isBreak(p) {
  return p.kind === 'break' || p.kind === 'lunch';
}

/* ── formatting ────────────────────────────────────────────── */
export function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${pad(m)} ${ap}`;
}

export function fmtShort(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${pad(m)}${h >= 12 ? 'pm' : 'am'}`;
}

export function fmtRange(p) {
  return `${fmtShort(p.start)} – ${fmtShort(p.end)}`;
}

export function fmtCountdown(mins) {
  if (mins == null) return '—';
  if (mins <= 0) return 'now';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

export function longDate(d = new Date()) {
  return `${DAYS[(d.getDay() + 6) % 7] || 'Sunday'}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function shortDate(d = new Date()) {
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/* ── dates ─────────────────────────────────────────────────── */
export function startOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function sameDate(a, b) {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
}

/** Monday of the week containing `d` */
export function startOfWeek(d = new Date()) {
  const dt = startOfDay(d);
  const offset = (dt.getDay() + 6) % 7;     // Mon = 0 … Sun = 6
  dt.setDate(dt.getDate() - offset);
  return dt;
}

/** Date of weekday `day` (1 = Mon … 6 = Sat) in the current week */
export function dateForDay(day, from = new Date()) {
  const s = startOfWeek(from);
  const d = new Date(s);
  d.setDate(s.getDate() + (day - 1));
  return d;
}

/** 1 … 6 for Mon … Sat, or null on Sunday */
export function todayDayIndex(d = new Date()) {
  const n = d.getDay();
  return n === 0 ? null : n;
}

export function isoDate(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isoWeek(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const diff = date - firstThursday;
  return 1 + Math.round((diff / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
}

/* ── periods ───────────────────────────────────────────────── */
export function byStart(a, b) {
  return toMin(a.start) - toMin(b.start);
}

export function periodsFor(periods, day) {
  return periods.filter(p => p.day === day).sort(byStart);
}

/**
 * Snapshot of "right now" for the Today view.
 * state ∈ off | empty | in | next | done
 */
export function computeStatus(periods, now = new Date()) {
  const dayIdx = todayDayIndex(now);
  if (dayIdx === null) {
    return { state: 'off', dayIdx: null, list: [], current: null, next: null, total: 0, doneCount: 0 };
  }

  const list = periodsFor(periods, dayIdx);
  const classes = list.filter(p => !isBreak(p));
  if (!list.length) {
    return { state: 'empty', dayIdx, list, current: null, next: null, total: 0, doneCount: 0 };
  }

  const nm = nowMin(now);
  const current = list.find(p => toMin(p.start) <= nm && nm < toMin(p.end)) || null;
  const next = list.find(p => toMin(p.start) > nm) || null;
  const doneCount = classes.filter(p => toMin(p.end) <= nm).length;

  let state;
  if (current) state = 'in';
  else if (next) state = 'next';
  else state = 'done';

  const progress = current
    ? Math.min(1, Math.max(0, (nm - toMin(current.start)) / (toMin(current.end) - toMin(current.start))))
    : 0;

  return {
    state, dayIdx, list, current, next, total: classes.length, doneCount, progress,
    minutesLeft: current ? toMin(current.end) - nm : null,
    minutesTo: next ? toMin(next.start) - nm : null
  };
}

/**
 * Upcoming classes across the next fortnight, skipping breaks.
 * Returns [{ period, date, dayIdx, isToday }]
 */
export function upcoming(periods, now = new Date(), limit = 3) {
  const out = [];
  const start = startOfWeek(now);
  const todayStart = startOfDay(now);
  const nm = nowMin(now);

  for (let i = 0; i < 14; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    if (date < todayStart) continue;
    const dayIdx = date.getDay() === 0 ? null : date.getDay();
    if (dayIdx === null) continue;
    const isToday = sameDate(date, now);

    for (const p of periodsFor(periods, dayIdx)) {
      if (isBreak(p)) continue;
      if (isToday && toMin(p.start) <= nm) continue;
      out.push({ period: p, date, dayIdx, isToday });
    }
  }

  out.sort((a, b) => (a.date - b.date) || (toMin(a.period.start) - toMin(b.period.start)));
  return out.slice(0, limit);
}

/** Stats used by the sidebar day card */
export function dayStats(periods, now = new Date()) {
  const st = computeStatus(periods, now);
  if (st.state === 'off') return { label: 'Sunday', pct: 0, note: 'No classes scheduled — enjoy the day off.' };
  if (st.state === 'empty') return { label: 'Today', pct: 0, note: 'Nothing on the timetable.' };

  const left = st.total - st.doneCount;
  const pct = st.total ? Math.round((st.doneCount / st.total) * 100) : 0;

  if (st.current && !isBreak(st.current)) {
    return {
      label: 'In class now',
      pct,
      note: `<b>${st.current.subject}</b> · ends ${fmtShort(st.current.end)}`
    };
  }
  if (st.next && !isBreak(st.next)) {
    return {
      label: `${left} left today`,
      pct,
      note: `Next · <b>${st.next.subject}</b> at ${fmtShort(st.next.start)}`
    };
  }
  if (st.state === 'done') {
    return { label: 'Day complete', pct: 100, note: `All ${st.total} classes done. Nice work.` };
  }
  return { label: `${left} left today`, pct, note: 'A quiet stretch ahead.' };
}

/* ── tasks ─────────────────────────────────────────────────── */
export function taskDueDate(task) {
  if (!task.due) return null;
  const [y, m, d] = task.due.split('-').map(Number);
  if (!y || !m || !d) return null;
  const [hh, mm] = (task.time || '23:59').split(':').map(Number);
  return new Date(y, m - 1, d, hh || 0, mm || 0);
}

export function dueLabel(task, now = new Date()) {
  const due = taskDueDate(task);
  if (!due) return { text: 'No date', tone: '' };

  const today = startOfDay(now);
  const that = startOfDay(due);
  const diffDays = Math.round((that - today) / 86400000);

  if (task.done) {
    return { text: `Done · ${shortDate(due)}`, tone: '' };
  }
  if (diffDays < -1) return { text: `${Math.abs(diffDays)} days overdue`, tone: 'late' };
  if (diffDays === -1) return { text: 'Overdue · yesterday', tone: 'late' };
  if (diffDays === 0) {
    return due < now
      ? { text: `Overdue · ${fmtShort(task.time || '23:59')}`, tone: 'late' }
      : { text: `Today · ${fmtShort(task.time || '23:59')}`, tone: 'soon' };
  }
  if (diffDays === 1) return { text: `Tomorrow · ${fmtShort(task.time || '23:59')}`, tone: 'soon' };
  if (diffDays < 7) {
    return { text: `${DAYS[(due.getDay() + 6) % 7] || 'Sunday'} · ${fmtShort(task.time || '23:59')}`, tone: '' };
  }
  return { text: `${shortDate(due)} · ${fmtShort(task.time || '23:59')}`, tone: '' };
}
