/* Episode 1: "Ayo Belajar Warna!"  Choreography.
 * Everything is a pure function of time t. Scene timing comes from the voice
 * files (EP.start / EP.dur, keyed by line id L01..L58), so swapping the voice
 * automatically re-times the whole episode. */
(function () {
  const { V, aim, ss, lerp, blendV, clamp } = KC;
  const EP = window.EP, T = EP.start, D = EP.dur;
  const E = (id) => T[id] + D[id];
  let S = null;
  const wob = (t, f, a) => Math.sin(t * Math.PI * 2 * f) * a;
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const easeOutBack = (x) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const inRanges = (rs, t) => rs.some(([a, b]) => t >= a && t <= b);

  // ---------- Lumo ----------
  const IDLE_L = V(-0.22, -0.95, 0.1), IDLE_R = V(0.22, -0.95, 0.1);
  const LUMO = {
    idle: () => [IDLE_L, IDLE_R],
    wave: (t) => [IDLE_L, V(0.78 + wob(t, 2.2, 0.2), 0.62 + wob(t, 2.2, 0.08), 0.12)],
    pointR: () => [IDLE_L, V(0.95, 0.12, 0.35)],
    pointUp: () => [IDLE_L, V(0.55, 0.85, 0.2)],
    cheer: (t) => [V(-0.64 + wob(t, 2, 0.14), 0.77 + wob(t, 2, 0.08), 0.1), V(0.64 + wob(t, 2, -0.14), 0.77 + wob(t, 2, 0.08), 0.1)],
    listen: () => [IDLE_L, V(0.42, 0.9, 0.2)],
    open: () => [V(-0.9, 0.1, 0.3), V(0.9, 0.1, 0.3)],
    dance: (t) => { const s = Math.sin(t * Math.PI * 2 / 0.6); return [V(-0.7, 0.65 + 0.25 * s, 0.1), V(0.7, 0.65 - 0.25 * s, 0.1)]; },
  };
  const LUMO_PLAN = [
    ["L01", "wave"], ["L03", "pointR"], ["L04", "cheer"],
    ["L05", "pointR"], ["L10", "cheer"], ["L11", "listen"], ["L12", "pointR"], ["L14", "cheer"],
    ["L15", "pointR"], ["L19", "pointUp"], ["L20", "cheer"], ["L21", "listen"], ["L22", "pointR"], ["L23", "pointUp"], ["L24", "cheer"],
    ["L25", "pointUp"], ["L29", "pointR"], ["L30", "cheer"], ["L31", "listen"], ["L32", "pointUp"], ["L33", "pointR"], ["L34", "cheer"],
    ["L35", "open"], ["L37", "cheer"], ["L38", "open"], ["L40", "cheer"], ["L41", "open"], ["L43", "cheer"],
    ["L44", "pointUp"], ["L45", "open"], ["L46", "listen"], ["L47", "cheer"], ["L48", "open"], ["L49", "listen"], ["L50", "cheer"], ["L51", "open"], ["L52", "listen"], ["L53", "cheer"],
    ["L54", "open"], ["L56", "dance"], ["L57", "wave"],
  ];
  const BOUNCY = new Set(["wave", "cheer", "dance"]);

  // ---------- Gaja ----------
  const GAJA = {
    idle: (t) => V(0.05 + wob(t, 0.8, 0.1), -0.78, 0.62),
    wave: (t) => V(-0.8, 0.45 + wob(t, 2.4, 0.18), 0.35),
    up: (t) => V(0, 0.95, 0.3 + wob(t, 1.5, 0.1)),
    point: (t) => V(-0.95, 0.1 + wob(t, 1.2, 0.05), 0.3),
    dance: (t) => V(-0.7 * Math.sin(t * Math.PI * 2 / 0.6), 0.6, 0.4),
  };
  const GAJA_PLAN = [
    ["L01", "wave"], ["L04", "idle"], ["L10", "point"], ["L11", "idle"], ["L20", "point"], ["L21", "idle"],
    ["L25", "up"], ["L28", "idle"], ["L30", "point"], ["L31", "idle"], ["L32", "up"], ["L33", "idle"], ["L34", "point"], ["L35", "idle"],
    ["L45", "point"], ["L48", "idle"], ["L50", "up"], ["L51", "idle"], ["L53", "point"], ["L54", "idle"], ["L56", "dance"], ["L57", "wave"],
  ];
  const toSegs = (plan) => plan.map(([id, name], i) => [T[id], i + 1 < plan.length ? T[plan[i + 1][0]] : 1e9, name]);
  const LUMO_SEG = toSegs(LUMO_PLAN), GAJA_SEG = toSegs(GAJA_PLAN);

  function segPose(segs, t, fn, blendFn) {
    let i = segs.findIndex(([a, b]) => t >= a && t < b); if (i < 0) i = t < segs[0][0] ? 0 : segs.length - 1;
    const [a, , name] = segs[i], cur = fn(name, t);
    if (i > 0) { const k = ss(a, a + 0.4, t); if (k < 1) return { name, val: blendFn(fn(segs[i - 1][2], t), cur, k) }; }
    return { name, val: cur };
  }

  // ---------- table props ----------
  const TABLE_Y = 1.03, PS = 1.3;
  const windows = {
    apple: [{ a: T.L05, b: T.L15, x: (t) => lerp(0.7, 0.0, ss(T.L09, T.L09 + 0.5, t)) }, { a: T.L35, b: T.L44, x: () => -0.5 }, { a: T.L54, b: 1e9, x: () => -0.5 }],
    strawberry: [{ a: T.L09, b: T.L15, x: () => 1.45 }],
    banana: [{ a: T.L15, b: T.L25, x: () => 0.7 }, { a: T.L35, b: T.L44, x: () => 0.7 }, { a: T.L54, b: 1e9, x: () => 0.7 }],
    bucket: [{ a: T.L29, b: T.L35, x: () => 0.7 }],
    ball: [{ a: T.L35, b: T.L44, x: () => 1.9 }, { a: T.L54, b: 1e9, x: () => 1.9 }],
  };
  const third = D.L55 / 3;
  const glow = {
    apple: [[T.L06, E("L08")]], strawberry: [[T.L09 + 0.4, E("L09")]], banana: [[T.L16, E("L18")]],
    bucket: [[T.L33, E("L33")]], ball: [[T.L41, E("L41")]],
  };
  const jump = {
    apple: [[T.L12, E("L12")], [T.L37, E("L37")], [T.L55, T.L55 + third]],
    strawberry: [[T.L13, E("L13")]],
    banana: [[T.L22, E("L22")], [T.L40, E("L40")], [T.L55 + third, T.L55 + 2 * third]],
    ball: [[T.L43, E("L43")], [T.L55 + 2 * third, E("L55")]],
  };
  const FLOWERS = [
    { id: "R", petal: 0xe0242a, center: 0xffc61a, pos: [-3.7, 0, -1.2], s: 1.9, a: T.L47, b: T.L54 },
    { id: "Y", petal: 0xffc61a, center: 0xf26b1d, pos: [2.4, 0, -2.2], s: 2.4, a: T.L50, b: T.L54 },
    { id: "B", petal: 0x2f8fe6, center: 0xffc61a, pos: [-0.9, 0, -2.2], s: 2.4, a: T.L53, b: T.L54 },
  ];
  const props = {}, flowers = [], sparks = [], confetti = [];
  let rainbow, sun;
  const SPARK = [[T.L37, "apple"], [T.L40, "banana"], [T.L43, "ball"], [T.L47 + 0.3, "F0"], [T.L50 + 0.3, "F1"], [T.L53 + 0.3, "F2"], [T.L56 + 0.2, null]];

  function init(stage) {
    S = stage; const W = KC.World;
    props.apple = W.makeApple(); props.strawberry = W.makeStrawberry(); props.banana = W.makeBanana(); props.bucket = W.makeBucket(); props.ball = W.makeBall();
    Object.values(props).forEach((g) => { g.visible = false; S.scene.add(g); });
    FLOWERS.forEach((f) => { const g = W.makeFlower(f.petal, f.center); g.visible = false; g.position.set(...f.pos); S.scene.add(g); flowers.push(g); });
    rainbow = W.makeRainbow(); rainbow.position.set(0.7, -0.4, -8); rainbow.visible = false; S.scene.add(rainbow);
    sun = W.makeSun(); sun.position.set(5.0, 5.2, -6); sun.visible = false; S.scene.add(sun);
    const sparkM = new THREE.MeshBasicMaterial({ color: 0xffd23f });
    SPARK.forEach(() => { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.25, 0), sparkM); m.visible = false; S.scene.add(m); sparks.push(m); });
    const cols = [0xff4d8d, 0xffd23f, 0x2aa7ff, 0x7ed957, 0xa56ee0, 0xff8a1f];
    for (let i = 0; i < 28; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.03), new THREE.MeshBasicMaterial({ color: cols[i % 6] })); m.visible = false; S.scene.add(m); confetti.push(m); }
  }

  function update(t) {
    const { lumo, gaja, cam } = S;

    // ---- Lumo
    const lp = segPose(LUMO_SEG, t, (n, tt) => LUMO[n](tt), (A, B, k) => [blendV(A[0], B[0], k), blendV(A[1], B[1], k)]);
    aim(lumo.armL, lp.val[0]); aim(lumo.armR, lp.val[1]);
    lumo.g.position.y = BOUNCY.has(lp.name) ? Math.abs(Math.sin(t * Math.PI / 0.5)) * 0.12 : Math.abs(Math.sin(t * Math.PI / 1.6)) * 0.015;
    lumo.g.rotation.y = 0.25 + (lp.name === "dance" ? wob(t, 1 / 1.2, 0.25) : 0);
    const surprised = ["L05", "L15", "L25", "L45", "L48", "L51"].some((id) => t >= T[id] && t < T[id] + 1.4);
    lumo.mouthO.visible = surprised; lumo.mouthH.visible = !surprised;
    lumo.eyeL.scale.y = lumo.eyeR.scale.y = (Math.sin(t * 1.3 + 2) > 0.985) ? 0.12 : 1;

    // ---- Gaja
    const gp = segPose(GAJA_SEG, t, (n, tt) => GAJA[n](tt), (A, B, k) => blendV(A, B, k));
    aim(gaja.trunk, gp.val);
    gaja.j2.rotation.x = -0.3 + 0.1 * Math.sin(t * 5); gaja.j3.rotation.x = -0.35 + 0.12 * Math.sin(t * 5 + 1);
    const excited = gp.name === "dance" || gp.name === "wave" || gp.name === "up";
    const flap = Math.sin(t * Math.PI * 2 / (excited ? 0.45 : 1.6)) * (excited ? 0.16 : 0.05);
    gaja.earL.rotation.y = -0.55 + flap; gaja.earR.rotation.y = 0.55 - flap;
    gaja.g.position.y = gp.name === "dance" ? Math.abs(Math.sin(t * Math.PI / 0.6)) * 0.14 : Math.abs(Math.sin(t * Math.PI / 1.8)) * 0.02;

    // ---- table props
    Object.keys(props).forEach((k) => {
      const g = props[k]; const w = windows[k].find((w) => t >= w.a && t <= w.b);
      if (!w) { g.visible = false; return; }
      g.visible = true;
      let sc = Math.max(easeOutBack(clamp((t - w.a) / 0.55, 0, 1)) * (1 - ss(w.b - 0.3, w.b, t)), 0.0001) * PS;
      if (glow[k] && inRanges(glow[k], t)) sc *= 1 + 0.12 * Math.sin(t * 9);
      let y = TABLE_Y + Math.sin(t * 2 + k.length) * 0.03;
      const jr = jump[k] && jump[k].find(([a, b]) => t >= a && t <= b);
      if (jr) { const u = (t - jr[0]) / Math.max(jr[1] - jr[0], 0.5); y += Math.abs(Math.sin(u * Math.PI * 3)) * 0.5 * (1 - u * 0.4); }
      g.position.set(w.x(t), y, 1.2); g.scale.setScalar(sc);
      g.rotation.y = k === "banana" ? 0.35 + 0.5 * Math.sin(t * 0.9) : t * 0.9 + k.length;
    });

    // ---- garden flowers (found one by one)
    flowers.forEach((g, i) => {
      const f = FLOWERS[i]; const on = t >= f.a && t <= f.b; g.visible = on; if (!on) return;
      const sc = Math.max(easeOutBack(clamp((t - f.a) / 0.6, 0, 1)) * (1 - ss(f.b - 0.4, f.b, t)), 0.0001) * f.s;
      const u = (t - f.a) / 1.4, hop = u >= 0 && u <= 1 ? Math.abs(Math.sin(u * Math.PI * 2)) * 0.5 : 0;
      g.scale.setScalar(sc); g.position.set(f.pos[0], hop, f.pos[2]); g.rotation.z = Math.sin(t * 2 + i) * 0.06;
    });

    // ---- rainbow, sun
    const rbA = [[T.L04, E("L05") + 0.5], [T.L54, 1e9]].find(([a, b]) => t >= a && t <= b);
    rainbow.visible = !!rbA;
    if (rbA) rainbow.scale.setScalar(Math.max(easeOutBack(clamp((t - rbA[0]) / 0.8, 0, 1)) * (1 - ss(rbA[1] - 0.4, rbA[1], t)), 0.0001));
    const sunOn = t >= T.L19 && t <= T.L25;
    sun.visible = sunOn;
    if (sunOn) { sun.scale.setScalar(Math.max(easeOutBack(clamp((t - T.L19) / 0.6, 0, 1)) * (1 - ss(T.L25 - 0.3, T.L25, t)), 0.0001)); sun.userData.rays.rotation.z = t * 0.6; }

    // ---- sparkles
    sparks.forEach((s, i) => {
      const [t0, k] = SPARK[i]; const u = (t - t0) / 1.0;
      if (u < 0 || u > 1) { s.visible = false; return; }
      s.visible = true; const sc = ss(0, 0.25, u) * (1 - ss(0.7, 1, u));
      let bx = 0.7, by = 2.2, bz = 1.5;
      if (k && props[k]) { bx = props[k].position.x; by = props[k].position.y; bz = 1.6; }
      if (k && k[0] === "F") { const f = FLOWERS[+k[1]]; bx = f.pos[0]; by = 1.6 * f.s * 0.5; bz = f.pos[2] + 0.5; }
      s.position.set(bx + 0.55, by + 0.9, bz); s.scale.set(sc * 1.4, sc * 1.4, sc * 0.5); s.rotation.z = u * 3;
    });
    // ---- confetti
    confetti.forEach((c, i) => {
      const t0 = T.L56 + 0.3 + (i % 7) * 0.2, u = (t - t0) / 3.4;
      if (u < 0 || u > 1) { c.visible = false; return; }
      c.visible = true; c.position.set(-3.8 + hash(i + 3) * 9.4, 5.6 - u * 5.5, 1.2 + hash(i + 9) * 1.8); c.rotation.set(u * 9 + i, u * 7, u * 5);
    });

    // ---- camera: gentle drift; look up (a little) for the sky lines
    const up1 = ss(T.L25, T.L25 + 0.7, t) * (1 - ss(E("L28") - 0.1, E("L28") + 0.6, t));
    const up2 = ss(T.L32, T.L32 + 0.6, t) * (1 - ss(E("L32") - 0.1, E("L32") + 0.5, t));
    const tilt = Math.max(up1, up2);
    cam.position.set(0.7 + 0.12 * Math.sin(t * 0.3), 2.0 + 0.08 * Math.sin(t * 0.23), 9.8 - 0.4 * ss(0, 3, t));
    cam.lookAt(0.7, lerp(1.5, 2.4, tilt), 0);
  }

  window.EPCHOREO = { init, update };
})();
