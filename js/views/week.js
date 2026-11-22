/* ============================================================
   Tempo — Timetable view
   ============================================================ */

import { getState, getUI, setSettings, updatePeriod, addPeriod, removePeriod } from '../store.js';
import { icon } from '../icons.js';
import { esc, confirmDialog } from '../ui.js';
import { timelineHTML } from './timeline.js';
import { openPeriodEditor } from './periodEditor.js';
import {
  periodsFor, isBreak, toMin, fmtShort, isoWeek, todayDayIndex,
  dateForDay, startOfWeek, shortDate
} from '../time.js';
import { DAYS, DAYS_SHORT, colorOf, shortName } from '../data.js';

const DAY_START = 9 * 60;        // 09:00
const DAY_END = 16 * 60 + 30;    // 16:30
const SPAN = DAY_END - DAY_START;

const HOUR_MARKS = [9, 10, 11, 12, 13, 14, 15, 16];

/* ── header ────────────────────────────────────────────────── */
function headHTML(mode) {
  const now = new Date();
  const start = startOfWeek(now);
  const end = new Date(start);
  end.setDate(start.getDate() + 5);

  return `
    <div class="page-head anim" data-d="0">
      <div>
        <div class="eyebrow">
          <span class="dot"></span>Week ${isoWeek(now)} · ${shortDate(start)} – ${shortDate(end)}
        </div>
        <h1 class="display">The <em>timetable.</em></h1>
      </div>
      <div class="head-actions">
        <div class="viewmode" role="group" aria-label="Timetable view">
          <button type="button" data-mode="list" aria-pressed="${mode === 'list'}"
                  aria-label="List view" title="List view">${icon('list', { size: 15 })}</button>
          <button type="button" data-mode="grid" aria-pressed="${mode === 'grid'}"
                  aria-label="Grid view" title="Grid view">${icon('grid', { size: 15 })}</button>
        </div>
      </div>
    </div>`;
}

/* ── list mode ─────────────────────────────────────────────── */
function listHTML(now, todayIdx) {
  const { periods } = getState();
  const ui = getUI();
  const sel = ui.weekDay || 1;
  const list = periodsFor(periods, sel);
  const classes = list.filter(p => !isBreak(p));
  const minutes = classes.reduce((sum, p) => sum + (toMin(p.end) - toMin(p.start)), 0);
  const date = dateForDay(sel, now);

  const tabs = DAYS.map((d, i) => {
    const day = i + 1;
    const dt = dateForDay(day, now);
    return `
      <button class="daytab${day === todayIdx ? ' is-today' : ''}" type="button"
              role="tab" data-day="${day}" aria-selected="${day === sel}">
        <span class="d">${DAYS_SHORT[i]}</span>
        <span class="n">${dt.getDate()}</span>
      </button>`;
  }).join('');

  return `
    <div class="anim" data-d="1" style="display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap">
      <div class="daytabs" role="tablist" aria-label="Weekday">${tabs}</div>
      <a class="btn btn-ghost btn-sm" href="#settings">${icon('plus', { size: 14 })} Edit schedule</a>
    </div>

    <div class="week-summary anim" data-d="2">
      <b>${DAYS[sel - 1]}, ${date.getDate()} ${shortDate(date).split(' ')[1]}</b>
      <span>·</span>
      <span>${classes.length} class${classes.length === 1 ? '' : 'es'}</span>
      <span>·</span>
      <span>${Math.floor(minutes / 60)}h ${minutes % 60 ? `${minutes % 60}m` : ''} of scheduled time</span>
      ${classes.length ? `<span>·</span><span>${fmtShort(classes[0].start)} – ${fmtShort(classes[classes.length - 1].end)}</span>` : ''}
    </div>

    <div class="anim" data-d="3">
      ${timelineHTML(list, now, {
        isToday: sel === todayIdx,
        emptyHTML: `
          <div class="empty">
            <div class="empty-art">${icon('calendar', { size: 40, stroke: 1.2 })}</div>
            <h3>A free ${DAYS[sel - 1]}</h3>
            <p>No periods scheduled for this day.</p>
            <button class="btn btn-primary" type="button" data-add-day="${sel}">
              ${icon('plus', { size: 16 })} Add a period
            </button>
          </div>`
      })}
    </div>`;
}

