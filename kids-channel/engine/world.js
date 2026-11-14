/* The garden world + reusable props. Needs THREE and KC (characters.js). */
(function () {
  const { M, sph, cap } = KC;

  function buildGarden(scene) {
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(90, 70), M(0x5fcf45, { roughness: 0.95, clearcoat: 0 }));
    lawn.rotation.x = -Math.PI / 2; lawn.receiveShadow = true; lawn.position.z = -12; scene.add(lawn);
    for (let i = 0; i < 12; i++) {
      const st = new THREE.Mesh(new THREE.PlaneGeometry(90, 1.3), M(0x6fd954, { roughness: 0.95, clearcoat: 0 }));
      st.rotation.x = -Math.PI / 2; st.position.set(0, 0.004, -2 + i * 2.6 - 14); st.receiveShadow = true; scene.add(st);
    }
    const hill = sph(14, M(0x8ee06a, { roughness: 1, clearcoat: 0 }), 1.8, 0.42, 0.5, 48); hill.position.set(-5, -1.2, -22); scene.add(hill);
    const hill2 = sph(10, M(0x7ad65a, { roughness: 1, clearcoat: 0 }), 1.6, 0.4, 0.5, 48); hill2.position.set(12, -1.0, -19); scene.add(hill2);
    const fenceM = M(0xa56ee0, { roughness: 0.5 }), railM = M(0x8a52c9, { roughness: 0.5 });
    for (let i = -22; i <= 22; i++) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.46, 1.5, 0.12), fenceM); post.position.set(i * 0.56, 0.75, -3.6); post.castShadow = true; scene.add(post);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.23, 0.26, 4), fenceM); tip.position.set(i * 0.56, 1.63, -3.6); tip.rotation.y = Math.PI / 4; tip.castShadow = true; scene.add(tip);
    }
    [1.15, 0.45].forEach((y) => { const r = new THREE.Mesh(new THREE.BoxGeometry(26, 0.14, 0.1), railM); r.position.set(0, y, -3.52); scene.add(r); });
    // simple trees behind the fence
    [[-7, -9], [8.5, -10], [-11, -12]].forEach(([x, z]) => {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.33, 2.2, 16), M(0x9a6b3f, { roughness: 0.8, clearcoat: 0 })); trunk.position.set(x, 1.1, z); trunk.castShadow = true; scene.add(trunk);
      const crown = sph(1.6, M(0x4cbf4a, { roughness: 0.8, clearcoat: 0.1 }), 1, 0.9, 1); crown.position.set(x, 3.2, z); scene.add(crown);
      const crown2 = sph(1.1, M(0x5fd35a, { roughness: 0.8, clearcoat: 0.1 }), 1, 0.9, 1); crown2.position.set(x + 0.9, 2.8, z + 0.3); scene.add(crown2);
    });
  }

  function buildTable(scene, x) {
    const g = new THREE.Group(); g.position.set(x, 0, 1.2);
    const wood = M(0xc98b4c, { roughness: 0.65 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.14, 1.5), wood); top.position.y = 0.95; top.castShadow = true; top.receiveShadow = true; g.add(top);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.05, 1.6), M(0xa86f35, { roughness: 0.7 })); trim.position.y = 0.87; g.add(trim);
    [[-1.8, -0.6], [1.8, -0.6], [-1.8, 0.6], [1.8, 0.6]].forEach(([lx, lz]) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.9, 16), wood); l.position.set(lx, 0.45, lz); l.castShadow = true; g.add(l); });
    scene.add(g); return g;
  }

  // ---- props (each returns a Group centred on its base, base at y=0) ----
  function makeApple() {
    const g = new THREE.Group();
    const body = sph(0.4, M(0xe0242a, { roughness: 0.35, clearcoat: 0.8 }), 1, 0.9, 1, 40); body.position.y = 0.38; g.add(body);
    const dimple = sph(0.12, M(0xb81a1f, { roughness: 0.5 }), 1, 0.5, 1); dimple.position.y = 0.72; g.add(dimple);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.2, 12), M(0x6b4a2a, { clearcoat: 0 })); stem.position.set(0, 0.8, 0); stem.rotation.z = 0.2; g.add(stem);
    const leaf = sph(0.13, M(0x3fae3f, { roughness: 0.5 }), 1.6, 0.25, 0.9); leaf.position.set(0.14, 0.84, 0); leaf.rotation.z = 0.5; g.add(leaf);
    return g;
  }
  function makeStrawberry() {
    const g = new THREE.Group();
    const body = sph(0.34, M(0xe8203c, { roughness: 0.4, clearcoat: 0.7 }), 1, 1.2, 1, 40); body.position.y = 0.4; g.add(body);
    const tipM = sph(0.2, M(0xe8203c, { roughness: 0.4, clearcoat: 0.7 }), 0.9, 1, 0.9); tipM.position.y = 0.1; g.add(tipM);
    const seedM = M(0xffe27a, { roughness: 0.5, clearcoat: 0 });
    for (let i = 0; i < 22; i++) {
      const a = i * 2.4, yy = 0.14 + (i % 7) * 0.1; const r = 0.3 * Math.sqrt(Math.max(0.05, 1 - Math.pow((yy - 0.4) / 0.48, 2)));
      const s = sph(0.022, seedM, 1, 1.4, 0.6); s.position.set(Math.cos(a) * r, yy, Math.sin(a) * r); s.lookAt(s.position.clone().multiplyScalar(2)); g.add(s);
    }
    for (let i = 0; i < 5; i++) { const lf = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.26, 8), M(0x3fae3f)); lf.position.set(Math.cos(i * 1.256) * 0.13, 0.82, Math.sin(i * 1.256) * 0.13); lf.rotation.z = Math.cos(i * 1.256) * -1.1; lf.rotation.x = Math.sin(i * 1.256) * 1.1; g.add(lf); }
    return g;
  }
  function makeBanana() {
    const g = new THREE.Group();
    const curve = new THREE.CatmullRomCurve3([V3(-0.55, 0.15, 0), V3(-0.3, -0.02, 0), V3(0.05, -0.06, 0), V3(0.4, 0.02, 0), V3(0.62, 0.22, 0)]);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.14, 20, false), M(0xffd62e, { roughness: 0.4, clearcoat: 0.7 }));
    tube.position.y = 0.3; tube.castShadow = true; g.add(tube);
    const tipA = sph(0.07, M(0x6b4a2a), 1, 1, 1); tipA.position.set(-0.55, 0.45, 0); g.add(tipA);
    const tipB = sph(0.08, M(0x6b4a2a), 1, 1, 1); tipB.position.set(0.62, 0.52, 0); g.add(tipB);
    g.rotation.z = 0.0; return g;
  }
  function makeBall() {
    const g = new THREE.Group();
    const ball = sph(0.42, M(0x2f8fe6, { roughness: 0.3, clearcoat: 0.9 }), 1, 1, 1, 44); ball.position.y = 0.42; g.add(ball);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 12, 40), M(0xffffff, { roughness: 0.3 })); band.position.y = 0.42; band.rotation.x = Math.PI / 2; g.add(band);
    const band2 = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 12, 40), M(0xffffff, { roughness: 0.3 })); band2.position.y = 0.42; g.add(band2);
    return g;
  }
  function makeBucket() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.32, 0.55, 36, 1, true), M(0x2f8fe6, { roughness: 0.35, clearcoat: 0.8, side: THREE.DoubleSide })); body.position.y = 0.3; body.castShadow = true; g.add(body);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.04, 36), M(0x2f8fe6)); base.position.y = 0.03; g.add(base);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 12, 40), M(0x1e6fc0)); rim.rotation.x = Math.PI / 2; rim.position.y = 0.58; g.add(rim);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.34, 0.03, 36), M(0x6fd0ff, { roughness: 0.1, clearcoat: 1 })); water.position.y = 0.46; g.add(water);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.025, 10, 30, Math.PI), M(0x9fb3c8, { metalness: 0.5, roughness: 0.3 })); handle.position.y = 0.58; g.add(handle);
    return g;
  }
  function V3(x, y, z) { return new THREE.Vector3(x, y, z); }

  // sun in the sky (emissive, no lighting)
  function makeSun() {
    const g = new THREE.Group();
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.9, 36, 24), new THREE.MeshBasicMaterial({ color: 0xffd23f })); g.add(core);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(1.25, 36, 24), new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0.35 })); g.add(halo);
    const rays = new THREE.Group();
    for (let i = 0; i < 12; i++) {
      const ray = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.6, 12), new THREE.MeshBasicMaterial({ color: 0xffc61a }));
      const a = i * Math.PI / 6; ray.position.set(Math.cos(a) * 1.55, Math.sin(a) * 1.55, 0); ray.rotation.z = a - Math.PI / 2; rays.add(ray);
    }
    g.add(rays); g.userData.rays = rays; return g;
  }
  // rainbow: three colour arcs (the three colours the episode teaches)
  function makeRainbow() {
    const g = new THREE.Group();
    [[5.2, 0xe0242a], [4.75, 0xffc61a], [4.3, 0x2f8fe6]].forEach(([r, c]) => {
      const arc = new THREE.Mesh(new THREE.TorusGeometry(r, 0.24, 16, 80, Math.PI), new THREE.MeshBasicMaterial({ color: c }));
      g.add(arc);
    });
    return g;
  }


  // garden flower (petal colour + centre colour); faces the camera (+z)
  function makeFlower(petal, center) {
    const g = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.85, 12), M(0x3fae3f, { clearcoat: 0 })); stem.position.y = 0.42; stem.castShadow = true; g.add(stem);
    [-1, 1].forEach((s) => { const lf = sph(0.12, M(0x3fae3f), 1.8, 0.28, 0.8); lf.position.set(s * 0.2, 0.35, 0); lf.rotation.z = s * -0.5; g.add(lf); });
    const pm = M(petal, { roughness: 0.4, clearcoat: 0.6 });
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; const pt = sph(0.13, pm, 1.2, 1.2, 0.55); pt.position.set(Math.cos(a) * 0.25, 0.98 + Math.sin(a) * 0.25, 0); g.add(pt); }
    const c = sph(0.17, M(center, { roughness: 0.4, clearcoat: 0.7 }), 1, 1, 0.8); c.position.set(0, 0.98, 0.05); g.add(c);
    return g;
  }

  KC.World = {makeFlower,  buildGarden, buildTable, makeApple, makeStrawberry, makeBanana, makeBall, makeBucket, makeSun, makeRainbow };
})();
