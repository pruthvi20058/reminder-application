/* ============================================================
   Tempo — DOM helpers, toasts, modals
   ============================================================ */

import { icon } from './icons.js';

/* ── escaping ──────────────────────────────────────────────── */
const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ESC_MAP[ch]);
}

/** Escape a string for use inside an HTML attribute */
export function attr(value) {
  return esc(value).replace(/\n/g, '&#10;');
}

/* ── toasts ────────────────────────────────────────────────── */
export function toast(message, opts = {}) {
  const host = document.getElementById('toasts');
  if (!host) return;

  const { tone = '', ic = 'check', duration = 2800 } = opts;
  const el = document.createElement('div');
  el.className = `toast${tone ? ` tone-${tone}` : ''}`;
  el.innerHTML = `${icon(ic, { size: 15 })}<span>${esc(message)}</span>`;
  host.appendChild(el);

  const remove = () => {
    el.classList.add('is-leaving');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  };
  setTimeout(remove, duration);
}

/* ── modal ─────────────────────────────────────────────────── */
let activeModal = null;
let lastFocused = null;

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])'
].join(',');

/**
 * Open a modal. Returns { close, el }.
 * opts: { title, subtitle, body, footer, onMount, className }
 */
export function openModal(opts = {}) {
  closeModal(true);

  const overlay = document.getElementById('overlay');
  if (!overlay) return { close() {}, el: null };

  lastFocused = document.activeElement;

  const modal = document.createElement('div');
  modal.className = `modal${opts.className ? ` ${opts.className}` : ''}`;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'modal-title');

  modal.innerHTML = `
    <div class="modal-head">
      <div>
        <h2 id="modal-title">${esc(opts.title || '')}</h2>
        ${opts.subtitle ? `<p>${esc(opts.subtitle)}</p>` : ''}
      </div>
      <button class="modal-close" type="button" data-close aria-label="Close">
        ${icon('x', { size: 16 })}
      </button>
    </div>
    <div class="modal-body">${opts.body || ''}</div>
    ${opts.footer ? `<div class="modal-foot">${opts.footer}</div>` : ''}
  `;

  overlay.innerHTML = '';
  overlay.appendChild(modal);
  overlay.hidden = false;
  document.body.style.overflow = 'hidden';

  const close = (immediate = false) => {
    if (overlay.hidden) return;
    overlay.hidden = true;
    overlay.innerHTML = '';
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKeydown, true);
    activeModal = null;
    if (!immediate && lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus({ preventScroll: true });
    }
    lastFocused = null;
  };

  const onKeydown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== 'Tab') return;

    const nodes = [...modal.querySelectorAll(FOCUSABLE)].filter(n => n.offsetParent !== null);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  overlay.onclick = (e) => { if (e.target === overlay) close(); };
  modal.querySelector('[data-close]')?.addEventListener('click', () => close());

  document.addEventListener('keydown', onKeydown, true);

  const focusTarget = modal.querySelector('[autofocus]')
    || modal.querySelector('input, select, textarea, button:not([data-close])');
  if (focusTarget) requestAnimationFrame(() => focusTarget.focus({ preventScroll: true }));

  activeModal = { close, el: modal };

  if (typeof opts.onMount === 'function') opts.onMount(modal, close);

  return { close, el: modal };
}

export function closeModal(immediate = false) {
  if (activeModal) activeModal.close(immediate);
  const overlay = document.getElementById('overlay');
  if (overlay && !overlay.hidden) {
    overlay.hidden = true;
    overlay.innerHTML = '';
    document.body.style.overflow = '';
  }
}

/** Promise-based confirmation dialog */
export function confirmDialog({
  title = 'Are you sure?',
  message = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = true
} = {}) {
  return new Promise((resolve) => {
    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const dialog = openModal({
      title,
      body: `<p style="font-size:13.5px;line-height:1.6;color:var(--ink-2)">${esc(message)}</p>`,
      footer: `
        <button class="btn btn-ghost" type="button" data-cancel>${esc(cancelLabel)}</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" type="button" data-confirm>${esc(confirmLabel)}</button>
      `,
      onMount(modalEl, closeFn) {
        modalEl.querySelector('[data-cancel]').addEventListener('click', () => {
          finish(false);
          closeFn();
        });
        modalEl.querySelector('[data-confirm]').addEventListener('click', () => {
          finish(true);
          closeFn();
        });
      }
    });

    // If the dialog is dismissed some other way, resolve as "cancel".
    const watch = setInterval(() => {
      if (!activeModal || activeModal.el !== dialog.el) {
        clearInterval(watch);
        finish(false);
      }
    }, 120);
  });
}

/* ── misc ──────────────────────────────────────────────────── */
export function debounce(fn, ms = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/** Replace the "subject colour" CSS variables on an element */
export function subjectVars(subject, color) {
  return `--bg:var(--bg-${color});--bg-ink:var(--c-${color});--dot:var(--c-${color})`;
}
