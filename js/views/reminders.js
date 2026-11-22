/* ============================================================
   Tempo — Reminders view
   ============================================================ */

import {
  getState, getUI, addTask, updateTask, toggleTask, removeTask
} from '../store.js';
import { icon } from '../icons.js';
import { esc, confirmDialog, toast, openModal } from '../ui.js';
import { taskDueDate, dueLabel, startOfDay, isoDate } from '../time.js';
import { SUBJECTS } from '../data.js';

const PRIORITY_LABEL = { high: 'High', medium: 'Medium', low: 'Low' };

/* ── helpers ───────────────────────────────────────────────── */
function sortedTasks() {
  const rank = { high: 0, medium: 1, low: 2 };
  return [...getState().tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const da = taskDueDate(a);
    const db = taskDueDate(b);
    if (da && db && da.getTime() !== db.getTime()) return da - db;
    if (da && !db) return -1;
    if (!da && db) return 1;
    return (rank[a.priority] ?? 1) - (rank[b.priority] ?? 1);
  });
}

function statsHTML(now) {
  const { tasks } = getState();
  const open = tasks.filter(t => !t.done);
  const todayStart = startOfDay(now);
  const tomorrow = new Date(todayStart);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dueToday = open.filter(t => {
    const d = taskDueDate(t);
    return d && d >= todayStart && d < tomorrow;
  }).length;

  const overdue = open.filter(t => {
    const d = taskDueDate(t);
    return d && d < now;
  }).length;

  const items = [
    { n: open.length, label: 'Open', bar: 'var(--accent)' },
    { n: dueToday, label: 'Due today', bar: 'var(--warn)' },
    { n: overdue, label: 'Overdue', bar: 'var(--danger)' }
  ];

  return `
    <div class="stats anim" data-d="1">
      ${items.map(i => `
        <div class="stat" style="--bar:${i.bar}">
          <div class="stat-num">${i.n}</div>
          <div class="stat-label">${i.label}</div>
        </div>`).join('')}
    </div>`;
}

/* ── task rows ─────────────────────────────────────────────── */
function taskRowHTML(t, now, index) {
  const due = dueLabel(t, now);
  const prio = t.priority || 'medium';
  const color = (SUBJECTS[t.subject] || {}).color || 'slate';

  return `
    <div class="task${t.done ? ' is-done' : ''}${due.tone === 'late' && !t.done ? ' is-overdue' : ''}"
         data-task="${t.id}" style="--i:${Math.min(index, 8)}">
      <button class="check" type="button" data-toggle="${t.id}"
              aria-pressed="${t.done}" aria-label="${t.done ? 'Mark as not done' : 'Mark as done'}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"
             stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
      </button>

      <div style="min-width:0">
        <div class="task-title">${esc(t.title)}</div>
        <div class="task-meta">
          <span class="prio ${prio}"><i></i>${PRIORITY_LABEL[prio]}</span>
          ${t.subject ? `<span class="sep">·</span>
            <span class="prio" style="color:var(--c-${color})">
              <i style="background:var(--c-${color})"></i>${esc(t.subject)}
            </span>` : ''}
          <span class="sep">·</span>
          <span class="due ${due.tone}">${esc(due.text)}</span>
        </div>
      </div>

      <div class="task-actions">
        <button type="button" data-edit="${t.id}" aria-label="Edit reminder">${icon('pencil', { size: 15 })}</button>
        <button type="button" data-delete="${t.id}" class="danger" aria-label="Delete reminder">${icon('trash', { size: 15 })}</button>
      </div>
    </div>`;
}

function listHTML(now) {
  const { tasks } = getState();
  const filter = getUI().taskFilter || 'all';

  let visible = sortedTasks();
  if (filter === 'open') visible = visible.filter(t => !t.done);
  if (filter === 'done') visible = visible.filter(t => t.done);

  if (!visible.length) {
    const copy = {
      all: ['Nothing here yet.', 'Add your first reminder and stop keeping deadlines in your head.'],
      open: ['All clear.', 'Every reminder is done. That is worth savouring.'],
      done: ['Nothing completed.', 'Tick something off and it will show up here.']
    }[filter];

    return `
      <div class="empty anim" data-d="3">
        <div class="empty-art">${icon('checkCircle', { size: 44, stroke: 1.1 })}</div>
        <h3>${copy[0]}</h3>
        <p>${copy[1]}</p>
        ${filter !== 'done' ? `
          <button class="btn btn-primary" type="button" data-new>
            ${icon('plus', { size: 16 })} New reminder
          </button>` : ''}
      </div>`;
  }

  return `<div class="task-list">${visible.map((t, i) => taskRowHTML(t, now, i)).join('')}</div>`;
}

/* ── render ────────────────────────────────────────────────── */
export function renderReminders() {
  const now = new Date();
  const { tasks } = getState();
  const open = tasks.filter(t => !t.done).length;
  const filter = getUI().taskFilter || 'all';

  const filters = [
    ['all', 'All'],
    ['open', 'Open'],
    ['done', 'Done']
  ].map(([value, label]) => `
    <button type="button" data-filter="${value}" aria-pressed="${filter === value}">${label}</button>
  `).join('');

  return `
    <div class="page-head anim" data-d="0">
      <div>
        <div class="eyebrow"><span class="dot"></span>${open} open · ${tasks.length} total</div>
        <h1 class="display">Things to <em>do.</em></h1>
      </div>
      <div class="head-actions">
        <button class="btn btn-primary" type="button" data-new>
          ${icon('plus', { size: 16 })} New reminder
        </button>
      </div>
    </div>

    ${statsHTML(now)}

    <div class="filterbar anim" data-d="2">
      <div class="filters" role="group" aria-label="Filter reminders">${filters}</div>
      <span style="font-size:11.5px;color:var(--ink-4)">Sorted by due date</span>
    </div>

    ${listHTML(now)}
  `;
}

