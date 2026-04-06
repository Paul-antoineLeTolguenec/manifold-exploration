// ============================================================
// Chapter 1: Smooth Manifolds — Interactive Visualizations
// ============================================================

(function () {
  const CYAN = 'rgba(0, 212, 255, ';
  const ORANGE = 'rgba(255, 140, 50, ';
  const TEXT_COLOR = '#7a8fa6';
  const LABEL_FONT = '11px "JetBrains Mono", monospace';
  const SMALL_FONT = '10px "JetBrains Mono", monospace';

  // ── Shared 3D utilities ──

  function rotateY(p, angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
  }

  function rotateX(p, angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
  }

  // Inverse rotations (for screen-to-world unprojection)
  function invRotateX(p, angle) { return rotateX(p, -angle); }
  function invRotateY(p, angle) { return rotateY(p, -angle); }

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

  // Unproject screen coords to sphere surface (returns {theta, phi} or null)
  function screenToSphere(mx, my, cx, cy, scale, rotYAngle, rotXAngle) {
    var sx = (mx - cx) / scale;
    var sy = (my - cy) / scale;
    var r2 = sx * sx + sy * sy;
    if (r2 > 1) return null;
    var sz = Math.sqrt(1 - r2);
    // Screen space point on unit sphere (orthographic)
    var p = { x: sx, y: sy, z: sz };
    // Inverse rotations to get world coordinates
    p = invRotateX(p, rotXAngle);
    p = invRotateY(p, rotYAngle);
    // Convert to theta/phi
    var theta = Math.acos(Math.max(-1, Math.min(1, p.y)));
    var phi = Math.atan2(p.z, p.x);
    return { theta: theta, phi: phi };
  }

  function drawLine(ctx, x1, y1, x2, y2, alpha, width, color) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = (color || CYAN) + alpha + ')';
    ctx.lineWidth = width || 0.6;
    ctx.stroke();
  }

  function drawDashedLine(ctx, x1, y1, x2, y2, alpha, width, color) {
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = (color || CYAN) + alpha + ')';
    ctx.lineWidth = width || 0.6;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawCircle(ctx, x, y, r, alpha, color) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = (color || CYAN) + alpha + ')';
    ctx.fill();
  }

  function drawSphereWireframe(ctx, cx, cy, scale, rotYAngle, rotXAngle, radius, nTheta, nPhi, baseAlpha) {
    var points = [];
    for (var i = 0; i <= nTheta; i++) {
      points[i] = [];
      var theta = (i / nTheta) * Math.PI;
      for (var j = 0; j <= nPhi; j++) {
        var phi = (j / nPhi) * Math.PI * 2;
        var p = sphereVertex(theta, phi, radius);
        p = rotateY(p, rotYAngle);
        p = rotateX(p, rotXAngle);
        points[i][j] = project(p, cx, cy, scale);
      }
    }
    for (var i = 0; i <= nTheta; i++) {
      for (var j = 0; j < nPhi; j++) {
        var a = points[i][j], b = points[i][j + 1];
        var avgDepth = (a.depth + b.depth) / 2;
        var t = (avgDepth + radius) / (2 * radius);
        var alpha = baseAlpha * (0.15 + 0.85 * Math.max(0, Math.min(1, t)));
        drawLine(ctx, a.sx, a.sy, b.sx, b.sy, alpha.toFixed(3));
      }
    }
    for (var j = 0; j <= nPhi; j++) {
      for (var i = 0; i < nTheta; i++) {
        var a = points[i][j], b = points[i + 1][j];
        var avgDepth = (a.depth + b.depth) / 2;
        var t = (avgDepth + radius) / (2 * radius);
        var alpha = baseAlpha * (0.15 + 0.85 * Math.max(0, Math.min(1, t)));
        drawLine(ctx, a.sx, a.sy, b.sx, b.sy, alpha.toFixed(3));
      }
    }
    return points;
  }

  function initCanvas(id) {
    var canvas = document.getElementById(id);
    if (!canvas) return null;
    var ctx = canvas.getContext('2d');
    var container = canvas.parentElement;

    function resize() {
      var rect = container.getBoundingClientRect();
      var dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = Math.max(350, rect.width * 0.5) * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = Math.max(350, rect.width * 0.5) + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener('resize', resize);

    return {
      canvas: canvas,
      ctx: ctx,
      width: function () { return canvas.width / (window.devicePixelRatio || 1); },
      height: function () { return canvas.height / (window.devicePixelRatio || 1); }
    };
  }

  // ============================================================
  // Viz 1: From Euclid to Riemann — Parallel lines comparison
  // ============================================================

  (function () {
    var c = initCanvas('ch1-parallel');
    if (!c) return;
    var ctx = c.ctx;
    var rotAngle = 0;

    function draw() {
      var W = c.width(), H = c.height();
      ctx.clearRect(0, 0, W, H);

      var midX = W / 2;
      var leftCx = W * 0.25;
      var rightCx = W * 0.75;
      var cy = H * 0.5;

      // ── Left panel: flat plane with parallel lines ──
      ctx.font = LABEL_FONT;
      ctx.fillStyle = TEXT_COLOR;
      ctx.textAlign = 'center';
      ctx.fillText('Euclidean plane', leftCx, 25);

      var gridSize = Math.min(W * 0.3, H * 0.6);
      var gridLeft = leftCx - gridSize / 2;
      var gridTop = cy - gridSize / 2;

      for (var i = 0; i <= 8; i++) {
        var t = i / 8;
        var x = gridLeft + t * gridSize;
        var y = gridTop + t * gridSize;
        drawLine(ctx, x, gridTop, x, gridTop + gridSize, 0.1);
        drawLine(ctx, gridLeft, y, gridLeft + gridSize, y, 0.1);
      }

      var y1 = gridTop + gridSize * 0.35;
      var y2 = gridTop + gridSize * 0.65;
      drawLine(ctx, gridLeft, y1, gridLeft + gridSize, y1, 0.9, 2);
      drawLine(ctx, gridLeft, y2, gridLeft + gridSize, y2, 0.9, 2, ORANGE);

      var arrowX = gridLeft + gridSize + 15;
      drawDashedLine(ctx, arrowX, y1, arrowX, y2, 0.4, 1);
      ctx.fillStyle = TEXT_COLOR;
      ctx.font = SMALL_FONT;
      ctx.textAlign = 'left';
      ctx.fillText('d = const', arrowX + 6, (y1 + y2) / 2 + 4);

      // Divider
      ctx.beginPath();
      ctx.moveTo(midX, 40);
      ctx.lineTo(midX, H - 20);
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // ── Right panel: sphere with great circles ──
      ctx.font = LABEL_FONT;
      ctx.fillStyle = TEXT_COLOR;
      ctx.textAlign = 'center';
      ctx.fillText('Riemannian surface (S\u00B2)', rightCx, 25);

      rotAngle += 0.004;
      var sphereR = Math.min(W * 0.18, H * 0.35);

      drawSphereWireframe(ctx, rightCx, cy, sphereR, rotAngle, 0.3, 1, 16, 24, 0.25);
      drawGreatCircle(ctx, rightCx, cy, sphereR, rotAngle, 0.3, 1, -0.3, true);
      drawGreatCircle(ctx, rightCx, cy, sphereR, rotAngle, 0.3, 1, 0.3, false);

      ctx.font = SMALL_FONT;
      ctx.fillStyle = TEXT_COLOR;
      ctx.textAlign = 'center';
      ctx.fillText('geodesics converge', rightCx, H - 15);

      requestAnimationFrame(draw);
    }

    function drawGreatCircle(ctx, cx, cy, scale, rotYAngle, rotXAngle, radius, tiltX, isCyan) {
      var pts = [];
      for (var i = 0; i <= 80; i++) {
        var t = (i / 80) * Math.PI * 2;
        var p = {
          x: radius * Math.cos(t),
          y: radius * Math.sin(t) * Math.cos(tiltX),
          z: radius * Math.sin(t) * Math.sin(tiltX)
        };
        p = rotateY(p, rotYAngle);
        p = rotateX(p, rotXAngle);
        pts.push(project(p, cx, cy, scale));
      }
      for (var i = 0; i < pts.length - 1; i++) {
        var a = pts[i], b = pts[i + 1];
        var avgDepth = (a.depth + b.depth) / 2;
        var t = (avgDepth + radius) / (2 * radius);
        var alpha = (0.2 + 0.8 * Math.max(0, Math.min(1, t)));
        var col = isCyan ? CYAN : ORANGE;
        drawLine(ctx, a.sx, a.sy, b.sx, b.sy, alpha.toFixed(3), 2, col);
      }
    }

    draw();
  })();

  // ============================================================
  // Viz 2: Topological Manifold Properties — 3 tabs
  // ============================================================

  (function () {
    var c = initCanvas('ch1-topology');
    if (!c) return;
    var ctx = c.ctx;
    var canvas = c.canvas;
    var activeTab = 0; // 0=Hausdorff, 1=Locally Euclidean
    var tabs = ['Hausdorff', 'Locally Euclidean'];
    var rotAngle = 0;

    // Hausdorff: two draggable points on S²
    var hPt1 = { theta: Math.PI * 0.35, phi: -0.4 };
    var hPt2 = { theta: Math.PI * 0.65, phi: 0.5 };
    var hDrag = -1; // -1=none, 0=pt1, 1=pt2

    // Locally Euclidean: hover patch
    var lePatchTheta = Math.PI * 0.45;
    var lePatchPhi = 0.5;
    var leHover = false;

    canvas.addEventListener('mousedown', function (e) {
      var rect = canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left;
      var my = e.clientY - rect.top;
      var W = c.width(), H = c.height();

      // Check tab clicks
      var tabW = Math.min(160, W / 2.5);
      var tabY = 8;
      for (var i = 0; i < 2; i++) {
        var tx = W / 2 - (2 * tabW) / 2 + i * tabW;
        if (mx >= tx && mx <= tx + tabW && my >= tabY && my <= tabY + 28) {
          activeTab = i;
          return;
        }
      }

      if (activeTab === 0) {
        // Hausdorff: check which point to drag
        var sCx = W * 0.5, sCy = H * 0.55;
        var sR = Math.min(W * 0.25, H * 0.35);
        var hit = screenToSphere(mx, my, sCx, sCy, sR, rotAngle, 0.3);
        if (hit) {
          // Determine which point is closer
          var d1 = Math.pow(hit.theta - hPt1.theta, 2) + Math.pow(hit.phi - hPt1.phi, 2);
          var d2 = Math.pow(hit.theta - hPt2.theta, 2) + Math.pow(hit.phi - hPt2.phi, 2);
          hDrag = d1 < d2 ? 0 : 1;
          if (hDrag === 0) { hPt1.theta = hit.theta; hPt1.phi = hit.phi; }
          else { hPt2.theta = hit.theta; hPt2.phi = hit.phi; }
        }
      }
    });

    canvas.addEventListener('mousemove', function (e) {
      var rect = canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left;
      var my = e.clientY - rect.top;
      var W = c.width(), H = c.height();
      var sCx = W * 0.5, sCy = H * 0.55;
      var sR = Math.min(W * 0.25, H * 0.35);

      if (activeTab === 0 && hDrag >= 0) {
        var hit = screenToSphere(mx, my, sCx, sCy, sR, rotAngle, 0.3);
        if (hit) {
          if (hDrag === 0) { hPt1.theta = hit.theta; hPt1.phi = hit.phi; }
          else { hPt2.theta = hit.theta; hPt2.phi = hit.phi; }
        }
      }

      if (activeTab === 1) {
        var hit = screenToSphere(mx, my, sCx, sCy, sR, rotAngle, 0.3);
        if (hit) {
          leHover = true;
          lePatchTheta = hit.theta;
          lePatchPhi = hit.phi;
        } else {
          leHover = false;
        }
      }
    });

    window.addEventListener('mouseup', function () { hDrag = -1; });
    canvas.addEventListener('mouseleave', function () { leHover = false; });

    function draw() {
      var W = c.width(), H = c.height();
      ctx.clearRect(0, 0, W, H);
      rotAngle += 0.002;

      // ── Draw tabs ──
      var tabW = Math.min(160, W / 2.5);
      var tabStartX = W / 2 - (2 * tabW) / 2;
      for (var i = 0; i < 2; i++) {
        var tx = tabStartX + i * tabW;
        var isActive = i === activeTab;
        ctx.fillStyle = isActive ? 'rgba(0, 212, 255, 0.12)' : 'rgba(0, 212, 255, 0.03)';
        ctx.strokeStyle = isActive ? CYAN + '0.4)' : CYAN + '0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(tx + 2, 8, tabW - 4, 28, 4);
        ctx.fill();
        ctx.stroke();
        ctx.font = SMALL_FONT;
        ctx.fillStyle = isActive ? CYAN + '0.9)' : TEXT_COLOR;
        ctx.textAlign = 'center';
        ctx.fillText(tabs[i], tx + tabW / 2, 27);
      }

      var sCx = W * 0.5, sCy = H * 0.55;
      var sR = Math.min(W * 0.25, H * 0.35);

      if (activeTab === 0) drawHausdorff(W, H, sCx, sCy, sR);
      else drawLocallyEuclidean(W, H, sCx, sCy, sR);

      requestAnimationFrame(draw);
    }

    function drawHausdorff(W, H, sCx, sCy, sR) {
      // Draw sphere
      drawSphereWireframe(ctx, sCx, sCy, sR, rotAngle, 0.3, 1, 14, 20, 0.15);

      // Two points on sphere
      var p1 = sphereVertex(hPt1.theta, hPt1.phi, 1);
      var p1r = rotateX(rotateY(p1, rotAngle), 0.3);
      var p1s = project(p1r, sCx, sCy, sR);

      var p2 = sphereVertex(hPt2.theta, hPt2.phi, 1);
      var p2r = rotateX(rotateY(p2, rotAngle), 0.3);
      var p2s = project(p2r, sCx, sCy, sR);

      // Screen distance between the two projected points
      var screenDist = Math.sqrt(Math.pow(p1s.sx - p2s.sx, 2) + Math.pow(p1s.sy - p2s.sy, 2));

      // Neighborhood radius: always strictly less than half the screen distance
      // This guarantees disjoint neighborhoods (Hausdorff property always holds on S²)
      var neighborRadius = Math.max(10, screenDist * 0.42);

      // Draw neighborhoods (translucent discs, always disjoint)
      if (p1s.depth > -0.5) {
        ctx.beginPath();
        ctx.arc(p1s.sx, p1s.sy, neighborRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 212, 255, 0.06)';
        ctx.strokeStyle = CYAN + '0.4)';
        ctx.lineWidth = 1.5;
        ctx.fill();
        ctx.stroke();
      }

      if (p2s.depth > -0.5) {
        ctx.beginPath();
        ctx.arc(p2s.sx, p2s.sy, neighborRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 140, 50, 0.06)';
        ctx.strokeStyle = ORANGE + '0.4)';
        ctx.lineWidth = 1.5;
        ctx.fill();
        ctx.stroke();
      }

      // Draw points
      if (p1s.depth > -0.5) drawCircle(ctx, p1s.sx, p1s.sy, 6, 0.9);
      if (p2s.depth > -0.5) drawCircle(ctx, p2s.sx, p2s.sy, 6, 0.9, ORANGE);

      // Labels
      if (p1s.depth > -0.5) {
        ctx.font = SMALL_FONT;
        ctx.fillStyle = CYAN + '0.8)';
        ctx.textAlign = 'center';
        ctx.fillText('p', p1s.sx, p1s.sy - 12);
        ctx.fillText('U\u2081', p1s.sx + neighborRadius * 0.5, p1s.sy - neighborRadius * 0.6);
      }
      if (p2s.depth > -0.5) {
        ctx.font = SMALL_FONT;
        ctx.fillStyle = ORANGE + '0.8)';
        ctx.textAlign = 'center';
        ctx.fillText('q', p2s.sx, p2s.sy - 12);
        ctx.fillText('U\u2082', p2s.sx + neighborRadius * 0.5, p2s.sy - neighborRadius * 0.6);
      }

      ctx.font = LABEL_FONT;
      ctx.fillStyle = TEXT_COLOR;
      ctx.textAlign = 'center';
      ctx.fillText('p \u2260 q \u21D2 \u2203 U\u2081, U\u2082 open : U\u2081 \u2229 U\u2082 = \u2205', sCx, H - 15);

      ctx.font = SMALL_FONT;
      ctx.fillStyle = 'rgba(122, 143, 166, 0.4)';
      ctx.fillText('drag the points on S\u00B2', sCx, 50);
    }

    function drawLocallyEuclidean(W, H, sCx, sCy, sR) {
      // Draw sphere
      drawSphereWireframe(ctx, sCx, sCy, sR, rotAngle, 0.3, 1, 14, 20, 0.15);

      // Draw highlighted patch
      var pt = leHover ? lePatchTheta : Math.PI * 0.45;
      var pp = leHover ? lePatchPhi : rotAngle + 0.5;
      var patchSize = 0.4;
      var patchRes = 8;
      var patchPts = [];

      for (var i = 0; i <= patchRes; i++) {
        patchPts[i] = [];
        var t = pt - patchSize / 2 + (i / patchRes) * patchSize;
        t = Math.max(0.05, Math.min(Math.PI - 0.05, t));
        for (var j = 0; j <= patchRes; j++) {
          var ph = pp - patchSize / 2 + (j / patchRes) * patchSize;
          var p = sphereVertex(t, ph, 1);
          p = rotateY(p, rotAngle);
          p = rotateX(p, 0.3);
          patchPts[i][j] = project(p, sCx, sCy, sR);
        }
      }

      // Draw patch on sphere
      for (var i = 0; i <= patchRes; i++) {
        for (var j = 0; j < patchRes; j++) {
          var a = patchPts[i][j], b = patchPts[i][j + 1];
          if (a.depth > -0.3 && b.depth > -0.3) drawLine(ctx, a.sx, a.sy, b.sx, b.sy, 0.8, 1.5);
        }
      }
      for (var j = 0; j <= patchRes; j++) {
        for (var i = 0; i < patchRes; i++) {
          var a = patchPts[i][j], b = patchPts[i + 1][j];
          if (a.depth > -0.3 && b.depth > -0.3) drawLine(ctx, a.sx, a.sy, b.sx, b.sy, 0.8, 1.5);
        }
      }

      // Draw flat patch on the right
      var flatCx = W * 0.82, flatCy = H * 0.55;
      var flatSize = Math.min(W * 0.14, H * 0.28);

      for (var i = 0; i <= patchRes; i++) {
        var t = i / patchRes;
        var x = flatCx - flatSize / 2 + t * flatSize;
        var y = flatCy - flatSize / 2 + t * flatSize;
        drawLine(ctx, x, flatCy - flatSize / 2, x, flatCy + flatSize / 2, 0.7, 1.2);
        drawLine(ctx, flatCx - flatSize / 2, y, flatCx + flatSize / 2, y, 0.7, 1.2);
      }

      // Arrow
      var arrowStartX = sCx + sR + 15;
      var arrowEndX = flatCx - flatSize / 2 - 15;
      var arrowY = H * 0.55;
      drawLine(ctx, arrowStartX, arrowY, arrowEndX, arrowY, 0.3, 1.5);
      ctx.beginPath();
      ctx.moveTo(arrowEndX, arrowY);
      ctx.lineTo(arrowEndX - 8, arrowY - 5);
      ctx.lineTo(arrowEndX - 8, arrowY + 5);
      ctx.closePath();
      ctx.fillStyle = CYAN + '0.3)';
      ctx.fill();

      ctx.font = SMALL_FONT;
      ctx.fillStyle = CYAN + '0.6)';
      ctx.textAlign = 'center';
      ctx.fillText('\u03C6', (arrowStartX + arrowEndX) / 2, arrowY - 10);

      ctx.font = LABEL_FONT;
      ctx.fillStyle = TEXT_COLOR;
      ctx.textAlign = 'center';
      ctx.fillText('U \u2282 S\u00B2', sCx, H - 15);
      ctx.fillText('\u03C6(U) \u2282 \u211D\u00B2', flatCx, H - 15);

      if (!leHover) {
        ctx.font = SMALL_FONT;
        ctx.fillStyle = 'rgba(122, 143, 166, 0.4)';
        ctx.fillText('hover over the sphere', sCx, 50);
      }
    }

    draw();
  })();

  // ============================================================
  // Viz 3: Spherical coordinates (θ, φ) on S²
  // ============================================================

  (function () {
    var c = initCanvas('ch1-local');
    if (!c) return;
    var ctx = c.ctx;
    var canvas = c.canvas;
    var rotAngle = 0.6;
    var rotXA = 0.3;
    var pointTheta = Math.PI * 0.4;
    var pointPhi = 0.8;
    var dragging = false;

    canvas.addEventListener('mousedown', function (e) {
      var rect = canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      var W = c.width(), H = c.height();
      var sCx = W * 0.5, sCy = H * 0.5;
      var sR = Math.min(W * 0.28, H * 0.4);
      var hit = screenToSphere(mx, my, sCx, sCy, sR, rotAngle, rotXA);
      if (hit) {
        dragging = true;
        pointTheta = Math.max(0.1, Math.min(Math.PI - 0.1, hit.theta));
        pointPhi = hit.phi;
      }
    });

    canvas.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var rect = canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      var W = c.width(), H = c.height();
      var sCx = W * 0.5, sCy = H * 0.5;
      var sR = Math.min(W * 0.28, H * 0.4);
      var hit = screenToSphere(mx, my, sCx, sCy, sR, rotAngle, rotXA);
      if (hit) {
        pointTheta = Math.max(0.1, Math.min(Math.PI - 0.1, hit.theta));
        pointPhi = hit.phi;
      }
    });

    window.addEventListener('mouseup', function () { dragging = false; });

    function drawArc(pts, color, alpha, width) {
      for (var i = 0; i < pts.length - 1; i++) {
        var a = pts[i], b = pts[i + 1];
        if (a.depth > -0.3 && b.depth > -0.3) {
          drawLine(ctx, a.sx, a.sy, b.sx, b.sy, alpha, width, color);
        }
      }
    }

    function draw() {
      var W = c.width(), H = c.height();
      ctx.clearRect(0, 0, W, H);

      var sCx = W * 0.5, sCy = H * 0.5;
      var sR = Math.min(W * 0.28, H * 0.4);

      // Sphere wireframe
      drawSphereWireframe(ctx, sCx, sCy, sR, rotAngle, rotXA, 1, 14, 20, 0.12);

      var th = pointTheta, ph = pointPhi;

      // ── Draw the θ arc: from north pole (θ=0) down to point, along the meridian φ=ph ──
      var thetaArcPts = [];
      var nArc = 40;
      for (var i = 0; i <= nArc; i++) {
        var t = (i / nArc) * th;
        var p = sphereVertex(t, ph, 1);
        p = rotateY(p, rotAngle);
        p = rotateX(p, rotXA);
        thetaArcPts.push(project(p, sCx, sCy, sR));
      }
      drawArc(thetaArcPts, ORANGE, 0.9, 2.5);

      // ── Draw the φ arc: from φ=0 to φ=ph, along the latitude θ=th ──
      var phiArcPts = [];
      var phNorm = ph;
      // Normalize to [0, 2π)
      while (phNorm < 0) phNorm += Math.PI * 2;
      while (phNorm > Math.PI * 2) phNorm -= Math.PI * 2;
      for (var i = 0; i <= nArc; i++) {
        var p2 = (i / nArc) * phNorm;
        var p = sphereVertex(th, p2, 1);
        p = rotateY(p, rotAngle);
        p = rotateX(p, rotXA);
        phiArcPts.push(project(p, sCx, sCy, sR));
      }
      drawArc(phiArcPts, CYAN, 0.9, 2.5);

      // ── Draw reference meridian φ=0 (faint) ──
      var refPts = [];
      for (var i = 0; i <= nArc; i++) {
        var t = (i / nArc) * Math.PI;
        var p = sphereVertex(t, 0, 1);
        p = rotateY(p, rotAngle);
        p = rotateX(p, rotXA);
        refPts.push(project(p, sCx, sCy, sR));
      }
      drawArc(refPts, CYAN, 0.15, 1);

      // ── Draw the full latitude circle at θ=th (faint) ──
      var latPts = [];
      for (var i = 0; i <= 60; i++) {
        var p2 = (i / 60) * Math.PI * 2;
        var p = sphereVertex(th, p2, 1);
        p = rotateY(p, rotAngle);
        p = rotateX(p, rotXA);
        latPts.push(project(p, sCx, sCy, sR));
      }
      drawArc(latPts, CYAN, 0.1, 0.8);

      // ── North pole ──
      var np = sphereVertex(0, 0, 1);
      np = rotateY(np, rotAngle);
      np = rotateX(np, rotXA);
      var npS = project(np, sCx, sCy, sR);
      if (npS.depth > -0.5) {
        ctx.beginPath();
        ctx.arc(npS.sx, npS.sy, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fill();
        ctx.font = SMALL_FONT;
        ctx.fillStyle = TEXT_COLOR;
        ctx.textAlign = 'center';
        ctx.fillText('N', npS.sx, npS.sy - 10);
      }

      // ── Reference point at φ=0 on equator (faint) ──
      var refP = sphereVertex(th, 0, 1);
      refP = rotateY(refP, rotAngle);
      refP = rotateX(refP, rotXA);
      var refPS = project(refP, sCx, sCy, sR);
      if (refPS.depth > -0.3) {
        ctx.beginPath();
        ctx.arc(refPS.sx, refPS.sy, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();
      }

      // ── The point p ──
      var pt = sphereVertex(th, ph, 1);
      pt = rotateY(pt, rotAngle);
      pt = rotateX(pt, rotXA);
      var ptS = project(pt, sCx, sCy, sR);

      if (ptS.depth > -0.5) {
        ctx.beginPath();
        ctx.arc(ptS.sx, ptS.sy, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fill();

        ctx.font = LABEL_FONT;
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText('p', ptS.sx + 10, ptS.sy - 4);
      }

      // ── θ label on the arc ──
      var thetaMid = sphereVertex(th * 0.5, ph, 1.12);
      thetaMid = rotateY(thetaMid, rotAngle);
      thetaMid = rotateX(thetaMid, rotXA);
      var thetaMidS = project(thetaMid, sCx, sCy, sR);
      if (thetaMidS.depth > -0.3) {
        ctx.font = LABEL_FONT;
        ctx.fillStyle = ORANGE + '0.9)';
        ctx.textAlign = 'center';
        ctx.fillText('\u03B8', thetaMidS.sx, thetaMidS.sy);
      }

      // ── φ label on the arc ──
      var phiMid = sphereVertex(th, phNorm * 0.5, 1.12);
      phiMid = rotateY(phiMid, rotAngle);
      phiMid = rotateX(phiMid, rotXA);
      var phiMidS = project(phiMid, sCx, sCy, sR);
      if (phiMidS.depth > -0.3) {
        ctx.font = LABEL_FONT;
        ctx.fillStyle = CYAN + '0.9)';
        ctx.textAlign = 'center';
        ctx.fillText('\u03C6', phiMidS.sx, phiMidS.sy);
      }

      // ── Coordinate display ──
      ctx.font = LABEL_FONT;
      ctx.textAlign = 'center';
      ctx.fillStyle = ORANGE + '0.8)';
      ctx.fillText('\u03B8 = ' + th.toFixed(2) + ' rad', sCx - 80, H - 15);
      ctx.fillStyle = CYAN + '0.8)';
      ctx.fillText('\u03C6 = ' + phNorm.toFixed(2) + ' rad', sCx + 80, H - 15);

      ctx.font = SMALL_FONT;
      ctx.fillStyle = 'rgba(122, 143, 166, 0.4)';
      ctx.textAlign = 'center';
      ctx.fillText('click and drag on S\u00B2', sCx, 20);

      requestAnimationFrame(draw);
    }

    draw();
  })();

  // ============================================================
  // Viz 4: Stereographic Projection — Interactive (fixed)
  // ============================================================

  (function () {
    var c = initCanvas('ch1-stereo');
    if (!c) return;
    var ctx = c.ctx;
    var canvas = c.canvas;
    var rotAngle = 0.5;
    var pointTheta = Math.PI * 0.55;
    var pointPhi = Math.PI * 0.4;
    var dragging = false;
    var fromNorth = true;

    function sphereLayout() {
      var W = c.width(), H = c.height();
      return {
        sCx: W * 0.35, sCy: H * 0.5,
        sR: Math.min(W * 0.2, H * 0.38),
        rotX: 0.25
      };
    }

    canvas.addEventListener('mousedown', function (e) {
      var rect = canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left;
      var my = e.clientY - rect.top;
      var W = c.width(), H = c.height();
      var sl = sphereLayout();

      // Check toggle button
      var btnCx = sl.sCx, btnCy = H - 25;
      if (Math.abs(mx - btnCx) < 60 && Math.abs(my - btnCy) < 12) {
        fromNorth = !fromNorth;
        return;
      }

      // Try to pick a point on sphere
      var hit = screenToSphere(mx, my, sl.sCx, sl.sCy, sl.sR, rotAngle, sl.rotX);
      if (hit) {
        dragging = true;
        pointTheta = hit.theta;
        pointPhi = hit.phi;
      }
    });

    canvas.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var rect = canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left;
      var my = e.clientY - rect.top;
      var sl = sphereLayout();

      var hit = screenToSphere(mx, my, sl.sCx, sl.sCy, sl.sR, rotAngle, sl.rotX);
      if (hit) {
        pointTheta = hit.theta;
        pointPhi = hit.phi;
      }
    });

    window.addEventListener('mouseup', function () { dragging = false; });

    function draw() {
      var W = c.width(), H = c.height();
      ctx.clearRect(0, 0, W, H);

      var sl = sphereLayout();
      var sCx = sl.sCx, sCy = sl.sCy, sR = sl.sR, rotX = sl.rotX;

      // Draw sphere
      drawSphereWireframe(ctx, sCx, sCy, sR, rotAngle, rotX, 1, 14, 20, 0.18);

      // Point on sphere (world coords for projection formula)
      var pt = sphereVertex(pointTheta, pointPhi, 1);
      var ptWorld = { x: pt.x, y: pt.y, z: pt.z };
      // Rotated for display
      var ptRot = rotateX(rotateY(pt, rotAngle), rotX);
      var ptProj = project(ptRot, sCx, sCy, sR);

      // Pole
      var poleTheta = fromNorth ? 0 : Math.PI;
      var pole = sphereVertex(poleTheta, 0, 1);
      var poleRot = rotateX(rotateY(pole, rotAngle), rotX);
      var poleProj = project(poleRot, sCx, sCy, sR);

      // Draw projection line
      drawDashedLine(ctx, poleProj.sx, poleProj.sy, ptProj.sx, ptProj.sy, 0.4, 1);

      // Draw point & pole
      if (ptProj.depth > -0.8) drawCircle(ctx, ptProj.sx, ptProj.sy, 5, 0.9);
      drawCircle(ctx, poleProj.sx, poleProj.sy, 4, 0.9, ORANGE);

      ctx.font = SMALL_FONT;
      ctx.textAlign = 'center';
      ctx.fillStyle = CYAN + '0.8)';
      if (ptProj.depth > -0.8) ctx.fillText('p', ptProj.sx, ptProj.sy - 10);
      ctx.fillStyle = ORANGE + '0.7)';
      ctx.fillText(fromNorth ? 'N' : 'S', poleProj.sx, poleProj.sy - 10);

      // ── Right side: ℝ² projection plane ──
      var planeCx = W * 0.75, planeCy = H * 0.5;
      var planeSize = Math.min(W * 0.25, H * 0.4);
      var gridHalf = planeSize / 2;

      // Compute stereographic projection
      // Our sphere vertex convention: y = cos(theta) is the "up" axis
      var u, v;
      if (fromNorth) {
        // Project from N=(0,1,0): σ_N(x,y,z) = (x/(1-y), z/(1-y))
        var denom = 1 - ptWorld.y;
        if (Math.abs(denom) < 0.001) denom = 0.001;
        u = ptWorld.x / denom;
        v = ptWorld.z / denom;
      } else {
        // Project from S=(0,-1,0): σ_S(x,y,z) = (x/(1+y), z/(1+y))
        var denom = 1 + ptWorld.y;
        if (Math.abs(denom) < 0.001) denom = 0.001;
        u = ptWorld.x / denom;
        v = ptWorld.z / denom;
      }

      // Draw grid
      for (var i = 0; i <= 8; i++) {
        var t = -1 + (2 * i / 8);
        var x = planeCx + t * gridHalf;
        var y = planeCy + t * gridHalf;
        drawLine(ctx, x, planeCy - gridHalf, x, planeCy + gridHalf, 0.08);
        drawLine(ctx, planeCx - gridHalf, y, planeCx + gridHalf, y, 0.08);
      }
      drawLine(ctx, planeCx - gridHalf, planeCy, planeCx + gridHalf, planeCy, 0.2, 1);
      drawLine(ctx, planeCx, planeCy - gridHalf, planeCx, planeCy + gridHalf, 0.2, 1);

      // Unit circle
      ctx.beginPath();
      for (var i = 0; i <= 64; i++) {
        var a = (i / 64) * Math.PI * 2;
        var cx2 = planeCx + Math.cos(a) * gridHalf / 2;
        var cy2 = planeCy + Math.sin(a) * gridHalf / 2;
        if (i === 0) ctx.moveTo(cx2, cy2);
        else ctx.lineTo(cx2, cy2);
      }
      ctx.strokeStyle = CYAN + '0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Projected point
      var projScale = gridHalf / 2;
      var projX = planeCx + u * projScale;
      var projY = planeCy - v * projScale;
      var cX = Math.max(planeCx - gridHalf + 5, Math.min(planeCx + gridHalf - 5, projX));
      var cY = Math.max(planeCy - gridHalf + 5, Math.min(planeCy + gridHalf - 5, projY));

      drawCircle(ctx, cX, cY, 5, 0.9);
      drawDashedLine(ctx, ptProj.sx, ptProj.sy, cX, cY, 0.15, 1);

      // Labels
      ctx.font = LABEL_FONT;
      ctx.fillStyle = TEXT_COLOR;
      ctx.textAlign = 'center';
      ctx.fillText('S\u00B2', sCx, 25);
      ctx.fillText('\u211D\u00B2', planeCx, 25);

      ctx.font = SMALL_FONT;
      ctx.fillStyle = CYAN + '0.7)';
      var label = fromNorth ? '\u03C3\u2099' : '\u03C3\u209B';
      ctx.fillText(label + '(p) = (' + u.toFixed(2) + ', ' + v.toFixed(2) + ')', planeCx, planeCy + gridHalf + 25);

      // Toggle button
      ctx.fillStyle = 'rgba(0, 212, 255, 0.08)';
      ctx.strokeStyle = CYAN + '0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(sCx - 55, H - 38, 110, 24, 4);
      ctx.fill();
      ctx.stroke();
      ctx.font = SMALL_FONT;
      ctx.fillStyle = CYAN + '0.7)';
      ctx.textAlign = 'center';
      ctx.fillText(fromNorth ? 'pole: North (click)' : 'pole: South (click)', sCx, H - 22);

      ctx.fillStyle = 'rgba(122, 143, 166, 0.4)';
      ctx.fillText('drag the point on S\u00B2', sCx, 42);

      requestAnimationFrame(draw);
    }

    draw();
  })();
})();
