/* The shared stage: renderer, camera, lights, garden, table, Lumo and Gaja. */
(function () {
  KC.createStage = function (canvas, W, H) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(32, W / H, 0.1, 200);

    scene.add(new THREE.HemisphereLight(0xcdeeff, 0x8bd86a, 1.25));
    const key = new THREE.DirectionalLight(0xfff0d8, 2.6);
    key.position.set(-3.5, 8, 8); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -9; key.shadow.camera.right = 9; key.shadow.camera.top = 7; key.shadow.camera.bottom = -3;
    key.shadow.camera.near = 1; key.shadow.camera.far = 35; key.shadow.radius = 5; key.shadow.bias = -0.0004;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xbfe0ff, 0.9); fill.position.set(6, 3, 7); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.8); rim.position.set(0, 4, -8); scene.add(rim);

    KC.World.buildGarden(scene);
    const table = KC.World.buildTable(scene, 0.7);

    const lumo = KC.makeLumo(); lumo.g.position.set(-2.4, 0, 0.2); lumo.g.rotation.y = 0.25; scene.add(lumo.g);
    const gaja = KC.makeGaja(); gaja.g.position.set(3.8, 0, 0.2); gaja.g.rotation.y = -0.35; gaja.g.scale.setScalar(0.95); scene.add(gaja.g);

    cam.position.set(0.7, 2.0, 9.8); cam.lookAt(0.7, 1.5, 0);

    function render() { cam.updateMatrixWorld(); renderer.render(scene, cam); }
    return { renderer, scene, cam, lumo, gaja, table, W, H, render };
  };
})();
