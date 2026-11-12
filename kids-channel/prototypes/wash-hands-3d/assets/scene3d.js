/* Benny & Ellie, 3D. Every frame is a pure function of time t (seconds). */
(function () {
  const W = 1080, H = 1920;
  const canvas = document.getElementById("gl");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(35, W / H, 0.1, 200);

  // ---------- helpers ----------
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const ss = (a, b, t) => { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const DOWN = V(0, -1, 0);
  const aim = (obj, d) => obj.quaternion.setFromUnitVectors(DOWN, d.clone().normalize());
  const blendV = (a, b, k) => V(lerp(a.x, b.x, k), lerp(a.y, b.y, k), lerp(a.z, b.z, k));

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
  function box(w, h, d, mat) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.castShadow = true; m.receiveShadow = true; return m;
  }

  // ---------- lights ----------
  scene.add(new THREE.HemisphereLight(0xcdeeff, 0x8bd86a, 1.25));
  const key = new THREE.DirectionalLight(0xfff0d8, 2.6);
  key.position.set(-3.5, 8, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(1536, 1536);
  key.shadow.camera.left = -6; key.shadow.camera.right = 6; key.shadow.camera.top = 7; key.shadow.camera.bottom = -3;
  key.shadow.camera.near = 1; key.shadow.camera.far = 30;
  key.shadow.radius = 5; key.shadow.bias = -0.0004;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xbfe0ff, 0.9); fill.position.set(5, 3, 6); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.9); rim.position.set(0, 4, -8); scene.add(rim);

  // ---------- world ----------
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(80, 60), M(0x5fcf45, { roughness: 0.95, clearcoat: 0 }));
  lawn.rotation.x = -Math.PI / 2; lawn.receiveShadow = true; lawn.position.z = -10; scene.add(lawn);
  // mowed stripes
  for (let i = 0; i < 10; i++) {
    const st = new THREE.Mesh(new THREE.PlaneGeometry(80, 1.2), M(0x6fd954, { roughness: 0.95, clearcoat: 0 }));
    st.rotation.x = -Math.PI / 2; st.position.set(0, 0.004, -2 + i * 2.4 - 10); st.receiveShadow = true; scene.add(st);
  }
  const hill = sph(14, M(0x8ee06a, { roughness: 1, clearcoat: 0 }), 1.8, 0.42, 0.5, 48); hill.position.set(-4, -1.2, -20); scene.add(hill);
  const hill2 = sph(10, M(0x7ad65a, { roughness: 1, clearcoat: 0 }), 1.6, 0.4, 0.5, 48); hill2.position.set(11, -1.0, -17); scene.add(hill2);
  // purple fence
  const fenceM = M(0xa56ee0, { roughness: 0.5 }), railM = M(0x8a52c9, { roughness: 0.5 });
  for (let i = -16; i <= 16; i++) {
    const post = box(0.46, 1.5, 0.12, fenceM); post.position.set(i * 0.56, 0.75, -3.2); scene.add(post);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.23, 0.26, 4), fenceM); tip.position.set(i * 0.56, 1.63, -3.2); tip.rotation.y = Math.PI / 4; tip.castShadow = true; scene.add(tip);
  }
  const rail1 = box(20, 0.14, 0.1, railM); rail1.position.set(0, 1.15, -3.12); scene.add(rail1);
  const rail2 = box(20, 0.14, 0.1, railM); rail2.position.set(0, 0.45, -3.12); scene.add(rail2);

  // ---------- Benny ----------
  const skin = M(0xffc093, { roughness: 0.5 });
  const shirtM = M(0x7fcdf2, { roughness: 0.6 });
  const shortsM = M(0xffcf33, { roughness: 0.6 });
  const whiteM = M(0xffffff, { roughness: 0.4 });
  const hairM = M(0xf59a1b, { roughness: 0.55 });
  const mudM = M(0x5b3a1e, { roughness: 0.95, clearcoat: 0 });
  const star = (() => {
    const sh = new THREE.Shape(); const n = 5, ro = 0.15, ri = 0.065;
    for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n; const r = i % 2 ? ri : ro; const x = Math.cos(a) * r, y = -Math.sin(a) * r; if (!i) sh.moveTo(x, y); else sh.lineTo(x, y); }
    sh.closePath(); return sh;
  })();

  function makeBenny() {
    const g = new THREE.Group();
    [-1, 1].forEach((s) => {
      const leg = cap(0.1, 0.22, skin); leg.position.set(s * 0.22, 0.38, 0); g.add(leg);
      const shoe = sph(0.2, whiteM, 1, 0.62, 1.5); shoe.position.set(s * 0.22, 0.13, 0.1); g.add(shoe);
    });
    const shorts = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.47, 0.42, 40), shortsM); shorts.position.y = 0.68; shorts.castShadow = true; g.add(shorts);
    const torso = cap(0.4, 0.36, shirtM); torso.position.y = 1.04; torso.scale.set(1, 1, 0.9); g.add(torso);
    const starM = new THREE.Mesh(new THREE.ExtrudeGeometry(star, { depth: 0.04, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 }), M(0xffc61a, { roughness: 0.35, clearcoat: 0.6 }));
    starM.position.set(0, 1.06, 0.355); g.add(starM);
    const head = sph(0.62, skin, 1, 0.95, 0.97, 48); head.position.y = 1.86; g.add(head);
    [-1, 1].forEach((s) => { const ear = sph(0.12, skin, 0.7, 1, 1); ear.position.set(s * 0.62, 1.82, 0); g.add(ear); });
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.655, 48, 28, 0, Math.PI * 2, 0, 1.22), hairM);
    hair.position.set(0, 1.9, -0.02); hair.rotation.x = -0.18; hair.scale.set(1, 0.97, 0.99); hair.castShadow = true; g.add(hair);
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 20), hairM); tuft.position.set(0.02, 2.55, 0.02); tuft.rotation.z = -0.35; tuft.castShadow = true; g.add(tuft);
    // eyes
    const mkEye = (s) => {
      const e = new THREE.Group(); e.position.set(s * 0.21, 1.9, 0.5);
      const w = sph(0.14, whiteM, 1, 1.15, 0.5); e.add(w);
      const iris = sph(0.095, M(0x2f8fe6, { roughness: 0.25, clearcoat: 0.8 }), 1, 1, 0.5); iris.position.set(0, -0.01, 0.045); e.add(iris);
      const pup = sph(0.05, M(0x10192e, { roughness: 0.2 }), 1, 1, 0.5); pup.position.set(0, -0.01, 0.075); e.add(pup);
      const hl = sph(0.028, new THREE.MeshBasicMaterial({ color: 0xffffff }), 1, 1, 0.6); hl.position.set(0.035, 0.04, 0.1); e.add(hl);
      return e;
    };
    const eyeL = mkEye(-1), eyeR = mkEye(1); g.add(eyeL); g.add(eyeR);
    [-1, 1].forEach((s) => {
      const br = cap(0.018, 0.12, M(0xc9801a)); br.rotation.z = Math.PI / 2 + s * 0.12; br.position.set(s * 0.21, 2.1, 0.5); g.add(br);
      const ch = sph(0.1, M(0xff9fa8, { roughness: 0.7, clearcoat: 0 }), 1, 0.75, 0.3); ch.position.set(s * 0.37, 1.72, 0.46); g.add(ch);
    });
    const nose = sph(0.045, M(0xf0a984), 1, 1, 0.9); nose.position.set(0, 1.8, 0.6); g.add(nose);
    // mouths
    const mouthO = sph(0.075, M(0xb83224, { roughness: 0.5 }), 1, 1.25, 0.4); mouthO.position.set(0, 1.62, 0.58); g.add(mouthO);
    const mouthH = new THREE.Group(); mouthH.position.set(0, 1.64, 0.57);
    const mh = new THREE.Mesh(new THREE.SphereGeometry(0.13, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M(0xb83224, { roughness: 0.5 }));
    mh.scale.set(1, 0.85, 0.55); mh.rotation.x = 0.1; mouthH.add(mh);
    const tongue = sph(0.06, M(0xff8a8a, { roughness: 0.6 }), 1, 0.55, 0.4); tongue.position.set(0, -0.085, 0.02); mouthH.add(tongue);
    g.add(mouthH);
    // arms
    const mkArm = (s) => {
      const p = new THREE.Group(); p.position.set(s * 0.47, 1.26, 0);
      const arm = cap(0.105, 0.36, skin); arm.position.y = -0.29; p.add(arm);
      const sleeve = sph(0.17, shirtM, 1, 1, 1); sleeve.position.y = -0.02; p.add(sleeve);
      const hand = sph(0.15, skin); hand.position.y = -0.6; p.add(hand);
      const mud = new THREE.Group(); mud.position.set(0, -0.6, 0.02);
      [[0.0, -0.02, 0.1, 0.1], [0.09, 0.04, 0.08, 0.06], [-0.08, 0.06, 0.06, 0.05]].forEach(([x, y, z, r]) => { const m = sph(r, mudM); m.position.set(x, y, z); mud.add(m); });
      p.add(mud);
      g.add(p); return { p, mud };
    };
    const aL = mkArm(-1), aR = mkArm(1);
    return { g, armL: aL.p, armR: aR.p, mudL: aL.mud, mudR: aR.mud, eyeR, mouthO, mouthH };
  }
  const benny = makeBenny(); scene.add(benny.g);

  // ---------- Ellie ----------
  const eY = M(0xffd24a, { roughness: 0.5 }), eYd = M(0xf0b92f, { roughness: 0.55 }), eBelly = M(0xffe48f, { roughness: 0.55 }), ePink = M(0xffb0bd, { roughness: 0.6, clearcoat: 0.1 });
  function makeEllie() {
    const g = new THREE.Group();
    [-1, 1].forEach((s) => { const leg = cap(0.2, 0.3, eYd); leg.position.set(s * 0.4, 0.35, 0.05); g.add(leg); });
    const body = sph(0.78, eY, 1, 0.92, 0.95, 44); body.position.set(0, 1.0, 0); g.add(body);
    const belly = sph(0.55, eBelly, 1, 0.95, 0.5, 40); belly.position.set(0, 0.92, 0.55); g.add(belly);
    const head = sph(0.66, eY, 1, 0.97, 1, 48); head.position.set(0, 2.0, 0.12); g.add(head);
    const mkEar = (s) => {
      const eg = new THREE.Group(); eg.position.set(s * 0.58, 2.1, 0.0);
      const outer = sph(0.62, eY, 1, 1.05, 0.2, 44); outer.position.set(s * 0.42, 0, 0); eg.add(outer);
      const inner = sph(0.42, ePink, 1, 1.05, 0.22, 40); inner.position.set(s * 0.42, 0, 0.05); eg.add(inner);
      eg.rotation.y = s * 0.55; g.add(eg); return eg;
    };
    const earL = mkEar(-1), earR = mkEar(1);
    [-1, 1].forEach((s) => {
      const w = sph(0.115, whiteM, 1, 1.1, 0.5); w.position.set(s * 0.24, 2.08, 0.72); g.add(w);
      const p = sph(0.07, M(0x3b2a1a, { roughness: 0.3, clearcoat: 0.7 }), 1, 1, 0.5); p.position.set(s * 0.235, 2.075, 0.77); g.add(p);
      const hl = sph(0.025, new THREE.MeshBasicMaterial({ color: 0xffffff }), 1, 1, 0.6); hl.position.set(s * 0.215, 2.11, 0.81); g.add(hl);
      const ch = sph(0.11, M(0xff9fa8, { roughness: 0.7, clearcoat: 0 }), 1, 0.75, 0.3); ch.position.set(s * 0.4, 1.86, 0.62); g.add(ch);
    });
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.02, 12, 24, Math.PI), M(0xb9770e, { clearcoat: 0 }));
    smile.rotation.z = Math.PI; smile.position.set(0, 1.82, 0.76); g.add(smile);
    // trunk: three jointed segments
    const root = new THREE.Group(); root.position.set(0, 1.85, 0.74); g.add(root);
    const s1 = cap(0.15, 0.28, eY); s1.position.y = -0.24; root.add(s1);
    const j2 = new THREE.Group(); j2.position.y = -0.5; root.add(j2);
    const s2 = cap(0.13, 0.26, eY); s2.position.y = -0.21; j2.add(s2);
    const j3 = new THREE.Group(); j3.position.y = -0.42; j2.add(j3);
    const s3 = cap(0.115, 0.2, eY); s3.position.y = -0.17; j3.add(s3);
    const tip = sph(0.125, eY); tip.position.y = -0.34; j3.add(tip);
    j2.rotation.x = -0.45; j3.rotation.x = -0.5;
    return { g, earL, earR, trunk: root, j2, j3 };
  }
  const ellie = makeEllie(); scene.add(ellie.g);

  // ---------- sink props ----------
  const props = new THREE.Group(); scene.add(props);
  const woodM = M(0xc98b4c, { roughness: 0.7 });
  const table = box(3.3, 0.7, 1.3, woodM); table.position.set(0, 0.35, 1.25); props.add(table);
  const tableTop = box(3.4, 0.08, 1.4, M(0xa86f35, { roughness: 0.7 })); tableTop.position.set(0, 0.72, 1.25); props.add(tableTop);
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.8, 0.34, 40, 1, true), M(0x74c0ff, { roughness: 0.3, side: THREE.DoubleSide }));
  basin.position.set(0, 0.93, 1.25); basin.castShadow = true; basin.receiveShadow = true; props.add(basin);
  const basinRim = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.05, 12, 48), M(0x9fd6ff, { roughness: 0.3 })); basinRim.rotation.x = Math.PI / 2; basinRim.position.set(0, 1.1, 1.25); props.add(basinRim);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.82, 0.04, 40), M(0x2aa7ff, { roughness: 0.15, clearcoat: 1 })); water.position.set(0, 0.98, 1.25); props.add(water);
  const metalM = M(0xb9c7d6, { roughness: 0.25, metalness: 0.6, clearcoat: 0.6 });
  const faucetV = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.85, 20), metalM); faucetV.position.set(0.95, 1.5, 0.75); faucetV.castShadow = true; props.add(faucetV);
  const faucetH = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.0, 20), metalM); faucetH.rotation.z = Math.PI / 2; faucetH.position.set(0.45, 1.9, 0.75); faucetH.castShadow = true; props.add(faucetH);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.3, 20), metalM); spout.position.set(-0.05, 1.77, 0.75); spout.castShadow = true; props.add(spout);
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 1, 12), new THREE.MeshPhysicalMaterial({ color: 0x4cc3ff, transparent: true, opacity: 0.8, roughness: 0.1 }));
  props.add(stream);

  // ---------- particles ----------
  const bubbleCols = [0xff9ecb, 0x7fd6ff, 0xffe066, 0xb9f6ca, 0xff9ecb, 0xffe066, 0x7fd6ff, 0xb9f6ca];
  const bubbles = bubbleCols.map((c) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshPhysicalMaterial({ color: c, emissive: c, emissiveIntensity: 0.45, transparent: true, opacity: 0.8, roughness: 0.1, clearcoat: 1 })); scene.add(m); return m; });
  const drops = []; for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), new THREE.MeshPhysicalMaterial({ color: 0x2aa7ff, roughness: 0.1 })); scene.add(m); drops.push(m); }
  const sparkleM = new THREE.MeshBasicMaterial({ color: 0xffd23f });
  const sparkles = []; for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), sparkleM); m.scale.set(1, 1, 0.35); scene.add(m); sparkles.push(m); }
  const confCols = [0xff4d8d, 0xffd23f, 0x2aa7ff, 0x7ed957, 0xa56ee0, 0xff8a1f];
  const confetti = []; for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.03), new THREE.MeshBasicMaterial({ color: confCols[i % 6] })); scene.add(m); confetti.push(m); }

  // ---------- poses ----------
  const P_UP = V(-0.82, 0.57, 0.12), P_WASH = V(0.58, -0.45, 0.74), P_SHOW = V(-0.98, 0.15, 0.15), P_CHEER = V(-0.64, 0.77, 0.1), P_FIVE = V(0.96, 0.3, 0.12);
  const mir = (v) => V(-v.x, v.y, v.z);
  const E_REST = V(0.05, -0.78, 0.62), E_WAVE = V(0.8, 0.45, 0.35), E_TOWARD = V(-0.95, 0.04, 0.22);

  function bennyPos(t) {
    const k1 = ss(4.1, 4.65, t), k2 = ss(12.1, 12.65, t);
    return V(lerp(lerp(-0.7, 0.28, k1), -1.2, k2), 0, lerp(lerp(0, 0, k1), 0.15, k2));
  }
  function ellieState(t) {
    const k1 = ss(4.1, 4.65, t), k2 = ss(12.1, 12.65, t);
    const x = lerp(lerp(1.65, -1.25, k1), 0.62, k2);
    const s = lerp(lerp(0.85, 0.7, k1), 0.9, k2);
    const z = lerp(lerp(0.45, 0.5, k1), 0.35, k2);
    return { x, s, z };
  }

  function renderAt(t) {
    // ---- Benny placement + bounce
    const bp = bennyPos(t);
    const bounce1 = t < 4.2 ? Math.abs(Math.sin(t * Math.PI / 0.42)) * 0.16 : 0;
    const bounce4 = t > 12.7 ? Math.abs(Math.sin((t - 12.7) * Math.PI / 0.8)) * 0.1 : 0;
    const sway = t > 4.6 && t < 12.1 ? Math.sin(t * 7) * 0.012 : 0;
    benny.g.position.set(bp.x, bounce1 + bounce4, bp.z);
    benny.g.rotation.y = lerp(lerp(0.12, -0.05, ss(4.1, 4.65, t)), 0.35, ss(12.1, 12.65, t)) + sway;

    // ---- Benny arms
    const wob1 = Math.sin(t * Math.PI * 2 / 0.52);
    const upL = P_UP.clone().add(V(0.1 * wob1, 0.08 * wob1, 0));
    const scrubAmp = ss(4.6, 4.8, t) * (1 - ss(7.6, 7.9, t)) * 0.2 + 0.05;
    const scrub = Math.sin(t * Math.PI * 2 / 0.6);
    const washL = P_WASH.clone().add(V(0.06 * scrub * scrubAmp * 5, 0.05 * scrub * scrubAmp * 5, 0));
    let dL = upL;
    dL = blendV(dL, washL, ss(4.1, 4.6, t));
    dL = blendV(dL, P_SHOW.clone().add(V(0, 0.04 * Math.sin(t * 9), 0)), ss(10.5, 10.95, t));
    const cheerWave = Math.sin(t * Math.PI * 2 / 0.5);
    dL = blendV(dL, P_CHEER.clone().add(V(0.12 * cheerWave, 0.08 * cheerWave, 0)), ss(12.1, 12.55, t));
    let dR = mir(upL);
    dR = blendV(dR, mir(washL), ss(4.1, 4.6, t));
    dR = blendV(dR, mir(P_SHOW).add(V(0, 0.04 * Math.sin(t * 9), 0)), ss(10.5, 10.95, t));
    const five = Math.sin(t * Math.PI * 2 / 0.5);
    dR = blendV(dR, P_FIVE.clone().add(V(0.03 * five * ss(13.0, 13.3, t), 0.06 * five * ss(13.0, 13.3, t), 0)), ss(12.1, 12.55, t));
    aim(benny.armL, dL); aim(benny.armR, dR);
    const mud = 1 - ss(7.0, 7.5, t);
    benny.mudL.scale.setScalar(Math.max(mud, 0.0001)); benny.mudR.scale.setScalar(Math.max(mud, 0.0001));
    benny.mudL.visible = benny.mudR.visible = mud > 0.01;
    benny.mouthO.visible = t < 4.2; benny.mouthH.visible = t >= 4.2;
    const wink = (t > 13.4 && t < 13.62) ? 0.12 : 1; benny.eyeR.scale.y = wink;

    // ---- Ellie
    const es = ellieState(t);
    const eb = t < 4.1 ? Math.abs(Math.sin(t * Math.PI / 0.6)) * 0.04 : (t > 12.7 ? Math.abs(Math.sin((t - 12.7) * Math.PI / 0.8)) * 0.07 : Math.abs(Math.sin(t * Math.PI / 0.7)) * 0.03);
    ellie.g.position.set(es.x, eb, es.z); ellie.g.scale.setScalar(es.s);
    ellie.g.rotation.y = lerp(lerp(-0.35, 0.3, ss(4.1, 4.65, t)), -0.3, ss(12.1, 12.65, t));
    let ed = E_REST.clone().add(V(0.22 * Math.sin(t * 6), 0, 0.1 * Math.sin(t * 6 + 1)));
    ed = blendV(ed, E_WAVE.clone().add(V(0, 0.18 * Math.sin(t * 22), 0.1 * Math.sin(t * 22))), ss(4.1, 4.55, t));
    ed = blendV(ed, E_TOWARD.clone().add(V(0, 0.1 * Math.sin(t * Math.PI * 2 / 0.5) * ss(13, 13.3, t), 0)), ss(12.1, 12.55, t));
    aim(ellie.trunk, ed);
    ellie.j2.rotation.x = -0.3 + 0.1 * Math.sin(t * 5); ellie.j3.rotation.x = -0.35 + 0.12 * Math.sin(t * 5 + 1);
    const flap = Math.sin(t * Math.PI * 2 / 0.6) * 0.1;
    ellie.earL.rotation.y = -0.55 + flap; ellie.earR.rotation.y = 0.55 - flap;

    // ---- props
    const pk = ss(4.0, 4.55, t) * (1 - ss(12.0, 12.35, t));
    props.visible = pk > 0.01;
    props.position.set(0.28, (1 - pk) * -1.4, 0);
    props.scale.setScalar(Math.max(pk, 0.001));
    const sOn = (t > 4.4 && t < 12.0) ? 1 : 0;
    stream.visible = sOn > 0;
    const sTop = 1.62, sBot = 0.98; stream.scale.set(1 + 0.15 * Math.sin(t * 40), sTop - sBot, 1 + 0.15 * Math.sin(t * 40));
    stream.position.set(0.28 - 0.05, (sTop + sBot) / 2 + props.position.y, 0.75);

    // ---- bubbles
    const handsX = 0.28 - 0.04 + 0.0, handsY = 0.95, handsZ = 0.62;
    bubbles.forEach((b, i) => {
      const t0 = 5.2 + (i + 1) * 0.22, u = (t - t0) / 1.2;
      if (u < 0 || u > 1) { b.visible = false; return; }
      b.visible = true;
      const grow = ss(0, 0.2, u), life = 1 - ss(0.82, 1, u);
      const r = (0.09 + hash(i + 1) * 0.1) * grow;
      const dir = (i % 2 ? 1 : -1) * (0.15 + hash(i + 7) * 0.45);
      b.position.set(handsX + dir * u + Math.sin(u * 6 + i) * 0.06, handsY + u * (1.2 + hash(i + 3) * 0.6), handsZ + 0.1 + hash(i + 5) * 0.2);
      b.scale.setScalar(Math.max(r, 0.0001));
      b.material.opacity = 0.8 * life;
    });
    drops.forEach((d, i) => {
      const per = 0.6, ph = ((t - (8.4 + i * 0.1)) / per) % 1;
      if (t < 8.4 || t > 12.0 || ph < 0) { d.visible = false; return; }
      d.visible = true; const dir = (i % 2 ? 1 : -1) * (0.3 + i * 0.07);
      d.position.set(handsX + dir * ph, handsY + 0.1 + Math.sin(ph * Math.PI) * 0.35 - ph * 0.15, handsZ + 0.1);
      d.scale.setScalar(1 - ph * 0.6);
    });

    // ---- sparkles
    const spk = [[10.7, V(-1.5, 1.9, 0.6)], [10.85, V(1.7, 1.8, 0.7)], [13.2, V(-0.1, 1.55, 0.9)], [13.35, V(0.25, 2.0, 0.9)]];
    sparkles.forEach((s, i) => {
      const [t0, p] = spk[i], u = (t - t0) / 1.0;
      if (u < 0 || u > 1) { s.visible = false; return; }
      s.visible = true; const sc = (ss(0, 0.25, u) * (1 - ss(0.7, 1, u))) * (i > 1 ? 1.5 : 1.1);
      s.position.copy(p); s.scale.set(sc, sc, sc * 0.35); s.rotation.z = u * 3;
    });
    // ---- confetti
    confetti.forEach((c, i) => {
      const t0 = 13.0 + (i % 6) * 0.15, u = (t - t0) / 3.2;
      if (u < 0 || u > 1) { c.visible = false; return; }
      c.visible = true;
      c.position.set(-2.3 + hash(i + 11) * 4.6 + Math.sin(u * 8 + i) * 0.15, 5.4 - u * 5.3, 0.8 + hash(i + 2) * 0.8);
      c.rotation.set(u * 9 + i, u * 7, u * 5);
    });

    // ---- camera
    const cx = lerp(lerp(0.0, 0.0, ss(4.1, 4.65, t)), -0.2, ss(12.1, 12.65, t)) + 0.12 * Math.sin(t * 0.4);
    const push = ss(0, 4.1, t) * 0.5 + ss(4.6, 12.0, t) * 0.7;
    cam.position.set(cx, lerp(2.0, 1.75, ss(12.1, 12.65, t)), 14 - push + 0.6 * ss(12.1, 12.65, t));
    cam.lookAt(cx * 0.6, 1.25, 0);
    cam.updateMatrixWorld();
    renderer.render(scene, cam);
  }

  window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
  renderAt(0);
})();
