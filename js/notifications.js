/* ============================================================
   Tempo — browser notifications
   ============================================================ */

import { getState, getSettings, setSettings } from './store.js';
import { toast } from './ui.js';
import { periodsFor, isBreak, toMin, todayDayIndex, fmtShort } from './time.js';
import { roomOf, shortName } from './data.js';

export function supported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestPermission() {
  if (!supported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

async function show(title, body) {
  if (!supported() || Notification.permission !== 'granted') return false;
  const options = {
    body,
    icon: 'assets/icons/icon-192.png',
    badge: 'assets/icons/icon-192.png',
    tag: `tempo-${Date.now()}`
  };
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) { await reg.showNotification(title, options); return true; }
    }
    new Notification(title, options);
    return true;
  } catch {
    try { new Notification(title, options); return true; } catch { return false; }
  }
}

/** Ask for permission (from the Today "Remind me" button) and confirm. */
export async function requestAndConfirm() {
  if (!supported()) {
    toast('This browser does not support notifications', { ic: 'bellOff', tone: 'danger' });
    return;
  }
  if (Notification.permission === 'denied') {
    toast('Notifications are blocked — enable them in your browser settings', { ic: 'bellOff', tone: 'danger' });
    return;
  }
  const granted = await requestPermission();
  if (!granted) {
    toast('Notifications were not enabled', { ic: 'bellOff', tone: 'danger' });
    return;
  }
  if (!getSettings().notify) setSettings({ notify: true });
  toast('Class reminders are on', { ic: 'bell' });
  show('Tempo reminders are on', `We'll nudge you ${getSettings().lead} minutes before each class.`);
}

export async function test() {
  if (!supported()) {
    toast('This browser does not support notifications', { ic: 'bellOff', tone: 'danger' });
    return;
  }
  const granted = await requestPermission();
  if (!granted) {
    toast('Notifications are blocked in this browser', { ic: 'bellOff', tone: 'danger' });
    return;
  }
  const sent = await show('Tempo · test reminder', 'This is how your class reminders will look.');
  toast(sent ? 'Test notification sent' : 'Could not send a notification', {
    ic: sent ? 'bell' : 'bellOff', tone: sent ? '' : 'danger'
  });
}

/* ── scheduler ─────────────────────────────────────────────── */
const notified = new Set();
let timer = null;

function check() {
  if (!supported() || Notification.permission !== 'granted') return;
  const settings = getSettings();
  if (!settings.notify) return;

  const now = new Date();
  const dayIdx = todayDayIndex(now);
  if (dayIdx === null) return;

  const lead = Number(settings.lead) || 10;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  for (const p of periodsFor(getState().periods, dayIdx)) {
    if (isBreak(p)) continue;
    const inMinutes = toMin(p.start) - nowMinutes;
    if (inMinutes !== lead) continue;
    const key = `${now.toDateString()}|${p.id}|${lead}`;
    if (notified.has(key)) continue;
    notified.add(key);
    const room = roomOf(p.subject);
    show(
      `${shortName(p.subject)} in ${lead} minutes`,
      `${fmtShort(p.start)} – ${fmtShort(p.end)}${room ? ` · ${room}` : ''}`
    );
  }
}

export function startScheduler() {
  if (timer) return;
  check();
  timer = setInterval(check, 20000);
}
