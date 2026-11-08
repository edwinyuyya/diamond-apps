/* Catatan2 — UI satu halaman.
 * Hanya memakai API HTTP /api/notes dan merender seluruh data pengguna
 * dengan textContent (tidak pernah innerHTML).
 */
(function () {
  'use strict';

  var form = document.getElementById('note-form');
  var titleInput = document.getElementById('title');
  var contentInput = document.getElementById('content');
  var submitBtn = document.getElementById('submit-btn');
  var cancelBtn = document.getElementById('cancel-btn');
  var formError = document.getElementById('form-error');
  var notesList = document.getElementById('notes-list');
  var listStatus = document.getElementById('list-status');
  var formHeading = document.getElementById('form-heading');

  var SAVE_ERROR_FALLBACK = 'Gagal menyimpan catatan.';
  var LOAD_ERROR_FALLBACK = 'Gagal memuat catatan.';
  var DELETE_ERROR_FALLBACK = 'Gagal menghapus catatan.';
  var CONFIRM_DELETE = 'Hapus catatan ini?';

  var activeNoteId = null;
  var isSaving = false;

  /* ---------- Utilitas tampilan ---------- */

  function setFormError(message) {
    formError.textContent = message || '';
  }

  function clearFormError() {
    setFormError('');
  }

  function setListStatus(message, isError) {
    listStatus.textContent = message || '';
    listStatus.classList.toggle('is-error', Boolean(message) && isError === true);
  }

  function formatUpdatedAt(value) {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
    try {
      return date.toLocaleString('id-ID');
    } catch (error) {
      return String(value);
    }
  }

  /* ---------- Lapisan HTTP ---------- */

  function request(url, options) {
    return fetch(url, options).then(
      function (response) {
        if (response.status === 204) {
          return null;
        }

        return response.text().then(function (raw) {
          var payload = null;
          if (raw) {
            try {
              payload = JSON.parse(raw);
            } catch (error) {
              payload = null;
            }
          }

          if (!response.ok) {
            var apiMessage = '';
            if (
              payload &&
              payload.error &&
              typeof payload.error.message === 'string' &&
              payload.error.message.trim() !== ''
            ) {
              apiMessage = payload.error.message;
            }

            var httpError = new Error(apiMessage || 'Permintaan gagal.');
            httpError.status = response.status;
            httpError.fromApi = Boolean(apiMessage);
            if (apiMessage) {
              httpError.displayMessage = apiMessage;
            }
            throw httpError;
          }

          return payload;
        });
      },
      function () {
        var networkError = new Error(
          'Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.'
        );
        networkError.displayMessage = networkError.message;
        networkError.isNetworkError = true;
        throw networkError;
      }
    );
  }

  function jsonHeaders() {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };
  }

  /* ---------- Rendering daftar ---------- */

  function buildNoteCard(note) {
    var article = document.createElement('article');
    article.className = 'note';
    article.dataset.id = note.id;

    var title = document.createElement('h3');
    title.className = 'note-title';
    title.textContent = note.title;
    article.appendChild(title);

    var content = document.createElement('p');
    content.className = 'note-content';
    content.textContent = typeof note.content === 'string' ? note.content : '';
    article.appendChild(content);

    var footer = document.createElement('div');
    footer.className = 'note-footer';

    var meta = document.createElement('div');
    meta.className = 'note-meta';

    var updated = document.createElement('time');
    updated.className = 'note-updated';
    if (note.updatedAt) {
      updated.dateTime = note.updatedAt;
    }
    updated.textContent = note.updatedAt
      ? formatUpdatedAt(note.updatedAt)
      : 'Waktu tidak tersedia';
    meta.appendChild(updated);

    var actions = document.createElement('div');
    actions.className = 'note-actions';

    var editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn btn--small btn--secondary edit-btn';
    editBtn.textContent = 'Edit';
    editBtn.setAttribute('aria-label', 'Edit catatan: ' + note.title);
    editBtn.addEventListener('click', function () {
      beginEdit(note);
    });

    var deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn--small btn--danger delete-btn';
    deleteBtn.textContent = 'Hapus';
    deleteBtn.setAttribute('aria-label', 'Hapus catatan: ' + note.title);
    deleteBtn.addEventListener('click', function () {
      deleteNote(note, deleteBtn);
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    footer.appendChild(meta);
    footer.appendChild(actions);
    article.appendChild(footer);

    return article;
  }

  function renderNotes(notes) {
    notesList.replaceChildren();

    if (!Array.isArray(notes) || notes.length === 0) {
      var empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'Belum ada catatan.';
      notesList.appendChild(empty);
      return;
    }

    var fragment = document.createDocumentFragment();
    notes.forEach(function (note) {
      fragment.appendChild(buildNoteCard(note));
    });
    notesList.appendChild(fragment);
  }

  function loadNotes() {
    setListStatus('Memuat catatan…', false);
    notesList.setAttribute('aria-busy', 'true');

    return request('/api/notes', {
      headers: { Accept: 'application/json' }
    })
      .then(function (notes) {
        renderNotes(notes);
        setListStatus('', false);
      })
      .catch(function (error) {
        // Jangan biarkan kartu parsial tertinggal saat pemuatan gagal.
        notesList.replaceChildren();
        setListStatus(error.displayMessage || LOAD_ERROR_FALLBACK, true);
      })
      .then(function () {
        notesList.removeAttribute('aria-busy');
      });
  }

  /* ---------- Mode form ---------- */

  function setSaving(saving) {
    isSaving = saving;
    submitBtn.disabled = saving;
    cancelBtn.disabled = saving;
    form.setAttribute('aria-busy', saving ? 'true' : 'false');
  }

  function beginEdit(note) {
    activeNoteId = note.id;
    titleInput.value = note.title;
    contentInput.value = typeof note.content === 'string' ? note.content : '';
    submitBtn.textContent = 'Simpan Perubahan';
    cancelBtn.hidden = false;
    if (formHeading) {
      formHeading.textContent = 'Edit catatan';
    }
    clearFormError();
    titleInput.focus();
    try {
      titleInput.setSelectionRange(titleInput.value.length, titleInput.value.length);
    } catch (error) {
      /* setSelectionRange tidak didukung untuk sebagian tipe input. */
    }
  }

  function resetForm() {
    form.reset();
    activeNoteId = null;
    submitBtn.textContent = 'Tambah Catatan';
    cancelBtn.hidden = true;
    if (formHeading) {
      formHeading.textContent = 'Tambah catatan';
    }
    clearFormError();
    setSaving(false);
  }

  /* ---------- Aksi CRUD ---------- */

  function handleSubmit(event) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    clearFormError();

    var payload = {
      title: titleInput.value,
      content: contentInput.value
    };
    var editingId = activeNoteId;
    var isEdit = editingId !== null && editingId !== undefined;

    setSaving(true);

    var url = isEdit ? '/api/notes/' + encodeURIComponent(editingId) : '/api/notes';
    var method = isEdit ? 'PUT' : 'POST';

    request(url, {
      method: method,
      headers: jsonHeaders(),
      body: JSON.stringify(payload)
    })
      .then(function () {
        resetForm();
        return loadNotes();
      })
      .catch(function (error) {
        var message = error.displayMessage || SAVE_ERROR_FALLBACK;

        if (error.status === 404 && isEdit) {
          // Catatan hilang (mis. dihapus di tab lain): tampilkan error dan
          // sinkronkan ulang daftar.
          resetForm();
          setFormError(message);
          return loadNotes();
        }

        setFormError(message);
      })
      .then(function () {
        setSaving(false);
      });
  }

  function deleteNote(note, button) {
    if (!window.confirm(CONFIRM_DELETE)) {
      return;
    }

    button.disabled = true;

    request('/api/notes/' + encodeURIComponent(note.id), {
      method: 'DELETE',
      headers: { Accept: 'application/json' }
    })
      .then(function () {
        if (activeNoteId === note.id) {
          resetForm();
        }
        return loadNotes();
      })
      .catch(function (error) {
        button.disabled = false;
        var message = error.displayMessage || DELETE_ERROR_FALLBACK;

        if (error.status === 404) {
          if (activeNoteId === note.id) {
            resetForm();
          }
          return loadNotes().then(function () {
            setListStatus(message, true);
          });
        }

        // Daftar tidak berubah saat penghapusan gagal.
        setListStatus(message, true);
      });
  }

  /* ---------- Inisialisasi ---------- */

  form.addEventListener('submit', handleSubmit);
  cancelBtn.addEventListener('click', resetForm);

  loadNotes();
})();
