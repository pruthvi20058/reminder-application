/* ============================================================
   Tempo — Settings view
   ============================================================ */

import {
  getState, getSettings, setSettings, getGcal, setGcal, exportData, importData, resetAll,
  addPeriod, updatePeriod, removePeriod
} from '../store.js';
import {
  connectGoogle, syncNow, disconnectGoogle, isConnected, downloadICS
} from '../gcal.js';
import { icon } from '../icons.js';
import { esc, confirmDialog, toast } from '../ui.js';
import { openPeriodEditor } from './periodEditor.js';
import { periodsFor, isBreak, fmtShort } from '../time.js';
import { DAYS, KIND_LABEL, colorOf, shortName } from '../data.js';

const APP_VERSION = '1.0.0';

/* ── panels ────────────────────────────────────────────────── */
function profilePanel() {
  const s = getSettings();
  return `
    <section class="panel anim" data-d="1">
      <div class="panel-head">
        <h3>${icon('sun')} Profile</h3>
        <p>Used in the greeting on your Today screen.</p>
      </div>
      <div class="field">
        <label for="set-name">Your name</label>
        <input class="input" id="set-name" type="text" placeholder="e.g. Pruthvi"
               value="${esc(s.name || '')}" autocomplete="given-name" maxlength="40">
      </div>
    </section>`;
}

function appearancePanel() {
  const s = getSettings();
  const options = [
    ['system', 'monitor', 'System'],
    ['light', 'sun', 'Light'],
    ['dark', 'moon', 'Dark']
  ];
  return `
    <section class="panel anim" data-d="2">
      <div class="panel-head">
        <h3>${icon('sun')} Appearance</h3>
        <p>Tempo follows your system by default.</p>
      </div>
      <div class="field">
        <label>Theme</label>
        <div class="segmented block" id="set-theme">
          ${options.map(([value, ic, label]) => `
            <button type="button" data-theme-choice="${value}" aria-pressed="${s.theme === value}">
              ${icon(ic, { size: 14 })} ${label}
            </button>`).join('')}
        </div>
      </div>
    </section>`;
}

function notificationPanel() {
  const s = getSettings();
  return `
    <section class="panel anim" data-d="3">
      <div class="panel-head">
        <h3>${icon('bell')} Reminders</h3>
        <p>Get a nudge before each class begins.</p>
      </div>

      <div class="switch-row" style="margin-bottom:16px">
        <div class="txt">
          <b>Class reminders</b>
          <span id="notif-status">Notifications are ${s.notify ? 'on' : 'off'}</span>
        </div>
        <button class="switch" id="set-notify" role="switch" type="button"
                aria-checked="${s.notify}" aria-label="Toggle class reminders"></button>
      </div>

      <div class="field">
        <label for="set-lead">Remind me before</label>
        <select class="select" id="set-lead">
          ${[5, 10, 15, 20, 30].map(n => `
            <option value="${n}" ${Number(s.lead) === n ? 'selected' : ''}>${n} minutes</option>
          `).join('')}
        </select>
      </div>

      <button class="btn btn-ghost btn-sm" type="button" id="test-notification" style="margin-top:4px">
        ${icon('bell', { size: 14 })} Send a test notification
      </button>
    </section>`;
}

