// Rekam Medisku — layar Profil & keluarga (t5).
// Form profil aktif, daftar anggota keluarga, tambah/ganti/hapus profil.
// Semua perubahan lewat state API; tidak ada akses penyimpanan langsung.

import { h, clear } from '../dom.js';
import {
  DISCLAIMERS,
  BLOOD_TYPES,
  SEX_OPTIONS,
  isValidDateISO
} from '../model.js';
import { formatDateID } from '../logic/dates.js';

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

function text(value) {
  return value == null ? '' : String(value);
}

function toast(ctx, message, tone = 'info') {
  if (typeof ctx?.toast === 'function') ctx.toast(message, tone);
}

function formatDateSafe(dateISO, style = 'long') {
  try {
    return formatDateID(dateISO, style);
  } catch {
    return '';
  }
}

/** Pecah textarea menjadi array unik: koma, titik koma, atau baris baru. */
function parseList(value) {
  const seen = new Set();
  const result = [];
  for (const raw of text(value).split(/[\n,;]+/)) {
    const item = raw.trim();
    if (!item) continue;
    const key = item.toLocaleLowerCase('id-ID');
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function listToText(list) {
  return Array.isArray(list) ? list.filter(Boolean).join(', ') : '';
}

function setValue(node, value) {
  node.value = value == null ? '' : String(value);
  return node;
}

function field(labelText, control, { hint = '', className = 'field' } = {}) {
  const wrapper = create('div', { class: className });
  wrapper.appendChild(create('label', { for: control.id }, labelText));
  wrapper.appendChild(control);
  if (hint) wrapper.appendChild(create('p', { class: 'hint' }, hint));
  return wrapper;
}

function input(id, type, value = '', extra = {}) {
  const node = create('input', {
    id,
    type,
    ...extra
  });
  setValue(node, value);
  return node;
}

function textarea(id, value = '', extra = {}) {
  const node = create('textarea', { id, rows: 3, ...extra });
  setValue(node, value);
  return node;
}

function select(id, options, value = '', extra = {}) {
  const node = create('select', { id, ...extra });
  let selected = false;
  for (const option of options) {
    const optionNode = create('option', { value: option.value }, option.label);
    optionNode.selected = option.value === value;
    if (optionNode.selected) selected = true;
    node.appendChild(optionNode);
  }
  // Tetapkan value secara eksplisit agar form tetap benar di semua peramban.
  node.value = selected ? value : (options[0]?.value ?? '');
  return node;
}

function bloodOptions() {
  return BLOOD_TYPES.map((value) => ({
    value,
    label: value === 'tidak tahu' ? 'Tidak tahu' : value
  }));
}

function sexOptions() {
  return SEX_OPTIONS.map((option) => ({ value: option.value, label: option.label }));
}

function showError(node, message) {
  if (!node) return;
  node.textContent = message || '';
  node.hidden = !message;
}

function buildProfileForm(profile) {
  const form = create('form', {
    id: 'profile-form',
    class: 'card profile-form',
    novalidate: true
  });
  form.appendChild(create('h2', {}, 'Data profil aktif'));

  const name = input('profile-name', 'text', profile.name || '', {
    required: true,
    autocomplete: 'name',
    maxlength: 120
  });
  form.appendChild(field('Nama lengkap *', name));

  const birth = input('profile-birth', 'date', profile.birthDate || '');
  form.appendChild(field('Tanggal lahir', birth, {
    hint: 'Dipakai untuk menghitung usia dan Ringkasan Dokter.'
  }));

  const sex = select('profile-sex', sexOptions(), profile.sex || '');
  form.appendChild(field('Jenis kelamin', sex));

  const blood = select('profile-blood', bloodOptions(), profile.bloodType || 'tidak tahu');
  form.appendChild(field('Golongan darah', blood));

  const allergies = textarea('profile-allergies', listToText(profile.allergies), {
    rows: 2,
    placeholder: 'mis. penisilin, kacang'
  });
  form.appendChild(field('Alergi', allergies, {
    hint: 'Pisahkan dengan koma atau baris baru.'
  }));

  const chronic = textarea('profile-chronic', listToText(profile.chronicConditions), {
    rows: 2,
    placeholder: 'mis. hipertensi, diabetes'
  });
  form.appendChild(field('Penyakit kronis', chronic, {
    hint: 'Pisahkan dengan koma atau baris baru.'
  }));

  const contacts = Array.isArray(profile.emergencyContacts) ? profile.emergencyContacts : [];
  const contact = contacts[0] || {};
  form.appendChild(create('h3', {}, 'Kontak darurat'));
  const contactName = input('profile-contact-name', 'text', contact.name || '', {
    autocomplete: 'name'
  });
  const contactRelation = input('profile-contact-relation', 'text', contact.relation || '', {
    placeholder: 'mis. Istri, Anak'
  });
  const contactPhone = input('profile-contact-phone', 'tel', contact.phone || '', {
    autocomplete: 'tel',
    inputmode: 'tel'
  });
  form.appendChild(create('div', { class: 'grid' },
    field('Nama kontak', contactName),
    field('Hubungan', contactRelation),
    field('Nomor telepon', contactPhone)
  ));
  if (contacts.length > 1) {
    form.appendChild(create('p', { class: 'hint' },
      `${contacts.length - 1} kontak darurat tambahan tetap disimpan. Form ini menyunting kontak pertama.`));
  }

  form.appendChild(create('h3', {}, 'Dokter / faskes langganan'));
  const doctor = profile.doctor || {};
  const doctorName = input('profile-doctor-name', 'text', doctor.name || '', {
    placeholder: 'mis. dr. Sari'
  });
  const doctorFacility = input('profile-doctor-facility', 'text', doctor.facility || '', {
    placeholder: 'mis. Klinik Sehat'
  });
  const doctorPhone = input('profile-doctor-phone', 'tel', doctor.phone || '', {
    inputmode: 'tel'
  });
  form.appendChild(create('div', { class: 'grid' },
    field('Nama dokter', doctorName),
    field('Faskes', doctorFacility),
    field('Telepon', doctorPhone)
  ));

  const notes = textarea('profile-notes', profile.notes || '', {
    rows: 3,
    placeholder: 'Catatan lain yang ingin Anda ingat'
  });
  form.appendChild(field('Catatan', notes));

  const error = create('p', {
    id: 'profile-form-error',
    class: 'error-text',
    role: 'alert',
    hidden: true
  });
  form.appendChild(error);

  const actions = create('div', { class: 'actions' });
  const save = create('button', {
    id: 'btn-save-profile',
    type: 'submit',
    class: 'button button--primary'
  }, 'Simpan profil');
  const remove = create('button', {
    id: 'btn-delete-profile',
    type: 'button',
    class: 'button button--danger danger'
  }, 'Hapus profil ini');
  actions.appendChild(save);
  actions.appendChild(remove);
  form.appendChild(actions);

  return {
    form,
    error,
    fields: {
      name,
      birth,
      sex,
      blood,
      allergies,
      chronic,
      contactName,
      contactRelation,
      contactPhone,
      doctorName,
      doctorFacility,
      doctorPhone,
      notes
    },
    save,
    remove
  };
}

function buildAddProfilePanel() {
  const panel = create('div', {
    id: 'add-profile-panel',
    class: 'card add-profile-panel'
  });
  panel.hidden = true;

  const form = create('form', { id: 'add-profile-form', novalidate: true });
  form.appendChild(create('h2', {}, 'Tambah anggota keluarga'));

  const name = input('new-profile-name', 'text', '', {
    required: true,
    autocomplete: 'off',
    maxlength: 120
  });
  form.appendChild(field('Nama lengkap *', name));

  const birth = input('new-profile-birth', 'date', '');
  const sex = select('new-profile-sex', sexOptions(), '');
  const blood = select('new-profile-blood', bloodOptions(), 'tidak tahu');
  form.appendChild(create('div', { class: 'grid' },
    field('Tanggal lahir', birth),
    field('Jenis kelamin', sex),
    field('Golongan darah', blood)
  ));

  const error = create('p', {
    id: 'new-profile-error',
    class: 'error-text',
    role: 'alert',
    hidden: true
  });
  form.appendChild(error);

  const actions = create('div', { class: 'actions' });
  const submit = create('button', {
    id: 'btn-create-profile',
    type: 'submit',
    class: 'button button--primary'
  }, 'Tambah profil');
  const cancel = create('button', {
    id: 'btn-cancel-add-profile',
    type: 'button',
    class: 'button button--ghost'
  }, 'Batal');
  actions.appendChild(submit);
  actions.appendChild(cancel);
  form.appendChild(actions);
  panel.appendChild(form);

  return { panel, form, name, birth, sex, blood, error, submit, cancel };
}

/**
 * Render layar Profil.
 * @param {HTMLElement} root
 * @param {object} ctx
 */
export async function render(root, ctx) {
  clear(root);
  const state = ctx.state;
  const active = ctx.profile || state.getActiveProfile();

  let profiles = [];
  let activeId = active?.id || null;
  try {
    profiles = state.list('profiles');
    const stateData = state.getState();
    activeId = stateData.activeProfileId || activeId;
  } catch (error) {
    profiles = active ? [active] : [];
  }

  const screen = create('section', { id: 'screen-profile', class: 'screen profile' });
  screen.appendChild(create('header', { class: 'screen-header' },
    create('h1', {}, 'Profil & keluarga'),
    create('p', { class: 'muted' },
      'Data setiap profil terpisah. Profil aktif dipakai di Beranda, Darurat, dan Ringkasan.')));

  // ---------------------------------------------------------------------
  // Form profil aktif
  // ---------------------------------------------------------------------
  if (active) {
    const formParts = buildProfileForm(active);

    formParts.form.addEventListener('submit', async (event) => {
      event.preventDefault();
      showError(formParts.error, '');
      const nameValue = formParts.fields.name.value.trim();
      if (!nameValue) {
        showError(formParts.error, 'Nama profil wajib diisi.');
        formParts.fields.name.focus();
        return;
      }
      const birthValue = formParts.fields.birth.value;
      if (birthValue && !isValidDateISO(birthValue)) {
        showError(formParts.error, 'Tanggal lahir tidak valid.');
        formParts.fields.birth.focus();
        return;
      }

      const existingContacts = Array.isArray(active.emergencyContacts)
        ? active.emergencyContacts.slice(1)
        : [];
      const firstContact = {
        name: formParts.fields.contactName.value.trim(),
        relation: formParts.fields.contactRelation.value.trim(),
        phone: formParts.fields.contactPhone.value.trim()
      };
      const hasFirst = Boolean(firstContact.name || firstContact.relation || firstContact.phone);
      const emergencyContacts = hasFirst
        ? [firstContact, ...existingContacts]
        : existingContacts;

      const patch = {
        name: nameValue,
        birthDate: birthValue || null,
        sex: formParts.fields.sex.value,
        bloodType: formParts.fields.blood.value,
        allergies: parseList(formParts.fields.allergies.value),
        chronicConditions: parseList(formParts.fields.chronic.value),
        emergencyContacts,
        doctor: {
          name: formParts.fields.doctorName.value.trim(),
          facility: formParts.fields.doctorFacility.value.trim(),
          phone: formParts.fields.doctorPhone.value.trim()
        },
        notes: formParts.fields.notes.value
      };

      formParts.save.disabled = true;
      formParts.save.textContent = 'Menyimpan…';
      try {
        await state.updateProfile(active.id, patch);
        toast(ctx, 'Profil disimpan.', 'success');
        await ctx.refresh();
      } catch (error) {
        showError(formParts.error, error?.message || 'Profil gagal disimpan.');
        toast(ctx, error?.message || 'Profil gagal disimpan.', 'error');
      } finally {
        formParts.save.disabled = false;
        formParts.save.textContent = 'Simpan profil';
      }
    });

    const deleteProfile = async (profile) => {
      const confirmed = ctx.confirm(
        `Hapus profil "${profile.name || 'Tanpa nama'}"? Semua obat, kunjungan, vital, `
        + 'lab, dan foto milik profil ini ikut dihapus. Tindakan ini tidak dapat dibatalkan.'
      );
      if (!confirmed) return false;
      try {
        await state.removeProfile(profile.id);
        toast(ctx, 'Profil dihapus.', 'success');
        await ctx.refresh();
        return true;
      } catch (error) {
        if (error?.code === 'PROFIL_TERAKHIR') {
          const message = 'Minimal satu profil harus tetap ada.';
          showError(formParts.error, message);
          toast(ctx, message, 'error');
        } else {
          showError(formParts.error, error?.message || 'Profil gagal dihapus.');
          toast(ctx, error?.message || 'Profil gagal dihapus.', 'error');
        }
        return false;
      }
    };

    formParts.remove.addEventListener('click', () => {
      deleteProfile(active);
    });

    screen.appendChild(formParts.form);
  } else {
    screen.appendChild(create('p', { class: 'empty-state' },
      'Profil aktif tidak ditemukan. Muat ulang halaman atau tambahkan profil keluarga.'));
  }

  // ---------------------------------------------------------------------
  // Daftar keluarga
  // ---------------------------------------------------------------------
  const family = create('section', { class: 'card family-card' });
  family.appendChild(create('div', { class: 'row' },
    create('h2', {}, 'Keluarga'),
    create('span', { class: 'hint' }, `${profiles.length} profil`)));

  const familyList = create('ul', { id: 'profile-family-list', class: 'list' });
  if (profiles.length === 0) {
    familyList.appendChild(create('li', { class: 'empty-state' }, 'Belum ada profil.'));
  }

  for (const profile of profiles) {
    const isActive = profile.id === activeId;
    const item = create('li', {
      class: `family-item list-item${isActive ? ' is-active' : ''}`
    });

    const info = create('div', { class: 'family-info' });
    info.appendChild(create('strong', {}, profile.name || 'Tanpa nama'));
    const details = [];
    if (profile.birthDate) details.push(formatDateSafe(profile.birthDate));
    if (profile.bloodType && profile.bloodType !== 'tidak tahu') details.push(profile.bloodType);
    if (details.length) info.appendChild(create('div', { class: 'hint' }, details.join(' · ')));
    if (isActive) info.appendChild(create('span', { class: 'badge badge-verified' }, 'Profil aktif'));
    item.appendChild(info);

    const actions = create('div', { class: 'family-actions row' });
    const switchButton = create('button', {
      type: 'button',
      class: 'button button--ghost',
      'data-action': 'switch-profile',
      'data-profile-id': profile.id
    }, isActive ? 'Sedang aktif' : 'Gunakan');
    switchButton.disabled = isActive;
    switchButton.addEventListener('click', async () => {
      switchButton.disabled = true;
      try {
        await state.setActiveProfile(profile.id);
        toast(ctx, `Profil ${profile.name || 'keluarga'} dipilih.`, 'success');
        await ctx.refresh();
      } catch (error) {
        toast(ctx, error?.message || 'Profil gagal diganti.', 'error');
        switchButton.disabled = false;
      }
    });
    actions.appendChild(switchButton);

    const deleteButton = create('button', {
      type: 'button',
      class: 'button button--danger danger',
      'data-action': 'delete-profile',
      'data-profile-id': profile.id
    }, 'Hapus');
    deleteButton.addEventListener('click', async () => {
      const confirmed = ctx.confirm(
        `Hapus profil "${profile.name || 'Tanpa nama'}" beserta seluruh datanya? `
        + 'Tindakan ini tidak dapat dibatalkan.'
      );
      if (!confirmed) return;
      deleteButton.disabled = true;
      try {
        await state.removeProfile(profile.id);
        toast(ctx, 'Profil dihapus.', 'success');
        await ctx.refresh();
      } catch (error) {
        if (error?.code === 'PROFIL_TERAKHIR') {
          toast(ctx, 'Minimal satu profil harus tetap ada.', 'error');
        } else {
          toast(ctx, error?.message || 'Profil gagal dihapus.', 'error');
        }
        deleteButton.disabled = false;
      }
    });
    actions.appendChild(deleteButton);
    item.appendChild(actions);
    familyList.appendChild(item);
  }
  family.appendChild(familyList);
  screen.appendChild(family);

  // ---------------------------------------------------------------------
  // Tambah profil
  // ---------------------------------------------------------------------
  const addParts = buildAddProfilePanel();
  const addToggle = create('button', {
    id: 'btn-add-profile',
    type: 'button',
    class: 'button button--primary',
    'aria-expanded': 'false',
    'aria-controls': 'add-profile-panel'
  }, 'Tambah profil keluarga');

  addToggle.addEventListener('click', () => {
    const willOpen = addParts.panel.hidden;
    addParts.panel.hidden = !willOpen;
    addToggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    if (willOpen) addParts.name.focus();
  });

  addParts.cancel.addEventListener('click', () => {
    addParts.form.reset();
    showError(addParts.error, '');
    addParts.panel.hidden = true;
    addToggle.setAttribute('aria-expanded', 'false');
    addToggle.focus();
  });

  addParts.form.addEventListener('submit', async (event) => {
    event.preventDefault();
    showError(addParts.error, '');
    const nameValue = addParts.name.value.trim();
    if (!nameValue) {
      showError(addParts.error, 'Nama anggota keluarga wajib diisi.');
      addParts.name.focus();
      return;
    }
    const birthValue = addParts.birth.value;
    if (birthValue && !isValidDateISO(birthValue)) {
      showError(addParts.error, 'Tanggal lahir tidak valid.');
      addParts.birth.focus();
      return;
    }

    addParts.submit.disabled = true;
    addParts.submit.textContent = 'Menambahkan…';
    try {
      const created = await state.addProfile({
        name: nameValue,
        birthDate: birthValue || null,
        sex: addParts.sex.value,
        bloodType: addParts.blood.value
      });
      if (created?.id) {
        try {
          await state.setActiveProfile(created.id);
        } catch {
          // Profil tetap tersimpan meskipun penggantian profil aktif gagal.
        }
      }
      toast(ctx, 'Profil keluarga ditambahkan.', 'success');
      await ctx.refresh();
    } catch (error) {
      showError(addParts.error, error?.message || 'Profil gagal ditambahkan.');
      toast(ctx, error?.message || 'Profil gagal ditambahkan.', 'error');
    } finally {
      addParts.submit.disabled = false;
      addParts.submit.textContent = 'Tambah profil';
    }
  });

  const addSection = create('section', { class: 'card add-profile-card' });
  addSection.appendChild(create('h2', {}, 'Tambah anggota keluarga'));
  addSection.appendChild(create('p', { class: 'muted' },
    'Data obat, kunjungan, vital, dan lab disimpan terpisah per profil.'));
  addSection.appendChild(addToggle);
  addSection.appendChild(addParts.panel);
  screen.appendChild(addSection);

  screen.appendChild(create('p', { class: 'hint' }, DISCLAIMERS.privacy));
  root.appendChild(screen);
  return undefined;
}

export default render;
