/* Hero 3D scene (Three.js). Bundled to assets/js/hero3d.js with esbuild:
   NODE_PATH=./node_modules npx esbuild src/hero3d.js --bundle --minify --format=iife --outfile=assets/js/hero3d.js */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, LineSegments, EdgesGeometry,
  IcosahedronGeometry, OctahedronGeometry, TorusKnotGeometry, TorusGeometry, BoxGeometry,
  MeshStandardMaterial, LineBasicMaterial, AmbientLight, DirectionalLight, PointLight, Color, MathUtils
} from "three";

(function () {
  const canvas = document.getElementById("hero-canvas");
  if (!canvas) return;
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  } catch (e) { return; }
  const lowEnd = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, lowEnd ? 1.25 : 2));

  const scene = new Scene();
  const camera = new PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 8);

  scene.add(new AmbientLight(0xffffff, 0.9));
  const sun = new DirectionalLight(0xffffff, 1.6); sun.position.set(4, 5, 6); scene.add(sun);
  const rim = new PointLight(0x0ea5e9, 26, 20); rim.position.set(-4, -2, 3); scene.add(rim);

  const edgeMat = new LineBasicMaterial({ color: 0x0f172a });
  const rig = new Group(); scene.add(rig);

  const core = new Mesh(new IcosahedronGeometry(1.35, 1), new MeshStandardMaterial({ color: 0x38bdf8, flatShading: true, roughness: 0.35, metalness: 0.1 }));
  core.add(new LineSegments(new EdgesGeometry(core.geometry), edgeMat));
  rig.add(core);

  const shell = new LineSegments(new EdgesGeometry(new IcosahedronGeometry(2.05, 1)), new LineBasicMaterial({ color: 0x0369a1 }));
  rig.add(shell);

  function orbiter(geo, color, r, speed, tilt, size) {
    const pivot = new Group(); pivot.rotation.set(tilt, 0, tilt * 0.6);
    const m = new Mesh(geo, new MeshStandardMaterial({ color, flatShading: true, roughness: 0.4 }));
    m.add(new LineSegments(new EdgesGeometry(geo), edgeMat));
    m.scale.setScalar(size); m.position.x = r; pivot.add(m); rig.add(pivot);
    return { pivot, m, speed };
  }
  const orbs = [
    orbiter(new OctahedronGeometry(1), 0x0369a1, 2.9, 0.6, 0.5, 0.36),
    orbiter(new TorusKnotGeometry(0.6, 0.2, 64, 8), 0x64748b, 3.3, -0.45, -0.7, 0.42),
    orbiter(new BoxGeometry(1, 1, 1), 0xffffff, 2.6, 0.8, 1.1, 0.34),
    orbiter(new TorusGeometry(0.7, 0.18, 8, 24), 0x7dd3fc, 3.6, -0.35, 0.2, 0.4)
  ];

  function paintTheme() {
    const dark = root.dataset.theme === "dark";
    edgeMat.color = new Color(dark ? 0x7dd3fc : 0x0f172a);
    core.material.color = new Color(dark ? 0x0369a1 : 0x38bdf8);
  }
  paintTheme(); addEventListener("cc:theme", paintTheme);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight || w;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.position.z = w < 420 ? 11.5 : 9.8; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas); resize();

  const mouse = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  addEventListener("pointermove", (e) => { mouse.x = (e.clientX / innerWidth) * 2 - 1; mouse.y = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });
  addEventListener("deviceorientation", (e) => { if (e.gamma == null) return; mouse.x = MathUtils.clamp(e.gamma / 30, -1, 1); mouse.y = MathUtils.clamp((e.beta - 45) / 30, -1, 1); }, { passive: true });

  let visible = true, raf = 0, t0 = performance.now();
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible && !raf && !reduced) loop(); }).observe(canvas);

  function frame(now) {
    const t = (now - t0) / 1000;
    cur.x += (mouse.x - cur.x) * 0.06; cur.y += (mouse.y - cur.y) * 0.06;
    const sc = Math.min(scrollY / 700, 1.6);
    rig.rotation.y = t * 0.25 + cur.x * 0.7 + sc * 1.4;
    rig.rotation.x = cur.y * 0.4 + sc * 0.3;
    rig.position.y = Math.sin(t * 1.1) * 0.12;
    core.rotation.y = -t * 0.4; shell.rotation.x = t * 0.15; shell.rotation.z = t * 0.1;
    const s = 1 + sc * 0.08; rig.scale.setScalar(s);
    orbs.forEach((o, i) => { o.pivot.rotation.y = t * o.speed; o.m.rotation.x = t * (0.6 + i * 0.2); o.m.rotation.y = t * 0.5; });
    renderer.render(scene, camera);
  }
  function loop(now) { if (!visible || document.hidden) { raf = 0; return; } frame(now || performance.now()); raf = requestAnimationFrame(loop); }
  document.addEventListener("visibilitychange", () => { if (!document.hidden && !raf && !reduced) loop(); });

  root.classList.add("has-webgl");
  if (reduced) frame(t0 + 800); else loop();
})();
