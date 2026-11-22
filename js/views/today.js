/* ============================================================
   Tempo — Today view
   ============================================================ */

import { getState, getSettings } from '../store.js';
import { icon } from '../icons.js';
import { esc } from '../ui.js';
import { timelineHTML } from './timeline.js';
import {
  computeStatus, upcoming, isBreak,
  fmtShort, fmtTime, fmtCountdown, longDate, greeting, toMin, startOfDay
} from '../time.js';
import { KIND_LABEL, colorOf, roomOf, shortName, DAYS } from '../data.js';

const RING_R = 54;
const RING_C = 2 * Math.PI * RING_R;

/* ── hero ──────────────────────────────────────────────────── */
function ringHTML(pct, num, unit) {
  const clamped = Math.min(1, Math.max(0, pct || 0));
  return `
    <div class="ring" aria-hidden="true">
      <svg viewBox="0 0 126 126" width="126" height="126">
        <circle class="ring-track" cx="63" cy="63" r="${RING_R}" fill="none" stroke-width="6.5"/>
        <circle class="ring-bar" cx="63" cy="63" r="${RING_R}" fill="none" stroke-width="6.5"
                stroke-dasharray="${RING_C.toFixed(2)}"
                stroke-dashoffset="${(RING_C * (1 - clamped)).toFixed(2)}"
                data-live="ring" data-pct="${clamped}"/>
      </svg>
      <div class="ring-center">
        <div class="ring-num" data-live="num">${esc(num)}</div>
        <div class="ring-unit">${esc(unit)}</div>
      </div>
    </div>`;
}

function chipHTML(text, ic, accent) {
  return `<span class="hero-chip${accent ? ' is-accent' : ''}">${ic ? icon(ic, { size: 13 }) : ''}${esc(text)}</span>`;
}