/* ── grid mode ─────────────────────────────────────────────── */
function gridHTML(now, todayIdx) {
  const { periods } = getState();
  const nm = now.getHours() * 60 + now.getMinutes();

  const heads = DAYS.map((d, i) => {
    const day = i + 1;
    const dt = dateForDay(day, now);
    return `
      <div class="tt-dayhead${day === todayIdx ? ' is-today' : ''}" style="grid-column:${day + 1}">
        <span>${DAYS_SHORT[i]}</span><b>${dt.getDate()}</b>
      </div>`;
  }).join('');

  const marks = HOUR_MARKS.map(h => `
    <span style="top:${((h * 60 - DAY_START) / SPAN) * 100}%">${h > 12 ? h - 12 : h}:00</span>
  `).join('');

  const cols = DAYS.map((d, i) => {
    const day = i + 1;
    const blocks = periodsFor(periods, day).map(p => {
      const start = toMin(p.start);
      const end = toMin(p.end);
      const color = colorOf(p.subject);
      const brk = isBreak(p);
      const isNow = day === todayIdx && start <= nm && nm < end;
      const top = Math.max(0, ((start - DAY_START) / SPAN) * 100);
      const height = Math.max(3, ((Math.min(end, DAY_END) - Math.max(start, DAY_START)) / SPAN) * 100);
      return `
        <button type="button" class="tt-block${brk ? ' is-break' : ''}${isNow ? ' is-now' : ''}"
                style="top:${top}%;height:${height}%;--bg:var(--bg-${color});--bg-ink:var(--c-${color})"
                data-period="${p.id}" title="${esc(p.subject)} · ${fmtShort(p.start)} – ${fmtShort(p.end)}">
          ${esc(brk ? p.subject : shortName(p.subject))}
        </button>`;
    }).join('');

    const nowline = day === todayIdx && nm >= DAY_START && nm <= DAY_END
      ? `<div class="tt-nowline" style="top:${((nm - DAY_START) / SPAN) * 100}%"></div>`
      : '';

    return `<div class="tt-col${day === todayIdx ? ' is-today' : ''}" style="grid-column:${day + 1}">
      ${blocks}${nowline}
    </div>`;
  }).join('');

  const seen = new Set();
  const legend = [];
  DAYS.forEach((d, i) => {
    periodsFor(periods, i + 1).forEach(p => {
      if (isBreak(p) || seen.has(p.subject)) return;
      seen.add(p.subject);
      legend.push({ subject: p.subject, color: colorOf(p.subject) });
    });
  });

  return `
    <div class="anim" data-d="1">
      <div class="tt-scroll">
        <div class="tt">
          <div class="tt-corner"></div>
          ${heads}
          <div class="tt-times">${marks}</div>
          ${cols}
        </div>
      </div>
      <ul class="tt-legend">
        ${legend.map(l => `<li><i class="subj-dot" style="--dot:var(--c-${l.color})"></i>${esc(shortName(l.subject))}</li>`).join('')}
      </ul>
      <p class="tt-hint" style="font-size:11.5px;color:var(--ink-4);margin-top:8px">
        Click any block to edit it.
      </p>
    </div>`;
}

/* ── render ────────────────────────────────────────────────── */
export function renderWeek() {
  const now = new Date();
  const todayIdx = todayDayIndex(now);
  const mode = getUI().weekMode || 'list';

  return `
    ${headHTML(mode)}
    ${mode === 'grid' ? gridHTML(now, todayIdx) : listHTML(now, todayIdx)}
  `;
}

/* ── events ────────────────────────────────────────────────── */
export function mountWeek(root) {
  const { periods } = getState();
  const ui = getUI();

  root.querySelectorAll('[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      setSettings({ weekMode: btn.dataset.mode });
    });
  });

  root.querySelectorAll('[data-day]').forEach(btn => {
    btn.addEventListener('click', () => {
      ui.weekDay = Number(btn.dataset.day);
      window.dispatchEvent(new CustomEvent('tempo:refresh'));
    });
  });

  const edit = (period, day) => {
    openPeriodEditor({
      period,
      day,
      showDay: false,
      onSave: (values) => {
        if (period) updatePeriod(period.id, values);
        else addPeriod({ ...values, day });
      },
      onDelete: async () => {
        const ok = await confirmDialog({
          title: 'Remove this period?',
          message: `${period.subject} on ${DAYS[period.day - 1]} will be deleted from your timetable.`,
          confirmLabel: 'Remove period'
        });
        if (ok) removePeriod(period.id);
      }
    });
  };

  root.querySelectorAll('[data-period]').forEach(el => {
    el.addEventListener('click', (e) => {
      // Only blocks are interactive in grid mode; list rows are display-only.
      if (!el.classList.contains('tt-block')) return;
      e.preventDefault();
      const p = periods.find(x => x.id === el.dataset.period);
      if (p) edit(p, p.day);
    });
  });

  root.querySelectorAll('[data-add-day]').forEach(btn => {
    btn.addEventListener('click', () => {
      const day = Number(btn.dataset.addDay);
      openPeriodEditor({
        period: null,
        day,
        showDay: false,
        onSave: (values) => addPeriod({ ...values, day })
      });
    });
  });
}
