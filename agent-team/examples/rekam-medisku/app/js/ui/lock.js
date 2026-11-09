// Rekam Medisku — layar Terkunci (t5).
// Satu-satunya layar yang dirender saat vault terenkripsi belum dibuka.

import { h, clear } from '../dom.js';
import { DISCLAIMERS } from '../model.js';

function flatten(children, out = []) {
  for (const child of children) {
    if (Array.isArray(child)) flatten(child, out);
    else if (child !== null && child !== undefined && child !== false) out.push(child);
  }
  return out;
}

function create(tag, attrs = {}, ...children) {
  const props = {};
  let className = '';
  for (const [key, value] of Object.entries(attrs || {})) {
    if (key === 'class' || key === 'className') {
      className = value == null ? '' : String(value);
    } else {
      props[key] = value;
    }
  }
  const node = h(tag, props, ...flatten(children));
  if (className) node.className = className;
  return node;
}

function toast(ctx, message, tone = 'info') {
  if (typeof ctx?.toast === 'function') ctx.toast(message, tone);
}

function showError(node, message) {
  if (!node) return;
  node.textContent = message || '';
  node.hidden = !message;
}

/**
 * Render layar Terkunci.
 * @param {HTMLElement} root
 * @param {object} ctx
 */
export async function render(root, ctx) {
  clear(root);

  const screen = create('section', { id: 'screen-lock', class: 'screen lock-screen' });
  screen.appendChild(create('header', { class: 'screen-header' },
    create('h1', {}, 'Rekam Medisku terkunci'),
    create('p', { class: 'muted' },
      'Masukkan kata sandi untuk membuka data yang tersimpan di perangkat ini.')));

  const form = create('form', { id: 'lock-form', class: 'card lock-form', novalidate: true });

  const password = create('input', {
    id: 'lock-password',
    type: 'password',
    name: 'password',
    autocomplete: 'current-password',
    required: true,
    autofocus: true
  });
  const label = create('label', { for: 'lock-password' }, 'Kata sandi');
  form.appendChild(label);
  form.appendChild(password);

  const error = create('p', {
    id: 'lock-error',
    class: 'error-text',
    role: 'alert',
    hidden: true
  });
  form.appendChild(error);

  const submit = create('button', {
    id: 'btn-unlock',
    type: 'submit',
    class: 'button button--primary touch'
  }, 'Buka aplikasi');
  form.appendChild(create('div', { class: 'actions' }, submit));

  const forgot = create('p', {
    id: 'lock-forgot-warning',
    class: 'warning-box'
  },
  'Lupa kata sandi berarti data TIDAK dapat dipulihkan. Tidak ada akun atau layanan '
  + 'luar yang dapat meresetnya. Bila Anda memiliki cadangan terenkripsi, kata sandi '
  + 'cadangannya juga diperlukan. Jangan hapus data peramban sebelum mencoba semua '
  + 'kemungkinan kata sandi.');
  form.appendChild(forgot);

  password.addEventListener('input', () => {
    if (!error.hidden) {
      showError(error, '');
      password.setAttribute('aria-invalid', 'false');
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    showError(error, '');
    const value = password.value;
    if (!value) {
      showError(error, 'Kata sandi wajib diisi.');
      password.setAttribute('aria-invalid', 'true');
      password.focus();
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Membuka…';
    password.disabled = true;
    try {
      await ctx.state.unlock(value);
      password.value = '';
      toast(ctx, 'Aplikasi terbuka.', 'success');
      if (typeof ctx.navigate === 'function') ctx.navigate('#/');
      if (typeof ctx.refresh === 'function') await ctx.refresh();
    } catch (unlockError) {
      // Pesan dari state API (mis. KATA_SANDI_SALAH) ditampilkan apa adanya.
      const message = unlockError?.message || 'Aplikasi gagal dibuka. Data tidak diubah.';
      showError(error, message);
      password.setAttribute('aria-invalid', 'true');
      toast(ctx, message, 'error');
      submit.disabled = false;
      submit.textContent = 'Buka aplikasi';
      password.disabled = false;
      password.focus();
      password.select();
    }
  });

  screen.appendChild(form);
  screen.appendChild(create('p', { class: 'hint' }, DISCLAIMERS.privacy));
  screen.appendChild(create('p', { class: 'hint' },
    'Kunci otomatis tidak dijalankan saat aplikasi ditutup; gunakan tombol Kunci di header '
    + 'sebelum meninggalkan perangkat.'));
  root.appendChild(screen);

  try {
    password.focus();
  } catch {
    // Fokus opsional; tidak boleh menggagalkan render.
  }

  return undefined;
}

export default render;
