// ============================================================
// Chapter 4: Geodesics & Parallel Transport — Visualizations
// ============================================================

(function () {
  var CYAN = 'rgba(0, 212, 255, ';
  var ORANGE = 'rgba(255, 140, 50, ';
  var RED = 'rgba(255, 80, 80, ';
  var GREEN = 'rgba(50, 255, 140, ';
  var YELLOW = 'rgba(255, 220, 80, ';
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

  function sphereVertex(theta, phi, r) {
    return {
      x: r * Math.sin(theta) * Math.cos(phi),
      y: r * Math.cos(theta),
      z: r * Math.sin(theta) * Math.sin(phi)
    };
  }

  function screenToSphere(mx, my, cx, cy, scale, rotYA, rotXA) {
    var sx = (mx - cx) / scale, sy = (my - cy) / scale;
    var r2 = sx * sx + sy * sy;
    if (r2 > 1) return null;
    var sz = Math.sqrt(1 - r2);
    var p = { x: sx, y: sy, z: sz };
    p = rotateX(p, -rotXA);
    p = rotateY(p, -rotYA);
    return { theta: Math.acos(Math.max(-1, Math.min(1, p.y))), phi: Math.atan2(p.z, p.x) };
  }

  function vecAdd(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; }
  function vecSub(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
  function vecScale(a, s) { return { x: a.x * s, y: a.y * s, z: a.z * s }; }
  function dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
  function vecLen(a) { return Math.sqrt(dot(a, a)); }
  function vecNorm(a) { var l = vecLen(a); return l > 1e-12 ? vecScale(a, 1 / l) : { x: 0, y: 0, z: 0 }; }
  function cross(a, b) {
    return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
  }

  function drawLine(ctx, x1, y1, x2, y2, alpha, width, color) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = (color || CYAN) + alpha + ')';
    ctx.lineWidth = width || 0.6;
    ctx.stroke();
  }

  function drawArrow(ctx, x1, y1, x2, y2, color, alpha, width) {
    var dx = x2 - x1, dy = y2 - y1;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len < 2) return;
    var ux = dx / len, uy = dy / len;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color + alpha + ')';
    ctx.lineWidth = width;
    ctx.stroke();
    var hl = Math.min(10, len * 0.35);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - ux * hl - uy * hl * 0.45, y2 - uy * hl + ux * hl * 0.45);
    ctx.lineTo(x2 - ux * hl + uy * hl * 0.45, y2 - uy * hl - ux * hl * 0.45);
    ctx.closePath();
    ctx.fillStyle = color + alpha + ')';
    ctx.fill();
  }

  function drawSphereWireframe(ctx, cx, cy, scale, rotYA, rotXA, radius, nT, nP, baseAlpha) {
    for (var i = 0; i <= nT; i++) {
      var theta = (i / nT) * Math.PI;
      for (var j = 0; j < nP; j++) {
        var phi1 = (j / nP) * Math.PI * 2;
        var phi2 = ((j + 1) / nP) * Math.PI * 2;
        var a = sphereVertex(theta, phi1, radius);
        a = rotateY(a, rotYA); a = rotateX(a, rotXA);
        var pa = project(a, cx, cy, scale);
        var b = sphereVertex(theta, phi2, radius);
        b = rotateY(b, rotYA); b = rotateX(b, rotXA);
        var pb = project(b, cx, cy, scale);
        var t = ((pa.depth + pb.depth) / 2 + radius) / (2 * radius);
        var al = baseAlpha * (0.15 + 0.85 * Math.max(0, Math.min(1, t)));
        drawLine(ctx, pa.sx, pa.sy, pb.sx, pb.sy, al.toFixed(3));
      }
    }
    for (var j = 0; j <= nP; j++) {
      var phi = (j / nP) * Math.PI * 2;
      for (var i = 0; i < nT; i++) {
        var theta1 = (i / nT) * Math.PI;
        var theta2 = ((i + 1) / nT) * Math.PI;
        var a = sphereVertex(theta1, phi, radius);
        a = rotateY(a, rotYA); a = rotateX(a, rotXA);
        var pa = project(a, cx, cy, scale);
        var b = sphereVertex(theta2, phi, radius);
        b = rotateY(b, rotYA); b = rotateX(b, rotXA);
        var pb = project(b, cx, cy, scale);
        var t = ((pa.depth + pb.depth) / 2 + radius) / (2 * radius);
        var al = baseAlpha * (0.15 + 0.85 * Math.max(0, Math.min(1, t)));
        drawLine(ctx, pa.sx, pa.sy, pb.sx, pb.sy, al.toFixed(3));
      }
    }
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
    // Pause rendering when off-screen
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

  // Great circle between two points on S² (as array of 3D points)
  function greatCircleArc(p1, p2, nSteps) {
    var d = dot(p1, p2);
    d = Math.max(-1, Math.min(1, d));
    var angle = Math.acos(d);
    if (angle < 1e-8) return [p1];
    var pts = [];
    for (var i = 0; i <= nSteps; i++) {
      var t = i / nSteps;
      var s = Math.sin(angle);
      var a = Math.sin((1 - t) * angle) / s;
      var b = Math.sin(t * angle) / s;
      pts.push(vecAdd(vecScale(p1, a), vecScale(p2, b)));
    }
    return pts;
  }

  // Compute arc length on sphere (angle between unit vectors)
  function sphereDist(p1, p2) {
    var d = dot(p1, p2);
    return Math.acos(Math.max(-1, Math.min(1, d)));
  }


  // ============================================================
  // Viz 1: Shortest path on S² — great circle vs other curves
  // ============================================================

  (function () {
    var c = initCanvas('ch4-shortest');
    if (!c) return;
    var ctx = c.ctx;
    var canvas = c.canvas;
    var rotYA = 0.4, rotXA = 0.3;

    // Two draggable points on sphere
    var ptA = { theta: Math.PI * 0.3, phi: -0.6 };
    var ptB = { theta: Math.PI * 0.65, phi: 1.2 };
    var dragging = null; // 'A', 'B', or null

    function getPos(pt) { return sphereVertex(pt.theta, pt.phi, 1); }

    // Generate a "wrong" curve: go via a waypoint offset from the geodesic
    function curvedPath(pA, pB, offset, nSteps) {
      // Find a midpoint displaced from the great circle
      var mid = vecNorm(vecAdd(pA, pB));
      var perp = vecNorm(cross(pA, pB));
      // Offset the midpoint along the perpendicular direction
      var displaced = vecNorm(vecAdd(mid, vecScale(perp, offset)));
      var arc1 = greatCircleArc(pA, displaced, Math.floor(nSteps / 2));
      var arc2 = greatCircleArc(displaced, pB, Math.ceil(nSteps / 2));
      return arc1.concat(arc2.slice(1));
    }

    // Compute arc length of a path on sphere
    function pathLength(pts) {
      var len = 0;
      for (var i = 1; i < pts.length; i++) {
        len += sphereDist(pts[i - 1], pts[i]);
      }
      return len;
    }

    canvas.addEventListener('mousedown', function (e) {
      var rect = canvas.getBoundingClientRect();
      var W = c.width(), H = c.height();
      var sCx = W * 0.5, sCy = H * 0.5;
      var sR = Math.min(W * 0.28, H * 0.4);
      var hit = screenToSphere(e.clientX - rect.left, e.clientY - rect.top, sCx, sCy, sR, rotYA, rotXA);
      if (!hit) return;
      // Check which point is closer
      var dA = Math.abs(hit.theta - ptA.theta) + Math.abs(hit.phi - ptA.phi);
      var dB = Math.abs(hit.theta - ptB.theta) + Math.abs(hit.phi - ptB.phi);
      dragging = (dA < dB) ? 'A' : 'B';
      var pt = dragging === 'A' ? ptA : ptB;
      pt.theta = Math.max(0.15, Math.min(Math.PI - 0.15, hit.theta));
      pt.phi = hit.phi;
    });

    canvas.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var rect = canvas.getBoundingClientRect();
      var W = c.width(), H = c.height();
      var sCx = W * 0.5, sCy = H * 0.5;
      var sR = Math.min(W * 0.28, H * 0.4);
      var hit = screenToSphere(e.clientX - rect.left, e.clientY - rect.top, sCx, sCy, sR, rotYA, rotXA);
      if (!hit) return;
      var pt = dragging === 'A' ? ptA : ptB;
      pt.theta = Math.max(0.15, Math.min(Math.PI - 0.15, hit.theta));
      pt.phi = hit.phi;
    });

    window.addEventListener('mouseup', function () { dragging = null; });

    function drawPath(pts, color, alpha, width) {
      for (var i = 1; i < pts.length; i++) {
        var a = rotateX(rotateY(pts[i - 1], rotYA), rotXA);
        var pa = project(a, 0, 0, 1);
        var b = rotateX(rotateY(pts[i], rotYA), rotXA);
        var pb = project(b, 0, 0, 1);
        // Depth-based visibility
        var avgDepth = (pa.depth + pb.depth) / 2;
        if (avgDepth < -0.3) continue;
        var W = c.width(), H = c.height();
        var sCx = W * 0.5, sCy = H * 0.5;
        var sR = Math.min(W * 0.28, H * 0.4);
        var sa = { sx: sCx + pa.sx * sR, sy: sCy + pa.sy * sR };
        var sb = { sx: sCx + pb.sx * sR, sy: sCy + pb.sy * sR };
        drawLine(ctx, sa.sx, sa.sy, sb.sx, sb.sy, alpha, width, color);
      }
    }

    function draw() {
      requestAnimationFrame(draw);
      if (!c.isVisible()) return;
      var W = c.width(), H = c.height();
      ctx.clearRect(0, 0, W, H);
      var sCx = W * 0.5, sCy = H * 0.5;
      var sR = Math.min(W * 0.28, H * 0.4);

      drawSphereWireframe(ctx, sCx, sCy, sR, rotYA, rotXA, 1, 14, 20, 0.1);

      var pA = getPos(ptA), pB = getPos(ptB);

      // Great circle (geodesic)
      var geodesic = greatCircleArc(pA, pB, 80);
      var geoLen = pathLength(geodesic);

      // Alternative curves
      var offsets = [0.6, -0.8, 1.3, -0.4];
      var colors = [RED, ORANGE, YELLOW, 'rgba(180, 100, 255, '];
      var altPaths = [];
      var altLens = [];
      for (var i = 0; i < offsets.length; i++) {
        var path = curvedPath(pA, pB, offsets[i], 80);
        altPaths.push(path);
        altLens.push(pathLength(path));
      }

      // Draw alternative paths first (behind)
      for (var i = 0; i < altPaths.length; i++) {
        drawPath(altPaths[i], colors[i], '0.5', 1.5);
      }

      // Draw geodesic on top
      drawPath(geodesic, CYAN, '0.95', 3);

      // Draw points
      var pAr = rotateX(rotateY(pA, rotYA), rotXA);
      var pAs = project(pAr, sCx, sCy, sR);
      var pBr = rotateX(rotateY(pB, rotYA), rotXA);
      var pBs = project(pBr, sCx, sCy, sR);

      if (pAs.depth > -0.3) {
        ctx.beginPath();
        ctx.arc(pAs.sx, pAs.sy, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fill();
        ctx.font = LABEL_FONT;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.textAlign = 'center';
        ctx.fillText('A', pAs.sx, pAs.sy - 12);
      }
      if (pBs.depth > -0.3) {
        ctx.beginPath();
        ctx.arc(pBs.sx, pBs.sy, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fill();
        ctx.font = LABEL_FONT;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.textAlign = 'center';
        ctx.fillText('B', pBs.sx, pBs.sy - 12);
      }

      // Length legend
      ctx.font = LABEL_FONT;
      ctx.textAlign = 'left';
      var lx = 15, ly = 22;
      ctx.fillStyle = CYAN + '0.9)';
      ctx.fillText('geodesic (great circle):  L = ' + geoLen.toFixed(3), lx, ly);
      for (var i = 0; i < altLens.length; i++) {
        ctx.fillStyle = colors[i] + '0.7)';
        ctx.fillText('curve ' + (i + 1) + ':  L = ' + altLens[i].toFixed(3), lx, ly + (i + 1) * 15);
      }

      ctx.font = SMALL_FONT;
      ctx.fillStyle = 'rgba(122, 143, 166, 0.4)';
      ctx.textAlign = 'center';
      ctx.fillText('drag A and B on the sphere', sCx, H - 12);
    }

    draw();
  })();


  // ============================================================
  // Viz 2: Calculus of Variations — curve perturbation with ε
  // ============================================================

  (function () {
    var c = initCanvas('ch4-variation', 0.45);
    if (!c) return;
    var ctx = c.ctx;
    var canvas = c.canvas;

    var epsilon = 0;
    var draggingSlider = false;

    // We show a 2D curve γ from (0,0) to (1,0) and a perturbation η
    // γ(t) = (t, 0) — straight line (the geodesic in flat space)
    // η(t) = sin(πt) — bump in the middle
    // γ_ε(t) = (t, ε·sin(πt))

    function gamma(t, eps) {
      return { x: t, y: eps * Math.sin(Math.PI * t) };
    }

    function eta(t) {
      return Math.sin(Math.PI * t);
    }

    // Energy of γ_ε (Euclidean): E = 0.5 * ∫₀¹ |γ̇_ε|² dt
    // γ̇_ε = (1, ε·π·cos(πt))
    // |γ̇_ε|² = 1 + ε²·π²·cos²(πt)
    // E = 0.5 * (1 + ε²·π²/2)
    function energy(eps) {
      return 0.5 * (1 + eps * eps * Math.PI * Math.PI / 2);
    }

    canvas.addEventListener('mousedown', function (e) { draggingSlider = true; updateEps(e); });
    canvas.addEventListener('mousemove', function (e) { if (draggingSlider) updateEps(e); });
    window.addEventListener('mouseup', function () { draggingSlider = false; });

    function updateEps(e) {
      var rect = canvas.getBoundingClientRect();
      var W = c.width();
      // Slider region
      var sliderLeft = W * 0.1;
      var sliderRight = W * 0.9;
      var mx = e.clientX - rect.left;
      var t = (mx - sliderLeft) / (sliderRight - sliderLeft);
      t = Math.max(0, Math.min(1, t));
      epsilon = (t - 0.5) * 2 * 0.8; // range [-0.8, 0.8]
    }

    function draw() {
      requestAnimationFrame(draw);
      if (!c.isVisible()) return;
      var W = c.width(), H = c.height();
      ctx.clearRect(0, 0, W, H);

      var margin = 60;
      var plotW = W - 2 * margin;
      var plotH = H - 140;
      var plotX = margin;
      var plotY = 50;

      // Axes
      ctx.strokeStyle = 'rgba(122, 143, 166, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(plotX, plotY + plotH / 2);
      ctx.lineTo(plotX + plotW, plotY + plotH / 2);
      ctx.stroke();

      // Draw η (the perturbation) as dashed
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = ORANGE + '0.4)';
      ctx.lineWidth = 1.5;
      for (var i = 0; i <= 100; i++) {
        var t = i / 100;
        var px = plotX + t * plotW;
        var py = plotY + plotH / 2 - eta(t) * plotH * 0.35;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw γ₀ (the straight line / geodesic) as dim
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.moveTo(plotX, plotY + plotH / 2);
      ctx.lineTo(plotX + plotW, plotY + plotH / 2);
      ctx.stroke();

      // Draw γ_ε
      ctx.beginPath();
      ctx.strokeStyle = CYAN + '0.9)';
      ctx.lineWidth = 2.5;
      for (var i = 0; i <= 100; i++) {
        var t = i / 100;
        var pt = gamma(t, epsilon);
        var px = plotX + pt.x * plotW;
        var py = plotY + plotH / 2 - pt.y * plotH * 0.35;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Endpoints
      ctx.beginPath();
      ctx.arc(plotX, plotY + plotH / 2, 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(plotX + plotW, plotY + plotH / 2, 5, 0, Math.PI * 2);
      ctx.fill();

      // Labels
      ctx.font = LABEL_FONT;
      ctx.textAlign = 'left';
      ctx.fillStyle = CYAN + '0.8)';
      ctx.fillText('γ_ε(t) = γ(t) + ε·η(t)', plotX, plotY - 10);
      ctx.fillStyle = ORANGE + '0.6)';
      ctx.fillText('η(t) = sin(πt)', plotX + plotW - 120, plotY - 10);

      // Energy display
      var E = energy(epsilon);
      ctx.font = '13px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillStyle = CYAN + '0.9)';
      ctx.fillText('E(γ_ε) = ' + E.toFixed(4), plotX + plotW, plotY - 10);

      // ε slider
      var sliderY = plotY + plotH + 35;
      var sliderLeft = plotX;
      var sliderRight = plotX + plotW;
      var sliderMid = sliderLeft + (sliderRight - sliderLeft) * (epsilon / 1.6 + 0.5);

      // Track
      ctx.beginPath();
      ctx.moveTo(sliderLeft, sliderY);
      ctx.lineTo(sliderRight, sliderY);
      ctx.strokeStyle = 'rgba(122, 143, 166, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Center tick (ε = 0)
      var centerX = (sliderLeft + sliderRight) / 2;
      ctx.beginPath();
      ctx.moveTo(centerX, sliderY - 6);
      ctx.lineTo(centerX, sliderY + 6);
      ctx.strokeStyle = 'rgba(122, 143, 166, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Handle
      ctx.beginPath();
      ctx.arc(sliderMid, sliderY, 8, 0, Math.PI * 2);
      ctx.fillStyle = CYAN + '0.9)';
      ctx.fill();

      // ε label
      ctx.font = LABEL_FONT;
      ctx.textAlign = 'center';
      ctx.fillStyle = TEXT_COLOR;
      ctx.fillText('ε = ' + epsilon.toFixed(2), sliderMid, sliderY + 24);

      // Minimum indicator
      if (Math.abs(epsilon) < 0.03) {
        ctx.fillStyle = GREEN + '0.8)';
        ctx.fillText('◆ minimum (geodesic)', centerX, sliderY - 16);
      }

      ctx.font = SMALL_FONT;
      ctx.fillStyle = 'rgba(122, 143, 166, 0.4)';
      ctx.textAlign = 'center';
      ctx.fillText('drag the slider to vary ε', W / 2, H - 12);
    }

    draw();
  })();


  // ============================================================
  // Viz 3: Geodesic tracer on S² — choose direction, integrate
  // ============================================================

  (function () {
    var c = initCanvas('ch4-geodesic');
    if (!c) return;
    var ctx = c.ctx;
    var canvas = c.canvas;
    var rotYA = 0.4, rotXA = 0.3;

    var startTheta = Math.PI * 0.45;
    var startPhi = 0.3;
    // Initial velocity direction as angle in tangent plane (0 = along ∂θ, π/2 = along ∂φ)
    var velAngle = 0.7;
    var dragging = null; // 'point' or 'dir'
    var dirHandleAngle = velAngle;

    // Integrate geodesic on S² using RK4
    // State: [θ, φ, dθ/dt, dφ/dt]
    function geodesicRHS(state) {
      var th = state[0], ph = state[1], dth = state[2], dph = state[3];
      var sinT = Math.sin(th), cosT = Math.cos(th);
      if (Math.abs(sinT) < 1e-10) sinT = 1e-10;
      return [
        dth,
        dph,
        sinT * cosT * dph * dph,           // -Γ^θ_φφ · φ̇²
        -2 * (cosT / sinT) * dth * dph       // -Γ^φ_θφ · θ̇φ̇ (×2 for symmetry)
      ];
    }

    function rk4Step(state, dt) {
      var k1 = geodesicRHS(state);
      var s2 = []; for (var i = 0; i < 4; i++) s2[i] = state[i] + 0.5 * dt * k1[i];
      var k2 = geodesicRHS(s2);
      var s3 = []; for (var i = 0; i < 4; i++) s3[i] = state[i] + 0.5 * dt * k2[i];
      var k3 = geodesicRHS(s3);
      var s4 = []; for (var i = 0; i < 4; i++) s4[i] = state[i] + dt * k3[i];
      var k4 = geodesicRHS(s4);
      var next = [];
      for (var i = 0; i < 4; i++) {
        next[i] = state[i] + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
      }
      return next;
    }

    function integrateGeodesic(th0, ph0, angle, nSteps, dt) {
      // Velocity in tangent plane: v = cos(angle)·e_θ + sin(angle)·e_φ/sinθ (normalized)
      var sinT = Math.sin(th0);
      if (Math.abs(sinT) < 0.01) sinT = 0.01;
      var dth0 = Math.cos(angle);
      var dph0 = Math.sin(angle) / sinT;
      // Normalize speed
      var speed = Math.sqrt(dth0 * dth0 + sinT * sinT * dph0 * dph0);
      if (speed > 1e-10) { dth0 /= speed; dph0 /= speed; }

      var state = [th0, ph0, dth0, dph0];
      var pts = [sphereVertex(th0, ph0, 1)];
      for (var i = 0; i < nSteps; i++) {
        state = rk4Step(state, dt);
        // Clamp theta
        if (state[0] < 0.001) { state[0] = 0.001; state[2] = Math.abs(state[2]); }
        if (state[0] > Math.PI - 0.001) { state[0] = Math.PI - 0.001; state[2] = -Math.abs(state[2]); }
        pts.push(sphereVertex(state[0], state[1], 1));
      }
      return pts;
    }

    canvas.addEventListener('mousedown', function (e) {
      var rect = canvas.getBoundingClientRect();
      var W = c.width(), H = c.height();
      var sCx = W * 0.5, sCy = H * 0.5;
      var sR = Math.min(W * 0.28, H * 0.4);

      // Check if clicking near the direction handle
      var startP = sphereVertex(startTheta, startPhi, 1);
      var dTh = { x: Math.cos(startTheta) * Math.cos(startPhi), y: -Math.sin(startTheta), z: Math.cos(startTheta) * Math.sin(startPhi) };
      var sinT = Math.sin(startTheta);
      var dPh = { x: -sinT * Math.sin(startPhi), y: 0, z: sinT * Math.cos(startPhi) };
      var handleLen = 0.35;
      var handleP = vecAdd(startP, vecAdd(vecScale(dTh, Math.cos(velAngle) * handleLen), vecScale(dPh, Math.sin(velAngle) * handleLen / (sinT || 0.01))));
      var hR = rotateX(rotateY(handleP, rotYA), rotXA);
      var hS = project(hR, sCx, sCy, sR);
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      if ((mx - hS.sx) * (mx - hS.sx) + (my - hS.sy) * (my - hS.sy) < 400) {
        dragging = 'dir';
        return;
      }

      var hit = screenToSphere(mx, my, sCx, sCy, sR, rotYA, rotXA);
      if (hit) {
        dragging = 'point';
        startTheta = Math.max(0.15, Math.min(Math.PI - 0.15, hit.theta));
        startPhi = hit.phi;
      }
    });

    canvas.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var rect = canvas.getBoundingClientRect();
      var W = c.width(), H = c.height();
      var sCx = W * 0.5, sCy = H * 0.5;
      var sR = Math.min(W * 0.28, H * 0.4);

      if (dragging === 'point') {
        var hit = screenToSphere(e.clientX - rect.left, e.clientY - rect.top, sCx, sCy, sR, rotYA, rotXA);
        if (hit) {
          startTheta = Math.max(0.15, Math.min(Math.PI - 0.15, hit.theta));
          startPhi = hit.phi;
        }
      } else if (dragging === 'dir') {
        // Map mouse position to angle in tangent plane
        var startP = sphereVertex(startTheta, startPhi, 1);
        var sR2 = rotateX(rotateY(startP, rotYA), rotXA);
        var sS = project(sR2, sCx, sCy, sR);
        var mx = e.clientX - rect.left - sS.sx;
        var my = e.clientY - rect.top - sS.sy;
        // Project mouse delta onto screen-space tangent basis
        var dTh = { x: Math.cos(startTheta) * Math.cos(startPhi), y: -Math.sin(startTheta), z: Math.cos(startTheta) * Math.sin(startPhi) };
        var sinT = Math.sin(startTheta);
        var dPh = { x: -sinT * Math.sin(startPhi), y: 0, z: sinT * Math.cos(startPhi) };
        var dThR = rotateX(rotateY(dTh, rotYA), rotXA);
        var dPhR = rotateX(rotateY(dPh, rotYA), rotXA);
        var projTh = mx * dThR.x * sR + my * dThR.y * sR;
        var projPh = mx * dPhR.x * sR + my * dPhR.y * sR;
        velAngle = Math.atan2(projPh, projTh);
      }
    });

    window.addEventListener('mouseup', function () { dragging = null; });

    function draw() {
      requestAnimationFrame(draw);
      if (!c.isVisible()) return;
      var W = c.width(), H = c.height();
      ctx.clearRect(0, 0, W, H);
      var sCx = W * 0.5, sCy = H * 0.5;
      var sR = Math.min(W * 0.28, H * 0.4);

      drawSphereWireframe(ctx, sCx, sCy, sR, rotYA, rotXA, 1, 14, 20, 0.1);

      // Integrate geodesic
      var pts = integrateGeodesic(startTheta, startPhi, velAngle, 600, 0.01);

      // Draw geodesic with fading
      for (var i = 1; i < pts.length; i++) {
        var a = rotateX(rotateY(pts[i - 1], rotYA), rotXA);
        var pa = project(a, sCx, sCy, sR);
        var b = rotateX(rotateY(pts[i], rotYA), rotXA);
        var pb = project(b, sCx, sCy, sR);
        var avgDepth = (pa.depth + pb.depth) / 2;
        if (avgDepth < -0.3) continue;
        var fade = 1 - i / pts.length;
        var alpha = (0.2 + 0.7 * fade) * (0.3 + 0.7 * ((avgDepth + 1) / 2));
        drawLine(ctx, pa.sx, pa.sy, pb.sx, pb.sy, alpha.toFixed(3), 2.5);
      }

      // Start point
      var startP = sphereVertex(startTheta, startPhi, 1);
      var spR = rotateX(rotateY(startP, rotYA), rotXA);
      var spS = project(spR, sCx, sCy, sR);

      if (spS.depth > -0.3) {
        ctx.beginPath();
        ctx.arc(spS.sx, spS.sy, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fill();

        // Direction arrow
        var dTh = { x: Math.cos(startTheta) * Math.cos(startPhi), y: -Math.sin(startTheta), z: Math.cos(startTheta) * Math.sin(startPhi) };
        var sinT = Math.sin(startTheta) || 0.01;
        var dPh = { x: -sinT * Math.sin(startPhi), y: 0, z: sinT * Math.cos(startPhi) };
        var arrowLen = 0.35;
        var arrowEnd = vecAdd(startP, vecAdd(vecScale(dTh, Math.cos(velAngle) * arrowLen), vecScale(dPh, Math.sin(velAngle) * arrowLen / sinT)));
        var aeR = rotateX(rotateY(arrowEnd, rotYA), rotXA);
        var aeS = project(aeR, sCx, sCy, sR);
        drawArrow(ctx, spS.sx, spS.sy, aeS.sx, aeS.sy, ORANGE, '0.9', 2.5);

        // Direction handle (small circle)
        ctx.beginPath();
        ctx.arc(aeS.sx, aeS.sy, 5, 0, Math.PI * 2);
        ctx.fillStyle = ORANGE + '0.9)';
        ctx.fill();
      }

      // Legend
      ctx.font = SMALL_FONT;
      ctx.textAlign = 'left';
      ctx.fillStyle = CYAN + '0.6)';
      ctx.fillText('geodesic (great circle)', 15, 20);
      ctx.fillStyle = ORANGE + '0.6)';
      ctx.fillText('initial velocity', 15, 34);

      ctx.fillStyle = 'rgba(122, 143, 166, 0.4)';
      ctx.textAlign = 'center';
      ctx.fillText('drag point or direction handle', sCx, H - 12);
    }

    draw();
  })();


  // ============================================================
  // Viz 4: Parallel transport around a triangle — holonomy
  // ============================================================

  (function () {
    var c = initCanvas('ch4-holonomy');
    if (!c) return;
    var ctx = c.ctx;
    var canvas = c.canvas;
    var rotYA = 0.3, rotXA = 0.25;

    // Three vertices of a geodesic triangle on S²
    var verts = [
      { theta: Math.PI * 0.2, phi: 0.0 },
      { theta: Math.PI * 0.5, phi: -0.8 },
      { theta: Math.PI * 0.5, phi: 0.8 }
    ];
    var dragging = -1;
    var animT = 0;
    var animSpeed = 0.003;
    var cachedTransport = null;
    var cacheKey = '';

    function getP(v) { return sphereVertex(v.theta, v.phi, 1); }

    function getTransport() {
      var key = verts.map(function (v) { return v.theta.toFixed(4) + ',' + v.phi.toFixed(4); }).join('|');
      if (key !== cacheKey) {
        cachedTransport = buildTransport();
        cacheKey = key;
      }
      return cachedTransport;
    }

    canvas.addEventListener('mousedown', function (e) {
      var rect = canvas.getBoundingClientRect();
      var W = c.width(), H = c.height();
      var sCx = W * 0.5, sCy = H * 0.5;
      var sR = Math.min(W * 0.28, H * 0.4);
      var hit = screenToSphere(e.clientX - rect.left, e.clientY - rect.top, sCx, sCy, sR, rotYA, rotXA);
      if (!hit) return;
      // Find closest vertex
      var bestD = 999, bestI = -1;
      for (var i = 0; i < 3; i++) {
        var d = Math.abs(hit.theta - verts[i].theta) + Math.abs(hit.phi - verts[i].phi);
        if (d < bestD) { bestD = d; bestI = i; }
      }
      if (bestD < 0.5) {
        dragging = bestI;
        verts[bestI].theta = Math.max(0.1, Math.min(Math.PI - 0.1, hit.theta));
        verts[bestI].phi = hit.phi;
      }
    });

    canvas.addEventListener('mousemove', function (e) {
      if (dragging < 0) return;
      var rect = canvas.getBoundingClientRect();
      var W = c.width(), H = c.height();
      var sCx = W * 0.5, sCy = H * 0.5;
      var sR = Math.min(W * 0.28, H * 0.4);
      var hit = screenToSphere(e.clientX - rect.left, e.clientY - rect.top, sCx, sCy, sR, rotYA, rotXA);
      if (hit) {
        verts[dragging].theta = Math.max(0.1, Math.min(Math.PI - 0.1, hit.theta));
        verts[dragging].phi = hit.phi;
      }
    });

    window.addEventListener('mouseup', function () { dragging = -1; });

    // Parallel transport a tangent vector along a great circle arc on unit sphere
    // Uses Schild's ladder approximation (exact for great circles):
    // The transported vector stays in the plane defined by the arc and
    // maintains its angle with the tangent.
    function parallelTransportAlongArc(p1, p2, v, nSteps) {
      // For great circle transport on S², we can use the exact formula:
      // v_transported = v - (dot(v, p2) + dot(v, p1)) / (1 + dot(p1, p2)) * (p1 + p2)
      // + 2 * dot(v, p1) * p2  ... actually let's use the rotation approach.
      //
      // The parallel transport from p1 to p2 on S² rotates v by the same rotation
      // that takes p1 to p2 along the great circle, but restricted to the tangent plane.
      var d = dot(p1, p2);
      d = Math.max(-0.9999, Math.min(0.9999, d));
      if (Math.abs(d - 1) < 1e-10) return v; // same point

      // Tangent at p1 in direction of p2
      var t1 = vecSub(p2, vecScale(p1, d));
      var t1len = vecLen(t1);
      if (t1len < 1e-10) return v;
      t1 = vecScale(t1, 1 / t1len);

      // Tangent at p2 in direction of p1
      var t2 = vecSub(p1, vecScale(p2, d));
      var t2len = vecLen(t2);
      if (t2len < 1e-10) return v;
      t2 = vecScale(t2, 1 / t2len);

      // Decompose v into components along t1 and perpendicular (in tangent plane)
      var vt = dot(v, t1);
      var vPerp = vecSub(v, vecScale(t1, vt));

      // Transport: component along geodesic tangent maps t1 → -t2, perpendicular stays
      var result = vecAdd(vecScale(t2, -vt), vPerp);

      // Project back to tangent plane of p2 (numerical safety)
      result = vecSub(result, vecScale(p2, dot(result, p2)));

      return result;
    }

    // Build full triangle path and parallel-transported vector
    function buildTransport() {
      var pts = [getP(verts[0]), getP(verts[1]), getP(verts[2])];
      var nPerSide = 50;
      var allPts = [];
      var allVecs = [];

      // Initial vector: tangent at vertex 0, perpendicular to first edge
      var t01 = vecSub(pts[1], vecScale(pts[0], dot(pts[0], pts[1])));
      t01 = vecNorm(t01);
      var initVec = cross(pts[0], t01); // perpendicular to edge in tangent plane
      // Project to tangent plane
      initVec = vecSub(initVec, vecScale(pts[0], dot(initVec, pts[0])));
      initVec = vecNorm(initVec);
      var vecScale2 = 0.2;
      initVec = vecScale(initVec, vecScale2);

      // Transport along each edge
      for (var edge = 0; edge < 3; edge++) {
        var pStart = pts[edge];
        var pEnd = pts[(edge + 1) % 3];
        var arc = greatCircleArc(pStart, pEnd, nPerSide);
        var currentVec = (edge === 0) ? initVec : allVecs[allVecs.length - 1];

        for (var i = 0; i < arc.length; i++) {
          allPts.push(arc[i]);
          if (i === 0 && edge > 0) {
            allVecs.push(currentVec);
          } else if (i === 0) {
            allVecs.push(initVec);
          } else {
            currentVec = parallelTransportAlongArc(arc[i - 1], arc[i], currentVec, 1);
            allVecs.push(currentVec);
          }
        }
      }

      return { pts: allPts, vecs: allVecs, initVec: initVec };
    }

    function draw() {
      requestAnimationFrame(draw);
      if (!c.isVisible()) return;
      var W = c.width(), H = c.height();
      ctx.clearRect(0, 0, W, H);
      var sCx = W * 0.5, sCy = H * 0.5;
      var sR = Math.min(W * 0.28, H * 0.4);

      drawSphereWireframe(ctx, sCx, sCy, sR, rotYA, rotXA, 1, 14, 20, 0.08);

      var transport = getTransport();
      var allPts = transport.pts;
      var allVecs = transport.vecs;
      var totalPts = allPts.length;

      // Animate
      animT += animSpeed;
      if (animT > 1) animT -= 1;
      var currentIdx = Math.floor(animT * (totalPts - 1));

      // Draw triangle edges
      var pts3 = [getP(verts[0]), getP(verts[1]), getP(verts[2])];
      for (var edge = 0; edge < 3; edge++) {
        var arc = greatCircleArc(pts3[edge], pts3[(edge + 1) % 3], 50);
        for (var i = 1; i < arc.length; i++) {
          var a = rotateX(rotateY(arc[i - 1], rotYA), rotXA);
          var pa = project(a, sCx, sCy, sR);
          var b = rotateX(rotateY(arc[i], rotYA), rotXA);
          var pb = project(b, sCx, sCy, sR);
          var avgD = (pa.depth + pb.depth) / 2;
          if (avgD < -0.3) continue;
          var al = 0.15 + 0.5 * ((avgD + 1) / 2);
          drawLine(ctx, pa.sx, pa.sy, pb.sx, pb.sy, al.toFixed(3), 2);
        }
      }

      // Draw vertices
      for (var i = 0; i < 3; i++) {
        var vr = rotateX(rotateY(pts3[i], rotYA), rotXA);
        var vs = project(vr, sCx, sCy, sR);
        if (vs.depth > -0.3) {
          ctx.beginPath();
          ctx.arc(vs.sx, vs.sy, 5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.fill();
        }
      }

      // Draw transported vector trail (ghost vectors along the path)
      var ghostStep = Math.floor(totalPts / 20);
      for (var i = 0; i < totalPts; i += ghostStep) {
        if (i >= allPts.length || i >= allVecs.length) continue;
        var p = allPts[i];
        var v = allVecs[i];
        var pEnd = vecAdd(p, v);
        var pr = rotateX(rotateY(p, rotYA), rotXA);
        var ps = project(pr, sCx, sCy, sR);
        var er = rotateX(rotateY(pEnd, rotYA), rotXA);
        var es = project(er, sCx, sCy, sR);
        if (ps.depth > -0.2) {
          var al = 0.1 + 0.15 * ((ps.depth + 1) / 2);
          drawArrow(ctx, ps.sx, ps.sy, es.sx, es.sy, CYAN, al.toFixed(2), 1.5);
        }
      }

      // Draw current transported vector (bright)
      if (currentIdx < allPts.length && currentIdx < allVecs.length) {
        var cp = allPts[currentIdx];
        var cv = allVecs[currentIdx];
        var cpEnd = vecAdd(cp, cv);
        var cpr = rotateX(rotateY(cp, rotYA), rotXA);
        var cps = project(cpr, sCx, sCy, sR);
        var cer = rotateX(rotateY(cpEnd, rotYA), rotXA);
        var ces = project(cer, sCx, sCy, sR);
        if (cps.depth > -0.3) {
          drawArrow(ctx, cps.sx, cps.sy, ces.sx, ces.sy, ORANGE, '0.95', 3);
          ctx.beginPath();
          ctx.arc(cps.sx, cps.sy, 4, 0, Math.PI * 2);
          ctx.fillStyle = ORANGE + '0.9)';
          ctx.fill();
        }
      }

      // Draw initial vector at vertex 0 (for comparison)
      var v0 = pts3[0];
      var v0end = vecAdd(v0, transport.initVec);
      var v0r = rotateX(rotateY(v0, rotYA), rotXA);
      var v0s = project(v0r, sCx, sCy, sR);
      var v0er = rotateX(rotateY(v0end, rotYA), rotXA);
      var v0es = project(v0er, sCx, sCy, sR);
      if (v0s.depth > -0.3) {
        drawArrow(ctx, v0s.sx, v0s.sy, v0es.sx, v0es.sy, GREEN, '0.7', 2.5);
      }

      // Compute holonomy angle
      var finalVec = allVecs[allVecs.length - 1];
      var initV = transport.initVec;
      // Both should be tangent to sphere at vertex 0
      var fLen = vecLen(finalVec), iLen = vecLen(initV);
      var holonomy = 0;
      if (fLen > 1e-10 && iLen > 1e-10) {
        var cosA = dot(finalVec, initV) / (fLen * iLen);
        cosA = Math.max(-1, Math.min(1, cosA));
        holonomy = Math.acos(cosA);
        // Determine sign via cross product
        var cr = cross(initV, finalVec);
        if (dot(cr, v0) < 0) holonomy = -holonomy;
      }

      // Compute area of spherical triangle (for Gauss-Bonnet)
      var a01 = sphereDist(pts3[0], pts3[1]);
      var a12 = sphereDist(pts3[1], pts3[2]);
      var a20 = sphereDist(pts3[2], pts3[0]);
      var s = (a01 + a12 + a20) / 2;
      // Spherical excess via L'Huilier's theorem
      var tanQE = Math.sqrt(
        Math.max(0, Math.tan(s / 2) * Math.tan((s - a01) / 2) * Math.tan((s - a12) / 2) * Math.tan((s - a20) / 2))
      );
      var area = 4 * Math.atan(tanQE);

      // Legend
      ctx.font = LABEL_FONT;
      ctx.textAlign = 'left';
      var lx = 15, ly = 22;
      ctx.fillStyle = GREEN + '0.7)';
      ctx.fillText('initial vector', lx, ly);
      ctx.fillStyle = ORANGE + '0.8)';
      ctx.fillText('transported vector', lx, ly + 15);
      ctx.fillStyle = CYAN + '0.7)';
      ctx.fillText('holonomy angle: ' + (holonomy * 180 / Math.PI).toFixed(1) + '°', lx, ly + 34);
      ctx.fillStyle = CYAN + '0.5)';
      ctx.fillText('triangle area:  ' + area.toFixed(3) + ' sr', lx, ly + 49);
      ctx.fillStyle = CYAN + '0.5)';
      ctx.fillText('α+β+γ−π = ' + (area * 180 / Math.PI).toFixed(1) + '°  (Gauss-Bonnet)', lx, ly + 64);

      ctx.font = SMALL_FONT;
      ctx.fillStyle = 'rgba(122, 143, 166, 0.4)';
      ctx.textAlign = 'center';
      ctx.fillText('drag the three vertices', sCx, H - 12);
    }

    draw();
  })();

})();
