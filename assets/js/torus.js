(function () {
  const canvas = document.getElementById('surface');
  const ctx = canvas.getContext('2d');

  let W, H;

  // Torus parameters
  const R = 8;
  const r = 3.2;
  const NU = 60;
  const NV = 60;
  const SCALE = 28;
  const SPRING = 0.04;
  const PULL_STRENGTH = 5.0;
  const FALLOFF_RADIUS = 20;

  // Per-vertex scalar displacement along normal
  const displace = [];
  for (let i = 0; i <= NU; i++) {
    displace[i] = new Float32Array(NV + 1);
  }

  let autoRotY = 0;
  const rotXBase = 0.45;

  let dragging = false;
  let grabI = -1, grabJ = -1;
  let grabScreenX = 0, grabScreenY = 0;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  function torusRest(u, v) {
    const x = (R + r * Math.cos(v)) * Math.cos(u);
    const y = (R + r * Math.cos(v)) * Math.sin(u);
    const z = r * Math.sin(v);
    return { x, y, z };
  }

  function torusNormal(u, v) {
    const nx = Math.cos(v) * Math.cos(u);
    const ny = Math.cos(v) * Math.sin(u);
    const nz = Math.sin(v);
    return { x: nx, y: ny, z: nz };
  }

  function torusDeformed(i, j) {
    const u = (i / NU) * Math.PI * 2;
    const v = (j / NV) * Math.PI * 2;
    const p = torusRest(u, v);
    const n = torusNormal(u, v);
    const d = displace[i][j];
    return { x: p.x + n.x * d, y: p.y + n.y * d, z: p.z + n.z * d };
  }

  function projectPoint(x, y, z, rotY, rotX) {
    const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
    const x1 = x * cosY + z * sinY;
    const z1 = -x * sinY + z * cosY;

    const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
    const y1 = y * cosX - z1 * sinX;
    const z2 = y * sinX + z1 * cosX;

    return { sx: W / 2 + x1 * SCALE, sy: H / 2 + y1 * SCALE, depth: z2 };
  }

  function findClosest(sx, sy, projected) {
    let bestDist = Infinity, bi = -1, bj = -1;
    for (let i = 0; i <= NU; i += 2) {
      for (let j = 0; j <= NV; j += 2) {
        const p = projected[i][j];
        const dx = p.sx - sx, dy = p.sy - sy;
        const d = dx * dx + dy * dy;
        if (d < bestDist) { bestDist = d; bi = i; bj = j; }
      }
    }
    const iMin = Math.max(0, bi - 2), iMax = Math.min(NU, bi + 2);
    const jMin = Math.max(0, bj - 2), jMax = Math.min(NV, bj + 2);
    for (let i = iMin; i <= iMax; i++) {
      for (let j = jMin; j <= jMax; j++) {
        const p = projected[i][j];
        const dx = p.sx - sx, dy = p.sy - sy;
        const d = dx * dx + dy * dy;
        if (d < bestDist) { bestDist = d; bi = i; bj = j; }
      }
    }
    return { i: bi, j: bj, dist: Math.sqrt(bestDist) };
  }

  function gridDist(i1, j1, i2, j2) {
    let di = Math.abs(i1 - i2);
    if (di > NU / 2) di = NU - di;
    let dj = Math.abs(j1 - j2);
    if (dj > NV / 2) dj = NV - dj;
    return Math.sqrt(di * di + dj * dj);
  }

  function normalScreenDir(i, j, rotY, rotX) {
    const u = (i / NU) * Math.PI * 2;
    const v = (j / NV) * Math.PI * 2;
    const n = torusNormal(u, v);
    const p0 = projectPoint(0, 0, 0, rotY, rotX);
    const p1 = projectPoint(n.x, n.y, n.z, rotY, rotX);
    const dx = p1.sx - p0.sx;
    const dy = p1.sy - p0.sy;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.001) return { x: 0, y: -1 };
    return { x: dx / len, y: dy / len };
  }

  let lastProjected = null;

  canvas.addEventListener('mousedown', function (e) {
    if (!lastProjected) return;
    const hit = findClosest(e.clientX, e.clientY, lastProjected);
    if (hit.dist < 80) {
      dragging = true;
      grabI = hit.i;
      grabJ = hit.j;
      grabScreenX = e.clientX;
      grabScreenY = e.clientY;
      canvas.style.cursor = 'grabbing';
    }
  });

  window.addEventListener('mousemove', function (e) {
    if (!dragging) return;
    const nDir = normalScreenDir(grabI, grabJ, autoRotY, rotXBase);
    const dsx = e.clientX - grabScreenX;
    const dsy = e.clientY - grabScreenY;
    const scalar = (dsx * nDir.x + dsy * nDir.y) / SCALE * PULL_STRENGTH;

    for (let i = 0; i <= NU; i++) {
      for (let j = 0; j <= NV; j++) {
        const gd = gridDist(i, j, grabI, grabJ);
        const weight = Math.exp(-(gd * gd) / (FALLOFF_RADIUS * FALLOFF_RADIUS / 3));
        displace[i][j] = scalar * weight;
      }
    }
  });

  window.addEventListener('mouseup', function () {
    dragging = false;
    grabI = -1;
    grabJ = -1;
    canvas.style.cursor = 'default';
  });

  function draw() {
    ctx.clearRect(0, 0, W, H);

    if (!dragging) {
      autoRotY += 0.003;
    }

    if (!dragging) {
      for (let i = 0; i <= NU; i++) {
        for (let j = 0; j <= NV; j++) {
          displace[i][j] *= (1 - SPRING);
        }
      }
    }

    const rotY = autoRotY;
    const rotX = rotXBase;
    const points = [];

    for (let i = 0; i <= NU; i++) {
      points[i] = [];
      for (let j = 0; j <= NV; j++) {
        const p = torusDeformed(i, j);
        points[i][j] = projectPoint(p.x, p.y, p.z, rotY, rotX);
      }
    }

    lastProjected = points;

    for (let i = 0; i <= NU; i++) {
      for (let j = 0; j < NV; j++) {
        drawEdge(points[i][j], points[i][j + 1]);
      }
    }
    for (let j = 0; j <= NV; j++) {
      for (let i = 0; i < NU; i++) {
        drawEdge(points[i][j], points[i + 1][j]);
      }
    }

    requestAnimationFrame(draw);
  }

  function drawEdge(a, b) {
    const avgDepth = (a.depth + b.depth) / 2;
    const t = (avgDepth + r + R) / (2 * (r + R));
    const alpha = 0.06 + 0.4 * Math.max(0, Math.min(1, t));
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(b.sx, b.sy);
    ctx.strokeStyle = `rgba(0, 212, 255, ${alpha})`;
    ctx.lineWidth = 0.4 + alpha * 1.0;
    ctx.stroke();
  }

  draw();
})();
