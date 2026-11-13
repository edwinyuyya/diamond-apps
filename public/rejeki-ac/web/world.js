/*
 * Kota mini 3D Rejeki Utama AC, digerakkan oleh scroll.
 *
 * Cerita (t = waktu cerita dalam "unit", lihat PHASES di bawah):
 *   pelanggan memesan lewat HP → sinyal ke CS di kantor → teknisi berangkat
 *   → 8 adegan kerja (service AC, pasang AC, toren, high pressure, CCTV,
 *   APAR, solar water heater, pembersihan hunian) → semua selesai.
 *
 * Semua keadaan adegan dihitung dari t saja (fungsi murni), jadi scroll ke
 * atas memutar cerita mundur. Gerak kecil (air, angin, partikel) memakai jam.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// ---------------------------------------------------------------- warna
const C = {
  bg: 0xeaf6fb, ground: 0xffffff, edge: 0x0daef1, road: 0xd7e6ee, grass: 0xbfe6c8,
  wall: 0xf7f3ec, wall2: 0xeef4f8, roof: 0x0a86bd, floor: 0xdfe9ef, wood: 0xc99a6b,
  brand: 0x0daef1, deep: 0x0a86bd, ink: 0x0b4a6b, skin: 0xf0c29b, skin2: 0xc68a5f,
  uniform: 0x0a86bd, pants: 0x1f3b52, white: 0xffffff, acWhite: 0xf4f8fb,
  dirt: 0x9a8461, moss: 0x7f9a62, toren: 0xf08a3e, red: 0xe5484e, yellow: 0xf5b800,
  green: 0x12a877, glass: 0x9fd6ee, dark: 0x23313d, grey: 0x9aa8b3,
};

// ---------------------------------------------------------------- utilitas
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const seg = (u, a, b) => clamp((u - a) / (b - a));
const matCache = new Map();
function mat(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...o }));
  return matCache.get(key);
}
function own(color, o = {}) { return new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...o }); }
function mesh(geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
const box = (w, h, d, material, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), material, x, y, z);
const rbox = (w, h, d, r, material, x, y, z) => mesh(new RoundedBoxGeometry(w, h, d, 3, r), material, x, y, z);
const cyl = (rt, rb, h, material, x, y, z, seg = 24) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material, x, y, z);
const sph = (r, material, x, y, z) => mesh(new THREE.SphereGeometry(r, 20, 14), material, x, y, z);

// Label (gelembung chat, kartu tiket) digambar di canvas
function label(text, o = {}) {
  const fs = 44, pad = 26, font = `600 ${fs}px Poppins, sans-serif`;
  const cv = document.createElement("canvas"), cx = cv.getContext("2d");
  cx.font = font;
  const icon = o.icon ? fs + 14 : 0;
  const w = Math.ceil(cx.measureText(text).width) + pad * 2 + icon, h = fs + pad * 2;
  cv.width = w; cv.height = h + (o.tail ? 22 : 0);
  cx.font = font;
  cx.fillStyle = o.bg || "#ffffff";
  const r = h / 2;
  cx.beginPath(); cx.roundRect(2, 2, w - 4, h - 4, r); cx.fill();
  if (o.tail) { cx.beginPath(); cx.moveTo(w / 2 - 18, h - 6); cx.lineTo(w / 2, h + 20); cx.lineTo(w / 2 + 18, h - 6); cx.fill(); }
  if (o.stroke) { cx.lineWidth = 4; cx.strokeStyle = o.stroke; cx.beginPath(); cx.roundRect(2, 2, w - 4, h - 4, r); cx.stroke(); }
  if (o.icon) { cx.fillStyle = o.iconBg || "#25D366"; cx.beginPath(); cx.arc(pad + fs / 2, h / 2, fs / 2, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = "#fff"; cx.font = `600 ${fs * 0.62}px Poppins, sans-serif`; cx.textAlign = "center"; cx.textBaseline = "middle"; cx.fillText(o.icon, pad + fs / 2, h / 2 + 2);
    cx.font = font; cx.textAlign = "left"; }
  cx.fillStyle = o.fg || "#0B4A6B"; cx.textBaseline = "middle";
  cx.fillText(text, pad + icon, h / 2 + 2);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }));
  const sc = o.scale || 0.012;
  sp.scale.set(cv.width * sc, cv.height * sc, 1);
  sp.userData.base = sp.scale.clone();
  sp.renderOrder = 10;
  return sp;
}
function showSprite(sp, k) { // muncul dengan sedikit "pop"
  const s = k <= 0 ? 0 : k < 1 ? 1 + Math.sin(k * Math.PI) * 0.18 * (1 - k) : 1;
  sp.visible = k > 0.001;
  sp.scale.set(sp.userData.base.x * Math.min(1, k * 1.6) * s, sp.userData.base.y * Math.min(1, k * 1.6) * s, 1);
}

// ---------------------------------------------------------------- orang
function person({ shirt = C.uniform, pants = C.pants, skin = C.skin, tech = false, hair = 0x2b2b2b } = {}) {
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  const legL = new THREE.Group(), legR = new THREE.Group();
  legL.position.set(-0.13, 0.78, 0); legR.position.set(0.13, 0.78, 0);
  legL.add(cyl(0.09, 0.08, 0.78, mat(pants), 0, -0.39, 0)); legR.add(cyl(0.09, 0.08, 0.78, mat(pants), 0, -0.39, 0));
  legL.add(box(0.16, 0.08, 0.26, mat(C.dark), 0, -0.76, 0.05)); legR.add(box(0.16, 0.08, 0.26, mat(C.dark), 0, -0.76, 0.05));
  body.add(legL, legR);
  body.add(rbox(0.5, 0.66, 0.3, 0.12, mat(shirt), 0, 1.12, 0));
  if (tech) body.add(box(0.51, 0.06, 0.31, mat(C.white), 0, 1.0, 0)); // garis seragam
  const head = new THREE.Group(); head.position.set(0, 1.62, 0); body.add(head);
  head.add(sph(0.2, mat(skin), 0, 0, 0));
  if (tech) { // topi teknisi
    head.add(cyl(0.21, 0.22, 0.12, mat(C.deep), 0, 0.12, 0));
    head.add(box(0.24, 0.03, 0.16, mat(C.deep), 0, 0.08, 0.2));
  } else head.add(mesh(new THREE.SphereGeometry(0.21, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(hair), 0, 0.03, -0.01));
  const arm = (side) => {
    const a = new THREE.Group(); a.position.set(side * 0.31, 1.4, 0);
    a.add(cyl(0.07, 0.065, 0.56, mat(shirt), 0, -0.28, 0));
    a.add(sph(0.075, mat(skin), 0, -0.58, 0));
    body.add(a); return a;
  };
  const armL = arm(-1), armR = arm(1);
  const hand = new THREE.Group(); hand.position.set(0, -0.6, 0); armR.add(hand); // tempat alat
  return { g, body, head, legL, legR, armL, armR, hand };
}
function walkPose(p, phase, amt = 1) {
  const s = Math.sin(phase) * 0.6 * amt;
  p.legL.rotation.x = s; p.legR.rotation.x = -s;
  p.armL.rotation.x = -s * 0.8; p.armR.rotation.x = s * 0.8;
  p.body.position.y = Math.abs(Math.cos(phase)) * 0.05 * amt;
}
function idlePose(p) { p.legL.rotation.x = p.legR.rotation.x = 0; p.armL.rotation.set(0, 0, 0); p.armR.rotation.set(0, 0, 0); p.body.position.y = 0; }
function phonePose(p, k) { // HP ke telinga
  p.armR.rotation.x = -2.3 * k; p.armR.rotation.z = 0.35 * k;
}
function phoneProp() {
  const g = new THREE.Group();
  g.add(rbox(0.1, 0.18, 0.03, 0.015, mat(C.dark), 0, 0, 0));
  return g;
}

// ---------------------------------------------------------------- partikel
class Spray {
  constructor(parent, n, color, size = 0.05, opacity = 0.85) {
    this.items = [];
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
    const geo = new THREE.SphereGeometry(size, 8, 6);
    for (let i = 0; i < n; i++) { const s = new THREE.Mesh(geo, m); s.visible = false; parent.add(s); this.items.push({ s, seed: Math.random() }); }
    this.mat = m;
  }
  // fn(seed, life 0..1) -> Vector3 posisi; on = aktif
  update(time, on, fn, speed = 1) {
    for (const it of this.items) {
      if (!on) { it.s.visible = false; continue; }
      const life = (time * speed + it.seed) % 1;
      it.s.visible = true;
      it.s.position.copy(fn(it.seed, life));
      const k = Math.sin(life * Math.PI);
      it.s.scale.setScalar(0.4 + k * 0.8);
    }
  }
}

// ---------------------------------------------------------------- bangunan
function roomShell(o = {}) { // ruang "rumah boneka": lantai + 2 dinding, sisi depan (+z) terbuka
  const g = new THREE.Group();
  const w = o.w || 6, d = o.d || 5, h = o.h || 3.2;
  g.add(box(w, 0.2, d, mat(o.floor || C.floor), 0, 0.1, 0));
  g.add(box(w, h, 0.2, mat(o.wall || C.wall), 0, h / 2 + 0.2, -d / 2));
  g.add(box(0.2, h, d, mat(o.wall2 || C.wall2), -w / 2, h / 2 + 0.2, 0));
  g.add(box(w + 0.1, 0.12, 0.3, mat(o.trim || C.roof), 0, h + 0.26, -d / 2)); // lis atas
  return g;
}
function plant(x, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s);
  g.add(cyl(0.28, 0.22, 0.4, mat(0xe07a5f), 0, 0.2, 0));
  g.add(sph(0.38, mat(0x5fa86b), 0, 0.72, 0));
  return g;
}
function tree(x, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s);
  g.add(cyl(0.12, 0.16, 0.9, mat(0x8a6a4a), 0, 0.45, 0));
  g.add(mesh(new THREE.IcosahedronGeometry(0.75, 0), mat(0x6cbf7a, { flatShading: true }), 0, 1.4, 0));
  return g;
}
function acIndoor() { // unit AC split: 1.6 x 0.46 x 0.36
  const g = new THREE.Group();
  const body = own(C.acWhite);
  g.add(rbox(1.6, 0.46, 0.36, 0.08, body, 0, 0, 0));
  g.add(box(1.4, 0.05, 0.05, mat(0xb9cbd9), 0, -0.13, 0.17));
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0x4b5b68 }));
  led.position.set(0.66, 0.08, 0.18); g.add(led);
  g.userData = { body, led };
  return g;
}
function acOutdoor() {
  const g = new THREE.Group();
  g.add(rbox(1.0, 0.75, 0.42, 0.05, mat(C.acWhite), 0, 0, 0));
  g.add(cyl(0.26, 0.26, 0.04, mat(C.dark), -0.18, 0, 0.21).rotateX(Math.PI / 2));
  for (let i = 0; i < 4; i++) g.add(box(0.26, 0.03, 0.02, mat(C.grey), 0.3, -0.18 + i * 0.12, 0.22));
  return g;
}

// ======================================================================
//  SITUS KERJA (koordinat lokal: sisi terbuka/depan menghadap +z = ke kantor)
// ======================================================================
const SITES = [
  { key: "ac", pos: [-14, -8] }, { key: "pasang", pos: [-5, -15] }, { key: "toren", pos: [6, -15] },
  { key: "jet", pos: [15, -6] }, { key: "cctv", pos: [15, 6] }, { key: "apar", pos: [6, 15] },
  { key: "solar", pos: [-5, 15] }, { key: "hunian", pos: [-14, 7] },
];
const ORDER_TEXT = {
  ac: "Service AC", pasang: "Pasang AC baru", toren: "Bersihkan toren", jet: "Cuci jalan tekanan tinggi",
  cctv: "Pasang CCTV", apar: "Isi ulang APAR", solar: "Rawat water heater", hunian: "Bersihkan rumah kosong",
};

function buildSite(key) {
  const g = new THREE.Group(); const S = { g, key };
  const tech = person({ tech: true }); S.tech = tech; g.add(tech.g);
  S.work = new THREE.Vector3(0, 0, 0); S.techYaw = Math.PI; // default menghadap dinding belakang
  const cust = person({ shirt: [0xf28f3b, 0x7c6fe0, 0xe0555a, 0x2bb58a, 0xf5b800, 0x6aa9d8, 0xd96aa7, 0x8d6e63][SITES.findIndex((s) => s.key === key)], skin: key === "jet" || key === "solar" ? C.skin2 : C.skin, hair: 0x3a2a20 });
  cust.g.position.set(3.7, 0, 1.4); cust.g.rotation.y = -0.9; g.add(cust.g); S.cust = cust;
  const ph = phoneProp(); ph.position.set(0, 0.02, 0.06); ph.rotation.x = -0.3; cust.hand.add(ph); S.phone = ph;
  S.bubble = label(ORDER_TEXT[key], { tail: true, icon: "✓", scale: 0.0075 }); S.bubble.position.set(3.7, 2.75, 1.4); g.add(S.bubble);
  S.happy = label("Terima kasih", { tail: true, bg: "#0DAEF1", fg: "#ffffff", scale: 0.0075 }); S.happy.position.set(3.7, 2.75, 1.4); g.add(S.happy);

  const GAR = { ac: "Garansi 30 hari", apar: "Garansi sampai 2 tahun", jet: "Pasti bersih atau tidak dibayar", hunian: "Pasti bersih atau tidak dibayar" };
  if (GAR[key]) { S.badge = label(GAR[key], { icon: "✓", iconBg: "#FEDE04", bg: "#0A86BD", fg: "#ffffff", scale: 0.0065 }); S.badge.position.set(0, key === "hunian" ? 4.4 : 4.0, -0.4); g.add(S.badge); }
  const t = new THREE.Vector3();
  if (key === "ac") { // ---------- service AC: semprot unit indoor
    g.add(roomShell());
    g.add(plant(-2.2, -1.6, 0.9));
    g.add(box(2.2, 0.5, 1, mat(0x9cc7e0), 1.3, 0.45, -1.7)); // sofa
    const ac = acIndoor(); ac.position.set(0, 2.55, -2.2); g.add(ac); S.ac = ac;
    g.add(mesh(new THREE.ConeGeometry(0.75, 0.6, 20, 1, true), mat(0xbfe6ff, { transparent: true, opacity: 0.55, side: THREE.DoubleSide }), 0, 1.95, -2.05)); // plastik penampung
    g.add(cyl(0.22, 0.18, 0.36, mat(0x4f8fd6), 0.4, 0.38, -1.9)); // ember
    g.add(box(0.7, 0.4, 0.5, mat(C.wood), -0.2, 0.4, -1.2)); // pijakan
    S.work.set(-0.2, 0.6, -1.15);
    const gun = new THREE.Group(); gun.add(box(0.08, 0.08, 0.36, mat(C.dark), 0, 0, 0.12)); gun.rotation.x = -1.2; tech.hand.add(gun);
    S.spray = new Spray(g, 30, 0x7fd3ff, 0.06);
    S.drip = new Spray(g, 12, C.dirt, 0.06, 0.9);
    S.cold = new Spray(g, 24, 0x8fe6ff, 0.08, 0.7);
  }
  if (key === "pasang") { // ---------- pasang AC baru
    g.add(roomShell({ wall: 0xf4efe6 }));
    g.add(box(1.8, 0.6, 0.9, mat(0xe9c46a), -1.2, 0.5, -1.8));
    const br = box(1.2, 0.08, 0.1, mat(C.grey), 0, 2.25, -2.32); g.add(br); S.bracket = br;
    const ac = acIndoor(); g.add(ac); S.ac = ac;
    const out = acOutdoor(); out.rotation.y = Math.PI / 2; g.add(out); S.out = out;
    const pipe = cyl(0.04, 0.04, 2.3, mat(0xffffff), -3.12, 1.4, -1.6); g.add(pipe); S.pipe = pipe;
    S.work.set(0.6, 0.2, -1.4);
    S.cold = new Spray(g, 24, 0x8fe6ff, 0.08, 0.7);
    // kardus AC
    const boxCard = box(1.0, 0.5, 0.5, mat(0xc8a77a), 1.8, 0.45, -0.6); g.add(boxCard); S.carton = boxCard;
  }
  if (key === "toren") { // ---------- pembersihan toren di atap
    g.add(box(5, 3, 4, mat(C.wall), 0, 1.5, -0.5));
    g.add(box(5.2, 0.2, 4.2, mat(C.roof), 0, 3.1, -0.5));
    g.add(box(1, 1.8, 0.05, mat(0x8a6a4a), -1.2, 0.9, 1.53)); // pintu
    g.add(box(1.1, 0.8, 0.05, mat(C.glass), 1.1, 1.8, 1.53));
    g.add(box(1.4, 0.6, 1.4, mat(C.grey), 0.6, 3.5, -1.1)); // dudukan
    const tor = cyl(0.8, 0.8, 1.7, own(C.toren), 0.6, 4.65, -1.1, 28); g.add(tor); S.toren = tor;
    for (let i = 0; i < 3; i++) g.add(mesh(new THREE.TorusGeometry(0.81, 0.04, 8, 28), mat(0xd9732c), 0.6, 4.05 + i * 0.55, -1.1).rotateX(Math.PI / 2));
    const lid = new THREE.Group(); lid.position.set(0.6 - 0.35, 5.52, -1.1); lid.add(cyl(0.35, 0.35, 0.1, mat(0xd9732c), 0.35, 0, 0)); g.add(lid); S.lid = lid;
    // tangga
    const lad = new THREE.Group(); lad.position.set(1.9, 0, 1.6); lad.rotation.x = -0.18;
    lad.add(box(0.06, 3.5, 0.06, mat(C.grey), -0.3, 1.75, 0)); lad.add(box(0.06, 3.5, 0.06, mat(C.grey), 0.3, 1.75, 0));
    for (let i = 0; i < 9; i++) lad.add(box(0.6, 0.05, 0.05, mat(C.grey), 0, 0.3 + i * 0.38, 0));
    g.add(lad);
    g.add(cyl(0.05, 0.05, 1.2, mat(C.grey), 1.45, 3.6, -1.1).rotateZ(Math.PI / 2)); // pipa kuras
    S.drain = new Spray(g, 30, 0x8c7a55, 0.09, 0.85);
    S.work.set(1.4, 3.2, -0.2);
    const brush = new THREE.Group(); brush.add(cyl(0.025, 0.025, 0.7, mat(C.wood), 0, -0.3, 0)); brush.add(box(0.2, 0.08, 0.1, mat(C.yellow), 0, -0.66, 0)); tech.hand.add(brush);
  }
  if (key === "jet") { // ---------- high pressure cleaning jalan
    g.add(box(7, 3.4, 0.3, mat(0xf3e9dc), 0, 1.7, -2.6)); // fasad toko
    g.add(box(7.2, 0.25, 1.2, mat(C.red), 0, 3.0, -2.0)); // kanopi
    g.add(box(1.4, 2.2, 0.05, mat(C.glass), -1.6, 1.1, -2.43)); g.add(box(2.4, 1.4, 0.05, mat(C.glass), 1.4, 1.6, -2.43));
    S.strips = [];
    for (let i = 0; i < 14; i++) { const m = own(C.moss); const s = box(0.5, 0.06, 3.6, m, -3.25 + i * 0.5, 0.04, 0); g.add(s); S.strips.push(m); }
    const mac = new THREE.Group(); mac.position.set(-3.6, 0, 2.2);
    mac.add(rbox(0.8, 0.7, 0.55, 0.08, mat(C.yellow), 0, 0.55, 0)); mac.add(cyl(0.16, 0.16, 0.1, mat(C.dark), -0.3, 0.16, 0.3).rotateX(Math.PI / 2)); mac.add(cyl(0.16, 0.16, 0.1, mat(C.dark), -0.3, 0.16, -0.3).rotateX(Math.PI / 2));
    g.add(mac); S.machine = mac;
    const lance = new THREE.Group(); lance.add(cyl(0.025, 0.025, 1.0, mat(C.dark), 0, -0.35, 0.25).rotateX(-0.9)); tech.hand.add(lance);
    S.spray = new Spray(g, 40, 0x9fdcff, 0.075, 0.9);
    S.hoseGeo = null; S.hose = new THREE.Mesh(new THREE.BufferGeometry(), mat(0x23313d)); g.add(S.hose);
    S.techYaw = Math.PI / 2;
  }
  if (key === "cctv") { // ---------- pasang CCTV di dinding kantor
    g.add(box(6, 4, 0.3, mat(0xeef4f8), 0, 2, -2.4));
    g.add(box(1.4, 2.4, 0.05, mat(0x5a7184), -1.6, 1.2, -2.23));
    g.add(box(2.2, 1.2, 0.05, mat(C.glass), 1.3, 2.0, -2.23));
    g.add(box(6.1, 0.15, 0.4, mat(C.roof), 0, 4.05, -2.35));
    const cam = new THREE.Group(); cam.position.set(-0.2, 3.3, -2.0);
    cam.add(box(0.08, 0.3, 0.08, mat(C.grey), 0, 0.12, -0.05));
    cam.add(rbox(0.5, 0.22, 0.24, 0.06, mat(C.white), 0, -0.05, 0.12));
    cam.add(cyl(0.07, 0.07, 0.06, mat(C.dark), 0, -0.05, 0.27).rotateX(Math.PI / 2));
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), new THREE.MeshBasicMaterial({ color: C.red })); led.position.set(0.17, 0.02, 0.25); cam.add(led);
    cam.rotation.x = 0.35; g.add(cam); S.cam = cam; S.camLed = led;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4.2, 28, 1, true), new THREE.MeshBasicMaterial({ color: C.brand, transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthWrite: false }));
    cone.geometry.translate(0, -2.1, 0); cone.rotation.x = Math.PI / 2 + 0.35 + Math.PI; cone.position.set(-0.2, 3.25, -1.75); cone.rotation.set(-Math.PI / 2 - 0.35 + Math.PI, 0, 0);
    g.add(cone); S.cone = cone;
    const step = new THREE.Group(); step.position.set(-0.2, 0, -1.5);
    step.add(box(0.8, 0.05, 0.4, mat(C.grey), 0, 1.2, 0)); step.add(box(0.06, 1.2, 0.06, mat(C.grey), -0.35, 0.6, -0.15)); step.add(box(0.06, 1.2, 0.06, mat(C.grey), 0.35, 0.6, -0.15)); step.add(box(0.06, 1.2, 0.06, mat(C.grey), -0.35, 0.6, 0.15)); step.add(box(0.06, 1.2, 0.06, mat(C.grey), 0.35, 0.6, 0.15));
    g.add(step);
    S.work.set(-0.2, 1.22, -1.5);
  }
  if (key === "apar") { // ---------- perawatan / isi ulang APAR
    g.add(roomShell({ wall: 0xeef1f4, floor: 0xd5dde3 }));
    g.add(box(0.5, 0.06, 0.2, mat(C.grey), -1.2, 1.65, -2.32)); // bracket dinding
    g.add(box(1.4, 0.5, 0.05, mat(0xe5484e), -1.2, 2.45, -2.38)); // papan tanda
    const ap = new THREE.Group();
    ap.add(cyl(0.2, 0.2, 0.8, own(C.red), 0, 0.4, 0)); ap.add(sph(0.2, mat(C.red), 0, 0.8, 0));
    ap.add(box(0.12, 0.12, 0.12, mat(C.dark), 0, 1.0, 0)); ap.add(box(0.06, 0.04, 0.3, mat(C.dark), 0, 1.06, 0.1));
    const gauge = new THREE.Group(); gauge.position.set(0.0, 1.02, 0.08);
    gauge.add(cyl(0.08, 0.08, 0.02, mat(C.white), 0, 0, 0).rotateX(Math.PI / 2));
    const needle = box(0.01, 0.065, 0.01, mat(C.red), 0, 0.03, 0.02); const nG = new THREE.Group(); nG.position.set(0, 0, 0.02); nG.add(needle); gauge.add(nG);
    ap.add(gauge); S.needle = nG;
    g.add(ap); S.apar = ap;
    S.tag = label("Siap pakai", { bg: "#12A877", fg: "#ffffff", scale: 0.009 }); S.tag.position.set(-1.2, 2.2, -1.7); g.add(S.tag);
    g.add(box(1.6, 0.8, 0.7, mat(C.wood), 1.5, 0.6, -1.9)); // meja
    S.work.set(0.1, 0.2, -1.0);
  }
  if (key === "solar") { // ---------- rawat solar water heater di atap
    g.add(box(5, 3, 4, mat(0xfbf3e4), 0, 1.5, -0.5));
    g.add(box(5.2, 0.2, 4.2, mat(0xb5683a), 0, 3.1, -0.5));
    g.add(box(1, 1.8, 0.05, mat(0x8a6a4a), 1.2, 0.9, 1.53));
    g.add(box(1.1, 0.8, 0.05, mat(C.glass), -1.1, 1.8, 1.53));
    const rack = new THREE.Group(); rack.position.set(-0.4, 3.25, -1.0); rack.rotation.x = -0.55;
    S.tubes = [];
    for (let i = 0; i < 9; i++) { const m = own(0x8a8f84, { roughness: 0.9 }); const tb = cyl(0.09, 0.09, 1.8, m, -1.0 + i * 0.25, 0.9, 0, 12); rack.add(tb); S.tubes.push(m); }
    rack.add(cyl(0.32, 0.32, 2.6, mat(C.white), 0, 1.85, 0).rotateZ(Math.PI / 2));
    g.add(rack);
    S.sun = label("Air panas lagi", { bg: "#F5B800", fg: "#0B4A6B", scale: 0.009 }); S.sun.position.set(-0.4, 5.4, -1.2); g.add(S.sun);
    const lad = new THREE.Group(); lad.position.set(1.9, 0, 1.6); lad.rotation.x = -0.18;
    lad.add(box(0.06, 3.5, 0.06, mat(C.grey), -0.3, 1.75, 0)); lad.add(box(0.06, 3.5, 0.06, mat(C.grey), 0.3, 1.75, 0));
    for (let i = 0; i < 9; i++) lad.add(box(0.6, 0.05, 0.05, mat(C.grey), 0, 0.3 + i * 0.38, 0));
    g.add(lad);
    const rag = box(0.25, 0.08, 0.18, mat(C.yellow), 0, -0.05, 0.1); tech.hand.add(rag);
    S.work.set(0.9, 3.2, 0.3);
  }
  if (key === "hunian") { // ---------- pembersihan hunian kosong
    const hm = own(0xb9b4a9); S.houseMat = hm;
    g.add(box(4.6, 2.8, 3.4, hm, 0, 1.4, -1.2));
    g.add(mesh(new THREE.ConeGeometry(3.4, 1.4, 4), mat(0x8c6f5a, { flatShading: true }), 0, 3.5, -1.2).rotateY(Math.PI / 4));
    g.add(box(0.9, 1.7, 0.05, mat(0x6b5444), 0, 0.85, 0.53));
    g.add(box(0.9, 0.7, 0.05, mat(0x8fa1ab), -1.4, 1.7, 0.53)); g.add(box(0.9, 0.7, 0.05, mat(0x8fa1ab), 1.4, 1.7, 0.53));
    S.weeds = [];
    for (let i = 0; i < 30; i++) {
      const x = -3 + (i % 10) * 0.66 + (i * 37 % 7) * 0.04, z = 0.9 + Math.floor(i / 10) * 0.75;
      const w = mesh(new THREE.ConeGeometry(0.22, 0.75, 5), mat(i % 3 ? 0x6d8f3f : 0x8a9a4a, { flatShading: true }), x, 0.37, z);
      g.add(w); S.weeds.push(w);
    }
    S.trash = [];
    for (let i = 0; i < 7; i++) { const t2 = box(0.25, 0.18, 0.2, mat([0xd9cfc0, 0x9fb6c4, 0xc4a484][i % 3]), -2.4 + i * 0.8, 0.12, 1.3 + (i % 2) * 0.9); t2.rotation.y = i; g.add(t2); S.trash.push(t2); }
    S.bags = [];
    for (let i = 0; i < 3; i++) { const b = sph(0.3, mat(0x1d2730), 2.5 + i * 0.35, 0.28, -0.2 + (i % 2) * 0.3); b.scale.y = 0.85; g.add(b); S.bags.push(b); }
    const tool = new THREE.Group(); tool.add(cyl(0.025, 0.025, 1.1, mat(C.dark), 0, -0.3, 0.3).rotateX(-1.0)); tool.add(box(0.3, 0.05, 0.12, mat(C.red), 0, -0.75, 0.8)); tech.hand.add(tool);
    S.techYaw = Math.PI / 2;
  }
  return S;
}

// ======================================================================
//  ALUR WAKTU
// ======================================================================
const JOB_ORDER = ["ac", "pasang", "toren", "jet", "cctv", "apar", "solar", "hunian"];
export const PHASES = (() => {
  const list = [
    { id: "intro", len: 1.2 }, { id: "order", len: 1.8 }, { id: "cs", len: 1.9 }, { id: "dispatch", len: 2.0 },
    ...JOB_ORDER.map((k) => ({ id: "job:" + k, len: 1.5 })),
    { id: "done", len: 1.6 },
  ];
  let t = 0;
  for (const p of list) { p.start = t; t += p.len; p.end = t; }
  list.total = t;
  return list;
})();
const P = Object.fromEntries(PHASES.map((p) => [p.id, p]));
const phaseU = (id, t) => seg(t, P[id].start, P[id].end);

// ======================================================================
//  DUNIA
// ======================================================================
export function createWorld(canvas, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.mobile ? 1.5 : 1.75));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.bg);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 300);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xcde8f4, 1.25));
  const sun = new THREE.DirectionalLight(0xfff4e6, 1.9);
  sun.position.set(18, 34, 16); sun.castShadow = true;
  sun.shadow.mapSize.set(opts.mobile ? 1024 : 2048, opts.mobile ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 90 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
  scene.add(sun);

  // alas bundar (seperti meja di contoh)
  const base = new THREE.Group(); scene.add(base);
  const plate = mesh(new THREE.CylinderGeometry(24, 24, 0.8, 120), [mat(C.edge), mat(C.ground), mat(C.edge)], 0, -0.4, 0);
  base.add(plate);
  // jalan dari kantor ke tiap situs
  for (const s of SITES) {
    const [x, z] = s.pos; const len = Math.hypot(x, z);
    const r = box(1.6, 0.04, len, mat(C.road), x / 2, 0.02, z / 2);
    r.rotation.y = Math.atan2(x, z); r.castShadow = false; base.add(r);
  }
  // pepohonan & hiasan
  [[-20, -2], [20, 0], [0, 21], [0, -21], [-9, -20], [10, 20], [-18, 13], [19, -12], [-11, 2], [11, -2]].forEach(([x, z], i) => base.add(tree(x, z, 0.9 + (i % 3) * 0.15)));

  // kantor Rejeki Utama AC (tengah)
  const office = new THREE.Group(); scene.add(office);
  office.add(roomShell({ w: 6.4, d: 5, h: 3.4, wall: 0xffffff, wall2: 0xeef7fc, floor: 0xcfe7f3 }));
  office.add(box(0.2, 3.4, 5, mat(0xeef7fc), 3.2, 1.9, 0)); // dinding kanan
  const sign = new THREE.Group(); sign.position.set(0, 4.35, -2.4); office.add(sign);
  sign.add(rbox(4.6, 1.1, 0.2, 0.08, mat(C.white), 0, 0, 0));
  const signTex = (() => { const cv = document.createElement("canvas"); cv.width = 920; cv.height = 220; const c = cv.getContext("2d");
    c.fillStyle = "#ffffff"; c.fillRect(0, 0, 920, 220); c.fillStyle = "#0DAEF1"; c.font = "600 84px Poppins, sans-serif"; c.textBaseline = "middle"; c.fillText("Rejeki Utama AC", 210, 96);
    c.fillStyle = "#0B4A6B"; c.font = "500 40px Poppins, sans-serif"; c.fillText("Sejak 1996", 214, 170);
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return { tx, cv, c }; })();
  const signFace = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.05), new THREE.MeshBasicMaterial({ map: signTex.tx })); signFace.position.z = 0.11; sign.add(signFace);
  if (window.RU_LOGO) { const im = new Image(); im.onload = () => { signTex.c.drawImage(im, 40, 30, 160, 160); signTex.tx.needsUpdate = true; }; im.src = window.RU_LOGO; }
  // 3 admin CS, masing-masing dengan meja dan monitor
  const ADMIN_X = [-2.0, 0, 2.0];
  const admins = ADMIN_X.map((x, i) => {
    office.add(rbox(1.7, 0.12, 1.0, 0.04, mat(C.white), x, 1.0, -1.0));
    office.add(box(0.08, 0.9, 0.8, mat(C.grey), x - 0.75, 0.5, -1.0)); office.add(box(0.08, 0.9, 0.8, mat(C.grey), x + 0.75, 0.5, -1.0));
    const mon = new THREE.Group(); mon.position.set(x, 1.48, -1.3);
    mon.add(rbox(0.9, 0.58, 0.06, 0.03, mat(C.dark), 0, 0, 0));
    const sm = new THREE.MeshBasicMaterial({ color: 0x0daef1 }); const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.5), sm); sc.position.z = 0.035; mon.add(sc);
    mon.add(box(0.07, 0.26, 0.07, mat(C.grey), 0, -0.4, 0)); office.add(mon);
    const p = person({ shirt: C.deep, hair: [0x2a1f1a, 0x1c1c1c, 0x4a2f22][i] }); p.g.position.set(x, 0, -0.15); p.g.rotation.y = Math.PI; office.add(p.g);
    p.head.add(mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 20, Math.PI), mat(C.dark), 0, 0.02, 0));
    p.head.add(sph(0.05, mat(C.dark), 0.2, -0.02, 0.06));
    office.add(box(0.5, 0.45, 0.5, mat(0x9cc7e0), x, 0.35, 0.35)); // kursi
    return { p, sm, x };
  });
  office.add(plant(2.6, 1.9, 0.8)); office.add(plant(-2.6, 1.9, 0.8));
  const csBubble = label("Pesanan diterima", { tail: true, icon: "✓", iconBg: "#0DAEF1", scale: 0.007 }); csBubble.position.set(0, 3.0, 0.3); office.add(csBubble);
  // tiket pekerjaan melayang di atas kantor
  const tickets = JOB_ORDER.map((k, i) => { const sp = label(ORDER_TEXT[k], { bg: "#ffffff", stroke: "#0DAEF1", scale: 0.0048 }); sp.position.set(-3.9 + (i % 4) * 2.6, 6.4 + Math.floor(i / 4) * 0.6, -1.5); office.add(sp); return sp; });

  // situs + garis sinyal
  const sites = SITES.map((s, i) => {
    const S = buildSite(s.key);
    const [x, z] = s.pos; S.g.position.set(x, 0, z);
    S.g.rotation.y = Math.atan2(-x, -z); // depan (+z lokal) menghadap kantor
    scene.add(S.g); S.index = i;
    S.g.updateMatrixWorld(true);
    // titik pelanggan & kerja di koordinat dunia
    S.custWorld = S.cust.g.getWorldPosition(new THREE.Vector3());
    S.workWorld = S.g.localToWorld(S.work.clone());
    // garis sinyal: lengkung dari kepala pelanggan ke papan kantor
    const a = S.custWorld.clone().add(new THREE.Vector3(0, 2.2, 0)), b = new THREE.Vector3(ADMIN_X[i % 3], 2.3, -1.3);
    const mid = a.clone().lerp(b, 0.5); mid.y += 6;
    S.curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(S.curve, 48, 0.035, 6), new THREE.MeshBasicMaterial({ color: C.brand, transparent: true, opacity: 0 }));
    scene.add(tube); S.tube = tube;
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 10), new THREE.MeshBasicMaterial({ color: 0x25d366 })); scene.add(dot); S.dot = dot;
    // rute teknisi: pintu kantor → depan situs → titik kerja
    const door = new THREE.Vector3(0, 0, 0).add(new THREE.Vector3(x, 0, z).normalize().multiplyScalar(3.4));
    const approach = new THREE.Vector3(x, 0, z).add(new THREE.Vector3(-x, 0, -z).normalize().multiplyScalar(4.6));
    const groundWork = S.workWorld.clone(); groundWork.y = 0;
    S.route = [door, approach, groundWork];
    S.routeLen = door.distanceTo(approach) + approach.distanceTo(groundWork);
    // teknisi berjalan di dunia, lalu "masuk" ke situs saat kerja
    scene.attach(S.tech.g);
    return S;
  });
  const byKey = Object.fromEntries(sites.map((s) => [s.key, s]));

  // ------------------------------------------------------------ kamera
  const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3();
  function overview(dist = 1) { return { pos: new THREE.Vector3(0, 46 * dist, 44 * dist), tgt: new THREE.Vector3(0, 0, -1) }; }
  function siteShot(S, k = 1) {
    const p = S.g.position; const toC = new THREE.Vector3(-p.x, 0, -p.z).normalize();
    const side = new THREE.Vector3(toC.z, 0, -toC.x);
    const tgt = p.clone().add(new THREE.Vector3(0, S.key === "toren" || S.key === "solar" ? 2.6 : 1.6, 0)).addScaledVector(toC, 0.6);
    const pos = p.clone().addScaledVector(toC, 15 * k).addScaledVector(side, 4).add(new THREE.Vector3(0, 9 * k, 0));
    return { pos, tgt };
  }
  const SHOTS = [];
  const addShot = (t, s) => SHOTS.push({ t, ...s });
  addShot(0, { pos: new THREE.Vector3(26, 34, 40), tgt: new THREE.Vector3(0, 0, 0) });
  addShot(P.intro.end, overview(0.92));
  addShot(P.order.end - 0.3, overview(0.9));
  addShot(P.cs.start + 0.5, { pos: new THREE.Vector3(3, 14, 19), tgt: new THREE.Vector3(-0.2, 3, -1) });
  addShot(P.cs.end - 0.4, { pos: new THREE.Vector3(2, 16, 22), tgt: new THREE.Vector3(0, 4, -1) });
  addShot(P.dispatch.start + 0.5, overview(0.85));
  addShot(P.dispatch.end - 0.2, overview(0.9));
  for (const k of JOB_ORDER) { const p = P["job:" + k]; addShot(p.start + 0.35, siteShot(byKey[k])); addShot(p.end - 0.25, siteShot(byKey[k], 0.92)); }
  addShot(P.done.start + 0.7, { pos: new THREE.Vector3(-30, 36, 34), tgt: new THREE.Vector3(0, 0, 0) });
  addShot(P.done.end, { pos: new THREE.Vector3(-34, 44, 30), tgt: new THREE.Vector3(0, 0, 0) });
  function cameraAt(t) {
    let i = 0; while (i < SHOTS.length - 1 && SHOTS[i + 1].t <= t) i++;
    const a = SHOTS[i], b = SHOTS[Math.min(i + 1, SHOTS.length - 1)];
    const k = b === a ? 0 : ease(clamp((t - a.t) / (b.t - a.t)));
    camPos.lerpVectors(a.pos, b.pos, k); camTgt.lerpVectors(a.tgt, b.tgt, k);
  }

  // ------------------------------------------------------------ keadaan per waktu
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const cDirt = new THREE.Color(C.dirt), cClean = new THREE.Color(C.acWhite);
  function routePoint(S, d) { // d = jarak yang sudah ditempuh
    const [a, b, c] = S.route, ab = a.distanceTo(b);
    if (d <= ab) return tmp.lerpVectors(a, b, d / ab);
    return tmp.lerpVectors(b, c, clamp((d - ab) / b.distanceTo(c)));
  }

  function update(t, time) {
    const uOrder = phaseU("order", t), uCs = phaseU("cs", t), uDisp = phaseU("dispatch", t), uDone = phaseU("done", t);
    // CS
    const csTalk = uCs > 0 && uCs < 1;
    admins.forEach((A, k) => {
      idlePose(A.p);
      A.p.armR.rotation.x = csTalk ? -0.9 + Math.sin(time * 6 + k * 2) * 0.15 : -0.5;
      A.p.armL.rotation.x = csTalk ? -0.9 + Math.cos(time * 6 + k * 2) * 0.15 : -0.5;
      A.sm.color.setHex(csTalk ? (Math.floor(time * 3 + k) % 2 ? 0x0daef1 : 0x25d366) : 0x0daef1);
    });
    showSprite(csBubble, seg(uCs, 0.15, 0.3) * (1 - seg(uCs, 0.9, 1)));

    sites.forEach((S, i) => {
      const stag = i / sites.length;
      // --- pelanggan memesan
      const oK = seg(uOrder, stag * 0.6, stag * 0.6 + 0.35);
      idlePose(S.cust); phonePose(S.cust, Math.min(1, oK * 2) * (1 - seg(uCs, 0.7, 1)));
      S.phone.visible = oK > 0 && uCs < 1;
      showSprite(S.bubble, oK * (1 - seg(uCs, 0.6, 0.85)));
      // --- sinyal ke CS
      const sK = seg(uCs, stag * 0.55, stag * 0.55 + 0.35);
      S.tube.material.opacity = 0.4 * Math.min(1, sK * 3) * (1 - seg(uDisp, 0, 0.3));
      S.dot.visible = sK > 0 && sK < 1;
      if (S.dot.visible) S.dot.position.copy(S.curve.getPoint(sK));
      showSprite(tickets[JOB_ORDER.indexOf(S.key)], seg(sK, 0.85, 1) * (1 - seg(uDisp, 0.5, 0.8)));
      // --- teknisi: di kantor → berjalan → kerja
      const jobId = "job:" + S.key, uJob = phaseU(jobId, t);
      const dK = seg(uDisp, stag * 0.25, stag * 0.25 + 0.75);
      const tg = S.tech.g;
      tg.visible = t >= P.dispatch.start;
      const atWork = dK >= 1;
      if (!atWork) {
        const d = dK * S.routeLen; const p = routePoint(S, d); tg.position.copy(p);
        const ahead = routePoint(S, Math.min(S.routeLen, d + 0.3)).clone(); const back = routePoint(S, d).clone();
        tg.position.copy(back);
        if (ahead.distanceTo(back) > 0.001) tg.rotation.set(0, Math.atan2(ahead.x - back.x, ahead.z - back.z), 0);
        walkPose(S.tech, dK * S.routeLen * 3.2, dK > 0 && dK < 1 ? 1 : 0);
      } else {
        idlePose(S.tech);
        tg.position.copy(S.workWorld);
        tg.rotation.set(0, S.g.rotation.y + S.techYaw, 0);
      }
      JOBS[S.key](S, uJob, time, atWork, t);
      if (S.badge) showSprite(S.badge, seg(uJob, 0.55, 0.68) * (1 - seg(uDone, 0, 0.15)));
      // --- selesai: pelanggan senang
      const hK = seg(uDone, 0.1 + stag * 0.4, 0.3 + stag * 0.4);
      showSprite(S.happy, hK);
      if (hK > 0) { S.cust.armL.rotation.z = -2.6 * hK; S.cust.armR.rotation.z = 2.6 * hK; S.cust.body.position.y = Math.abs(Math.sin(time * 5 + i)) * 0.15 * hK; }
    });
  }

  // ------------------------------------------------------------ 8 adegan kerja
  const JOBS = {
    ac(S, u, time, atWork) {
      const k = seg(u, 0.12, 0.75);
      S.ac.userData.body.color.copy(cDirt).lerp(cClean, ease(k));
      const sprayOn = atWork && u > 0.08 && u < 0.78;
      if (atWork && u > 0.05 && u < 0.85) { S.tech.armR.rotation.x = -1.9 + Math.sin(time * 4) * 0.12; S.tech.armL.rotation.x = -0.6; }
      const gunTip = new THREE.Vector3(-0.05, 2.3, -1.55);
      S.spray.update(time, sprayOn, (seed, life) => tmp2.set(lerp(gunTip.x, -0.6 + seed * 1.2, life), lerp(gunTip.y, 2.45 + (seed - 0.5) * 0.25, life), lerp(gunTip.z, -2.05, life)), 1.6);
      S.drip.update(time, sprayOn, (seed, life) => tmp2.set(-0.5 + seed, 2.25 - life * 1.6, -2.0 + seed * 0.1), 1.1);
      const coldOn = u > 0.82;
      S.ac.userData.led.material.color.setHex(coldOn ? 0x19c6f0 : 0x4b5b68);
      S.cold.update(time, coldOn, (seed, life) => tmp2.set(-0.7 + seed * 1.4, 2.3 - life * 1.4, -1.95 + life * 1.8), 0.6);
    },
    pasang(S, u, time, atWork) {
      const kB = seg(u, 0.08, 0.2), kLift = ease(seg(u, 0.25, 0.6)), kOut = ease(seg(u, 0.6, 0.8));
      S.bracket.scale.set(Math.max(0.001, kB), 1, 1);
      S.ac.position.set(lerp(1.8, 0, kLift), lerp(0.85, 2.55, kLift), lerp(-0.6, -2.2, kLift));
      S.carton.visible = u < 0.25;
      S.ac.visible = u >= 0.2;
      S.out.position.set(-3.75, 0.6, lerp(2.2, -1.2, kOut));
      S.pipe.scale.y = Math.max(0.001, seg(u, 0.72, 0.85));
      if (atWork && u > 0.2 && u < 0.62) { S.tech.armR.rotation.x = -2.6; S.tech.armL.rotation.x = -2.6; }
      const on = u > 0.88;
      S.ac.userData.led.material.color.setHex(on ? 0x19c6f0 : 0x4b5b68);
      S.cold.update(time, on, (seed, life) => tmp2.set(-0.7 + seed * 1.4, 2.3 - life * 1.4, -1.95 + life * 1.8), 0.6);
    },
    toren(S, u, time, atWork) {
      const tg = S.tech.g;
      if (atWork) { // naik tangga
        const climb = ease(seg(u, 0, 0.22));
        const ground = S.g.localToWorld(new THREE.Vector3(1.9, 0, 2.3)); const top = S.workWorld;
        if (climb < 1) { tg.position.lerpVectors(ground, top, climb); tg.rotation.y = S.g.rotation.y + Math.PI; walkPose(S.tech, climb * 18, climb > 0 ? 0.6 : 0); }
      }
      S.lid.rotation.z = -1.9 * seg(u, 0.22, 0.3) * (1 - seg(u, 0.85, 0.93));
      const scrub = atWork && u > 0.3 && u < 0.82;
      if (scrub) { S.tech.armR.rotation.x = -2.2 + Math.sin(time * 9) * 0.35; S.tech.body.position.y = Math.abs(Math.sin(time * 9)) * 0.04; }
      const clean = ease(seg(u, 0.32, 0.8));
      S.toren.material.color.set(C.dirt).lerp(new THREE.Color(C.toren), clean);
      const water = new THREE.Color(0x8c7a55).lerp(new THREE.Color(0x9fe3ff), seg(u, 0.55, 0.8));
      S.drain.mat.color.copy(water);
      S.drain.update(time, atWork && u > 0.38 && u < 0.84, (seed, life) => tmp2.set(2.05 + life * 0.5, 3.6 - life * life * 3.4, -1.1 + (seed - 0.5) * 0.2), 1.4);
    },
    jet(S, u, time, atWork) {
      const tg = S.tech.g;
      const xL = lerp(-3.4, 3.3, ease(seg(u, 0.1, 0.85)));
      if (atWork) {
        tg.position.copy(S.g.localToWorld(new THREE.Vector3(xL - 0.6, 0, 1.0)));
        tg.rotation.y = S.g.rotation.y + Math.PI / 2;
        if (u > 0.08 && u < 0.88) walkPose(S.tech, u * 30, 0.35);
        S.tech.armR.rotation.x = -0.9; S.tech.armL.rotation.x = -0.8;
      }
      S.strips.forEach((m, i) => { const sx = -3.25 + i * 0.5; const k = clamp((xL + 0.6 - sx) / 0.6); m.color.set(C.moss).lerp(new THREE.Color(0xdbe5ea), atWork ? k : 0); });
      const on = atWork && u > 0.1 && u < 0.86;
      S.spray.update(time, on, (seed, life) => tmp2.set(xL + 0.15 + life * 0.6 + (seed - 0.5) * 0.3, 0.95 - life * 0.9, 1.0 + (seed - 0.5) * 1.6 * life), 2.2);
      // selang dari mesin ke teknisi
      const a = new THREE.Vector3(-3.6, 0.5, 2.2), b = new THREE.Vector3(atWork ? xL - 0.45 : -3.2, 0.9, atWork ? 1.15 : 2.2);
      const curve = new THREE.QuadraticBezierCurve3(a, new THREE.Vector3((a.x + b.x) / 2, 0.05, 2.4), b);
      S.hose.geometry.dispose(); S.hose.geometry = new THREE.TubeGeometry(curve, 20, 0.035, 5);
    },
    cctv(S, u, time, atWork) {
      const k = ease(seg(u, 0.2, 0.45));
      S.cam.scale.setScalar(Math.max(0.001, k));
      if (atWork && u > 0.12 && u < 0.5) { S.tech.armR.rotation.x = -2.8; S.tech.armL.rotation.x = -2.6; }
      S.camLed.visible = u > 0.5 && Math.floor(time * 2) % 2 === 0;
      S.cone.material.opacity = 0.16 * seg(u, 0.55, 0.75);
      S.cone.rotation.z = Math.sin(time * 0.8) * 0.35 * seg(u, 0.6, 0.8);
    },
    apar(S, u, time, atWork) {
      const lift = ease(seg(u, 0.62, 0.82));
      S.apar.position.set(lerp(0.35, -1.2, lift), lerp(0.2, 1.08, lift), lerp(-0.6, -2.1, lift));
      S.needle.rotation.z = lerp(1.1, -0.6, ease(seg(u, 0.2, 0.55)));
      if (atWork && u > 0.15 && u < 0.6) { S.tech.armR.rotation.x = -1.0; S.tech.armL.rotation.x = -1.0; S.tech.body.rotation.x = 0.35; } else S.tech.body.rotation.x = 0;
      showSprite(S.tag, seg(u, 0.84, 0.95));
    },
    solar(S, u, time, atWork) {
      const tg = S.tech.g;
      if (atWork) {
        const climb = ease(seg(u, 0, 0.22));
        const ground = S.g.localToWorld(new THREE.Vector3(1.9, 0, 2.3)); const top = S.workWorld;
        if (climb < 1) { tg.position.lerpVectors(ground, top, climb); tg.rotation.y = S.g.rotation.y + Math.PI; walkPose(S.tech, climb * 18, climb > 0 ? 0.6 : 0); }
        else { tg.rotation.y = S.g.rotation.y + Math.PI - 0.5; }
      }
      const wipe = atWork && u > 0.25 && u < 0.85;
      if (wipe) { S.tech.armR.rotation.x = -1.8 + Math.sin(time * 7) * 0.3; S.tech.armR.rotation.z = Math.cos(time * 7) * 0.3; }
      S.tubes.forEach((m, i) => { const k = seg(u, 0.25 + i * 0.06, 0.4 + i * 0.06); m.color.set(0x8a8f84).lerp(new THREE.Color(0x1f3b52), k); m.roughness = lerp(0.9, 0.25, k); m.metalness = lerp(0, 0.3, k); });
      showSprite(S.sun, seg(u, 0.86, 0.96));
    },
    hunian(S, u, time, atWork) {
      const tg = S.tech.g;
      const xL = lerp(-3.2, 3.0, ease(seg(u, 0.08, 0.8)));
      if (atWork) {
        tg.position.copy(S.g.localToWorld(new THREE.Vector3(xL - 0.4, 0, 0.6)));
        tg.rotation.y = S.g.rotation.y + Math.PI / 2;
        if (u > 0.06 && u < 0.82) walkPose(S.tech, u * 30, 0.4);
        S.tech.armR.rotation.x = -0.7;
      }
      S.weeds.forEach((w) => { const k = atWork ? clamp((xL - w.position.x + 0.3) / 0.6) : 0; w.scale.setScalar(Math.max(0.001, 1 - k)); });
      S.trash.forEach((tr) => { tr.visible = !(atWork && xL > tr.position.x + 0.2); });
      S.bags.forEach((b, i) => { b.scale.setScalar(Math.max(0.001, seg(u, 0.3 + i * 0.15, 0.4 + i * 0.15))); b.scale.y *= 0.85; });
      S.houseMat.color.set(0xb9b4a9).lerp(new THREE.Color(0xf6f1e7), ease(seg(u, 0.7, 0.95)));
    },
  };

  // ------------------------------------------------------------ ukuran & render
  function resize(w, h) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 46 : 32; // layar HP: lebih lebar
    camera.updateProjectionMatrix();
    lookOffset = opts.offsetFn ? opts.offsetFn(w, h) : 0;
  }
  let lookOffset = 0;
  const clock = new THREE.Clock();
  function render(t, pointer = { x: 0, y: 0 }) {
    const time = clock.getElapsedTime();
    update(t, time);
    cameraAt(t);
    camera.position.copy(camPos);
    camera.position.x += pointer.x * 0.8; camera.position.y += pointer.y * 0.5;
    camera.lookAt(camTgt);
    // geser bidikan agar adegan tidak tertutup panel teks (desktop: panel di kiri)
    if (lookOffset) { const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0); camera.position.addScaledVector(right, -lookOffset * camPos.distanceTo(camTgt) * 0.2); camera.lookAt(camTgt.clone().addScaledVector(right, -lookOffset * camPos.distanceTo(camTgt) * 0.2)); }
    renderer.render(scene, camera);
  }
  return { render, resize, total: PHASES.total, phases: PHASES, renderer };
}
