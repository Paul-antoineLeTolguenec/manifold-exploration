// ============================================================
// Chapter 8: Manifold Learning — Visualizations
// ============================================================

(function () {
  'use strict';

  var CYAN = 'rgba(0, 212, 255, ';
  var ORANGE = 'rgba(255, 140, 50, ';
  var RED = 'rgba(255, 80, 80, ';
  var GREEN = 'rgba(50, 255, 140, ';
  var TEXT_COLOR = '#7a8fa6';
  var LABEL_FONT = '11px "JetBrains Mono", monospace';
  var SMALL_FONT = '10px "JetBrains Mono", monospace';

  // ── Shared 3D helpers ──

  function rotateY(p, a) {
    var c = Math.cos(a), s = Math.sin(a);
    return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
  }

  function rotateX(p, a) {
    var c = Math.cos(a), s = Math.sin(a);
    return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
  }

  function project(p, cx, cy, scale) {
    return { sx: cx + p.x * scale, sy: cy + p.y * scale, depth: p.z };
  }

  function initCanvas(id, aspectRatio) {
    var canvas = document.getElementById(id);
    if (!canvas) return null;
    var ctx = canvas.getContext('2d');
    var container = canvas.parentElement;
    var ar = aspectRatio || 0.55;
    var visible = false;
    function resize() {
      var rect = container.getBoundingClientRect();
      var dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = Math.max(400, rect.width * ar) * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = Math.max(400, rect.width * ar) + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);
    var observer = new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
    }, { rootMargin: '200px' });
    observer.observe(canvas);
    return {
      canvas: canvas, ctx: ctx,
      width: function () { return canvas.width / (window.devicePixelRatio || 1); },
      height: function () { return canvas.height / (window.devicePixelRatio || 1); },
      isVisible: function () { return visible; }
    };
  }

  // ── Seeded RNG (mulberry32) ──
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // ── Swiss roll data generation ──
  var rng = mulberry32(42);
  var N_PTS = 150;
  var T_MIN = 1.5 * Math.PI;
  var T_MAX = 4.5 * Math.PI;
  var H_MAX = 12;
  var pts = [];
  for (var i = 0; i < N_PTS; i++) {
    var t = T_MIN + rng() * (T_MAX - T_MIN);
    var h = rng() * H_MAX;
    pts.push({ t: t, h: h, x: t * Math.cos(t), y: h, z: t * Math.sin(t), idx: i });
  }

  // Center and bounding extent
  var cx3d = 0, cy3d = 0, cz3d = 0;
  for (var i = 0; i < N_PTS; i++) { cx3d += pts[i].x; cy3d += pts[i].y; cz3d += pts[i].z; }
  cx3d /= N_PTS; cy3d /= N_PTS; cz3d /= N_PTS;
  var maxExt = 0;
  for (var i = 0; i < N_PTS; i++) {
    maxExt = Math.max(maxExt,
      Math.abs(pts[i].x - cx3d), Math.abs(pts[i].y - cy3d), Math.abs(pts[i].z - cz3d));
  }

  // ── Color mapping ──
  function rollColor(tVal, alpha) {
    var f = (tVal - T_MIN) / (T_MAX - T_MIN);
    return 'rgba(' + Math.round(f * 255) + ',' + Math.round(212 - f * 72) + ',' +
      Math.round(255 - f * 205) + ',' + alpha + ')';
  }

  function eigenColor(val, alpha) {
    // Diverging: negative → cyan, zero → gray, positive → orange
    var r, g, b;
    if (val >= 0) {
      r = Math.round(40 + val * 215); g = Math.round(50 + val * 90); b = Math.round(60 - val * 10);
    } else {
      var f = -val;
      r = Math.round(40 - f * 40); g = Math.round(50 + f * 162); b = Math.round(60 + f * 195);
    }
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  // ── k-NN graph (symmetric) ──
  function buildKNN(data, k) {
    var n = data.length;
    var adj = [];
    for (var i = 0; i < n; i++) adj[i] = [];
    for (var i = 0; i < n; i++) {
      var dists = [];
      for (var j = 0; j < n; j++) {
        if (j === i) continue;
        var dx = data[i].x - data[j].x, dy = data[i].y - data[j].y, dz = data[i].z - data[j].z;
        dists.push({ idx: j, d: Math.sqrt(dx * dx + dy * dy + dz * dz) });
      }
      dists.sort(function (a, b) { return a.d - b.d; });
      for (var m = 0; m < Math.min(k, dists.length); m++) {
        adj[i].push({ v: dists[m].idx, w: dists[m].d });
      }
    }
    // Symmetrize
    for (var i = 0; i < n; i++) {
      for (var m = 0; m < adj[i].length; m++) {
        var j = adj[i][m].v, w = adj[i][m].w;
        var found = false;
        for (var p = 0; p < adj[j].length; p++) { if (adj[j][p].v === i) { found = true; break; } }
        if (!found) adj[j].push({ v: i, w: w });
      }
    }
    return adj;
  }

  // ── Dijkstra shortest path ──
  function dijkstra(adj, src) {
    var n = adj.length;
    var dist = [], prev = [], visited = [];
    for (var i = 0; i < n; i++) { dist[i] = Infinity; prev[i] = -1; visited[i] = false; }
    dist[src] = 0;
    for (var step = 0; step < n; step++) {
      var u = -1;
      for (var v = 0; v < n; v++) {
        if (!visited[v] && (u === -1 || dist[v] < dist[u])) u = v;
      }
      if (u === -1 || dist[u] === Infinity) break;
      visited[u] = true;
      for (var m = 0; m < adj[u].length; m++) {
        var e = adj[u][m], alt = dist[u] + e.w;
        if (alt < dist[e.v]) { dist[e.v] = alt; prev[e.v] = u; }
      }
    }
    return { dist: dist, prev: prev };
  }

  function reconstructPath(prev, target) {
    var path = [], cur = target;
    while (cur !== -1) { path.unshift(cur); cur = prev[cur]; }
    return path;
  }

  // ── Graph Laplacian & eigenvectors ──
  function computeLaplacian(adj, n, sigma) {
    var W = [], D = [];
    for (var i = 0; i < n; i++) { W[i] = new Float64Array(n); D[i] = 0; }
    for (var i = 0; i < n; i++) {
      for (var m = 0; m < adj[i].length; m++) {
        var j = adj[i][m].v, d = adj[i][m].w;
        var w = Math.exp(-d * d / (2 * sigma * sigma));
        W[i][j] = Math.max(W[i][j], w);
      }
    }
    for (var i = 0; i < n; i++) { for (var j = i + 1; j < n; j++) {
      var s = Math.max(W[i][j], W[j][i]); W[i][j] = s; W[j][i] = s;
    }}
    for (var i = 0; i < n; i++) { for (var j = 0; j < n; j++) D[i] += W[i][j]; }
    var L = [];
    for (var i = 0; i < n; i++) {
      L[i] = new Float64Array(n);
      for (var j = 0; j < n; j++) L[i][j] = (i === j ? D[i] : 0) - W[i][j];
    }
    return L;
  }

  function computeEigenvectors(L, numVecs) {
    var n = L.length;
    var lambdaMax = 0;
    for (var i = 0; i < n; i++) lambdaMax = Math.max(lambdaMax, L[i][i]);
    lambdaMax *= 1.1;

    function matVecS(v) {
      var r = new Float64Array(n);
      for (var i = 0; i < n; i++) {
        var s = lambdaMax * v[i];
        for (var j = 0; j < n; j++) s -= L[i][j] * v[j];
        r[i] = s;
      }
      return r;
    }
    function normalize(v) {
      var norm = 0;
      for (var i = 0; i < n; i++) norm += v[i] * v[i];
      norm = Math.sqrt(norm);
      if (norm > 1e-12) for (var i = 0; i < n; i++) v[i] /= norm;
      return v;
    }
    function orthogonalize(v, vecs) {
      for (var k = 0; k < vecs.length; k++) {
        var d = 0;
        for (var i = 0; i < n; i++) d += v[i] * vecs[k][i];
        for (var i = 0; i < n; i++) v[i] -= d * vecs[k][i];
      }
      return v;
    }

    var rngL = mulberry32(123);
    var eigvecs = [];
    for (var k = 0; k < numVecs; k++) {
      var v = new Float64Array(n);
      for (var i = 0; i < n; i++) v[i] = rngL() - 0.5;
      normalize(v);
      for (var iter = 0; iter < 120; iter++) {
        v = matVecS(v); orthogonalize(v, eigvecs); normalize(v);
      }
      eigvecs.push(v);
    }
    return eigvecs; // [0] = constant, [1] = Fiedler, etc.
  }

  // ── Geodesic path on Swiss roll (linear in parameter space) ──
  function geodesicPath(pA, pB, nSteps) {
    var path = [];
    for (var i = 0; i <= nSteps; i++) {
      var s = i / nSteps;
      var t = pA.t + s * (pB.t - pA.t), h = pA.h + s * (pB.h - pA.h);
      path.push({ x: t * Math.cos(t), y: h, z: t * Math.sin(t) });
    }
    return path;
  }

  // ── Find closest point to screen position ──
  function findClosest(screenPts, mx, my, threshold) {
    var best = -1, bestD = threshold * threshold;
    for (var i = 0; i < screenPts.length; i++) {
      var dx = screenPts[i].sx - mx, dy = screenPts[i].sy - my, d2 = dx * dx + dy * dy;
      if (d2 < bestD) { bestD = d2; best = i; }
    }
    return best;
  }

  // ── Canvas button helpers ──
  function drawButton(ctx, x, y, w, h, label, active) {
    ctx.fillStyle = active ? CYAN + '0.25)' : 'rgba(255,255,255,0.05)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = CYAN + '0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = active ? CYAN + '0.9)' : TEXT_COLOR;
    ctx.font = SMALL_FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  function hitTest(mx, my, bx, by, bw, bh) {
    return mx >= bx && mx <= bx + bw && my >= by && my <= by + bh;
  }


  // ════════════════════════════════════════════════════════════
  // Viz 1: Swiss Roll — Euclidean vs. Geodesic Distance
  // ════════════════════════════════════════════════════════════
  (function () {
    var c = initCanvas('ch8-swissroll', 0.55);
    if (!c) return;
    var ctx = c.ctx;
    var rotYA = 0.6, rotXA = 0.3;
    var dragging = false, dsx, dsy, drY, drX, justDragged = false;
    var selA = -1, selB = -1;
    var blend = 0, blendTarget = 0;

    c.canvas.addEventListener('mousedown', function (e) {
      var r = c.canvas.getBoundingClientRect();
      dsx = e.clientX - r.left; dsy = e.clientY - r.top;
      drY = rotYA; drX = rotXA; dragging = true; justDragged = false;
    });
    c.canvas.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var r = c.canvas.getBoundingClientRect();
      var dx = (e.clientX - r.left) - dsx, dy = (e.clientY - r.top) - dsy;
      if (Math.abs(dx) + Math.abs(dy) > 3) justDragged = true;
      rotYA = drY + dx * 0.01;
      rotXA = Math.max(-1.2, Math.min(1.2, drX + dy * 0.01));
    });
    c.canvas.addEventListener('mouseup', function (e) {
      dragging = false;
      if (justDragged) return;
      var r = c.canvas.getBoundingClientRect();
      var mx = e.clientX - r.left, my = e.clientY - r.top;
      var W = c.width(), H = c.height();
      // Toggle button
      if (hitTest(mx, my, W - 85, 10, 75, 24)) {
        blendTarget = blendTarget < 0.5 ? 1 : 0; return;
      }
      // Point selection
      var sp = computeScreen(W, H);
      var idx = findClosest(sp, mx, my, 18);
      if (idx >= 0) {
        if (selA < 0) selA = idx;
        else if (selB < 0) selB = idx;
        else { selA = idx; selB = -1; }
      }
    });

    function computeScreen(W, H) {
      var scl = Math.min(W, H) * 0.32 / maxExt;
      var cxs = W / 2, cys = H / 2;
      var margin = 50;
      var res = [];
      for (var i = 0; i < N_PTS; i++) {
        var p = pts[i];
        var p3 = { x: p.x - cx3d, y: -(p.y - cy3d), z: p.z - cz3d };
        p3 = rotateY(p3, rotYA); p3 = rotateX(p3, rotXA);
        var proj = project(p3, cxs, cys, scl);
        var ux = margin + ((p.t - T_MIN) / (T_MAX - T_MIN)) * (W - 2 * margin);
        var uy = margin + 15 + (1 - p.h / H_MAX) * (H - 2 * margin - 35);
        res.push({
          sx: proj.sx * (1 - blend) + ux * blend,
          sy: proj.sy * (1 - blend) + uy * blend,
          depth: proj.depth * (1 - blend), idx: i
        });
      }
      return res;
    }

    function project3D(gp, W, H) {
      var scl = Math.min(W, H) * 0.32 / maxExt;
      var p3 = { x: gp.x - cx3d, y: -(gp.y - cy3d), z: gp.z - cz3d };
      p3 = rotateY(p3, rotYA); p3 = rotateX(p3, rotXA);
      return project(p3, W / 2, H / 2, scl);
    }

    function draw() {
      requestAnimationFrame(draw);
      if (!c.isVisible()) return;
      blend += (blendTarget - blend) * 0.08;
      if (Math.abs(blend - blendTarget) < 0.001) blend = blendTarget;

      var W = c.width(), H = c.height();
      ctx.clearRect(0, 0, W, H);
      var sp = computeScreen(W, H);
      var sorted = sp.slice().sort(function (a, b) { return a.depth - b.depth; });
      var margin = 50;

      // Draw geodesic path and Euclidean line
      if (selA >= 0 && selB >= 0) {
        var pA = pts[selA], pB = pts[selB];
        var gPath = geodesicPath(pA, pB, 60);
        // Geodesic path (green)
        ctx.beginPath();
        for (var i = 0; i < gPath.length; i++) {
          var proj = project3D(gPath[i], W, H);
          var gt = pA.t + (i / 60) * (pB.t - pA.t);
          var gh = pA.h + (i / 60) * (pB.h - pA.h);
          var ux = margin + ((gt - T_MIN) / (T_MAX - T_MIN)) * (W - 2 * margin);
          var uy = margin + 15 + (1 - gh / H_MAX) * (H - 2 * margin - 35);
          var gsx = proj.sx * (1 - blend) + ux * blend;
          var gsy = proj.sy * (1 - blend) + uy * blend;
          if (i === 0) ctx.moveTo(gsx, gsy); else ctx.lineTo(gsx, gsy);
        }
        ctx.strokeStyle = GREEN + '0.8)'; ctx.lineWidth = 2.5; ctx.stroke();
        // Euclidean line (red dashed)
        ctx.beginPath(); ctx.setLineDash([6, 4]);
        ctx.moveTo(sp[selA].sx, sp[selA].sy); ctx.lineTo(sp[selB].sx, sp[selB].sy);
        ctx.strokeStyle = RED + '0.7)'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
      }

      // Draw points
      for (var i = 0; i < sorted.length; i++) {
        var pt = sorted[i], p = pts[pt.idx];
        var alpha = blend > 0.5 ? 0.85 : 0.4 + 0.5 * Math.max(0, Math.min(1, (pt.depth / (maxExt * 0.35) + 1) / 2));
        var rad = (pt.idx === selA || pt.idx === selB) ? 5.5 : 3;
        var col = (pt.idx === selA) ? GREEN + alpha + ')'
          : (pt.idx === selB) ? ORANGE + alpha + ')'
          : rollColor(p.t, alpha);
        ctx.beginPath(); ctx.arc(pt.sx, pt.sy, rad, 0, Math.PI * 2);
        ctx.fillStyle = col; ctx.fill();
      }

      // Distance labels
      if (selA >= 0 && selB >= 0) {
        var pA = pts[selA], pB = pts[selB];
        var euclD = Math.sqrt((pA.x - pB.x) ** 2 + (pA.y - pB.y) ** 2 + (pA.z - pB.z) ** 2);
        var gPath = geodesicPath(pA, pB, 60), geoD = 0;
        for (var i = 1; i < gPath.length; i++) {
          geoD += Math.sqrt((gPath[i].x - gPath[i - 1].x) ** 2 + (gPath[i].y - gPath[i - 1].y) ** 2 + (gPath[i].z - gPath[i - 1].z) ** 2);
        }
        ctx.font = LABEL_FONT;
        ctx.fillStyle = RED + '0.9)'; ctx.fillText('Euclidean: ' + euclD.toFixed(1), 15, H - 35);
        ctx.fillStyle = GREEN + '0.9)'; ctx.fillText('Geodesic:  ' + geoD.toFixed(1), 15, H - 18);
      } else {
        ctx.font = SMALL_FONT; ctx.fillStyle = TEXT_COLOR;
        ctx.fillText('Click two points to compare distances', 15, H - 18);
      }

      // 2D axes labels (when unrolled)
      if (blend > 0.3) {
        ctx.globalAlpha = Math.min(1, (blend - 0.3) / 0.4);
        ctx.font = SMALL_FONT; ctx.fillStyle = TEXT_COLOR;
        ctx.textAlign = 'center';
        ctx.fillText('t (arc length)', W / 2, H - 5);
        ctx.save(); ctx.translate(15, H / 2); ctx.rotate(-Math.PI / 2);
        ctx.fillText('h (height)', 0, 0); ctx.restore();
        ctx.textAlign = 'left';
        ctx.globalAlpha = 1;
      }

      // Toggle button and title
      drawButton(ctx, W - 85, 10, 75, 24, blendTarget < 0.5 ? 'Unroll' : '3D view', false);
      ctx.font = LABEL_FONT; ctx.fillStyle = TEXT_COLOR;
      ctx.fillText('Swiss roll' + (blend < 0.5 ? ' — drag to rotate' : ' — unrolled view'), 15, 22);
    }
    draw();
  })();


  // ════════════════════════════════════════════════════════════
  // Viz 2: ISOMAP Pipeline — k-NN Graph + Shortest Path
  // ════════════════════════════════════════════════════════════
  (function () {
    var c = initCanvas('ch8-isomap', 0.55);
    if (!c) return;
    var ctx = c.ctx;
    var kVal = 6;
    var adj = buildKNN(pts, kVal);
    var rotYA = 0.6, rotXA = 0.3;
    var dragging = false, dsx, dsy, drY, drX, justDragged = false;

    // Pre-select two points close in 3D but far on manifold
    var selA = 0, selB = 0, bestRatio = 0;
    for (var i = 0; i < N_PTS; i++) {
      for (var j = i + 1; j < N_PTS; j++) {
        var dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, dz = pts[i].z - pts[j].z;
        var eucl = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (eucl < maxExt * 0.35 && eucl > 1) {
          var ratio = Math.abs(pts[i].t - pts[j].t) / eucl;
          if (ratio > bestRatio) { bestRatio = ratio; selA = i; selB = j; }
        }
      }
    }
    var pathRes = dijkstra(adj, selA);
    var shortPath = reconstructPath(pathRes.prev, selB);

    function recompute() {
      adj = buildKNN(pts, kVal);
      pathRes = dijkstra(adj, selA);
      shortPath = reconstructPath(pathRes.prev, selB);
    }

    c.canvas.addEventListener('mousedown', function (e) {
      var r = c.canvas.getBoundingClientRect();
      dsx = e.clientX - r.left; dsy = e.clientY - r.top;
      drY = rotYA; drX = rotXA; dragging = true; justDragged = false;
    });
    c.canvas.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var r = c.canvas.getBoundingClientRect();
      var mx = e.clientX - r.left;
      if (dsx < c.width() * 0.5) {
        var dx = mx - dsx, dy = (e.clientY - r.top) - dsy;
        if (Math.abs(dx) + Math.abs(dy) > 3) justDragged = true;
        rotYA = drY + dx * 0.01;
        rotXA = Math.max(-1.2, Math.min(1.2, drX + dy * 0.01));
      }
    });
    c.canvas.addEventListener('mouseup', function (e) {
      dragging = false;
      if (justDragged) return;
      var r = c.canvas.getBoundingClientRect();
      var mx = e.clientX - r.left, my = e.clientY - r.top;
      var W = c.width(), H = c.height();
      // k buttons
      var kbY = H - 32;
      if (hitTest(mx, my, W * 0.5 + 15, kbY, 24, 22) && kVal > 2) { kVal--; recompute(); return; }
      if (hitTest(mx, my, W * 0.5 + 105, kbY, 24, 22) && kVal < 15) { kVal++; recompute(); return; }
      // Point selection (left panel)
      if (mx < W * 0.5) {
        var sp = compute3D(W, H);
        var idx = findClosest(sp, mx, my, 18);
        if (idx >= 0 && idx !== selA) {
          selB = idx;
          pathRes = dijkstra(adj, selA);
          shortPath = reconstructPath(pathRes.prev, selB);
        }
      }
    });

    function compute3D(W, H) {
      var lw = W * 0.48, scl = Math.min(lw, H) * 0.32 / maxExt;
      var cxs = lw / 2, cys = H / 2;
      var res = [];
      for (var i = 0; i < N_PTS; i++) {
        var p = pts[i];
        var p3 = { x: p.x - cx3d, y: -(p.y - cy3d), z: p.z - cz3d };
        p3 = rotateY(p3, rotYA); p3 = rotateX(p3, rotXA);
        var proj = project(p3, cxs, cys, scl);
        res.push({ sx: proj.sx, sy: proj.sy, depth: proj.depth, idx: i });
      }
      return res;
    }

    function compute2D(W, H) {
      var m = 25, ox = W * 0.52 + m, ow = W * 0.48 - 2 * m;
      var oy = m + 15, oh = H - 2 * m - 45;
      var res = [];
      for (var i = 0; i < N_PTS; i++) {
        var p = pts[i];
        res.push({
          sx: ox + ((p.t - T_MIN) / (T_MAX - T_MIN)) * ow,
          sy: oy + (1 - p.h / H_MAX) * oh, idx: i
        });
      }
      return res;
    }

    function draw() {
      requestAnimationFrame(draw);
      if (!c.isVisible()) return;
      var W = c.width(), H = c.height();
      ctx.clearRect(0, 0, W, H);

      // Divider
      ctx.beginPath(); ctx.moveTo(W * 0.5, 30); ctx.lineTo(W * 0.5, H - 40);
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1; ctx.stroke();

      var s3 = compute3D(W, H), s2 = compute2D(W, H);

      // Graph edges
      ctx.lineWidth = 0.4;
      for (var i = 0; i < N_PTS; i++) {
        for (var m = 0; m < adj[i].length; m++) {
          var j = adj[i][m].v;
          if (j <= i) continue;
          ctx.beginPath(); ctx.moveTo(s3[i].sx, s3[i].sy); ctx.lineTo(s3[j].sx, s3[j].sy);
          ctx.strokeStyle = CYAN + '0.08)'; ctx.stroke();
          ctx.beginPath(); ctx.moveTo(s2[i].sx, s2[i].sy); ctx.lineTo(s2[j].sx, s2[j].sy);
          ctx.strokeStyle = CYAN + '0.08)'; ctx.stroke();
        }
      }

      // Shortest path
      var connected = shortPath.length > 1 && pathRes.dist[selB] < Infinity;
      if (connected) {
        ctx.lineWidth = 2.5; ctx.strokeStyle = ORANGE + '0.9)';
        ctx.beginPath();
        for (var i = 0; i < shortPath.length; i++) {
          var sp = s3[shortPath[i]];
          if (i === 0) ctx.moveTo(sp.sx, sp.sy); else ctx.lineTo(sp.sx, sp.sy);
        }
        ctx.stroke();
        ctx.beginPath();
        for (var i = 0; i < shortPath.length; i++) {
          var sp = s2[shortPath[i]];
          if (i === 0) ctx.moveTo(sp.sx, sp.sy); else ctx.lineTo(sp.sx, sp.sy);
        }
        ctx.stroke();
        // Euclidean line (red dashed)
        ctx.beginPath(); ctx.setLineDash([5, 3]); ctx.lineWidth = 1.5;
        ctx.moveTo(s3[selA].sx, s3[selA].sy); ctx.lineTo(s3[selB].sx, s3[selB].sy);
        ctx.strokeStyle = RED + '0.5)'; ctx.stroke(); ctx.setLineDash([]);
      }

      // Points
      for (var i = 0; i < N_PTS; i++) {
        var p = pts[i], col = rollColor(p.t, 0.8), rad = 2.5;
        if (i === selA || i === selB) { rad = 5; col = (i === selA ? GREEN + '1)' : ORANGE + '1)'); }
        ctx.beginPath(); ctx.arc(s3[i].sx, s3[i].sy, rad, 0, Math.PI * 2);
        ctx.fillStyle = col; ctx.fill();
        ctx.beginPath(); ctx.arc(s2[i].sx, s2[i].sy, rad, 0, Math.PI * 2);
        ctx.fillStyle = col; ctx.fill();
      }

      // Labels
      ctx.font = LABEL_FONT; ctx.fillStyle = TEXT_COLOR; ctx.textAlign = 'center';
      ctx.fillText('Ambient space + k-NN graph', W * 0.25, 18);
      ctx.fillText('Embedding \u2248 unrolled coordinates', W * 0.75, 18);
      ctx.textAlign = 'left';

      // Distance info
      if (connected) {
        var dx = pts[selA].x - pts[selB].x, dy = pts[selA].y - pts[selB].y, dz = pts[selA].z - pts[selB].z;
        ctx.font = SMALL_FONT;
        ctx.fillStyle = RED + '0.9)';
        ctx.fillText('\u2016x\u2080\u2212x\u2081\u2016 = ' + Math.sqrt(dx * dx + dy * dy + dz * dz).toFixed(1), 10, H - 38);
        ctx.fillStyle = ORANGE + '0.9)';
        ctx.fillText('d_G = ' + pathRes.dist[selB].toFixed(1), 10, H - 22);
      } else if (shortPath.length <= 1) {
        ctx.font = SMALL_FONT; ctx.fillStyle = RED + '0.7)';
        ctx.fillText('Graph disconnected! Increase k.', 10, H - 22);
      }

      // k controls
      var kbY = H - 32;
      drawButton(ctx, W * 0.5 + 15, kbY, 24, 22, '\u2212', false);
      ctx.font = LABEL_FONT; ctx.fillStyle = CYAN + '0.9)'; ctx.textAlign = 'center';
      ctx.fillText('k = ' + kVal, W * 0.5 + 72, kbY + 15);
      ctx.textAlign = 'left';
      drawButton(ctx, W * 0.5 + 105, kbY, 24, 22, '+', false);
    }
    draw();
  })();


  // ════════════════════════════════════════════════════════════
  // Viz 3: Spectral Methods — Laplacian Eigenmaps
  // ════════════════════════════════════════════════════════════
  (function () {
    var c = initCanvas('ch8-spectral', 0.55);
    if (!c) return;
    var ctx = c.ctx;

    // Compute graph Laplacian and eigenvectors
    var kG = 8;
    var adjS = buildKNN(pts, kG);
    var nnDists = [];
    for (var i = 0; i < N_PTS; i++) { if (adjS[i].length > 0) nnDists.push(adjS[i][0].w); }
    nnDists.sort(function (a, b) { return a - b; });
    var sigma = nnDists[Math.floor(nnDists.length / 2)] || 1;
    var L = computeLaplacian(adjS, N_PTS, sigma);
    var eigvecs = computeEigenvectors(L, 6);

    var eigenIdx = 1; // 0 = constant (trivial), 1 = Fiedler
    var rotYA = 0.6, rotXA = 0.3;
    var dragging = false, dsx, dsy, drY, drX, justDragged = false;
    var blend = 0, blendTarget = 0;

    c.canvas.addEventListener('mousedown', function (e) {
      var r = c.canvas.getBoundingClientRect();
      dsx = e.clientX - r.left; dsy = e.clientY - r.top;
      drY = rotYA; drX = rotXA; dragging = true; justDragged = false;
    });
    c.canvas.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var r = c.canvas.getBoundingClientRect();
      var dx = (e.clientX - r.left) - dsx, dy = (e.clientY - r.top) - dsy;
      if (Math.abs(dx) + Math.abs(dy) > 3) justDragged = true;
      rotYA = drY + dx * 0.01;
      rotXA = Math.max(-1.2, Math.min(1.2, drX + dy * 0.01));
    });
    c.canvas.addEventListener('mouseup', function (e) {
      dragging = false;
      if (justDragged) return;
      var r = c.canvas.getBoundingClientRect();
      var mx = e.clientX - r.left, my = e.clientY - r.top;
      var W = c.width(), H = c.height();
      // Toggle
      if (hitTest(mx, my, W - 90, 10, 80, 24)) { blendTarget = blendTarget < 0.5 ? 1 : 0; return; }
      // Eigen index buttons
      var ebY = H - 32;
      if (hitTest(mx, my, 20, ebY, 24, 22) && eigenIdx > 1) { eigenIdx--; return; }
      if (hitTest(mx, my, 150, ebY, 24, 22) && eigenIdx < eigvecs.length - 1) { eigenIdx++; return; }
    });

    function draw() {
      requestAnimationFrame(draw);
      if (!c.isVisible()) return;
      blend += (blendTarget - blend) * 0.08;
      if (Math.abs(blend - blendTarget) < 0.001) blend = blendTarget;

      var W = c.width(), H = c.height();
      ctx.clearRect(0, 0, W, H);

      var ev = eigvecs[eigenIdx];
      var evAbs = 0;
      for (var i = 0; i < N_PTS; i++) evAbs = Math.max(evAbs, Math.abs(ev[i]));
      if (evAbs < 1e-12) evAbs = 1;

      // Embedding coords from eigvecs[1] and eigvecs[2]
      var ev1 = eigvecs[1], ev2 = eigvecs.length > 2 ? eigvecs[2] : eigvecs[1];
      var e1Min = Infinity, e1Max = -Infinity, e2Min = Infinity, e2Max = -Infinity;
      for (var i = 0; i < N_PTS; i++) {
        e1Min = Math.min(e1Min, ev1[i]); e1Max = Math.max(e1Max, ev1[i]);
        e2Min = Math.min(e2Min, ev2[i]); e2Max = Math.max(e2Max, ev2[i]);
      }
      var e1Range = e1Max - e1Min || 1, e2Range = e2Max - e2Min || 1;

      var scl = Math.min(W, H) * 0.32 / maxExt;
      var margin = 55;
      var drawPts = [];
      for (var i = 0; i < N_PTS; i++) {
        var p = pts[i];
        var p3 = { x: p.x - cx3d, y: -(p.y - cy3d), z: p.z - cz3d };
        p3 = rotateY(p3, rotYA); p3 = rotateX(p3, rotXA);
        var proj = project(p3, W / 2, H / 2, scl);
        var ex = margin + ((ev1[i] - e1Min) / e1Range) * (W - 2 * margin);
        var ey = margin + 10 + (1 - (ev2[i] - e2Min) / e2Range) * (H - 2 * margin - 50);
        drawPts.push({
          sx: proj.sx * (1 - blend) + ex * blend,
          sy: proj.sy * (1 - blend) + ey * blend,
          depth: proj.depth * (1 - blend),
          val: ev[i] / evAbs, idx: i
        });
      }
      drawPts.sort(function (a, b) { return a.depth - b.depth; });

      // Draw graph edges faintly
      if (blend < 0.7) {
        var sp3d = [];
        for (var i = 0; i < N_PTS; i++) {
          var p = pts[i];
          var p3 = { x: p.x - cx3d, y: -(p.y - cy3d), z: p.z - cz3d };
          p3 = rotateY(p3, rotYA); p3 = rotateX(p3, rotXA);
          sp3d.push(project(p3, W / 2, H / 2, scl));
        }
        ctx.lineWidth = 0.3;
        for (var i = 0; i < N_PTS; i++) {
          for (var m = 0; m < adjS[i].length; m++) {
            var j = adjS[i][m].v;
            if (j <= i) continue;
            ctx.beginPath(); ctx.moveTo(sp3d[i].sx, sp3d[i].sy); ctx.lineTo(sp3d[j].sx, sp3d[j].sy);
            ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.stroke();
          }
        }
      }

      // Draw points
      for (var i = 0; i < drawPts.length; i++) {
        var dp = drawPts[i];
        var alpha = blend > 0.5 ? 0.9 : 0.4 + 0.5 * Math.max(0, Math.min(1, (dp.depth / (maxExt * 0.35) + 1) / 2));
        ctx.beginPath(); ctx.arc(dp.sx, dp.sy, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = eigenColor(dp.val, alpha); ctx.fill();
      }

      // Toggle
      drawButton(ctx, W - 90, 10, 80, 24, blendTarget < 0.5 ? 'Eigenmap' : '3D view', false);

      // Eigen index selector
      var ebY = H - 32;
      drawButton(ctx, 20, ebY, 24, 22, '\u25C0', false);
      ctx.font = LABEL_FONT; ctx.fillStyle = CYAN + '0.9)'; ctx.textAlign = 'center';
      ctx.fillText('\u03C6' + eigenIdx, 97, ebY + 15);
      ctx.textAlign = 'left';
      drawButton(ctx, 150, ebY, 24, 22, '\u25B6', false);

      // Color legend
      ctx.font = SMALL_FONT;
      var lgX = W - 170;
      ctx.fillStyle = CYAN + '0.8)'; ctx.fillText('\u2212 value', lgX, H - 12);
      ctx.fillStyle = TEXT_COLOR; ctx.fillText('|', lgX + 55, H - 12);
      ctx.fillStyle = ORANGE + '0.8)'; ctx.fillText('+ value', lgX + 65, H - 12);

      // 2D axes labels
      if (blend > 0.3) {
        ctx.globalAlpha = Math.min(1, (blend - 0.3) / 0.4);
        ctx.font = SMALL_FONT; ctx.fillStyle = TEXT_COLOR; ctx.textAlign = 'center';
        ctx.fillText('\u03C6\u2081', W / 2, H - 2);
        ctx.save(); ctx.translate(15, H / 2); ctx.rotate(-Math.PI / 2);
        ctx.fillText('\u03C6\u2082', 0, 0); ctx.restore();
        ctx.textAlign = 'left'; ctx.globalAlpha = 1;
      }

      // Title
      ctx.font = LABEL_FONT; ctx.fillStyle = TEXT_COLOR;
      ctx.fillText('Laplacian eigenvectors — drag to rotate', 15, 22);
    }
    draw();
  })();

})();
