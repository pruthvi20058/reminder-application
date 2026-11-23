/* ============================================================
   Tempo — Google Calendar sync

   Talks directly from the browser to the Google Calendar API
   using Google Identity Services (no backend, no secrets).
   The user supplies their own free Google Cloud OAuth Client ID
   once; Tempo then keeps a dedicated "Tempo — Class Timetable"
   calendar in sync with the in-app timetable:

     add period    -> create weekly recurring event
     edit period   -> update that event
     delete period -> delete that event

   Each event carries a popup reminder `lead` minutes before it
   starts, so the Google Calendar mobile app notifies the phone.

   A no-setup fallback (downloadICS) exports the same recurring
   events — with alarms — as an .ics file for manual import.
   ============================================================ */

import { getState, getSettings, getGcal, setGcal } from './store.js';
import { dateForDay, isBreak } from './time.js';
import { KIND_LABEL, colorOf, roomOf, shortName, pad } from './data.js';

const API = 'https://www.googleapis.com/calendar/v3';
const SCOPE = 'https://www.googleapis.com/auth/calendar';
const TOKEN_KEY = 'tempo.gcal.token';
const CALENDAR_NAME = 'Tempo — Class Timetable';
const BYDAY = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/* Google Calendar event colourIds approximating Tempo's palette */
const COLOR_ID = {
  moss: '10', ocean: '7', plum: '3', clay: '6', ochre: '5',
  teal: '2', wine: '4', lime: '8', slate: '8', indigo: '9'
};

/* ── token handling ────────────────────────────────────────── */
let accessToken = null;
let tokenClient = null;
let gisPromise = null;
let syncing = false;
let autoTimer = null;

function readStoredToken() {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.expires_at > Date.now() + 30000 ? parsed : null;
  } catch { return null; }
}

export function isConnected() {
  if (accessToken) return true;
  const stored = readStoredToken();
  if (stored) { accessToken = stored.access_token; return true; }
  return false;
}

function storeToken(resp) {
  accessToken = resp.access_token;
  const record = {
    access_token: resp.access_token,
    expires_at: Date.now() + (Number(resp.expires_in) || 3600) * 1000
  };
  try { sessionStorage.setItem(TOKEN_KEY, JSON.stringify(record)); } catch { /* noop */ }
}

function loadGIS() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Google sign-in. Check your connection.'));
    document.head.appendChild(script);
  });
  return gisPromise;
}

async function requestToken(interactive = true) {
  const { clientId } = getGcal();
  if (!clientId) throw new Error('Add your Google Client ID first (see setup steps below).');
  await loadGIS();

  return new Promise((resolve, reject) => {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (resp) => {
        if (resp.error) {
          reject(new Error(resp.error === 'access_denied'
            ? 'Google sign-in was cancelled or denied.'
            : `Google sign-in failed (${resp.error}).`));
          return;
        }
        storeToken(resp);
        resolve(resp.access_token);
      },
      error_callback: (err) => reject(new Error(err?.message || 'Google sign-in failed.'))
    });
    tokenClient.requestAccessToken({ prompt: interactive ? 'consent' : '' });
  });
}

async function ensureToken(interactive) {
  if (isConnected()) return accessToken;
  if (!interactive) return null;
  return requestToken(true);
}

/* ── Calendar API ──────────────────────────────────────────── */
async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {})
    }
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) {
      accessToken = null;
      try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* noop */ }
    }
    throw new Error(data?.error?.message || `Google Calendar error (${res.status}).`);
  }
  return data;
}

async function ensureCalendar() {
  const gcal = getGcal();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  if (gcal.calendarId) {
    try {
      const cal = await api(`/users/me/calendarList/${encodeURIComponent(gcal.calendarId)}`);
      if (cal?.summary) setGcal({ calendarName: cal.summary });
      return gcal.calendarId;
    } catch (err) {
      if (!/notFound|Not Found|404/i.test(err.message)) throw err;
    }
  }

  // Reuse an existing Tempo calendar if there is one.
  const list = await api('/users/me/calendarList?maxResults=250');
  const existing = (list.items || []).find(c => c.summary === CALENDAR_NAME);
  if (existing) {
    setGcal({ calendarId: existing.id, calendarName: existing.summary });
    return existing.id;
  }

  const created = await api('/calendars', {
    method: 'POST',
    body: JSON.stringify({ summary: CALENDAR_NAME, timeZone: tz })
  });
  setGcal({ calendarId: created.id, calendarName: created.summary });
  return created.id;
}

/* ── event mapping ─────────────────────────────────────────── */
export function semesterEnd(now = new Date()) {
  const { gcalEnd } = getSettings();
  if (gcalEnd) {
    const [y, m, d] = gcalEnd.split('-').map(Number);
    if (y && m && d) return new Date(y, m - 1, d, 23, 59, 59);
  }
  const end = new Date(now);
  end.setDate(end.getDate() + 16 * 7);
  end.setHours(23, 59, 59, 0);
  return end;
}

