// Fake DOM minimal tanpa dependency untuk menguji layar suara/pemeriksaan
// (CONTRACT.md 10.3 & 14.1). Cukup untuk modul `app/js/dom.js` dan layar
// yang memakai `h()`, `textContent`, atribut, kelas, event, dan querySelector.
//
// Bukan emulasi peramban lengkap: tidak ada layout, CSS, atau navigasi.

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;
const DOCUMENT_NODE = 9;
const FRAGMENT_NODE = 11;

const VOID_TAGS = new Set(['input', 'img', 'br', 'hr', 'meta', 'link', 'source', 'area', 'base', 'col', 'embed', 'param', 'track', 'wbr']);

const FOCUSABLE_TAGS = new Set(['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A']);

const BOOLEAN_ATTRS = [
  'disabled', 'checked', 'required', 'hidden', 'selected', 'readonly',
  'multiple', 'autofocus', 'open', 'novalidate'
];

function nodeChildren(node) {
  return node && Array.isArray(node._children) ? node._children : [];
}

function normalizeSpace(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

/* ------------------------------------------------------------------ */
/* Selector engine kecil                                               */
/* ------------------------------------------------------------------ */

function splitTopLevel(selector, separator) {
  const hasil = [];
  let depth = 0;
  let quote = null;
  let mulai = 0;
  for (let i = 0; i < selector.length; i += 1) {
    const ch = selector[i];
    if (quote) {
      if (ch === quote && selector[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '[' || ch === '(') depth += 1;
    else if (ch === ']' || ch === ')') depth = Math.max(0, depth - 1);
    else if (ch === separator && depth === 0) {
      hasil.push(selector.slice(mulai, i));
      mulai = i + 1;
    }
  }
  hasil.push(selector.slice(mulai));
  return hasil;
}

function splitDescendant(selector) {
  return splitTopLevel(selector.trim(), ' ')
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseCompound(text) {
  const cond = { tag: null, id: null, classes: [], attrs: [], nots: [] };
  const source = String(text || '').trim();
  let i = 0;

  while (i < source.length) {
    const ch = source[i];

    if (ch === '*') { i += 1; continue; }

    if (ch === '#' || ch === '.') {
      const match = /^[A-Za-z0-9_-]+/.exec(source.slice(i + 1));
      if (!match) { i += 1; continue; }
      if (ch === '#') cond.id = match[0];
      else cond.classes.push(match[0]);
      i += 1 + match[0].length;
      continue;
    }

    if (ch === '[') {
      const end = source.indexOf(']', i);
      if (end < 0) { i += 1; continue; }
      const inner = source.slice(i + 1, end).trim();
      const match = /^([\w-]+)\s*(?:([~^$*|]?=)\s*["']?([^"'\]]*)["']?)?$/.exec(inner);
      if (match) {
        cond.attrs.push({ name: match[1], op: match[2] || null, value: match[3] ?? null });
      }
      i = end + 1;
      continue;
    }

    if (ch === ':') {
      const notMatch = /^:not\(([^)]*)\)/.exec(source.slice(i));
      if (notMatch) {
        const parts = splitDescendant(notMatch[1]).map(parseCompound);
        if (parts.length) cond.nots.push(parts);
        i += notMatch[0].length;
        continue;
      }
      const pseudo = /^:([\w-]+)(?:\(([^)]*)\))?/.exec(source.slice(i));
      if (pseudo) { i += pseudo[0].length; continue; }
      i += 1;
      continue;
    }

    const tag = /^[A-Za-z][\w-]*/.exec(source.slice(i));
    if (tag && cond.tag === null) {
      cond.tag = tag[0].toUpperCase();
      i += tag[0].length;
      continue;
    }
    i += 1;
  }

  return cond;
}

function parseSelector(selector) {
  return splitTopLevel(String(selector || ''), ',')
    .map((bagian) => splitDescendant(bagian).map(parseCompound))
    .filter((parts) => parts.length > 0);
}

function attrMatches(el, attr) {
  if (!el.hasAttribute(attr.name)) return false;
  if (attr.op === null) return true;
  const actual = String(el.getAttribute(attr.name));
  const expected = String(attr.value ?? '');
  switch (attr.op) {
    case '=': return actual === expected;
    case '^=': return actual.startsWith(expected);
    case '$=': return actual.endsWith(expected);
    case '*=': return actual.includes(expected);
    case '~=': return actual.split(/\s+/).includes(expected);
    case '|=': return actual === expected || actual.startsWith(`${expected}-`);
    default: return false;
  }
}

function matchesCompound(el, cond) {
  if (!el || el.nodeType !== ELEMENT_NODE) return false;
  if (cond.tag && el.tagName !== cond.tag) return false;
  if (cond.id && el.id !== cond.id) return false;
  for (const kelas of cond.classes) {
    if (!el.classList.contains(kelas)) return false;
  }
  for (const attr of cond.attrs) {
    if (!attrMatches(el, attr)) return false;
  }
  for (const notParts of cond.nots) {
    if (matchesComplex(el, notParts)) return false;
  }
  return true;
}

function matchesComplex(el, parts) {
  if (!el || el.nodeType !== ELEMENT_NODE || parts.length === 0) return false;
  const terakhir = parts[parts.length - 1];
  if (!matchesCompound(el, terakhir)) return false;
  let kandidat = el.parentNode;
  for (let index = parts.length - 2; index >= 0; index -= 1) {
    let cocok = null;
    while (kandidat && kandidat.nodeType === ELEMENT_NODE) {
      if (matchesCompound(kandidat, parts[index])) { cocok = kandidat; break; }
      kandidat = kandidat.parentNode;
    }
    if (!cocok) return false;
    kandidat = cocok.parentNode;
  }
  return true;
}

function descendants(node) {
  const hasil = [];
  const kunjungi = (induk) => {
    for (const child of nodeChildren(induk)) {
      if (child.nodeType !== ELEMENT_NODE) continue;
      hasil.push(child);
      kunjungi(child);
    }
  };
  kunjungi(node);
  return hasil;
}

/* ------------------------------------------------------------------ */
/* Node                                                                */
/* ------------------------------------------------------------------ */

class FakeTextNode {
  constructor(text, ownerDocument) {
    this.nodeType = TEXT_NODE;
    this.nodeName = '#text';
    this.ownerDocument = ownerDocument;
    this.parentNode = null;
    this.data = String(text == null ? '' : text);
  }

  get textContent() { return this.data; }
  set textContent(value) { this.data = String(value == null ? '' : value); }
  get nodeValue() { return this.data; }
  set nodeValue(value) { this.data = String(value == null ? '' : value); }
  get firstChild() { return null; }
  get childNodes() { return []; }
  get children() { return []; }
  appendChild() { throw new Error('Text node tidak dapat memiliki anak.'); }
  removeChild() { throw new Error('Text node tidak dapat memiliki anak.'); }
  addEventListener() {}
  removeEventListener() {}
}

class FakeElement {
  constructor(tag, ownerDocument, namespace = null) {
    this.nodeType = ELEMENT_NODE;
    this.tagName = String(tag).toUpperCase();
    this.localName = String(tag);
    this.ownerDocument = ownerDocument;
    this.namespaceURI = namespace;
    this.parentNode = null;
    this._children = [];
    this._attrs = new Map();
    this._listeners = new Map();
    this.dataset = {};
    this.style = {};
  }

  /* --- atribut --- */
  setAttribute(name, value) {
    const key = String(name).toLowerCase();
    this._attrs.set(key, String(value == null ? '' : value));
  }

  getAttribute(name) {
    const key = String(name).toLowerCase();
    return this._attrs.has(key) ? this._attrs.get(key) : null;
  }

  hasAttribute(name) {
    return this._attrs.has(String(name).toLowerCase());
  }

  removeAttribute(name) {
    this._attrs.delete(String(name).toLowerCase());
  }

  getAttributeNames() {
    return [...this._attrs.keys()];
  }

  /* --- properti umum --- */
  get id() { return this.getAttribute('id') || ''; }
  set id(value) { this.setAttribute('id', value); }

  get className() { return this.getAttribute('class') || ''; }
  set className(value) { this.setAttribute('class', value); }

  get classList() {
    const element = this;
    const daftar = () => (element.getAttribute('class') || '').split(/\s+/).filter(Boolean);
    return {
      add(...names) {
        const set = new Set(daftar());
        for (const name of names) if (name) set.add(String(name));
        element.setAttribute('class', [...set].join(' '));
      },
      remove(...names) {
        const buang = new Set(names.map(String));
        element.setAttribute('class', daftar().filter((name) => !buang.has(name)).join(' '));
      },
      contains(name) { return daftar().includes(String(name)); },
      toggle(name, force) {
        const ada = daftar().includes(String(name));
        const aktif = force === undefined ? !ada : Boolean(force);
        if (aktif && !ada) this.add(name);
        if (!aktif && ada) this.remove(name);
        return aktif;
      },
      get value() { return daftar().join(' '); }
    };
  }

  get type() { return this.getAttribute('type') || ''; }
  set type(value) { this.setAttribute('type', value); }

  get name() { return this.getAttribute('name') || ''; }
  set name(value) { this.setAttribute('name', value); }

  get htmlFor() { return this.getAttribute('for') || ''; }
  set htmlFor(value) { this.setAttribute('for', value); }

  get value() { return this.getAttribute('value') || ''; }
  set value(value) { this.setAttribute('value', value); }

  get tabIndex() {
    const attr = this.getAttribute('tabindex');
    if (attr !== null) {
      const n = Number(attr);
      return Number.isFinite(n) ? n : -1;
    }
    if (this.tagName === 'A') return this.hasAttribute('href') ? 0 : -1;
    return FOCUSABLE_TAGS.has(this.tagName) ? 0 : -1;
  }

  set tabIndex(value) {
    const n = Number(value);
    this.setAttribute('tabindex', Number.isFinite(n) ? n : -1);
  }

  /* --- teks --- */
  get textContent() {
    if (VOID_TAGS.has(this.localName.toLowerCase())) return '';
    return this._children.map((child) => child.textContent).join('');
  }

  set textContent(value) {
    const teks = value == null ? '' : String(value);
    this._children = [];
    if (teks !== '') this.appendChild(this.ownerDocument.createTextNode(teks));
    if (this.localName === 'textarea') this.setAttribute('value', teks);
  }

  get innerText() { return this.textContent; }
  set innerText(value) { this.textContent = value; }

  /* --- pohon --- */
  get childNodes() { return [...this._children]; }
  get children() { return this._children.filter((child) => child.nodeType === ELEMENT_NODE); }
  get firstChild() { return this._children[0] || null; }
  get lastChild() { return this._children[this._children.length - 1] || null; }

  get nextSibling() {
    if (!this.parentNode) return null;
    const siblings = this.parentNode._children;
    return siblings[siblings.indexOf(this) + 1] || null;
  }

  get previousSibling() {
    if (!this.parentNode) return null;
    const siblings = this.parentNode._children;
    return siblings[siblings.indexOf(this) - 1] || null;
  }

  appendChild(child) {
    if (!child) return child;
    if (child.nodeType === FRAGMENT_NODE) {
      for (const item of [...child._children]) this.appendChild(item);
      child._children = [];
      return child;
    }
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    this._children.push(child);
    return child;
  }

  insertBefore(child, reference) {
    if (!reference) return this.appendChild(child);
    if (!child) return child;
    if (child.nodeType === FRAGMENT_NODE) {
      for (const item of [...child._children]) this.insertBefore(item, reference);
      child._children = [];
      return child;
    }
    if (child.parentNode) child.parentNode.removeChild(child);
    const index = this._children.indexOf(reference);
    if (index < 0) return this.appendChild(child);
    child.parentNode = this;
    this._children.splice(index, 0, child);
    return child;
  }

  removeChild(child) {
    const index = this._children.indexOf(child);
    if (index < 0) throw new Error('Node bukan anak elemen ini.');
    this._children.splice(index, 1);
    child.parentNode = null;
    return child;
  }

  remove() {
    if (this.parentNode) this.parentNode.removeChild(this);
  }

  /* --- event --- */
  addEventListener(type, handler, options = {}) {
    if (typeof handler !== 'function') return;
    const key = String(type);
    if (!this._listeners.has(key)) this._listeners.set(key, []);
    this._listeners.get(key).push({ handler, options: options || {} });
  }

  removeEventListener(type, handler) {
    const key = String(type);
    const daftar = this._listeners.get(key);
    if (!daftar) return;
    this._listeners.set(key, daftar.filter((item) => item.handler !== handler));
  }

  dispatchEvent(event) {
    const tipe = String(event && event.type ? event.type : '');
    if (!event.target) event.target = this;
    event.currentTarget = this;
    if (typeof event.preventDefault !== 'function') {
      event.defaultPrevented = false;
      event.preventDefault = () => { event.defaultPrevented = true; };
    }
    if (typeof event.stopPropagation !== 'function') event.stopPropagation = () => {};
    const daftar = [...(this._listeners.get(tipe) || [])];
    for (const item of daftar) {
      item.handler.call(this, event);
      if (item.options && item.options.once) {
        this._listeners.set(tipe, (this._listeners.get(tipe) || []).filter((entry) => entry !== item));
      }
    }
    return !event.defaultPrevented;
  }

  click() {
    this.dispatchEvent({ type: 'click' });
  }

  /* --- fokus --- */
  focus() {
    if (this.ownerDocument) this.ownerDocument.activeElement = this;
    this.dispatchEvent({ type: 'focus' });
  }

  blur() {
    if (this.ownerDocument && this.ownerDocument.activeElement === this) {
      this.ownerDocument.activeElement = this.ownerDocument.body;
    }
    this.dispatchEvent({ type: 'blur' });
  }

  select() {}

  /* --- query --- */
  matches(selector) {
    return parseSelector(selector).some((parts) => (
      parts.length === 1 && matchesCompound(this, parts[0])
    ));
  }

  querySelector(selector) {
    const groups = parseSelector(selector);
    for (const el of descendants(this)) {
      if (groups.some((parts) => matchesComplex(el, parts))) return el;
    }
    return null;
  }

  querySelectorAll(selector) {
    const groups = parseSelector(selector);
    return descendants(this).filter((el) => groups.some((parts) => matchesComplex(el, parts)));
  }

  getElementsByTagName(tag) {
    const target = String(tag).toUpperCase();
    return descendants(this).filter((el) => target === '*' || el.tagName === target);
  }

  closest(selector) {
    let node = this;
    while (node && node.nodeType === ELEMENT_NODE) {
      if (node.matches(selector)) return node;
      node = node.parentNode;
    }
    return null;
  }
}

// Properti boolean yang tersimpan sebagai atribut.
for (const attr of BOOLEAN_ATTRS) {
  Object.defineProperty(FakeElement.prototype, attr, {
    configurable: true,
    enumerable: true,
    get() { return this.hasAttribute(attr); },
    set(value) {
      if (value) this.setAttribute(attr, '');
      else this.removeAttribute(attr);
    }
  });
}

// Alias camelCase yang dipakai `dom.js`.
Object.defineProperty(FakeElement.prototype, 'readOnly', {
  configurable: true,
  get() { return this.hasAttribute('readonly'); },
  set(value) {
    if (value) this.setAttribute('readonly', '');
    else this.removeAttribute('readonly');
  }
});

class FakeFragment {
  constructor(ownerDocument) {
    this.nodeType = FRAGMENT_NODE;
    this.nodeName = '#document-fragment';
    this.ownerDocument = ownerDocument;
    this.parentNode = null;
    this._children = [];
  }

  get childNodes() { return [...this._children]; }
  get children() { return this._children; }
  get firstChild() { return this._children[0] || null; }

  appendChild(child) {
    if (!child) return child;
    if (child.nodeType === FRAGMENT_NODE) {
      for (const item of [...child._children]) this.appendChild(item);
      child._children = [];
      return child;
    }
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    this._children.push(child);
    return child;
  }

  removeChild(child) {
    const index = this._children.indexOf(child);
    if (index >= 0) {
      this._children.splice(index, 1);
      child.parentNode = null;
    }
    return child;
  }
}

class FakeDocument {
  constructor() {
    this.nodeType = DOCUMENT_NODE;
    this.nodeName = '#document';
    this.ownerDocument = null;
    this._listeners = new Map();
    this.documentElement = new FakeElement('html', this);
    this.head = new FakeElement('head', this);
    this.body = new FakeElement('body', this);
    this.documentElement.appendChild(this.head);
    this.documentElement.appendChild(this.body);
    this.activeElement = this.body;
    this.title = '';
  }

  createElement(tag) { return new FakeElement(tag, this); }
  createElementNS(namespace, tag) { return new FakeElement(tag, this, namespace); }
  createTextNode(text) { return new FakeTextNode(text, this); }
  createDocumentFragment() { return new FakeFragment(this); }

  get childNodes() { return [this.documentElement]; }
  get children() { return [this.documentElement]; }
  get firstChild() { return this.documentElement; }
  get bodyElement() { return this.body; }

  appendChild(child) {
    this.documentElement.appendChild(child);
    return child;
  }

  getElementById(id) {
    const target = String(id);
    if (this.documentElement.id === target) return this.documentElement;
    return descendants(this.documentElement).find((el) => el.id === target) || null;
  }

  querySelector(selector) {
    const groups = parseSelector(selector);
    const semua = [this.documentElement, ...descendants(this.documentElement)];
    return semua.find((el) => groups.some((parts) => matchesComplex(el, parts))) || null;
  }

  querySelectorAll(selector) {
    const groups = parseSelector(selector);
    const semua = [this.documentElement, ...descendants(this.documentElement)];
    return semua.filter((el) => groups.some((parts) => matchesComplex(el, parts)));
  }

  addEventListener(type, handler) {
    if (typeof handler !== 'function') return;
    const key = String(type);
    if (!this._listeners.has(key)) this._listeners.set(key, []);
    this._listeners.get(key).push(handler);
  }

  removeEventListener(type, handler) {
    const key = String(type);
    this._listeners.set(key, (this._listeners.get(key) || []).filter((fn) => fn !== handler));
  }

  dispatchEvent(event) {
    const tipe = String(event && event.type ? event.type : '');
    for (const handler of [...(this._listeners.get(tipe) || [])]) handler.call(this, event);
    return true;
  }
}

/* ------------------------------------------------------------------ */
/* Publik                                                              */
/* ------------------------------------------------------------------ */

/**
 * Pasang DOM palsu sebagai `globalThis.document` (hanya selama test).
 * @returns {{document: FakeDocument, createRoot: Function, teardown: Function}}
 */
export function createFakeDom() {
  const sebelumnya = Object.prototype.hasOwnProperty.call(globalThis, 'document')
    ? globalThis.document
    : undefined;
  const document = new FakeDocument();
  globalThis.document = document;

  return {
    document,
    createRoot() {
      const root = document.createElement('div');
      root.id = 'app-view';
      document.body.appendChild(root);
      return root;
    },
    teardown() {
      if (sebelumnya === undefined) delete globalThis.document;
      else globalThis.document = sebelumnya;
    }
  };
}

/** Semua elemen di bawah root (tidak termasuk root). */
export function allElements(root) {
  return descendants(root);
}

/** Peta id -> indeks urutan dokumen (untuk uji urutan fokus/logis). */
export function documentOrder(root) {
  const map = new Map();
  allElements(root).forEach((el, index) => {
    if (el.id && !map.has(el.id)) map.set(el.id, index);
  });
  return map;
}

/** Teks yang dipangkas dan spasinya dirapikan. */
export function textOf(el) {
  return normalizeSpace(el ? el.textContent : '');
}

/** Label `<label for=...>` untuk satu kontrol. */
export function labelFor(el, root = null) {
  if (!el || !el.id) return null;
  const scope = root || el.ownerDocument;
  let labels = [];
  if (scope && typeof scope.querySelectorAll === 'function') {
    labels = scope.querySelectorAll(`label[for="${el.id}"]`);
  }
  return labels.length > 0 ? labels[0] : null;
}

function resolveLabelledBy(el) {
  const ids = (el.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean);
  const doc = el.ownerDocument;
  return ids
    .map((id) => (doc && typeof doc.getElementById === 'function' ? doc.getElementById(id) : null))
    .filter(Boolean)
    .map((item) => textOf(item))
    .join(' ');
}

/**
 * Nama aksesibel sederhana: aria-label, aria-labelledby, label for, alt, teks.
 */
export function accessibleName(el, root = null) {
  if (!el || el.nodeType !== ELEMENT_NODE) return '';
  const aria = normalizeSpace(el.getAttribute('aria-label'));
  if (aria) return aria;
  const labelled = normalizeSpace(resolveLabelledBy(el));
  if (labelled) return labelled;

  const tag = el.tagName;
  if (tag === 'IMG') return normalizeSpace(el.getAttribute('alt'));

  if (tag === 'INPUT') {
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    if (['submit', 'button', 'reset'].includes(type)) {
      return normalizeSpace(el.getAttribute('value'));
    }
    const label = labelFor(el, root);
    if (label) return textOf(label);
    return '';
  }

  if (tag === 'SELECT' || tag === 'TEXTAREA') {
    const label = labelFor(el, root);
    if (label) return textOf(label);
    return '';
  }

  const teks = textOf(el);
  if (teks) return teks;
  return normalizeSpace(el.getAttribute('title'));
}

/** Apakah elemen (atau leluhurnya) tersembunyi dari pohon aksesibilitas. */
export function isHidden(el) {
  let node = el;
  while (node && node.nodeType === ELEMENT_NODE) {
    if (node.hidden) return true;
    if (node.getAttribute('aria-hidden') === 'true') return true;
    if (node.style && node.style.display === 'none') return true;
    node = node.parentNode;
  }
  return false;
}

/**
 * Elemen yang dapat difokus dengan Tab, dalam urutan dokumen.
 * Menghormati disabled, hidden, type=hidden, dan tabindex negatif.
 */
export function tabbables(root) {
  return allElements(root).filter((el) => {
    if (isHidden(el)) return false;
    if (el.disabled) return false;
    if (el.tagName === 'INPUT' && String(el.type).toLowerCase() === 'hidden') return false;
    if (!FOCUSABLE_TAGS.has(el.tagName) && !el.hasAttribute('tabindex')) return false;
    return el.tabIndex >= 0;
  });
}

export const SELECTOR_ENGINE = { parseSelector, matchesComplex, descendants };
