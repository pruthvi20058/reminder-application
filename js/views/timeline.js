/* ============================================================
   Tempo — shared timeline renderer
   ============================================================ */

import { icon } from '../icons.js';
import { esc, subjectVars } from '../ui.js';
import { isBreak, nowMin, toMin, fmtShort } from '../time.js';
import { KIND_LABEL, colorOf, roomOf, shortName } from '../data.js';

function splitTime(t) {
  const s = fmtShort(t);
  return { num: s.slice(0, -2), ap: s.slice(-2) };
}

/**
 * Render a vertical timeline.
 * @param {Array}  list
 * @param {Date}   now
 * @param {{isToday?:boolean, emptyHTML?:string}} [opts]
 */
export function timelineHTML(list, now = new Date(), opts = {}) {
  if (!list || !list.length) return opts.emptyHTML || '';

  const nm = nowMin(now);
  return `<div class="timeline">${list.map(p => rowHTML(p, nm, opts)).join('')}</div>`;
}

function rowHTML(p, nm, opts) {
  const start = toMin(p.start);
  const end = toMin(p.end);
  const isToday = opts.isToday !== false;
  const isNow = isToday && start <= nm && nm < end;
  const state = isNow ? 'now' : (isToday && end <= nm ? 'past' : 'future');
  const brk = isBreak(p);
  const color = colorOf(p.subject);
  const t = splitTime(p.start);

  const tags = [];
  if (brk) {
    tags.push(`<span class="tl-tag">${Math.round(end - start)} min</span>`);
  } else {
    tags.push(`<span class="tl-tag"><i class="subj-dot" style="--dot:var(--c-${color})"></i>${esc(KIND_LABEL[p.kind] || 'Lecture')}</span>`);
    if (roomOf(p.subject)) {
      tags.push(`<span class="tl-tag">${icon('book', { size: 11 })}${esc(roomOf(p.subject))}</span>`);
    }
  }

  return `
    <div class="tl-row${brk ? ' is-break' : ''}" data-state="${state}" data-period="${p.id}"
         style="${subjectVars(p.subject, color)}">
      <div class="tl-time"><b>${t.num}</b>${t.ap}</div>
      <div class="tl-rail"><span class="tl-dot"></span></div>
      <div class="tl-main">
        <div class="tl-info">
          <div class="tl-name">${esc(brk ? p.subject : shortName(p.subject))}</div>
          <div class="tl-tags">${tags.join('')}</div>
        </div>
        ${isNow ? `<span class="chip chip-accent">Now</span>` : `<span class="tl-end">${fmtShort(p.end)}</span>`}
      </div>
    </div>`;
}
