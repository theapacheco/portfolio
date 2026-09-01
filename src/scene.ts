import * as THREE from "three";

/**
 * The hero background: a sparse field of thin, floating rectangles standing
 * in for individual film frames, drifting slowly in depth with a gentle
 * parallax response to the cursor. Deliberately restrained — this runs
 * behind body copy, so it stays quiet after the opening countdown.
 */
export function initHeroScene(canvas: HTMLCanvasElement) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x14120f, 0.045);

  const camera = new THREE.PerspectiveCamera(
    45,
    canvas.clientWidth / canvas.clientHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 14);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const group = new THREE.Group();
  scene.add(group);

  const FRAME_COUNT = 34;
  const frames: {
    mesh: THREE.Mesh;
    speed: number;
    baseZ: number;
    swing: number;
    phase: number;
  }[] = [];

  const geometry = new THREE.PlaneGeometry(1, 0.5625); // 16:9 "frame"
  const edges = new THREE.EdgesGeometry(geometry);

  for (let i = 0; i < FRAME_COUNT; i++) {
    const material = new THREE.MeshBasicMaterial({
      color: 0xe4362a,
      transparent: true,
      opacity: 0.05 + Math.random() * 0.08,
    });
    const mesh = new THREE.Mesh(geometry, material);

    const lineMat = new THREE.LineBasicMaterial({
      color: 0xe8e3d8,
      transparent: true,
      opacity: 0.06 + Math.random() * 0.1,
    });
    const line = new THREE.LineSegments(edges, lineMat);
    mesh.add(line);

    const scale = 0.6 + Math.random() * 2.2;
    mesh.scale.setScalar(scale);

    const x = (Math.random() - 0.5) * 22;
    const y = (Math.random() - 0.5) * 14;
    const z = -Math.random() * 18;
    mesh.position.set(x, y, z);
    mesh.rotation.z = (Math.random() - 0.5) * 0.3;

    group.add(mesh);
    frames.push({
      mesh,
      speed: 0.15 + Math.random() * 0.35,
      baseZ: z,
      swing: 0.4 + Math.random() * 0.8,
      phase: Math.random() * Math.PI * 2,
    });
  }

  let targetX = 0;
  let targetY = 0;
  let pointerX = 0;
  let pointerY = 0;

  window.addEventListener("pointermove", (e) => {
    pointerX = (e.clientX / window.innerWidth - 0.5) * 2;
    pointerY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  function resize() {
    const { clientWidth, clientHeight } = canvas;
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(clientWidth, clientHeight, false);
  }
  window.addEventListener("resize", resize);
  resize();

  const clock = new THREE.Clock();
  let running = true;

  function tick() {
    if (!running) return;
    const t = clock.getElapsedTime();

    targetX += (pointerX - targetX) * 0.03;
    targetY += (pointerY - targetY) * 0.03;

    group.rotation.y = targetX * 0.08;
    group.rotation.x = -targetY * 0.05;

    for (const f of frames) {
      f.mesh.position.z = f.baseZ + Math.sin(t * f.speed + f.phase) * f.swing;
      f.mesh.rotation.z += 0.0002 * f.speed;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();

  return {
    stop: () => {
      running = false;
    },
  };
}

/**
 * A one-time leader-style countdown drawn on its own canvas, matching the
 * academy-leader circular sweep used to hand off reels between projectors.
 * Runs once on load, then resolves so the caller can dismiss the overlay.
 */
export function playLeaderCountdown(
  canvas: HTMLCanvasElement,
  onDone: () => void
) {
  const ctx = canvas.getContext("2d")!;
  const dpr = Math.min(window.devicePixelRatio, 2);

  function size() {
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size();
  window.addEventListener("resize", size);

  const duration = 2.6; // seconds, ~3 count beats
  const start = performance.now();
  const numbers = ["3", "2", "1"];

  function draw(now: number) {
    const elapsed = (now - start) / 1000;
    const t = Math.min(elapsed / duration, 1);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) * 0.16;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#14120f";
    ctx.fillRect(0, 0, w, h);

    const beat = Math.min(Math.floor(t * numbers.length), numbers.length - 1);
    const beatT = (t * numbers.length) % 1;

    // Circle
    ctx.strokeStyle = "rgba(232,227,216,0.5)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Cross-hairs
    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy + r);
    ctx.stroke();

    // Sweeping wipe arm (the classic leader "clock hand")
    const angle = -Math.PI / 2 + beatT * Math.PI * 2;
    ctx.strokeStyle = "#e4362a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    ctx.stroke();

    // Number
    ctx.fillStyle = "#e8e3d8";
    ctx.font = `${Math.round(r * 0.9)}px 'JetBrains Mono', monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = 1 - beatT * 0.3;
    ctx.fillText(numbers[beat], cx, cy + r * 0.03);
    ctx.globalAlpha = 1;

    if (t < 1) {
      requestAnimationFrame(draw);
    } else {
      onDone();
    }
  }
  requestAnimationFrame(draw);
}
