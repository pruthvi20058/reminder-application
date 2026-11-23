/* ============================================================
   Tempo — state & persistence
   ============================================================ */

import {
  DEFAULT_PERIODS, DEFAULT_SETTINGS, seedTasks, uid
} from './data.js';

const KEY = 'tempo.v1';
const VERSION = 1;

/* ── UI-only state (not persisted) ─────────────────────────── */
const ui = {
  route: 'today',
  weekDay: null,          // selected day in the timetable view
  taskFilter: 'all',      // all | open | done
  weekMode: 'list',       // list | grid
  editingTask: null
};

const DEFAULT_GCAL = {
  clientId: '',
  calendarId: '',
  calendarName: '',
  hashes: {},
  lastSync: ''
};

const state = {
  version: VERSION,
  periods: DEFAULT_PERIODS.map(p => ({ ...p })),
  tasks: [],
  settings: { ...DEFAULT_SETTINGS },
  gcal: { ...DEFAULT_GCAL }
};

const listeners = new Set();

/* ── persistence ───────────────────────────────────────────── */
function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (err) {
    console.warn('[tempo] could not read saved state', err);
    return null;
  }
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      version: VERSION,
      periods: state.periods,
      tasks: state.tasks,
      settings: state.settings,
      gcal: state.gcal
    }));
  } catch (err) {
    console.warn('[tempo] could not persist state', err);
  }
}

export function load() {
  const saved = read();

  if (saved) {
    state.periods = Array.isArray(saved.periods) && saved.periods.length
      ? saved.periods
      : state.periods;
    state.tasks = Array.isArray(saved.tasks) ? saved.tasks : [];
    state.settings = { ...DEFAULT_SETTINGS, ...(saved.settings || {}) };
    state.gcal = { ...DEFAULT_GCAL, ...(saved.gcal || {}) };
  } else {
    state.tasks = seedTasks();
  }

  ui.weekMode = state.settings.weekMode || 'list';
  ui.weekDay = new Date().getDay() === 0 ? 1 : new Date().getDay();

  if (!saved) save();
  return state;
}

/* ── subscriptions ─────────────────────────────────────────── */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(reason = 'update') {
  save();
  listeners.forEach(fn => {
    try { fn(reason); } catch (err) { console.error(err); }
  });
}

/* ── getters ───────────────────────────────────────────────── */
export function getState() { return state; }
export function getUI() { return ui; }
export function getSettings() { return state.settings; }
export function getGcal() { return state.gcal; }

export function setGcal(patch) {
  Object.assign(state.gcal, patch);
  emit('gcal');
}

export function openTaskCount() {
  return state.tasks.filter(t => !t.done).length;
}

/* ── settings ──────────────────────────────────────────────── */
export function setSettings(patch) {
  Object.assign(state.settings, patch);
  if (patch.weekMode) ui.weekMode = patch.weekMode;
  emit('settings');
}

/* ── periods ───────────────────────────────────────────────── */
export function addPeriod(period) {
  const p = {
    id: uid('p'),
    day: period.day,
    start: period.start,
    end: period.end,
    subject: period.subject,
    kind: period.kind || 'class'
  };
  state.periods.push(p);
  emit('periods');
  return p;
}

export function updatePeriod(id, patch) {
  const p = state.periods.find(x => x.id === id);
  if (!p) return;
  Object.assign(p, patch);
  emit('periods');
}

export function removePeriod(id) {
  const i = state.periods.findIndex(x => x.id === id);
  if (i === -1) return;
  state.periods.splice(i, 1);
  emit('periods');
}

/* ── tasks ─────────────────────────────────────────────────── */
export function addTask(task) {
  const t = {
    id: uid('task'),
    title: (task.title || '').trim(),
    subject: task.subject || '',
    due: task.due || '',
    time: task.time || '23:59',
    priority: task.priority || 'medium',
    notes: task.notes || '',
    done: false,
    createdAt: Date.now()
  };
  state.tasks.unshift(t);
  emit('tasks');
  return t;
}

export function updateTask(id, patch) {
  const t = state.tasks.find(x => x.id === id);
  if (!t) return;
  Object.assign(t, patch);
  if (patch.title !== undefined) t.title = patch.title.trim();
  emit('tasks');
}

export function toggleTask(id) {
  const t = state.tasks.find(x => x.id === id);
  if (!t) return;
  t.done = !t.done;
  emit('tasks');
  return t.done;
}

export function removeTask(id) {
  const i = state.tasks.findIndex(x => x.id === id);
  if (i === -1) return;
  state.tasks.splice(i, 1);
  emit('tasks');
}

/* ── bulk data ─────────────────────────────────────────────── */
export function exportData() {
  return JSON.stringify({
    app: 'tempo',
    version: VERSION,
    exportedAt: new Date().toISOString(),
    periods: state.periods,
    tasks: state.tasks,
    settings: state.settings,
    gcal: { clientId: state.gcal.clientId, calendarId: state.gcal.calendarId }
  }, null, 2);
}

export function importData(raw) {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!parsed || typeof parsed !== 'object') throw new Error('That file is not a Tempo backup.');
  if (parsed.app && parsed.app !== 'tempo') throw new Error('That file was not made by Tempo.');

  if (Array.isArray(parsed.periods)) state.periods = parsed.periods;
  if (Array.isArray(parsed.tasks)) state.tasks = parsed.tasks;
  if (parsed.settings) state.settings = { ...DEFAULT_SETTINGS, ...parsed.settings };
  if (parsed.gcal) state.gcal = { ...DEFAULT_GCAL, ...parsed.gcal };

  emit('import');
}

export function resetAll() {
  state.periods = DEFAULT_PERIODS.map(p => ({ ...p }));
  state.tasks = seedTasks();
  state.settings = { ...DEFAULT_SETTINGS, theme: state.settings.theme };
  state.gcal = { ...state.gcal, hashes: {}, lastSync: '' };
  emit('reset');
}