/* ── create / edit modal ───────────────────────────────────── */
function openTaskEditor(task = null) {
  const isEdit = Boolean(task);
  const subjects = Object.keys(SUBJECTS).filter(s => s !== 'Break' && s !== 'Lunch Break');
  let priority = task?.priority || 'medium';

  const body = `
    <form id="task-form" class="form-grid" novalidate>
      <div class="field full">
        <label for="tf-title">What needs doing?</label>
        <input class="input" id="tf-title" name="title" placeholder="e.g. Submit the SRS document"
               value="${esc(task?.title || '')}" autocomplete="off" required>
      </div>

      <div class="field">
        <label for="tf-subject">Subject</label>
        <select class="select" id="tf-subject" name="subject">
          <option value="">General</option>
          ${subjects.map(s => `<option value="${esc(s)}" ${task?.subject === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}
        </select>
      </div>

      <div class="field">
        <label for="tf-date">Due date</label>
        <input class="input" id="tf-date" name="due" type="date"
               value="${esc(task?.due || isoDate(new Date()))}" required>
      </div>

      <div class="field">
        <label for="tf-time">Time</label>
        <input class="input" id="tf-time" name="time" type="time" value="${esc(task?.time || '23:59')}">
      </div>

      <div class="field">
        <label>Priority</label>
        <div class="segmented block" id="tf-priority" role="group" aria-label="Priority">
          ${['low', 'medium', 'high'].map(p => `
            <button type="button" data-priority="${p}" aria-pressed="${priority === p}">
              ${PRIORITY_LABEL[p]}
            </button>`).join('')}
        </div>
      </div>

      <div class="field full">
        <label for="tf-notes">Notes <span style="font-weight:400;color:var(--ink-4)">(optional)</span></label>
        <textarea class="textarea" id="tf-notes" name="notes"
                  placeholder="Links, page numbers, anything worth remembering…">${esc(task?.notes || '')}</textarea>
      </div>

      <p class="field-error" id="tf-error" role="alert"
         style="grid-column:1/-1;margin:-4px 0 0;font-size:12px;color:var(--danger)"></p>
    </form>
  `;

  const footer = `
    <button class="btn btn-ghost" type="button" data-cancel>Cancel</button>
    <button class="btn btn-primary" type="button" data-save>
      ${icon('check', { size: 16 })} ${isEdit ? 'Save changes' : 'Add reminder'}
    </button>
  `;

  openModal({
      title: isEdit ? 'Edit reminder' : 'New reminder',
      subtitle: isEdit ? 'Update the details below.' : 'A small note now beats a late night later.',
      body,
      footer,
      onMount(modal, closeFn) {
        const form = modal.querySelector('#task-form');
        const error = modal.querySelector('#tf-error');

        modal.querySelector('[data-cancel]').addEventListener('click', closeFn);

        modal.querySelectorAll('[data-priority]').forEach(btn => {
          btn.addEventListener('click', () => {
            priority = btn.dataset.priority;
            modal.querySelectorAll('[data-priority]').forEach(b => {
              b.setAttribute('aria-pressed', String(b === btn));
            });
          });
        });

        modal.querySelector('[data-save]').addEventListener('click', () => {
          const fd = new FormData(form);
          const values = {
            title: String(fd.get('title') || '').trim(),
            subject: String(fd.get('subject') || ''),
            due: String(fd.get('due') || ''),
            time: String(fd.get('time') || '23:59'),
            notes: String(fd.get('notes') || ''),
            priority
          };

          if (!values.title) {
            error.textContent = 'Give the reminder a title.';
            modal.querySelector('#tf-title').focus();
            return;
          }
          if (!values.due) {
            error.textContent = 'Pick a due date.';
            modal.querySelector('#tf-date').focus();
            return;
          }

          closeFn();
          if (isEdit) {
            updateTask(task.id, values);
            toast('Reminder updated', { ic: 'checkCircle' });
          } else {
            addTask(values);
            toast('Reminder added', { ic: 'checkCircle' });
          }
        });

        form.addEventListener('submit', (e) => {
          e.preventDefault();
          modal.querySelector('[data-save]').click();
        });
      }
    });
}

/* ── events ────────────────────────────────────────────────── */
export function mountReminders(root) {
  const ui = getUI();

  root.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      ui.taskFilter = btn.dataset.filter;
      window.dispatchEvent(new CustomEvent('tempo:refresh'));
    });
  });

  root.querySelectorAll('[data-new]').forEach(btn => {
    btn.addEventListener('click', () => openTaskEditor());
  });

  root.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const done = toggleTask(btn.dataset.toggle);
      if (done) toast('Nice — marked as done', { ic: 'checkCircle' });
    });
  });

  root.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const task = getState().tasks.find(t => t.id === btn.dataset.edit);
      if (task) openTaskEditor(task);
    });
  });

  root.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const task = getState().tasks.find(t => t.id === btn.dataset.delete);
      if (!task) return;
      const ok = await confirmDialog({
        title: 'Delete this reminder?',
        message: `"${task.title}" will be removed permanently.`,
        confirmLabel: 'Delete reminder'
      });
      if (ok) {
        removeTask(task.id);
        toast('Reminder deleted', { ic: 'trash' });
      }
    });
  });
}
