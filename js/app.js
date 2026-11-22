/* ============================================================
   Tempo — application entry point & hash router
   ============================================================ */

import { load, subscribe, getState, getUI, getSettings, openTaskCount, setSettings } from './store.js';
import { hydrateIcons, icon } from './icons.js';
import { dayStats } from './time.js';
import { renderToday, mountToday, liveUpdate } from './views/today.js';
import { renderWeek, mountWeek } from './views/week.js';
import { renderReminders, mountReminders } from './views/reminders.js';
import { renderSettings, mountSettings, applyTheme } from './views/settings.js';
import { startScheduler } from './notifications.js';

const ROUTES = {
  today:    { render: renderToday,    mount: mountToday,    title: 'Today' },
  week:     { render: renderWeek,     mount: mountWeek,     title: 'Timetable' },
  reminders:{ render: renderReminders,mount: mountReminders,title: 'Reminders' },
  settings: { render: renderSettings, mount: mountSettings, title: 'Settings' }
};

const root = document.getElementById('view-root');
const main = document.getElementById('main');

function routeFromHash() {
  const raw = (location.hash || '#today').replace(/^#\/?/, '').split('?')[0];
  return ROUTES[raw] ? raw : 'today';
}

function resolvedDark() {
  const theme = getSettings().theme;
  return theme === 'dark'
    || (theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

function syncChrome(route) {
  document.querySelectorAll('[data-route]').forEach((el) => {
    if (el.dataset.route === route) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  });

  const count = openTaskCount();
  for (const id of ['nav-task-count', 'tab-task-count']) {
    const badge = document.getElementById(id);
    if (!badge) continue;
    badge.hidden = count === 0;
    badge.textContent = String(count);
  }

  const card = document.getElementById('side-daycard');
  if (card) {
    const stats = dayStats(getState().periods);
    card.innerHTML = `
      <div class="daycard-top"><span>${stats.label}</span><b>${stats.pct}%</b></div>
      <div class="daycard-track"><i style="width:${stats.pct}%"></i></div>
      <p class="daycard-note">${stats.note}</p>`;
  }

  const toggle = document.getElementById('theme-toggle');
  if (toggle) {
    const dark = resolvedDark();
    toggle.innerHTML = `<span>${icon(dark ? 'sun' : 'moon', { size: 17 })}</span><span style="font-size:12.5px;font-weight:500">${dark ? 'Light mode' : 'Dark mode'}</span>`;
    toggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  }
}

function render() {
  const route = routeFromHash();
  getUI().route = route;
  const view = ROUTES[route];

  root.innerHTML = view.render();
  view.mount(root);
  hydrateIcons(root);
  syncChrome(route);
  document.title = `${view.title} · Tempo`;
  main?.scrollTo({ top: 0 });
  window.scrollTo({ top: 0 });
}

function init() {
  load();
  applyTheme();
  hydrateIcons(document);
  render();
  startScheduler();

  window.addEventListener('hashchange', render);
  window.addEventListener('tempo:refresh', render);
  subscribe(() => render());

  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    setSettings({ theme: resolvedDark() ? 'light' : 'dark' });
    applyTheme();
    // subscribe() re-renders the view; refresh the toggle/chrome too.
    syncChrome(getUI().route);
  });

  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener?.('change', () => {
    if (getSettings().theme === 'system') { applyTheme(); syncChrome(getUI().route); }
  });

  // Live countdown without a full re-render; refresh views when the minute flips.
  let lastMinute = new Date().getMinutes();
  setInterval(() => {
    const now = new Date();
    if (getUI().route === 'today') liveUpdate(root);
    if (now.getMinutes() !== lastMinute) {
      lastMinute = now.getMinutes();
      if (getUI().route === 'today' || getUI().route === 'week') render();
      else syncChrome(getUI().route);
    }
  }, 1000);

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is best-effort */ });
  }
}

init();