function heroHTML(st, now) {
  const name = getSettings().name;

  if (st.state === 'off') {
    const next = upcoming(getState().periods, now, 1)[0];
    const mins = next ? Math.round((next.date - now) / 60000) + toMin(next.period.start) : null;
    return `
      <section class="hero anim" data-d="1">
        <div class="hero-main">
          <div class="hero-body">
            <div class="hero-kicker"><span class="live-dot"></span>Sunday · no classes</div>
            <h1 class="hero-title">A well-earned <span class="thin">day off.</span></h1>
            <p class="hero-sub">${
              next
                ? `Next up is <b style="color:var(--hero-ink);font-weight:600">${esc(shortName(next.period.subject))}</b> `
                  + `on ${DAYS[next.dayIdx - 1]} at ${fmtTime(next.period.start)}.`
                : 'Enjoy the quiet — nothing is scheduled for the coming week.'
            }</p>
            <div class="hero-meta">
              ${next ? chipHTML(`${DAYS[next.dayIdx - 1]} · ${fmtShort(next.period.start)}`, 'calendar', true) : ''}
              ${next ? chipHTML(roomOf(next.period.subject) || 'Campus', 'book') : ''}
              ${name ? chipHTML(`See you ${greeting(new Date()).toLowerCase().replace('good ', '')}, ${name}`, 'sparkle') : ''}
            </div>
          </div>
          ${next ? ringHTML(0, fmtCountdown(mins), 'until next') : ''}
        </div>
        <div class="hero-foot">
          <div class="hero-track"><i style="width:0%"></i></div>
          <div class="hero-foot-row">
            <span>Rest day</span><span>Classes resume ${next ? DAYS[next.dayIdx - 1] : 'soon'}</span>
          </div>
        </div>
      </section>`;
  }

  if (st.state === 'done' || st.state === 'empty') {
    const total = st.total;
    return `
      <section class="hero anim" data-d="1">
        <div class="hero-main">
          <div class="hero-body">
            <div class="hero-kicker"><span class="live-dot"></span>Day complete</div>
            <h1 class="hero-title">That's a <span class="thin">wrap.</span></h1>
            <p class="hero-sub">${
              total
                ? `All ${total} class${total === 1 ? '' : 'es'} are behind you. Take the evening.`
                : 'Nothing was scheduled for today.'
            }</p>
            <div class="hero-meta">
              ${chipHTML(`${total} class${total === 1 ? '' : 'es'} attended`, 'checkCircle', true)}
              ${chipHTML('Timetable clear until tomorrow', 'calendar')}
            </div>
          </div>
          ${ringHTML(1, String(total), 'classes')}
        </div>
        <div class="hero-foot">
          <div class="hero-track"><i style="width:100%"></i></div>
          <div class="hero-foot-row"><span>100% of the day</span><span>Well done</span></div>
        </div>
      </section>`;
  }

  if (st.state === 'in') {
    const p = st.current;
    const color = colorOf(p.subject);
    const label = isBreak(p) ? KIND_LABEL[p.kind] : (KIND_LABEL[p.kind] || 'Class');
    return `
      <section class="hero anim" data-d="1">
        <div class="hero-main">
          <div class="hero-body">
            <div class="hero-kicker">
              <span class="live-dot"></span>Now · ${fmtShort(p.start)} – ${fmtShort(p.end)}
            </div>
            <h1 class="hero-title">${esc(shortName(p.subject))}</h1>
            <p class="hero-sub">${
              isBreak(p)
                ? `A ${Math.round((toMin(p.end) - toMin(p.start)))}-minute pause. Stretch, hydrate, look away from the screen.`
                : `${label} in ${esc(roomOf(p.subject) || 'campus')}. You're <b style="color:var(--hero-ink);font-weight:600">${Math.round(st.progress * 100)}%</b> of the way through.`
            }</p>
            <div class="hero-meta">
              ${chipHTML(label, isBreak(p) ? 'coffee' : 'book', true)}
              ${roomOf(p.subject) ? chipHTML(roomOf(p.subject), 'users') : ''}
              <span class="hero-chip" data-live="countdown-chip">
                ${icon('clock', { size: 13 })}<span data-live="countdown">${fmtCountdown(st.minutesLeft)}</span> left
              </span>
            </div>
          </div>
          ${ringHTML(st.progress, fmtCountdown(st.minutesLeft), 'left')}
        </div>
        <div class="hero-foot">
          <div class="hero-track"><i data-live="track" style="width:${Math.round(st.progress * 100)}%"></i></div>
          <div class="hero-foot-row">
            <span><span data-live="pct">${Math.round(st.progress * 100)}</span>% of this period</span>
            <span>Ends ${fmtTime(p.end)}</span>
          </div>
        </div>
      </section>`;
  }

  /* state === 'next' — free right now */
  const p = st.next;
  const isBreakNext = isBreak(p);
  return `
    <section class="hero anim" data-d="1">
      <div class="hero-main">
        <div class="hero-body">
          <div class="hero-kicker"><span class="live-dot"></span>Free until ${fmtShort(p.start)}</div>
          <h1 class="hero-title">Next up, <span class="thin">${esc(shortName(p.subject))}.</span></h1>
          <p class="hero-sub">${
            isBreakNext
              ? `A short ${Math.round(toMin(p.end) - toMin(p.start))}-minute break starts at ${fmtTime(p.start)}.`
              : `${KIND_LABEL[p.kind] || 'Class'}${roomOf(p.subject) ? ` in ${esc(roomOf(p.subject))}` : ''} `
                + `starts at ${fmtTime(p.start)} — you have ${fmtCountdown(st.minutesTo)}.`
          }</p>
          <div class="hero-meta">
            ${chipHTML(KIND_LABEL[p.kind] || 'Class', isBreakNext ? 'coffee' : 'book', true)}
            ${roomOf(p.subject) ? chipHTML(roomOf(p.subject), 'users') : ''}
            <span class="hero-chip" data-live="countdown-chip">
              ${icon('clock', { size: 13 })}in <span data-live="countdown">${fmtCountdown(st.minutesTo)}</span>
            </span>
          </div>
        </div>
        ${ringHTML(0, fmtCountdown(st.minutesTo), 'until next')}
      </div>
      <div class="hero-foot">
        <div class="hero-track"><i style="width:0%"></i></div>
        <div class="hero-foot-row">
          <span>${fmtTime(p.start)} – ${fmtTime(p.end)}</span>
          <span>${st.total - st.doneCount} class${st.total - st.doneCount === 1 ? '' : 'es'} still ahead</span>
        </div>
      </div>
    </section>`;
}

/* ── side cards ────────────────────────────────────────────── */
function upNextHTML(now) {
  const items = upcoming(getState().periods, now, 4);
  if (!items.length) {
    return `<div class="card side-card"><h3>Up next</h3><p class="side-empty">No classes in the next two weeks.</p></div>`;
  }

  const rows = items.map(({ period, date, isToday }) => {
    const color = colorOf(period.subject);
    const dayLabel = isToday
      ? 'Today'
      : Math.round((startOfDay(date) - startOfDay(now)) / 86400000) === 1
          ? 'Tomorrow'
          : DAYS[(date.getDay() + 6) % 7];
    return `
      <div class="next-row">
        <i class="subj-dot" style="--dot:var(--c-${color})"></i>
        <div style="min-width:0">
          <b>${esc(shortName(period.subject))}</b>
          <span>${dayLabel} · ${fmtShort(period.start)}</span>
        </div>
        <span class="next-time">${fmtShort(period.start)}</span>
      </div>`;
  }).join('');

  return `
    <div class="card side-card">
      <h3>Up next</h3>
      <div class="next-list">${rows}</div>
    </div>`;
}

function dueSoonHTML() {
  const { tasks } = getState();
  const open = tasks
    .filter(t => !t.done)
    .sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'))
    .slice(0, 4);

  if (!open.length) {
    return `
      <div class="card side-card">
        <h3>Due soon</h3>
        <p class="side-empty">Nothing outstanding. Rare and wonderful.</p>
        <a class="sec-link" href="#reminders" style="margin-top:10px">Add a reminder ${icon('arrowRight', { size: 13 })}</a>
      </div>`;
  }

  const rows = open.map(t => {
    const [y, m, d] = (t.due || '').split('-').map(Number);
    const date = y ? new Date(y, m - 1, d) : null;
    const label = date ? `${date.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][date.getMonth()]}` : '—';
    return `
      <a class="mini-task" href="#reminders">
        <span class="check" style="width:17px;height:17px;margin-top:1px" aria-hidden="true"></span>
        <div style="min-width:0">
          <div class="t">${esc(t.title)}</div>
          <div class="d">${esc(label)} · ${esc(t.subject || 'Reminder')}</div>
        </div>
      </a>`;
  }).join('');

  return `
    <div class="card side-card">
      <h3>Due soon</h3>
      ${rows}
      <a class="sec-link" href="#reminders" style="margin-top:10px;display:inline-flex">All reminders ${icon('arrowRight', { size: 13 })}</a>
    </div>`;
}

/* ── render ────────────────────────────────────────────────── */
export function renderToday() {
  const { periods } = getState();
  const now = new Date();
  const st = computeStatus(periods, now);

  const name = getSettings().name;

  return `
    <div class="page-head anim" data-d="0">
      <div>
        <div class="eyebrow"><span class="dot"></span>${longDate(now)}</div>
        <h1 class="display">${greeting(now)}${name ? `, <em>${esc(name)}</em>` : '<em>there</em>'}.</h1>
      </div>
      <div class="head-actions">
        <button class="btn btn-ghost" type="button" data-action="notify" title="Enable reminders">
          ${icon('bell', { size: 16 })}<span class="hide-sm">Remind me</span>
        </button>
      </div>
    </div>

    ${heroHTML(st, now)}

    <div class="today-grid" style="margin-top:26px">
      <div class="today-main">
        <div class="sec-head" style="margin-top:0">
          <h2 class="sec-title">Today's flow <span class="count">${st.list.length ? `${st.list.length} period${st.list.length === 1 ? '' : 's'}` : ''}</span></h2>
          <a class="sec-link" href="#week">Full timetable ${icon('arrowRight', { size: 13 })}</a>
        </div>
        ${timelineHTML(st.list, now, { isToday: true, emptyHTML: `
          <div class="empty" style="margin-top:6px">
            <div class="empty-art">${icon('calendar', { size: 40, stroke: 1.2 })}</div>
            <h3>Nothing scheduled</h3>
            <p>Add a period in Settings to start building this day.</p>
          </div>` })}
      </div>
      <aside class="today-side">
        <div class="anim" data-d="2">${upNextHTML(now)}</div>
        <div class="anim" data-d="3">${dueSoonHTML()}</div>
      </aside>
    </div>
  `;
}

/* ── live updates (every second, no re-render) ─────────────── */
export function liveUpdate(root) {
  const now = new Date();
  const { periods } = getState();
  const st = computeStatus(periods, now);

  const countdown = root.querySelector('[data-live="countdown"]');
  if (countdown) {
    const mins = st.state === 'in' ? st.minutesLeft : st.minutesTo;
    if (mins != null) countdown.textContent = fmtCountdown(mins);
  }

  const num = root.querySelector('[data-live="num"]');
  if (num) {
    if (st.state === 'in') num.textContent = fmtCountdown(st.minutesLeft);
    else if (st.state === 'next') num.textContent = fmtCountdown(st.minutesTo);
  }

  const bar = root.querySelector('[data-live="ring"]');
  if (bar && st.state === 'in') {
    bar.setAttribute('stroke-dashoffset', (RING_C * (1 - st.progress)).toFixed(2));
  }

  const track = root.querySelector('[data-live="track"]');
  if (track && st.state === 'in') {
    track.style.width = `${Math.round(st.progress * 100)}%`;
  }

  const pct = root.querySelector('[data-live="pct"]');
  if (pct && st.state === 'in') pct.textContent = Math.round(st.progress * 100);
}

/* ── events ────────────────────────────────────────────────── */
export function mountToday(root) {
  const notifyBtn = root.querySelector('[data-action="notify"]');
  notifyBtn?.addEventListener('click', async () => {
    const mod = await import('../notifications.js');
    mod.requestAndConfirm();
  });
}
