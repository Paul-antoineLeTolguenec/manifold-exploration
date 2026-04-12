// ============================================================
// Chapter 9: Latent Space Geometry — Visualizations
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

  // ── Gaussian bump decoder: f(z1, z2) = (z1, z2, A * exp(-(z1²+z2²)/(2σ²))) ──
  var SIGMA = 0.8;
  var S2 = SIGMA * SIGMA;
  var S4 = S2 * S2;

  function bumpH(z1, z2, A) {
    return A * Math.exp(-(z1 * z1 + z2 * z2) / (2 * S2));
  }

  // All derivatives from a single exp() call
  function bumpDerivatives(z1, z2, A) {
    var h = A * Math.exp(-(z1 * z1 + z2 * z2) / (2 * S2));
    var h1 = -z1 * h / S2;
    var h2 = -z2 * h / S2;
    var h11 = (z1 * z1 / S2 - 1) * h / S2;
    var h22 = (z2 * z2 / S2 - 1) * h / S2;
    var h12 = z1 * z2 * h / S4;
    return { h: h, h1: h1, h2: h2, h11: h11, h22: h22, h12: h12 };
  }

  // Metric tensor g_{ij}(z) = I + (grad h)(grad h)^T
  function metric(z1, z2, A) {
    var d = bumpDerivatives(z1, z2, A);
    var g11 = 1 + d.h1 * d.h1;
    var g12 = d.h1 * d.h2;
    var g22 = 1 + d.h2 * d.h2;
    var det = 1 + d.h1 * d.h1 + d.h2 * d.h2;
    return { g11: g11, g12: g12, g22: g22, det: det };
  }

  // Gaussian curvature K = (h11*h22 - h12^2) / det(g)^2
  function gaussK(z1, z2, A) {
    var d = bumpDerivatives(z1, z2, A);
    var det = 1 + d.h1 * d.h1 + d.h2 * d.h2;
    return (d.h11 * d.h22 - d.h12 * d.h12) / (det * det);
  }

  // Christoffel symbols: Gamma^k_{ij} = h_k * h_{ij} / det(g)
  // Single exp() call for all 6 symbols
  function christoffel(z1, z2, A) {
    var d = bumpDerivatives(z1, z2, A);
    var det = 1 + d.h1 * d.h1 + d.h2 * d.h2;
    return {
      G1_11: d.h1 * d.h11 / det, G1_12: d.h1 * d.h12 / det, G1_22: d.h1 * d.h22 / det,
      G2_11: d.h2 * d.h11 / det, G2_12: d.h2 * d.h12 / det, G2_22: d.h2 * d.h22 / det
    };
  }

  // Curvature color (same palette as ch5)
  function curvatureColor(K, alpha) {
    if (K > 0.01) {
      var t = Math.min(1, K / 3);
      return 'rgba(' + Math.floor(50 * (1 - t)) + ',' + Math.floor(100 + 155 * t) + ',' + Math.floor(150 + 105 * t) + ',' + alpha + ')';
    } else if (K < -0.01) {
      var t = Math.min(1, -K / 3);
      return 'rgba(' + Math.floor(150 + 105 * t) + ',' + Math.floor(50 + 30 * (1 - t)) + ',' + Math.floor(50) + ',' + alpha + ')';
    }
    return 'rgba(60, 70, 80, ' + alpha + ')';
  }

  // Decoder: z -> 3D point
  function decode(z1, z2, A) {
    return { x: z1, y: bumpH(z1, z2, A), z: z2 };
  }

  // ── RK4 geodesic solver ──
  // State: [z1, z2, dz1/dt, dz2/dt]
  function geodesicRHS(state, A) {
    var z1 = state[0], z2 = state[1], v1 = state[2], v2 = state[3];
    var G = christoffel(z1, z2, A);
    return [
      v1,
      v2,
      -(G.G1_11 * v1 * v1 + 2 * G.G1_12 * v1 * v2 + G.G1_22 * v2 * v2),
      -(G.G2_11 * v1 * v1 + 2 * G.G2_12 * v1 * v2 + G.G2_22 * v2 * v2)
    ];
  }

  function rk4Step(state, dt, A) {
    var k1 = geodesicRHS(state, A);
    var s2 = []; for (var i = 0; i < 4; i++) s2[i] = state[i] + 0.5 * dt * k1[i];
    var k2 = geodesicRHS(s2, A);
    var s3 = []; for (var i = 0; i < 4; i++) s3[i] = state[i] + 0.5 * dt * k2[i];
    var k3 = geodesicRHS(s3, A);
    var s4 = []; for (var i = 0; i < 4; i++) s4[i] = state[i] + dt * k3[i];
    var k4 = geodesicRHS(s4, A);
    var next = [];
    for (var i = 0; i < 4; i++) {
      next[i] = state[i] + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
    }
    return next;
  }

  // Integrate geodesic from z_start with initial velocity (v1,v2), return array of {z1,z2}
  function integrateGeodesic(z1, z2, v1, v2, A, nSteps, dt) {
    var state = [z1, z2, v1, v2];
    var pts = [{ z1: z1, z2: z2 }];
    for (var i = 0; i < nSteps; i++) {
      state = rk4Step(state, dt, A);
      // Clamp to domain
      if (Math.abs(state[0]) > 3 || Math.abs(state[1]) > 3) break;
      pts.push({ z1: state[0], z2: state[1] });
    }
    return pts;
  }

  // Shooting method: find geodesic from zA to zB
  function shootGeodesic(zA, zB, A) {
    var dx = zB.z1 - zA.z1, dy = zB.z2 - zA.z2;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1e-6) return [{ z1: zA.z1, z2: zA.z2 }, { z1: zB.z1, z2: zB.z2 }];

    var nSteps = 200;
    var dt = 0.015;
    // Normalize initial velocity using the metric at zA
    var g = metric(zA.z1, zA.z2, A);

    // Try multiple initial angles to find the one that gets closest to zB
    var bestAngle = Math.atan2(dy, dx);
    var bestDist = 1e10;
    var nSweep = 36;
    for (var k = 0; k < nSweep; k++) {
      var angle = (2 * Math.PI * k) / nSweep;
      var v1 = Math.cos(angle), v2 = Math.sin(angle);
      // Normalize speed so that g(v,v) = 1
      var gvv = g.g11 * v1 * v1 + 2 * g.g12 * v1 * v2 + g.g22 * v2 * v2;
      var speed = Math.sqrt(gvv);
      if (speed < 1e-10) continue;
      v1 /= speed; v2 /= speed;
      // Scale speed so geodesic reaches approximately the right distance
      var eucSpeed = dist / (nSteps * dt);
      v1 *= eucSpeed; v2 *= eucSpeed;
      var pts = integrateGeodesic(zA.z1, zA.z2, v1, v2, A, nSteps, dt);
      var last = pts[pts.length - 1];
      var d = Math.sqrt((last.z1 - zB.z1) * (last.z1 - zB.z1) + (last.z2 - zB.z2) * (last.z2 - zB.z2));
      if (d < bestDist) { bestDist = d; bestAngle = angle; }
    }

    // Golden-section search refinement
    var lo = bestAngle - Math.PI / nSweep;
    var hi = bestAngle + Math.PI / nSweep;
    var phi = (Math.sqrt(5) - 1) / 2; // golden ratio conjugate ~0.618
    var m1 = hi - phi * (hi - lo);
    var m2 = lo + phi * (hi - lo);
    var f1 = tryAngle(zA, zB, m1, A, nSteps, dt, dist, g).dist;
    var f2 = tryAngle(zA, zB, m2, A, nSteps, dt, dist, g).dist;
    for (var iter = 0; iter < 15; iter++) {
      if (f1 < f2) {
        hi = m2;
        m2 = m1; f2 = f1;
        m1 = hi - phi * (hi - lo);
        f1 = tryAngle(zA, zB, m1, A, nSteps, dt, dist, g).dist;
      } else {
        lo = m1;
        m1 = m2; f1 = f2;
        m2 = lo + phi * (hi - lo);
        f2 = tryAngle(zA, zB, m2, A, nSteps, dt, dist, g).dist;
      }
    }
    var finalAngle = (lo + hi) / 2;
    var res = tryAngle(zA, zB, finalAngle, A, nSteps, dt, dist, g);

    // If shooting failed badly, fall back to straight line
    if (res.dist > dist * 0.3) {
      return straightLine(zA, zB, 100);
    }
    return res.pts;
  }

  function tryAngle(zA, zB, angle, A, nSteps, dt, dist, g) {
    var v1 = Math.cos(angle), v2 = Math.sin(angle);
    var gvv = g.g11 * v1 * v1 + 2 * g.g12 * v1 * v2 + g.g22 * v2 * v2;
    var speed = Math.sqrt(gvv);
    if (speed < 1e-10) speed = 1;
    v1 /= speed; v2 /= speed;
    var eucSpeed = dist / (nSteps * dt);
    v1 *= eucSpeed; v2 *= eucSpeed;
    var pts = integrateGeodesic(zA.z1, zA.z2, v1, v2, A, nSteps, dt);
    var last = pts[pts.length - 1];
    var d = Math.sqrt((last.z1 - zB.z1) * (last.z1 - zB.z1) + (last.z2 - zB.z2) * (last.z2 - zB.z2));
    return { pts: pts, dist: d };
  }

  function straightLine(zA, zB, n) {
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n;
      pts.push({ z1: zA.z1 * (1 - t) + zB.z1 * t, z2: zA.z2 * (1 - t) + zB.z2 * t });
    }
    return pts;
  }

  // Compute surface length of a path in latent space
  function surfaceLength(path, A) {
    var len = 0;
    for (var i = 0; i < path.length - 1; i++) {
      var dz1 = path[i + 1].z1 - path[i].z1;
      var dz2 = path[i + 1].z2 - path[i].z2;
      var g = metric(path[i].z1, path[i].z2, A);
      len += Math.sqrt(g.g11 * dz1 * dz1 + 2 * g.g12 * dz1 * dz2 + g.g22 * dz2 * dz2);
    }
    return len;
  }

  // Button helpers
  function drawButton(ctx, x, y, w, h, label, active) {
    ctx.fillStyle = active ? CYAN + '0.25)' : 'rgba(255,255,255,0.06)';
    ctx.strokeStyle = active ? CYAN + '0.6)' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, w, h, 4);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = active ? CYAN + '1)' : TEXT_COLOR;
    ctx.font = SMALL_FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y);
  }

  function hitTest(mx, my, bx, by, bw, bh) {
    return Math.abs(mx - bx) < bw / 2 && Math.abs(my - by) < bh / 2;
  }


  // ════════════════════════════════════════════════════════════
  // Viz 1: ch9-metric — Pullback metric + curvature heatmap
  // ════════════════════════════════════════════════════════════
  (function () {
    var c = initCanvas('ch9-metric', 0.55);
    if (!c) return;
    var ctx = c.ctx;
    var canvas = c.canvas;

    var amplitude = 1.5;
    var rotAngle = 0.6;
    var rotXA = 0.35;
    var dragging = false, dsx, dsy, drY, drX;
    var DOMAIN = 2.5;
    var GRID = 35;

    // Drag rotation on left panel
    canvas.addEventListener('mousedown', function (e) {
      var r = canvas.getBoundingClientRect();
      var mx = e.clientX - r.left;
      if (mx < c.width() * 0.5) {
        dsx = mx; dsy = e.clientY - r.top;
        drY = rotAngle; drX = rotXA; dragging = true;
      }
    });
    canvas.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var r = canvas.getBoundingClientRect();
      var dx = (e.clientX - r.left) - dsx, dy = (e.clientY - r.top) - dsy;
      rotAngle = drY + dx * 0.01;
      rotXA = Math.max(-1.2, Math.min(1.2, drX + dy * 0.01));
    });
    canvas.addEventListener('mouseup', function () { dragging = false; });
    canvas.addEventListener('mouseleave', function () { dragging = false; });

    // Slider click
    canvas.addEventListener('click', function (e) {
      var r = canvas.getBoundingClientRect();
      var mx = e.clientX - r.left, my = e.clientY - r.top;
      var W = c.width(), H = c.height();
      var sliderX = W * 0.5 + 30, sliderW = W * 0.44 - 30, sliderY = H - 28;
      if (my > sliderY - 15 && my < sliderY + 15 && mx > sliderX && mx < sliderX + sliderW) {
        amplitude = ((mx - sliderX) / sliderW) * 2.5;
        amplitude = Math.max(0, Math.min(2.5, amplitude));
      }
    });

    function draw() {
      requestAnimationFrame(draw);
      if (!c.isVisible()) return;
      var W = c.width(), H = c.height();
      ctx.clearRect(0, 0, W, H);

      if (!dragging) rotAngle += 0.003;

      var leftW = W * 0.5;
      var rightW = W * 0.5;

      // ── Left panel: 3D surface colored by K ──
      var cx3d = leftW / 2, cy3d = H * 0.45;
      var scl = Math.min(leftW, H) * 0.16;
      var step = (2 * DOMAIN) / GRID;
      var quads = [];

      for (var i = 0; i < GRID; i++) {
        for (var j = 0; j < GRID; j++) {
          var z1 = -DOMAIN + i * step;
          var z2 = -DOMAIN + j * step;
          var corners = [
            decode(z1, z2, amplitude),
            decode(z1 + step, z2, amplitude),
            decode(z1 + step, z2 + step, amplitude),
            decode(z1, z2 + step, amplitude)
          ];
          var K = gaussK(z1 + step / 2, z2 + step / 2, amplitude);
          var projected = [];
          var depthSum = 0;
          for (var k = 0; k < 4; k++) {
            var p = rotateY(corners[k], rotAngle);
            p = rotateX(p, rotXA);
            var s = project(p, cx3d, cy3d, scl);
            projected.push(s);
            depthSum += s.depth;
          }
          quads.push({ proj: projected, K: K, depth: depthSum / 4 });
        }
      }

      // Depth sort
      quads.sort(function (a, b) { return a.depth - b.depth; });

      for (var q = 0; q < quads.length; q++) {
        var quad = quads[q];
        ctx.beginPath();
        ctx.moveTo(quad.proj[0].sx, quad.proj[0].sy);
        for (var k = 1; k < 4; k++) ctx.lineTo(quad.proj[k].sx, quad.proj[k].sy);
        ctx.closePath();
        ctx.fillStyle = curvatureColor(quad.K, 0.7);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Label
      ctx.font = LABEL_FONT;
      ctx.fillStyle = TEXT_COLOR;
      ctx.textAlign = 'center';
      ctx.fillText('decoded surface f(z\u2081, z\u2082) |color: K', leftW / 2, 18);

      // Color legend
      ctx.fillStyle = curvatureColor(2, 1);
      ctx.fillRect(15, H - 55, 12, 12);
      ctx.fillStyle = TEXT_COLOR; ctx.textAlign = 'left'; ctx.font = SMALL_FONT;
      ctx.fillText('K > 0', 32, H - 44);
      ctx.fillStyle = curvatureColor(-2, 1);
      ctx.fillRect(15, H - 38, 12, 12);
      ctx.fillStyle = TEXT_COLOR;
      ctx.fillText('K < 0', 32, H - 28);

      // ── Right panel: 2D latent space with √det(g) heatmap + metric ellipses ──
      var rx = leftW + 20, ry = 30;
      var rw = rightW - 40, rh = H - 85;
      var cellSize = rw / GRID;

      // Heatmap
      for (var i = 0; i < GRID; i++) {
        for (var j = 0; j < GRID; j++) {
          var z1 = -DOMAIN + i * step;
          var z2 = -DOMAIN + j * step;
          var g = metric(z1 + step / 2, z2 + step / 2, amplitude);
          var vol = Math.sqrt(g.det);
          var t = Math.min(1, (vol - 1) / 1.5);
          var px = rx + (i / GRID) * rw;
          var py = ry + (j / GRID) * rh;
          ctx.fillStyle = 'rgba(' + Math.floor(0 + 50 * t) + ',' + Math.floor(60 + 130 * t) + ',' + Math.floor(80 + 175 * t) + ',' + (0.3 + 0.5 * t) + ')';
          ctx.fillRect(px, py, rw / GRID + 1, rh / GRID + 1);
        }
      }

      // Border
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(rx, ry, rw, rh);

      // Metric ellipses at a 7x7 subgrid
      var nEllipse = 7;
      for (var i = 0; i < nEllipse; i++) {
        for (var j = 0; j < nEllipse; j++) {
          var z1 = -DOMAIN + (i + 0.5) * (2 * DOMAIN / nEllipse);
          var z2 = -DOMAIN + (j + 0.5) * (2 * DOMAIN / nEllipse);
          var g = metric(z1, z2, amplitude);

          // Eigenvalues of 2x2 symmetric matrix g
          var tr = g.g11 + g.g22;
          var det = g.g11 * g.g22 - g.g12 * g.g12;
          var disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
          var lam1 = tr / 2 + disc;
          var lam2 = tr / 2 - disc;

          // Eigenvector for lam1
          var angle = 0;
          if (Math.abs(g.g12) > 1e-10) {
            angle = Math.atan2(lam1 - g.g11, g.g12);
          }

          var ex = rx + ((z1 + DOMAIN) / (2 * DOMAIN)) * rw;
          var ey = ry + ((z2 + DOMAIN) / (2 * DOMAIN)) * rh;
          var maxR = (DOMAIN * 2 / nEllipse) * rw / (2 * DOMAIN) * 0.35;
          var r1 = Math.min(maxR, Math.sqrt(lam1) * maxR * 0.6);
          var r2 = Math.min(maxR, Math.sqrt(lam2) * maxR * 0.6);

          ctx.save();
          ctx.translate(ex, ey);
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.ellipse(0, 0, r1, r2, 0, 0, 2 * Math.PI);
          ctx.strokeStyle = CYAN + '0.7)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.restore();
        }
      }

      // Label
      ctx.font = LABEL_FONT;
      ctx.fillStyle = TEXT_COLOR;
      ctx.textAlign = 'center';
      ctx.fillText('latent space \ud835\udcb5 |color: \u221Adet(g)', leftW + rightW / 2, 18);

      // Axis labels
      ctx.font = SMALL_FONT;
      ctx.fillStyle = TEXT_COLOR;
      ctx.textAlign = 'center';
      ctx.fillText('z\u2081', rx + rw / 2, ry + rh + 16);
      ctx.save();
      ctx.translate(rx - 10, ry + rh / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('z\u2082', 0, 0);
      ctx.restore();

      // ── Slider: amplitude A ──
      var sliderX = leftW + 30, sliderW = rightW - 60, sliderY = H - 28;
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sliderX, sliderY);
      ctx.lineTo(sliderX + sliderW, sliderY);
      ctx.stroke();

      var knobX = sliderX + (amplitude / 2.5) * sliderW;
      ctx.beginPath();
      ctx.arc(knobX, sliderY, 7, 0, 2 * Math.PI);
      ctx.fillStyle = CYAN + '0.9)';
      ctx.fill();

      ctx.font = SMALL_FONT;
      ctx.fillStyle = TEXT_COLOR;
      ctx.textAlign = 'left';
      ctx.fillText('A = ' + amplitude.toFixed(2), sliderX, sliderY - 14);
      ctx.textAlign = 'right';
      ctx.fillText('bump amplitude', sliderX + sliderW, sliderY - 14);

      // Separator
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(leftW, 0);
      ctx.lineTo(leftW, H);
      ctx.stroke();
    }

    draw();
  })();


  // ════════════════════════════════════════════════════════════
  // Viz 2: ch9-geodesic — Geodesic vs linear interpolation
  // ════════════════════════════════════════════════════════════
  (function () {
    var c = initCanvas('ch9-geodesic', 0.55);
    if (!c) return;
    var ctx = c.ctx;
    var canvas = c.canvas;

    var AMP = 1.5;
    var DOMAIN = 2.5;
    var GRID = 30;
    var rotAngle = 0.6, rotXA = 0.35;
    var dragging3d = false, dsx, dsy, drY, drX;
    var dragPoint = null; // 'A' or 'B'

    // Default endpoints: line crosses the bump
    var ptA = { z1: -1.8, z2: -0.3 };
    var ptB = { z1: 1.8, z2: 0.3 };

    // Precompute paths
    var linPath = straightLine(ptA, ptB, 100);
    var geoPath = shootGeodesic(ptA, ptB, AMP);
    var linLen = surfaceLength(linPath, AMP);
    var geoLen = surfaceLength(geoPath, AMP);

    function recomputePaths() {
      linPath = straightLine(ptA, ptB, 100);
      geoPath = shootGeodesic(ptA, ptB, AMP);
      linLen = surfaceLength(linPath, AMP);
      geoLen = surfaceLength(geoPath, AMP);
    }

    // Convert latent panel coords to z coords
    function panelToZ(mx, my, W, H) {
      var rx = W * 0.52 + 15, ry = 30;
      var rw = W * 0.48 - 45, rh = H - 85;
      var z1 = ((mx - rx) / rw) * 2 * DOMAIN - DOMAIN;
      var z2 = ((my - ry) / rh) * 2 * DOMAIN - DOMAIN;
      return { z1: z1, z2: z2 };
    }

    function zToPanel(z1, z2, W, H) {
      var rx = W * 0.52 + 15, ry = 30;
      var rw = W * 0.48 - 45, rh = H - 85;
      return {
        sx: rx + ((z1 + DOMAIN) / (2 * DOMAIN)) * rw,
        sy: ry + ((z2 + DOMAIN) / (2 * DOMAIN)) * rh
      };
    }

    canvas.addEventListener('mousedown', function (e) {
      var r = canvas.getBoundingClientRect();
      var mx = e.clientX - r.left, my = e.clientY - r.top;
      var W = c.width(), H = c.height();

      // Check right panel for endpoint drag
      if (mx > W * 0.52) {
        var pA = zToPanel(ptA.z1, ptA.z2, W, H);
        var pB = zToPanel(ptB.z1, ptB.z2, W, H);
        if ((mx - pA.sx) * (mx - pA.sx) + (my - pA.sy) * (my - pA.sy) < 225) {
          dragPoint = 'A'; return;
        }
        if ((mx - pB.sx) * (mx - pB.sx) + (my - pB.sy) * (my - pB.sy) < 225) {
          dragPoint = 'B'; return;
        }
      }

      // Left panel: 3D rotation
      if (mx < W * 0.52) {
        dsx = mx; dsy = my;
        drY = rotAngle; drX = rotXA;
        dragging3d = true;
      }
    });

    canvas.addEventListener('mousemove', function (e) {
      var r = canvas.getBoundingClientRect();
      var mx = e.clientX - r.left, my = e.clientY - r.top;
      var W = c.width(), H = c.height();

      if (dragPoint) {
        var z = panelToZ(mx, my, W, H);
        z.z1 = Math.max(-DOMAIN + 0.1, Math.min(DOMAIN - 0.1, z.z1));
        z.z2 = Math.max(-DOMAIN + 0.1, Math.min(DOMAIN - 0.1, z.z2));
        if (dragPoint === 'A') { ptA.z1 = z.z1; ptA.z2 = z.z2; }
        else { ptB.z1 = z.z1; ptB.z2 = z.z2; }
        return;
      }

      if (dragging3d) {
        var dx = mx - dsx, dy = my - dsy;
        rotAngle = drY + dx * 0.01;
        rotXA = Math.max(-1.2, Math.min(1.2, drX + dy * 0.01));
      }
    });

    canvas.addEventListener('mouseup', function () {
      if (dragPoint) {
        recomputePaths();
        dragPoint = null;
      }
      dragging3d = false;
    });

    canvas.addEventListener('mouseleave', function () {
      if (dragPoint) {
        recomputePaths();
        dragPoint = null;
      }
      dragging3d = false;
    });

    function draw() {
      requestAnimationFrame(draw);
      if (!c.isVisible()) return;
      var W = c.width(), H = c.height();
      ctx.clearRect(0, 0, W, H);

      if (!dragging3d && !dragPoint) rotAngle += 0.003;

      var leftW = W * 0.52;

      // ── Left panel: 3D surface + decoded paths ──
      var cx3d = leftW / 2, cy3d = H * 0.47;
      var scl = Math.min(leftW, H) * 0.16;
      var step = (2 * DOMAIN) / GRID;

      // Draw surface mesh (translucent)
      var quads = [];
      for (var i = 0; i < GRID; i++) {
        for (var j = 0; j < GRID; j++) {
          var z1 = -DOMAIN + i * step;
          var z2 = -DOMAIN + j * step;
          var corners = [
            decode(z1, z2, AMP),
            decode(z1 + step, z2, AMP),
            decode(z1 + step, z2 + step, AMP),
            decode(z1, z2 + step, AMP)
          ];
          var K = gaussK(z1 + step / 2, z2 + step / 2, AMP);
          var projected = [];
          var depthSum = 0;
          for (var k = 0; k < 4; k++) {
            var p = rotateY(corners[k], rotAngle);
            p = rotateX(p, rotXA);
            var s = project(p, cx3d, cy3d, scl);
            projected.push(s);
            depthSum += s.depth;
          }
          quads.push({ proj: projected, K: K, depth: depthSum / 4 });
        }
      }
      quads.sort(function (a, b) { return a.depth - b.depth; });

      for (var q = 0; q < quads.length; q++) {
        var quad = quads[q];
        ctx.beginPath();
        ctx.moveTo(quad.proj[0].sx, quad.proj[0].sy);
        for (var k = 1; k < 4; k++) ctx.lineTo(quad.proj[k].sx, quad.proj[k].sy);
        ctx.closePath();
        ctx.fillStyle = curvatureColor(quad.K, 0.35);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 0.4;
        ctx.stroke();
      }

      // Decoded linear path (ORANGE)
      ctx.beginPath();
      for (var i = 0; i < linPath.length; i++) {
        var p3 = decode(linPath[i].z1, linPath[i].z2, AMP);
        p3 = rotateY(p3, rotAngle);
        p3 = rotateX(p3, rotXA);
        var s = project(p3, cx3d, cy3d, scl);
        if (i === 0) ctx.moveTo(s.sx, s.sy);
        else ctx.lineTo(s.sx, s.sy);
      }
      ctx.strokeStyle = ORANGE + '0.9)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Decoded geodesic (CYAN)
      ctx.beginPath();
      for (var i = 0; i < geoPath.length; i++) {
        var p3 = decode(geoPath[i].z1, geoPath[i].z2, AMP);
        p3 = rotateY(p3, rotAngle);
        p3 = rotateX(p3, rotXA);
        var s = project(p3, cx3d, cy3d, scl);
        if (i === 0) ctx.moveTo(s.sx, s.sy);
        else ctx.lineTo(s.sx, s.sy);
      }
      ctx.strokeStyle = CYAN + '1)';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Decoded endpoints
      var pA3 = decode(ptA.z1, ptA.z2, AMP);
      pA3 = rotateY(pA3, rotAngle); pA3 = rotateX(pA3, rotXA);
      var sA = project(pA3, cx3d, cy3d, scl);
      var pB3 = decode(ptB.z1, ptB.z2, AMP);
      pB3 = rotateY(pB3, rotAngle); pB3 = rotateX(pB3, rotXA);
      var sB = project(pB3, cx3d, cy3d, scl);

      ctx.beginPath(); ctx.arc(sA.sx, sA.sy, 5, 0, 2 * Math.PI);
      ctx.fillStyle = GREEN + '1)'; ctx.fill();
      ctx.beginPath(); ctx.arc(sB.sx, sB.sy, 5, 0, 2 * Math.PI);
      ctx.fillStyle = RED + '1)'; ctx.fill();

      // Label
      ctx.font = LABEL_FONT;
      ctx.fillStyle = TEXT_COLOR;
      ctx.textAlign = 'center';
      ctx.fillText('decoded surface f(z)', leftW / 2, 18);

      // ── Right panel: 2D latent space ──
      var rx = W * 0.52 + 15, ry = 30;
      var rw = W * 0.48 - 45, rh = H - 85;

      // Subtle √det(g) heatmap
      var hStep = (2 * DOMAIN) / 25;
      for (var i = 0; i < 25; i++) {
        for (var j = 0; j < 25; j++) {
          var z1 = -DOMAIN + i * hStep;
          var z2 = -DOMAIN + j * hStep;
          var g = metric(z1 + hStep / 2, z2 + hStep / 2, AMP);
          var vol = Math.sqrt(g.det);
          var t = Math.min(1, (vol - 1) / 1.5);
          var px = rx + (i / 25) * rw;
          var py = ry + (j / 25) * rh;
          ctx.fillStyle = 'rgba(' + Math.floor(50 * t) + ',' + Math.floor(60 + 100 * t) + ',' + Math.floor(80 + 140 * t) + ',' + (0.15 + 0.25 * t) + ')';
          ctx.fillRect(px, py, rw / 25 + 1, rh / 25 + 1);
        }
      }

      // Border
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(rx, ry, rw, rh);

      // Linear path (ORANGE dashed)
      ctx.beginPath();
      var sLA = zToPanel(ptA.z1, ptA.z2, W, H);
      var sLB = zToPanel(ptB.z1, ptB.z2, W, H);
      ctx.moveTo(sLA.sx, sLA.sy);
      ctx.lineTo(sLB.sx, sLB.sy);
      ctx.strokeStyle = ORANGE + '0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Geodesic path (CYAN solid)
      ctx.beginPath();
      for (var i = 0; i < geoPath.length; i++) {
        var sp = zToPanel(geoPath[i].z1, geoPath[i].z2, W, H);
        if (i === 0) ctx.moveTo(sp.sx, sp.sy);
        else ctx.lineTo(sp.sx, sp.sy);
      }
      ctx.strokeStyle = CYAN + '1)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Endpoints (draggable)
      var pAp = zToPanel(ptA.z1, ptA.z2, W, H);
      var pBp = zToPanel(ptB.z1, ptB.z2, W, H);

      ctx.beginPath(); ctx.arc(pAp.sx, pAp.sy, 7, 0, 2 * Math.PI);
      ctx.fillStyle = GREEN + '1)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();

      ctx.beginPath(); ctx.arc(pBp.sx, pBp.sy, 7, 0, 2 * Math.PI);
      ctx.fillStyle = RED + '1)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();

      // Labels on points
      ctx.font = SMALL_FONT;
      ctx.fillStyle = GREEN + '1)';
      ctx.textAlign = 'left';
      ctx.fillText('A', pAp.sx + 10, pAp.sy - 5);
      ctx.fillStyle = RED + '1)';
      ctx.fillText('B', pBp.sx + 10, pBp.sy - 5);

      // Label
      ctx.font = LABEL_FONT;
      ctx.fillStyle = TEXT_COLOR;
      ctx.textAlign = 'center';
      ctx.fillText('latent space \ud835\udcb5 |drag A, B', rx + rw / 2, 18);

      // Axis labels
      ctx.font = SMALL_FONT;
      ctx.fillStyle = TEXT_COLOR;
      ctx.textAlign = 'center';
      ctx.fillText('z\u2081', rx + rw / 2, ry + rh + 16);
      ctx.save();
      ctx.translate(rx - 10, ry + rh / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('z\u2082', 0, 0);
      ctx.restore();

      // ── Length readout ──
      var readY = H - 18;
      ctx.font = LABEL_FONT;
      ctx.textAlign = 'left';
      ctx.fillStyle = ORANGE + '1)';
      ctx.fillText('linear: ' + linLen.toFixed(3), rx, readY);
      ctx.fillStyle = CYAN + '1)';
      ctx.fillText('geodesic: ' + geoLen.toFixed(3), rx + rw * 0.5, readY);

      // Legend
      ctx.textAlign = 'right';
      ctx.fillStyle = TEXT_COLOR;
      ctx.font = SMALL_FONT;
      ctx.fillText('surface length', rx + rw, readY);

      // Separator
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(W * 0.52, 0);
      ctx.lineTo(W * 0.52, H);
      ctx.stroke();
    }

    draw();
  })();

})();
