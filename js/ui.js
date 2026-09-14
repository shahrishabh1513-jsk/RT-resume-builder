/**
 * ui.js — reusable toast + modal system.
 * showToast(message, type) and openModal({...}) are used by every page.
 */

function ensureToastStack() {
  let stack = document.getElementById('toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'toast-stack';
    document.body.appendChild(stack);
  }
  return stack;
}

function showToast(message, type = 'default', duration = 2600) {
  const stack = ensureToastStack();
  const toast = document.createElement('div');
  toast.className = `toast${type !== 'default' ? ' toast-' + type : ''}`;
  toast.textContent = message;
  toast.setAttribute('role', 'status');
  stack.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 200);
  }, duration);
}

function ensureModalOverlay() {
  let overlay = document.getElementById('modal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = '<div class="modal" role="dialog" aria-modal="true"></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal(); });
  }
  return overlay;
}

/**
 * openModal({ title, body, confirmText, cancelText, danger, onConfirm, input })
 * `input` (optional): { label, value, placeholder } renders a text field and
 * passes the typed value into onConfirm(value).
 */
function openModal({ title, body = '', confirmText = 'Confirm', cancelText = 'Cancel', danger = false, onConfirm, input = null }) {
  const overlay = ensureModalOverlay();
  const modal = overlay.querySelector('.modal');
  modal.innerHTML = `
    <h3>${title}</h3>
    ${body ? `<p>${body}</p>` : ''}
    ${input ? `
      <label style="display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-top:14px;">${input.label || ''}
        <input type="text" id="modal-input-field" value="${input.value ? input.value.replace(/"/g, '&quot;') : ''}" placeholder="${input.placeholder || ''}">
      </label>` : ''}
    <div class="modal-actions">
      <button class="btn btn-ghost" id="modal-cancel-btn">${cancelText}</button>
      <button class="btn ${danger ? 'btn-danger-outline' : 'btn-primary'}" id="modal-confirm-btn">${confirmText}</button>
    </div>
  `;
  overlay.classList.add('open');
  const field = modal.querySelector('#modal-input-field');
  if (field) { field.focus(); field.select(); }

  modal.querySelector('#modal-cancel-btn').addEventListener('click', closeModal);
  modal.querySelector('#modal-confirm-btn').addEventListener('click', () => {
    const value = field ? field.value.trim() : null;
    closeModal();
    if (onConfirm) onConfirm(value);
  });
  if (field) {
    field.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') modal.querySelector('#modal-confirm-btn').click();
    });
  }
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.remove('open');
}
