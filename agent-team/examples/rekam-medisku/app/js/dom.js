// Rekam Medisku — helper DOM kecil tanpa dependency.
// Tidak menyentuh DOM saat impor; hanya saat fungsi dipanggil.

const SVG_NS = 'http://www.w3.org/2000/svg';

// Tag yang harus dibuat dengan namespace SVG. `h('svg', ...)` dan anak-anaknya
// (path, circle, dst.) bekerja tanpa perlu pembungkus khusus.
const SVG_TAGS = new Set([
  'svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon',
  'text', 'tspan', 'title', 'desc', 'defs', 'use', 'symbol', 'clipPath', 'mask',
  'linearGradient', 'radialGradient', 'stop', 'pattern', 'marker', 'foreignObject'
]);

// Properti boolean yang harus diset sebagai properti (dan atribut) elemen.
const BOOLEAN_PROPS = new Set([
  'disabled', 'checked', 'required', 'hidden', 'selected', 'readOnly', 'multiple',
  'autofocus', 'autoplay', 'controls', 'loop', 'muted', 'novalidate', 'open',
  'formNoValidate', 'defaultChecked', 'defaultSelected', 'indeterminate'
]);

function isNode(value) {
  return Boolean(value) && typeof value === 'object' && typeof value.nodeType === 'number';
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && !isNode(value);
}

function createElement(tag) {
  const name = String(tag);
  if (SVG_TAGS.has(name)) return document.createElementNS(SVG_NS, name);
  return document.createElement(name);
}

function appendChild(parent, child) {
  if (child == null || child === false || child === true) return;
  if (Array.isArray(child)) {
    for (const entry of child) appendChild(parent, entry);
    return;
  }
  if (isNode(child)) {
    parent.appendChild(child);
    return;
  }
  if (typeof child === 'string' || typeof child === 'number' || typeof child === 'bigint') {
    parent.appendChild(document.createTextNode(String(child)));
  }
  // Fungsi/objek lain diabaikan dengan sengaja (mis. hasil `cond && h(...)`).
}

function applyProps(element, props) {
  for (const key of Object.keys(props)) {
    const value = props[key];
    if (value == null) continue;

    if (key === 'class' || key === 'className') {
      element.setAttribute('class', String(value));
      continue;
    }
    if (key === 'text' || key === 'textContent') {
      element.textContent = String(value);
      continue;
    }
    if (key === 'dataset') {
      if (isPlainObject(value)) {
        for (const dataKey of Object.keys(value)) {
          if (value[dataKey] != null) element.dataset[dataKey] = String(value[dataKey]);
        }
      }
      continue;
    }
    if (key === 'style') {
      if (typeof value === 'string') element.setAttribute('style', value);
      else if (isPlainObject(value)) Object.assign(element.style, value);
      continue;
    }
    if (key === 'on' && isPlainObject(value)) {
      for (const eventName of Object.keys(value)) {
        if (typeof value[eventName] === 'function') element.addEventListener(eventName, value[eventName]);
      }
      continue;
    }
    if (key.length > 2 && key.startsWith('on') && typeof value === 'function') {
      element.addEventListener(key.slice(2).toLowerCase(), value);
      continue;
    }
    // innerHTML sengaja tidak didukung: data pengguna wajib lewat teks/DOM.
    if (key === 'html' || key === 'innerHTML') continue;

    if (BOOLEAN_PROPS.has(key)) {
      element[key] = Boolean(value);
      if (value) element.setAttribute(key.toLowerCase(), '');
      else element.removeAttribute(key.toLowerCase());
      continue;
    }
    if (key === 'for') {
      element.htmlFor = String(value);
      element.setAttribute('for', String(value));
      continue;
    }
    if (key === 'value') {
      element.value = String(value);
      try {
        element.setAttribute('value', String(value));
      } catch {
        // Elemen tanpa atribut value (mis. DocumentFragment) diabaikan.
      }
      continue;
    }
    if (key === 'aria' && isPlainObject(value)) {
      for (const ariaKey of Object.keys(value)) {
        if (value[ariaKey] != null) element.setAttribute(`aria-${ariaKey}`, String(value[ariaKey]));
      }
      continue;
    }
    if (key === 'props' && isPlainObject(value)) {
      // Kompatibilitas: objek `props` tambahan diterapkan rekursif.
      applyProps(element, value);
      continue;
    }

    element.setAttribute(key, String(value));
  }
}

/**
 * Membuat elemen DOM. Tidak memakai innerHTML.
 * @param {string} tag
 * @param {object|string|Node} [props]
 * @param {...any} children
 * @returns {Element}
 */
export function h(tag, props = {}, ...children) {
  let normalizedProps = props;
  const needsChildFirst = props == null
    || typeof props === 'string'
    || typeof props === 'number'
    || Array.isArray(props)
    || isNode(props);
  if (needsChildFirst) {
    normalizedProps = {};
    if (props != null) children.unshift(props);
  }
  if (!isPlainObject(normalizedProps)) normalizedProps = {};

  const element = createElement(tag);
  applyProps(element, normalizedProps);
  for (const child of children) appendChild(element, child);
  return element;
}

/**
 * querySelector singkat.
 */
export function qs(selector, root = document) {
  if (!root || typeof root.querySelector !== 'function') return null;
  return root.querySelector(selector);
}

/**
 * querySelectorAll sebagai array biasa.
 */
export function qsa(selector, root = document) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  return Array.from(root.querySelectorAll(selector));
}

/**
 * Mengosongkan seluruh anak node.
 */
export function clear(node) {
  if (!node) return node;
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

/**
 * Memasang listener dan mengembalikan fungsi pelepas yang idempoten.
 */
export function on(node, event, handler, options) {
  if (!node || typeof node.addEventListener !== 'function' || typeof handler !== 'function') {
    return () => {};
  }
  node.addEventListener(event, handler, options);
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    node.removeEventListener(event, handler, options);
  };
}

/**
 * Meng-escape lima karakter HTML penting.
 */
export function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return character;
    }
  });
}

/**
 * Menulis teks dengan aman (tanpa innerHTML).
 */
export function setText(node, text) {
  if (!node) return node;
  node.textContent = text == null ? '' : String(text);
  return node;
}

/**
 * DocumentFragment berisi anak-anak yang diberikan.
 */
export function fragment(...children) {
  const frag = document.createDocumentFragment();
  for (const child of children) appendChild(frag, child);
  return frag;
}