function untilUTC(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function localDateTime(dayIdx, time, from = new Date()) {
  const date = dateForDay(dayIdx, from);
  const [h, m] = time.split(':').map(Number);
  const p2 = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p2(date.getMonth() + 1)}-${p2(date.getDate())}T${p2(h)}:${p2(m)}:00`;
}

function hashOf(period) {
  const s = getSettings();
  return JSON.stringify([
    period.day, period.start, period.end, period.subject, period.kind,
    s.lead, s.gcalEnd, Intl.DateTimeFormat().resolvedOptions().timeZone
  ]);
}

function periodToEvent(period) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const lead = Number(getSettings().lead) || 10;
  return {
    summary: shortName(period.subject),
    location: roomOf(period.subject) || undefined,
    description: `${KIND_LABEL[period.kind] || 'Class'} · synced from Tempo`,
    start: { dateTime: localDateTime(period.day, period.start), timeZone: tz },
    end: { dateTime: localDateTime(period.day, period.end), timeZone: tz },
    recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[period.day - 1]};UNTIL=${untilUTC(semesterEnd())}`],
    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: lead }] },
    colorId: COLOR_ID[colorOf(period.subject)] || undefined,
    extendedProperties: {
      private: { tempoApp: 'tempo', tempoPeriodId: period.id }
    }
  };
}

async function listTempoEvents(calendarId) {
  const byPeriod = new Map();
  let pageToken = '';
  do {
    const qs = new URLSearchParams({
      privateExtendedProperty: 'tempoApp=tempo',
      singleEvents: 'false',
      maxResults: '250'
    });
    if (pageToken) qs.set('pageToken', pageToken);
    const data = await api(`/calendars/${encodeURIComponent(calendarId)}/events?${qs}`);
    for (const ev of data.items || []) {
      const pid = ev.extendedProperties?.private?.tempoPeriodId;
      if (pid) byPeriod.set(pid, ev);
    }
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return byPeriod;
}

/* ── public sync API ───────────────────────────────────────── */
export async function syncNow({ interactive = false } = {}) {
  if (syncing) return { synced: false, reason: 'busy' };
  const token = await ensureToken(interactive);
  if (!token) return { synced: false, reason: 'auth' };

  syncing = true;
  try {
    const calendarId = await ensureCalendar();
    const remote = await listTempoEvents(calendarId);
    const { periods } = getState();
    const hashes = { ...(getGcal().hashes || {}) };
    const counts = { created: 0, updated: 0, deleted: 0 };
    const liveIds = new Set();

    for (const period of periods) {
      if (isBreak(period)) continue;
      liveIds.add(period.id);
      const hash = hashOf(period);
      const existing = remote.get(period.id);
      if (!existing) {
        await api(`/calendars/${encodeURIComponent(calendarId)}/events`, {
          method: 'POST',
          body: JSON.stringify(periodToEvent(period))
        });
        counts.created += 1;
      } else if (hashes[period.id] !== hash) {
        await api(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(existing.id)}`, {
          method: 'PATCH',
          body: JSON.stringify(periodToEvent(period))
        });
        counts.updated += 1;
      }
      hashes[period.id] = hash;
    }

    for (const [periodId, ev] of remote) {
      if (liveIds.has(periodId)) continue;
      await api(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(ev.id)}`, {
        method: 'DELETE'
      });
      delete hashes[periodId];
      counts.deleted += 1;
    }

    setGcal({ hashes, lastSync: new Date().toISOString() });
    return { synced: true, counts };
  } finally {
    syncing = false;
  }
}

export async function connectGoogle() {
  await requestToken(true);
  return syncNow({ interactive: false });
}

/** Called by the app whenever the timetable changes. Silent if signed out. */
export function scheduleAutoSync() {
  if (!getSettings().gcalAuto) return;
  if (!getGcal().clientId || !isConnected()) return;
  clearTimeout(autoTimer);
  autoTimer = setTimeout(() => {
    syncNow({ interactive: false }).catch(err => console.warn('[tempo] gcal sync', err));
  }, 900);
}

export async function disconnectGoogle() {
  const token = accessToken;
  accessToken = null;
  tokenClient = null;
  try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* noop */ }
  if (token && window.google?.accounts?.oauth2) {
    try { window.google.accounts.oauth2.revoke(token, () => {}); } catch { /* noop */ }
  }
}

/* ── .ics fallback (no Google Cloud setup needed) ──────────── */
function icsEscape(text) {
  return String(text || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function buildICS(now = new Date()) {
  const lead = Number(getSettings().lead) || 10;
  const end = semesterEnd(now);
  const until = `${end.getFullYear()}${pad(end.getMonth() + 1)}${pad(end.getDate())}T235959`;
  const stamp = untilUTC(now);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tempo//Class Timetable//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Tempo — Class Timetable'
  ];

  for (const period of getState().periods) {
    if (isBreak(period)) continue;
    const date = dateForDay(period.day, now);
    const ymd = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
    const start = period.start.replace(':', '') + '00';
    const finish = period.end.replace(':', '') + '00';
    lines.push(
      'BEGIN:VEVENT',
      `UID:tempo-${period.id}@tempo.app`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${ymd}T${start}`,
      `DTEND:${ymd}T${finish}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[period.day - 1]};UNTIL=${until}`,
      `SUMMARY:${icsEscape(shortName(period.subject))}`,
      `LOCATION:${icsEscape(roomOf(period.subject))}`,
      `DESCRIPTION:${icsEscape(`${KIND_LABEL[period.kind] || 'Class'} · exported from Tempo`)}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `TRIGGER:-PT${lead}M`,
      `DESCRIPTION:${icsEscape(shortName(period.subject))} starts soon`,
      'END:VALARM',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadICS() {
  const blob = new Blob([buildICS()], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tempo-timetable.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