function googlePanel() {
  const s = getSettings();
  const g = getGcal();
  const connected = isConnected();
  const origin = globalThis.location?.origin || 'http://localhost:8000';
  const last = g.lastSync
    ? new Date(g.lastSync).toLocaleString([], { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    : '';

  return `
    <section class="panel wide anim" data-d="4">
      <div class="panel-head">
        <h3>${icon('calendar')} Google Calendar</h3>
        <p>Sync this timetable to a “Tempo — Class Timetable” calendar. Phone alerts
           then come from the Google Calendar app on your mobile.</p>
      </div>

      <div class="field" style="margin-bottom:12px">
        <label>Status</label>
        <p style="font-size:13px;color:var(--ink-2);display:flex;align-items:center;gap:8px">
          <i class="subj-dot" style="--dot:${connected ? 'var(--accent)' : 'var(--ink-4)'}"></i>
          ${connected
            ? `Connected${g.calendarName ? ` · ${esc(g.calendarName)}` : ''}${last ? ` · last synced ${esc(last)}` : ''}`
            : g.clientId
              ? 'Not connected — tap “Connect Google Calendar”.'
              : 'Not set up yet — add a Client ID below (free, one time).'}
        </p>
      </div>

      <div class="form-grid">
        <div class="field">
          <label for="gcal-client">Google OAuth Client ID</label>
          <input class="input" id="gcal-client" type="text" spellcheck="false"
                 placeholder="xxxx.apps.googleusercontent.com"
                 value="${esc(g.clientId || '')}" autocomplete="off">
        </div>
        <div class="field">
          <label for="gcal-end">Semester ends</label>
          <input class="input" id="gcal-end" type="date" value="${esc(s.gcalEnd || '')}">
        </div>
      </div>

      <div class="switch-row" style="margin:4px 0 16px">
        <div class="txt">
          <b>Sync changes automatically</b>
          <span>Adding, editing or deleting a period updates Google Calendar too</span>
        </div>
        <button class="switch" id="gcal-auto" role="switch" type="button"
                aria-checked="${s.gcalAuto !== false}" aria-label="Toggle automatic Google Calendar sync"></button>
      </div>

      <div class="data-actions">
        <button class="btn btn-primary btn-sm" type="button" id="gcal-connect">
          ${icon('calendar', { size: 14 })} ${connected ? 'Reconnect Google' : 'Connect Google Calendar'}
        </button>
        <button class="btn btn-ghost btn-sm" type="button" id="gcal-sync">
          ${icon('rotate', { size: 14 })} Sync now
        </button>
        ${connected ? `<button class="btn btn-ghost btn-sm" type="button" id="gcal-disconnect">Disconnect</button>` : ''}
        <button class="btn btn-ghost btn-sm" type="button" id="gcal-ics">
          ${icon('download', { size: 14 })} Download .ics instead
        </button>
      </div>

      <details style="margin-top:16px">
        <summary style="cursor:pointer;font-size:13px;font-weight:600">One-time setup (about 3 minutes)</summary>
        <ol style="font-size:12.5px;line-height:1.7;color:var(--ink-2);padding-left:18px;margin-top:10px">
          <li>Open <b>console.cloud.google.com</b> → create a project (any name).</li>
          <li><b>APIs &amp; Services → Library</b> → enable <b>Google Calendar API</b>.</li>
          <li><b>OAuth consent screen</b> → External → add your Gmail as a test user.</li>
          <li><b>Credentials → Create credentials → OAuth client ID → Web application.</b></li>
          <li>Under <b>Authorised JavaScript origins</b> add: <code style="font-size:11.5px">${esc(origin)}</code>
              (add <code style="font-size:11.5px">http://localhost:8000</code> too if you run it locally).</li>
          <li>Copy the Client ID, paste it above, then tap <b>Connect Google Calendar</b> and sign in.</li>
          <li>On your phone: install/open <b>Google Calendar</b>, sign in with the same account,
              open the “Tempo — Class Timetable” calendar, and allow notifications —
              you'll get an alert ${Number(s.lead) || 10} minutes before every class.</li>
        </ol>
        <p style="font-size:12px;color:var(--ink-3);margin-top:8px">
          No server is involved: Tempo talks to Google directly from your browser, and only
          ever touches the one Tempo calendar. Prefer no setup? “Download .ics instead”
          exports the same repeating classes with alarms — import it once at
          calendar.google.com → Settings → Import &amp; export (one-way, no auto-updates).
        </p>
      </details>
    </section>`;
}

function schedulePanel() {
  const { periods } = getState();

  const editors = DAYS.map((day, i) => {
    const list = periodsFor(periods, i + 1);
    const classes = list.filter(p => !isBreak(p)).length;

    const rows = list.length
      ? list.map(p => {
          const color = colorOf(p.subject);
          return `
            <div class="ed-row">
              <span class="t">${p.start}–${p.end}</span>
              <span class="s" style="display:flex;align-items:center;gap:7px">
                <i class="subj-dot" style="--dot:var(--c-${color})"></i>
                ${esc(shortName(p.subject))}
                ${isBreak(p) ? `<em style="font-style:normal;font-size:10.5px;color:var(--ink-4)">${KIND_LABEL[p.kind]}</em>` : ''}
              </span>
              <span class="acts">
                <button type="button" data-edit-period="${p.id}" aria-label="Edit ${esc(p.subject)}">${icon('pencil', { size: 14 })}</button>
                <button type="button" data-del-period="${p.id}" aria-label="Remove ${esc(p.subject)}">${icon('trash', { size: 14 })}</button>
              </span>
            </div>`;
        }).join('')
      : `<p style="font-size:12px;color:var(--ink-4);padding:8px 0">No periods yet.</p>`;

    return `
      <details class="day-editor"${i === 0 ? ' open' : ''}>
        <summary>
          <span>${day}</span>
          <span style="display:flex;align-items:center;gap:8px">
            <span class="count">${classes} class${classes === 1 ? '' : 'es'}</span>
            <span class="chev">${icon('chevronDown', { size: 15 })}</span>
          </span>
        </summary>
        <div class="body">
          ${rows}
          <button class="btn btn-quiet btn-sm" type="button" data-add-period="${i + 1}" style="margin-top:6px">
            ${icon('plus', { size: 14 })} Add period
          </button>
        </div>
      </details>`;
  }).join('');

  return `
    <section class="panel wide anim" data-d="4">
      <div class="panel-head">
        <h3>${icon('calendar')} Timetable</h3>
        <p>Edit any period, or add a new one. Changes apply everywhere instantly.</p>
      </div>
      ${editors}
    </section>`;
}

function dataPanel() {
  return `
    <section class="panel anim" data-d="5">
      <div class="panel-head">
        <h3>${icon('download')} Your data</h3>
        <p>Everything is stored on this device. Take it with you.</p>
      </div>
      <div class="data-actions">
        <button class="btn btn-ghost btn-sm" type="button" id="btn-export">
          ${icon('download', { size: 14 })} Export
        </button>
        <button class="btn btn-ghost btn-sm" type="button" id="btn-import">
          ${icon('upload', { size: 14 })} Import
        </button>
        <button class="btn btn-ghost btn-sm" type="button" id="btn-reset" style="color:var(--danger)">
          ${icon('rotate', { size: 14 })} Reset
        </button>
        <input type="file" id="file-import" accept="application/json,.json" hidden>
      </div>
    </section>`;
}

function aboutPanel() {
  const { periods, tasks } = getState();
  return `
    <section class="panel anim" data-d="6">
      <div class="panel-head">
        <h3>${icon('info')} About</h3>
        <p>A small, calm companion for the semester.</p>
      </div>
      <div class="about">
        <div>
          <b>Tempo</b> v${APP_VERSION}<br>
          <span style="font-size:11.5px">${periods.length} periods · ${tasks.length} reminders</span>
        </div>
        <span style="font-family:var(--font-display);font-size:20px;color:var(--ink-3)">t.</span>
      </div>
    </section>`;
}

/* ── render ────────────────────────────────────────────────── */
export function renderSettings() {
  return `
    <div class="page-head anim" data-d="0">
      <div>
        <div class="eyebrow"><span class="dot"></span>Preferences</div>
        <h1 class="display">Make it <em>yours.</em></h1>
      </div>
    </div>

    <div class="settings-grid">
      ${profilePanel()}
      ${appearancePanel()}
      ${notificationPanel()}
      ${googlePanel()}
      ${schedulePanel()}
      ${dataPanel()}
      ${aboutPanel()}
    </div>
  `;
}

/* ── events ────────────────────────────────────────────────── */
export function mountSettings(root) {
  const nameInput = root.querySelector('#set-name');
  nameInput?.addEventListener('change', () => {
    setSettings({ name: nameInput.value.trim() });
    toast('Name saved', { ic: 'checkCircle' });
  });

  root.querySelectorAll('[data-theme-choice]').forEach(btn => {
    btn.addEventListener('click', () => {
      setSettings({ theme: btn.dataset.themeChoice });
      applyTheme();
      root.querySelectorAll('[data-theme-choice]').forEach(b => {
        b.setAttribute('aria-pressed', String(b === btn));
      });
    });
  });

  const notifySwitch = root.querySelector('#set-notify');
  notifySwitch?.addEventListener('click', async () => {
    const next = !getSettings().notify;
    if (next) {
      const mod = await import('../notifications.js');
      const granted = await mod.requestPermission();
      if (!granted) {
        toast('Notifications are blocked in this browser', { ic: 'bellOff', tone: 'danger' });
        return;
      }
    }
    setSettings({ notify: next });
    notifySwitch.setAttribute('aria-checked', String(next));
    const status = root.querySelector('#notif-status');
    if (status) status.textContent = `Notifications are ${next ? 'on' : 'off'}`;
  });

  const leadSelect = root.querySelector('#set-lead');
  leadSelect?.addEventListener('change', () => {
    setSettings({ lead: Number(leadSelect.value) });
  });

  root.querySelector('#test-notification')?.addEventListener('click', async () => {
    const mod = await import('../notifications.js');
    mod.test();
  });

  /* schedule editing */
  root.querySelectorAll('[data-edit-period]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = getState().periods.find(x => x.id === btn.dataset.editPeriod);
      if (!p) return;
      openPeriodEditor({
        period: p,
        day: p.day,
        showDay: true,
        onSave: (values) => updatePeriod(p.id, values),
        onDelete: async () => {
          const ok = await confirmDialog({
            title: 'Remove this period?',
            message: `${p.subject} on ${DAYS[p.day - 1]} will be deleted.`,
            confirmLabel: 'Remove period'
          });
          if (ok) removePeriod(p.id);
        }
      });
    });
  });

  root.querySelectorAll('[data-del-period]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const p = getState().periods.find(x => x.id === btn.dataset.delPeriod);
      if (!p) return;
      const ok = await confirmDialog({
        title: 'Remove this period?',
        message: `${p.subject} on ${DAYS[p.day - 1]} at ${fmtShort(p.start)} will be deleted.`,
        confirmLabel: 'Remove period'
      });
      if (ok) {
        removePeriod(p.id);
        toast('Period removed', { ic: 'trash' });
      }
    });
  });

  root.querySelectorAll('[data-add-period]').forEach(btn => {
    btn.addEventListener('click', () => {
      const day = Number(btn.dataset.addPeriod);
      openPeriodEditor({
        period: null,
        day,
        showDay: true,
        onSave: (values) => addPeriod(values)
      });
    });
  });


  /* Google Calendar */
  const gcalClient = root.querySelector('#gcal-client');
  gcalClient?.addEventListener('change', () => {
    setGcal({ clientId: gcalClient.value.trim() });
    toast('Google Client ID saved', { ic: 'checkCircle' });
  });

  const gcalEnd = root.querySelector('#gcal-end');
  gcalEnd?.addEventListener('change', () => setSettings({ gcalEnd: gcalEnd.value }));

  root.querySelector('#gcal-auto')?.addEventListener('click', (e) => {
    const next = !getSettings().gcalAuto;
    setSettings({ gcalAuto: next });
    e.currentTarget.setAttribute('aria-checked', String(next));
  });

  root.querySelector('#gcal-connect')?.addEventListener('click', async () => {
    try {
      const result = await connectGoogle();
      const c = result.counts || {};
      toast(`Google Calendar synced · ${c.created || 0} added, ${c.updated || 0} updated, ${c.deleted || 0} removed`, { ic: 'calendar' });
    } catch (err) {
      toast(err.message || 'Google sign-in failed', { ic: 'alert', tone: 'danger' });
    }
  });

  root.querySelector('#gcal-sync')?.addEventListener('click', async () => {
    try {
      const result = await syncNow({ interactive: true });
      if (!result.synced) throw new Error('Could not sync — try reconnecting Google.');
      const c = result.counts || {};
      toast(`Synced · ${c.created || 0} added, ${c.updated || 0} updated, ${c.deleted || 0} removed`, { ic: 'calendar' });
    } catch (err) {
      toast(err.message || 'Sync failed', { ic: 'alert', tone: 'danger' });
    }
  });

  root.querySelector('#gcal-disconnect')?.addEventListener('click', async () => {
    await disconnectGoogle();
    toast('Disconnected from Google Calendar', { ic: 'bellOff' });
    window.dispatchEvent(new CustomEvent('tempo:refresh'));
  });

  root.querySelector('#gcal-ics')?.addEventListener('click', () => {
    downloadICS();
    toast('Timetable .ics downloaded — import it in Google Calendar', { ic: 'download' });
  });

  /* data */
  root.querySelector('#btn-export')?.addEventListener('click', () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tempo-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Backup downloaded', { ic: 'download' });
  });

  const fileInput = root.querySelector('#file-import');
  root.querySelector('#btn-import')?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      importData(text);
      applyTheme();
      toast('Backup restored', { ic: 'checkCircle' });
    } catch (err) {
      toast(err.message || 'Could not read that file', { ic: 'alert', tone: 'danger' });
    }
    fileInput.value = '';
  });

  root.querySelector('#btn-reset')?.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Reset everything?',
      message: 'Your timetable, reminders and preferences will be replaced with the defaults. This cannot be undone.',
      confirmLabel: 'Reset app'
    });
    if (ok) {
      resetAll();
      applyTheme();
      toast('Tempo has been reset', { ic: 'rotate' });
    }
  });
}

/* Keep the document theme in sync with the preference */
export function applyTheme() {
  const { theme } = getSettings();
  const dark = theme === 'dark' || (theme === 'system'
    && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';

  const meta = document.querySelector('meta[name="theme-color"]:not([media])');
  if (meta) meta.setAttribute('content', dark ? '#0c0e0c' : '#f4f2ec');
}
