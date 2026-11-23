/* ============================================================
   Tempo — period editor modal (shared by Timetable & Settings)
   ============================================================ */

import { openModal } from '../ui.js';
import { icon } from '../icons.js';
import { esc } from '../ui.js';
import { DAYS, KIND_LABEL, SUBJECTS } from '../data.js';

/**
 * @param {object} opts
 * @param {object|null} opts.period   existing period, or null to create
 * @param {number}     opts.day       1–6 (used when creating)
 * @param {boolean}    opts.showDay   show the weekday selector
 * @param {(values:object) => void} opts.onSave
 * @param {() => void} [opts.onDelete]
 */
export function openPeriodEditor({ period = null, day = 1, showDay = false, onSave, onDelete }) {
  const isEdit = Boolean(period);
  const subjects = Object.keys(SUBJECTS).filter(s => s !== 'Break' && s !== 'Lunch Break');

  const body = `
    <form id="period-form" class="form-grid" novalidate>
      <div class="field full">
        <label for="pe-subject">Subject</label>
        <input class="input" id="pe-subject" name="subject" list="pe-subjects"
               placeholder="e.g. Computer Networks" value="${esc(period?.subject || '')}"
               autocomplete="off" required>
        <datalist id="pe-subjects">
          ${subjects.map(s => `<option value="${esc(s)}"></option>`).join('')}
        </datalist>
      </div>

      <div class="field">
        <label for="pe-kind">Type</label>
        <select class="select" id="pe-kind" name="kind">
          ${Object.entries(KIND_LABEL).map(([value, label]) => `
            <option value="${value}" ${period?.kind === value ? 'selected' : ''}>${label}</option>
          `).join('')}
        </select>
      </div>

      ${showDay ? `
      <div class="field">
        <label for="pe-day">Day</label>
        <select class="select" id="pe-day" name="day">
          ${DAYS.map((d, i) => `<option value="${i + 1}" ${(period?.day ?? day) === i + 1 ? 'selected' : ''}>${d}</option>`).join('')}
        </select>
      </div>` : ''}

      <div class="field">
        <label for="pe-start">Starts</label>
        <input class="input" id="pe-start" name="start" type="time"
               value="${esc(period?.start || '09:00')}" required>
      </div>

      <div class="field">
        <label for="pe-end">Ends</label>
        <input class="input" id="pe-end" name="end" type="time"
               value="${esc(period?.end || '10:00')}" required>
      </div>

      <p class="field-error" id="pe-error" role="alert"
         style="grid-column:1/-1;margin:-4px 0 0;font-size:12px;color:var(--danger);min-height:0"></p>
    </form>
  `;

  const footer = `
    ${isEdit ? `<button class="btn btn-quiet left" type="button" data-delete style="color:var(--danger)">
      ${icon('trash', { size: 15 })} Remove</button>` : ''}
    <button class="btn btn-ghost" type="button" data-cancel>Cancel</button>
    <button class="btn btn-primary" type="button" data-save>
      ${icon('check', { size: 16 })} ${isEdit ? 'Save changes' : 'Add period'}
    </button>
  `;

  const { close, el } = openModal({
    title: isEdit ? 'Edit period' : 'Add a period',
    subtitle: isEdit ? 'Adjust the time, subject or type.' : 'Slot a new class into the timetable.',
    body,
    footer,
    onMount(modal, closeFn) {
      const form = modal.querySelector('#period-form');
      const error = modal.querySelector('#pe-error');
      const toMinutes = (v) => {
        const [h, m] = (v || '').split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
      };

      modal.querySelector('[data-cancel]').addEventListener('click', closeFn);

      modal.querySelector('[data-delete]')?.addEventListener('click', () => {
        closeFn();
        onDelete?.();
      });

      modal.querySelector('[data-save]').addEventListener('click', () => {
        const fd = new FormData(form);
        const values = {
          subject: String(fd.get('subject') || '').trim(),
          kind: String(fd.get('kind') || 'class'),
          start: String(fd.get('start') || ''),
          end: String(fd.get('end') || ''),
          day: showDay ? Number(fd.get('day')) : (period?.day ?? day)
        };

        if (!values.subject) {
          error.textContent = 'Give the period a subject name.';
          modal.querySelector('#pe-subject').focus();
          return;
        }
        if (!values.start || !values.end) {
          error.textContent = 'Both a start and end time are required.';
          return;
        }
        if (toMinutes(values.end) <= toMinutes(values.start)) {
          error.textContent = 'The end time must come after the start time.';
          return;
        }

        closeFn();
        onSave(values);
      });

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        modal.querySelector('[data-save]').click();
      });
    }
  });

  return { close, el };
}
