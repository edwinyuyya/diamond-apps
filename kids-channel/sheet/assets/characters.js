/*
 * Channel characters, built in code so they look IDENTICAL in every episode.
 * Source of truth for the design: kids-channel/CHARACTERS.md.
 * Never change a proportion or colour here without bumping DESIGN_VERSION
 * and updating CHARACTERS.md (and re-rendering the character sheet).
 */
(function () {
  const DESIGN_VERSION = "1.0";

  // ---- design tokens (single source of truth for colours) ----
  const PALETTE = {
    lumoSkin: 0xc78556,
    lumoHair: 0x2a1c15,
    lumoShirt: 0xfff1d6,
    lumoShorts: 0xe0453a,
    lumoShoe: 0xffffff,
    lumoShoeToe: 0xe0453a,
    gajaBody: 0x4fc3c9,
    gajaBelly: 0xc6f1ee,
    gajaEar: 0xff9fb6,
    gajaLeg: 0x3aa9b0,
    starYellow: 0xffc61a,
    cheek: 0xff8f8f,
    white: 0xffffff,
    mud: 0x5b3a1e,
  };

  const M = (color, o) => new THREE.MeshPhysicalMaterial(Object.assign({ color, roughness: 0.55, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.35 }, o || {}));
  function sph(r, mat, sx, sy, sz, seg) {
    const s = seg || 36;
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, s, Math.floor(s * 0.7)), mat);
    m.scale.set(sx || 1, sy || 1, sz || 1); m.castShadow = true; m.receiveShadow = true; return m;
  }
  function cap(r, len, mat) {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 10, 20), mat);
    m.castShadow = true; m.receiveShadow = true; return m;
  }
  function starShape(ro, ri) {
    const sh = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5; const r = i % 2 ? ri : ro; const x = Math.cos(a) * r, y = -Math.sin(a) * r; if (!i) sh.moveTo(x, y); else sh.lineTo(x, y); }
    sh.closePath(); return sh;
  }
  const starGeo = (ro, ri, depth) => new THREE.ExtrudeGeometry(starShape(ro, ri), { depth, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2 });

  // =====================================================================
  // LUMO: boy, about 3-4 years old. Signature: round topknot, rainbow patch.
  // =====================================================================
  function makeLumo() {
    const skin = M(PALETTE.lumoSkin, { roughness: 0.5 });
    const shirt = M(PALETTE.lumoShirt, { roughness: 0.65 });
    const shorts = M(PALETTE.lumoShorts, { roughness: 0.6 });
    const white = M(PALETTE.white, { roughness: 0.4 });
    const hairM = M(PALETTE.lumoHair, { roughness: 0.45, clearcoat: 0.5 });
    const mudM = M(PALETTE.mud, { roughness: 0.95, clearcoat: 0 });
    const g = new THREE.Group();

    [-1, 1].forEach((s) => {
      const leg = cap(0.1, 0.22, skin); leg.position.set(s * 0.22, 0.38, 0); g.add(leg);
      const shoe = sph(0.2, white, 1, 0.62, 1.5); shoe.position.set(s * 0.22, 0.13, 0.1); g.add(shoe);
      const toe = sph(0.13, M(PALETTE.lumoShoeToe), 1, 0.7, 0.9); toe.position.set(s * 0.22, 0.14, 0.34); g.add(toe);
    });
    // shorts: one tapered body + two leg tubes (reads as shorts, never as a skirt)
    const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.37, 0.52, 40), shorts); waist.position.y = 0.76; waist.castShadow = true; g.add(waist);
    [-1, 1].forEach((s) => { const lt = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.18, 0.3, 28), shorts); lt.position.set(s * 0.2, 0.5, 0.02); lt.castShadow = true; g.add(lt); });
    const torso = cap(0.4, 0.36, shirt); torso.position.y = 1.04; torso.scale.set(1, 1, 0.9); g.add(torso);
    // rainbow patch on the chest (three concentric arcs)
    [[0.15, 0xe0453a], [0.11, 0xffc61a], [0.07, 0x2f8fe6]].forEach(([r, c], i) => {
      const arc = new THREE.Mesh(new THREE.TorusGeometry(r, 0.022, 12, 28, Math.PI), M(c, { roughness: 0.4, clearcoat: 0.6 }));
      arc.position.set(0, 0.99, 0.36 + i * 0.002); g.add(arc);
    });

    const head = sph(0.62, skin, 1, 0.95, 0.97, 48); head.position.y = 1.86; g.add(head);
    [-1, 1].forEach((s) => { const ear = sph(0.12, skin, 0.7, 1, 1); ear.position.set(s * 0.62, 1.82, 0); g.add(ear); });
    // hair: bowl cap + round topknot
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.655, 48, 28, 0, Math.PI * 2, 0, 1.2), hairM);
    hair.position.set(0, 1.9, -0.02); hair.rotation.x = -0.2; hair.scale.set(1, 0.97, 0.99); hair.castShadow = true; g.add(hair);
    const knot = sph(0.17, hairM); knot.position.set(0, 2.52, -0.04); g.add(knot);
    const knotBase = sph(0.07, M(PALETTE.lumoShorts), 1, 0.6, 1); knotBase.position.set(0, 2.38, -0.04); g.add(knotBase);

    const mkEye = (s) => {
      const e = new THREE.Group(); e.position.set(s * 0.21, 1.9, 0.5);
      e.add(sph(0.14, white, 1, 1.15, 0.5));
      const iris = sph(0.1, M(0x3a2415, { roughness: 0.25, clearcoat: 0.8 }), 1, 1, 0.5); iris.position.set(0, -0.01, 0.045); e.add(iris);
      const pup = sph(0.055, M(0x0c0806, { roughness: 0.2 }), 1, 1, 0.5); pup.position.set(0, -0.01, 0.075); e.add(pup);
      const hl = sph(0.03, new THREE.MeshBasicMaterial({ color: 0xffffff }), 1, 1, 0.6); hl.position.set(0.04, 0.045, 0.1); e.add(hl);
      return e;
    };
    const eyeL = mkEye(-1), eyeR = mkEye(1); g.add(eyeL); g.add(eyeR);
    [-1, 1].forEach((s) => {
      const br = cap(0.02, 0.12, hairM); br.rotation.z = Math.PI / 2 + s * 0.12; br.position.set(s * 0.21, 2.1, 0.5); g.add(br);
      const ch = sph(0.1, M(PALETTE.cheek, { roughness: 0.7, clearcoat: 0 }), 1, 0.75, 0.3); ch.position.set(s * 0.37, 1.72, 0.46); g.add(ch);
    });
    const nose = sph(0.045, M(0xb06c42), 1, 1, 0.9); nose.position.set(0, 1.8, 0.6); g.add(nose);
    const mouthO = sph(0.075, M(0x8a2418, { roughness: 0.5 }), 1, 1.25, 0.4); mouthO.position.set(0, 1.62, 0.58); g.add(mouthO);
    const mouthH = new THREE.Group(); mouthH.position.set(0, 1.64, 0.57);
    const mh = new THREE.Mesh(new THREE.SphereGeometry(0.13, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M(0x8a2418, { roughness: 0.5 }));
    mh.scale.set(1, 0.85, 0.55); mh.rotation.x = 0.1; mouthH.add(mh);
    const tongue = sph(0.06, M(0xff8a8a, { roughness: 0.6 }), 1, 0.55, 0.4); tongue.position.set(0, -0.085, 0.02); mouthH.add(tongue);
    g.add(mouthH);

    const mkArm = (s) => {
      const p = new THREE.Group(); p.position.set(s * 0.47, 1.26, 0);
      const arm = cap(0.105, 0.36, skin); arm.position.y = -0.29; p.add(arm);
      const sleeve = sph(0.17, shirt, 1, 1, 1); sleeve.position.y = -0.02; p.add(sleeve);
      const hand = sph(0.15, skin); hand.position.y = -0.6; p.add(hand);
      const mud = new THREE.Group(); mud.position.set(0, -0.6, 0.02);
      [[0.0, -0.02, 0.1, 0.1], [0.09, 0.04, 0.08, 0.06], [-0.08, 0.06, 0.06, 0.05]].forEach(([x, y, z, r]) => { const m = sph(r, mudM); m.position.set(x, y, z); mud.add(m); });
      mud.visible = false; p.add(mud);
      g.add(p); return { p, mud };
    };
    const aL = mkArm(-1), aR = mkArm(1);
    mouthO.visible = false;
    return { g, armL: aL.p, armR: aR.p, mudL: aL.mud, mudR: aR.mud, eyeL, eyeR, mouthO, mouthH };
  }

  // =====================================================================
  // GAJA: baby elephant. Signature: teal body, forehead star, pink ears.
  // =====================================================================
  function makeGaja() {
    const body = M(PALETTE.gajaBody, { roughness: 0.5 });
    const leg = M(PALETTE.gajaLeg, { roughness: 0.55 });
    const belly = M(PALETTE.gajaBelly, { roughness: 0.55 });
    const pink = M(PALETTE.gajaEar, { roughness: 0.6, clearcoat: 0.1 });
    const white = M(PALETTE.white, { roughness: 0.4 });
    const g = new THREE.Group();
    [-1, 1].forEach((s) => { const l = cap(0.2, 0.3, leg); l.position.set(s * 0.4, 0.35, 0.05); g.add(l); });
    const bd = sph(0.78, body, 1, 0.92, 0.95, 44); bd.position.set(0, 1.0, 0); g.add(bd);
    const bl = sph(0.55, belly, 1, 0.95, 0.5, 40); bl.position.set(0, 0.92, 0.55); g.add(bl);
    const head = sph(0.66, body, 1, 0.97, 1, 48); head.position.set(0, 2.0, 0.12); g.add(head);
    const mkEar = (s) => {
      const eg = new THREE.Group(); eg.position.set(s * 0.58, 2.1, 0.0);
      const outer = sph(0.62, body, 1, 1.05, 0.2, 44); outer.position.set(s * 0.42, 0, 0); eg.add(outer);
      const inner = sph(0.42, pink, 1, 1.05, 0.22, 40); inner.position.set(s * 0.42, 0, 0.05); eg.add(inner);
      eg.rotation.y = s * 0.55; g.add(eg); return eg;
    };
    const earL = mkEar(-1), earR = mkEar(1);
    // forehead star (signature mark)
    const star = new THREE.Mesh(starGeo(0.1, 0.043, 0.03), M(PALETTE.starYellow, { roughness: 0.3, clearcoat: 0.7 }));
    star.position.set(0, 2.42, 0.6); star.rotation.x = -0.45; star.castShadow = true; g.add(star);
    [-1, 1].forEach((s) => {
      const w = sph(0.115, white, 1, 1.1, 0.5); w.position.set(s * 0.24, 2.08, 0.72); g.add(w);
      const p = sph(0.07, M(0x1d2b3a, { roughness: 0.3, clearcoat: 0.7 }), 1, 1, 0.5); p.position.set(s * 0.235, 2.075, 0.77); g.add(p);
      const hl = sph(0.025, new THREE.MeshBasicMaterial({ color: 0xffffff }), 1, 1, 0.6); hl.position.set(s * 0.215, 2.11, 0.81); g.add(hl);
      const ch = sph(0.11, M(PALETTE.cheek, { roughness: 0.7, clearcoat: 0 }), 1, 0.75, 0.3); ch.position.set(s * 0.4, 1.86, 0.62); g.add(ch);
    });
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.02, 12, 24, Math.PI), M(0x2b6f74, { clearcoat: 0 }));
    smile.rotation.z = Math.PI; smile.position.set(0, 1.82, 0.76); g.add(smile);
    const root = new THREE.Group(); root.position.set(0, 1.85, 0.74); g.add(root);
    const s1 = cap(0.15, 0.28, body); s1.position.y = -0.24; root.add(s1);
    const j2 = new THREE.Group(); j2.position.y = -0.5; root.add(j2);
    const s2 = cap(0.13, 0.26, body); s2.position.y = -0.21; j2.add(s2);
    const j3 = new THREE.Group(); j3.position.y = -0.42; j2.add(j3);
    const s3 = cap(0.115, 0.2, body); s3.position.y = -0.17; j3.add(s3);
    const tip = sph(0.125, body); tip.position.y = -0.34; j3.add(tip);
    j2.rotation.x = -0.3; j3.rotation.x = -0.35;
    return { g, earL, earR, trunk: root, j2, j3 };
  }

  // ---- shared helpers for episodes ----
  const DOWN = new THREE.Vector3(0, -1, 0);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const aim = (obj, d) => obj.quaternion.setFromUnitVectors(DOWN, d.clone().normalize());
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const ss = (a, b, t) => { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const blendV = (a, b, k) => V(lerp(a.x, b.x, k), lerp(a.y, b.y, k), lerp(a.z, b.z, k));

  window.KC = { DESIGN_VERSION, PALETTE, makeLumo, makeGaja, M, sph, cap, V, aim, clamp, ss, lerp, blendV };
})();
