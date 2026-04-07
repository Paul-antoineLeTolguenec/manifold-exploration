// ============================================================
// Chapter 7: Projection onto Manifolds — Visualizations
// ============================================================

(function () {
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

  // ── Ch7-specific helpers ──

  // Tangent basis at point p on S² (in R³)
  function tangentBasis(theta, phi) {
    var cosT = Math.cos(theta), sinT = Math.sin(theta);
    var cosP = Math.cos(phi), sinP = Math.sin(phi);
    // e_theta: derivative of sphereVertex w.r.t. theta (unit length in R³)
    var eTheta = { x: cosT * cosP, y: -sinT, z: cosT * sinP };
    // e_phi: derivative of sphereVertex w.r.t. phi is (-sinT sinP, 0, sinT cosP)
    // Normalize to unit length in R³: divide by sinT
    var ePhi;
    if (sinT > 1e-10) {
      ePhi = { x: -sinP, y: 0, z: cosP };
    } else {
      ePhi = { x: 0, y: 0, z: 1 };
    }
    return { eTheta: eTheta, ePhi: ePhi };
  }

  // Exponential map on S²: exp_p(v) where p is unit R³, v is tangent at p
  function expMap(p, v) {
    var r = vecLen(v);
    if (r < 1e-12) return { x: p.x, y: p.y, z: p.z };
    var vHat = vecScale(v, 1 / r);
    return vecAdd(vecScale(p, Math.cos(r)), vecScale(vHat, Math.sin(r)));
  }

  // Logarithmic map on S²: log_p(q)
  function logMap(p, q) {
    var cosD = Math.max(-1, Math.min(1, dot(p, q)));
    var d = Math.acos(cosD);
    if (d < 1e-12) return { x: 0, y: 0, z: 0 };
    var tangentComp = vecSub(q, vecScale(p, cosD));
    var tangentLen = vecLen(tangentComp);
    if (tangentLen < 1e-12) return { x: 0, y: 0, z: 0 };
    return vecScale(tangentComp, d / tangentLen);
  }

  // Geodesic circle on S²: points at geodesic distance radius from center
  function geodesicCircle(pCenter, radius, nPts) {
    var th = Math.acos(Math.max(-1, Math.min(1, pCenter.y)));
    var ph = Math.atan2(pCenter.z, pCenter.x);
    var sinT = Math.sin(th) || 0.01;
    var dTh = { x: Math.cos(th) * Math.cos(ph), y: -Math.sin(th), z: Math.cos(th) * Math.sin(ph) };
    var dPh = { x: -sinT * Math.sin(ph), y: 0, z: sinT * Math.cos(ph) };
    var dPhLen = Math.sqrt(dot(dPh, dPh));
    if (dPhLen > 0.001) dPh = vecScale(dPh, 1 / dPhLen);
    var pts = [];
    for (var i = 0; i <= nPts; i++) {
      var angle = (i / nPts) * Math.PI * 2;
      var dir = vecAdd(vecScale(dTh, Math.cos(angle)), vecScale(dPh, Math.sin(angle)));
      var pt = vecAdd(vecScale(pCenter, Math.cos(radius)), vecScale(dir, Math.sin(radius)));
      pts.push(pt);
    }
    return pts;
  }


  // ============================================================
  // Viz 1: Projection onto S²
  // ============================================================
  // A point q in ambient R³ (outside the sphere) and its projection
  // π(q) = q/‖q‖ onto S². Drag to rotate view, slider for ‖q‖.

  (function () {
    var c = initCanvas('ch7-projection');
    if (!c) return;
    var ctx = c.ctx;
    var canvas = c.canvas;

    var rotYA = 0.5, rotXA = 0.35;
    var qTheta = Math.PI * 0.4, qPhi = 0.3;
    var qRadius = 1.8; // ‖q‖ — distance from origin
    var dragging = false;
    var draggingSlider = false;

    canvas.addEventListener('mousedown', function (e) {
      var rect = canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      var W = c.width(), H = c.height();
      // Check slider
      var sliderY = H - 50;
      if (Math.abs(my - sliderY) < 20) {
        draggingSlider = true;
        updateSlider(mx, W);
        return;
      }
      dragging = true;
    });

    canvas.addEventListener('mousemove', function (e) {
      var rect = canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      var W = c.width();
      if (draggingSlider) {
        updateSlider(mx, W);
        return;
      }
      if (!dragging) return;
      // Drag rotates the point q around the sphere
      var W = c.width(), H = c.height();
      var sCx = W * 0.5, sCy = H * 0.5;
      var sR = Math.min(W * 0.22, H * 0.35);
      var hit = screenToSphere(mx, my, sCx, sCy, sR, rotYA, rotXA);
      if (hit) {
        qTheta = Math.max(0.15, Math.min(Math.PI - 0.15, hit.theta));
        qPhi = hit.phi;
      }
    });

    window.addEventListener('mouseup', function () { dragging = false; draggingSlider = false; });

    function updateSlider(mx, W) {
      var sliderLeft = W * 0.1, sliderRight = W * 0.9;
      var t = (mx - sliderLeft) / (sliderRight - sliderLeft);
      t = Math.max(0, Math.min(1, t));
      qRadius = 0.05 + t * 2.45; // range [0.05, 2.5]
    }

    function draw() {
      requestAnimationFrame(draw);
      if (!c.isVisible()) return;
      var W = c.width(), H = c.height();
      ctx.clearRect(0, 0, W, H);
      var sCx = W * 0.5, sCy = H * 0.48;
      var sR = Math.min(W * 0.22, H * 0.35);

      // Draw sphere wireframe
      drawSphereWireframe(ctx, sCx, sCy, sR, rotYA, rotXA, 1, 14, 20, 0.08);

      // Compute q in R³
      var qDir = sphereVertex(qTheta, qPhi, 1);
      var q = vecScale(qDir, qRadius);
      var proj = vecNorm(q); // π(q) = q/‖q‖

      // Transform and project to screen
      var qRot = rotateX(rotateY(q, rotYA), rotXA);
      var qScreen = project(qRot, sCx, sCy, sR);
      var projRot = rotateX(rotateY(proj, rotYA), rotXA);
      var projScreen = project(projRot, sCx, sCy, sR);

      // Draw normal line (extension through q beyond the sphere)
      var normalFar = vecScale(qDir, 2.8);
      var normalNear = vecScale(qDir, -0.3);
      var nfRot = rotateX(rotateY(normalFar, rotYA), rotXA);
      var nfScreen = project(nfRot, sCx, sCy, sR);
      var nnRot = rotateX(rotateY(normalNear, rotYA), rotXA);
      var nnScreen = project(nnRot, sCx, sCy, sR);

      // Dashed normal line
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.moveTo(nnScreen.sx, nnScreen.sy);
      ctx.lineTo(nfScreen.sx, nfScreen.sy);
      ctx.strokeStyle = 'rgba(122, 143, 166, 0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw projection line q → π(q)
      if (qRadius > 1.01 || qRadius < 0.99) {
        ctx.beginPath();
        ctx.moveTo(qScreen.sx, qScreen.sy);
        ctx.lineTo(projScreen.sx, projScreen.sy);
        ctx.strokeStyle = CYAN + '0.7)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Ambiguity visualization when q near origin
      if (qRadius < 0.3) {
        var nLines = 8;
        for (var i = 0; i < nLines; i++) {
          var aTheta = (i / nLines) * Math.PI;
          var aPhi = (i / nLines) * Math.PI * 4;
          var target = sphereVertex(aTheta, aPhi, 1);
          var tRot = rotateX(rotateY(target, rotYA), rotXA);
          var tScreen = project(tRot, sCx, sCy, sR);
          ctx.beginPath();
          ctx.setLineDash([3, 5]);
          ctx.moveTo(qScreen.sx, qScreen.sy);
          ctx.lineTo(tScreen.sx, tScreen.sy);
          ctx.strokeStyle = RED + '0.4)';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Draw projection point on sphere
      if (projScreen.depth > -0.3 && qRadius > 0.3) {
        ctx.beginPath();
        ctx.arc(projScreen.sx, projScreen.sy, 6, 0, Math.PI * 2);
        ctx.fillStyle = CYAN + '0.95)';
        ctx.fill();
        ctx.font = LABEL_FONT;
        ctx.fillStyle = CYAN + '0.8)';
        ctx.textAlign = 'center';
        ctx.fillText('\u03C0(q)', projScreen.sx, projScreen.sy - 12);
      }

      // Draw point q
      ctx.beginPath();
      ctx.arc(qScreen.sx, qScreen.sy, 5, 0, Math.PI * 2);
      ctx.fillStyle = qRadius < 0.3 ? RED + '0.9)' : 'rgba(255, 255, 255, 0.95)';
      ctx.fill();
      ctx.font = LABEL_FONT;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.textAlign = 'center';
      ctx.fillText('q', qScreen.sx, qScreen.sy - 12);

      // Draw origin
      var originRot = rotateX(rotateY({ x: 0, y: 0, z: 0 }, rotYA), rotXA);
      var originScreen = project(originRot, sCx, sCy, sR);
      ctx.beginPath();
      ctx.arc(originScreen.sx, originScreen.sy, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(122, 143, 166, 0.6)';
      ctx.fill();

      // Slider for ‖q‖
      var sliderY = H - 50;
      var sliderLeft = W * 0.1, sliderRight = W * 0.9;
      var sliderT = (qRadius - 0.05) / 2.45;
      var sliderX = sliderLeft + sliderT * (sliderRight - sliderLeft);

      ctx.beginPath();
      ctx.moveTo(sliderLeft, sliderY);
      ctx.lineTo(sliderRight, sliderY);
      ctx.strokeStyle = 'rgba(122, 143, 166, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Mark ‖q‖ = 1 on slider
      var oneT = (1 - 0.05) / 2.45;
      var oneX = sliderLeft + oneT * (sliderRight - sliderLeft);
      ctx.beginPath();
      ctx.moveTo(oneX, sliderY - 6);
      ctx.lineTo(oneX, sliderY + 6);
      ctx.strokeStyle = 'rgba(122, 143, 166, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.font = SMALL_FONT;
      ctx.textAlign = 'center';
      ctx.fillStyle = TEXT_COLOR;
      ctx.fillText('on S\u00B2', oneX, sliderY + 18);

      ctx.beginPath();
      ctx.arc(sliderX, sliderY, 8, 0, Math.PI * 2);
      ctx.fillStyle = qRadius < 0.3 ? RED + '0.9)' : CYAN + '0.9)';
      ctx.fill();

      ctx.font = LABEL_FONT;
      ctx.textAlign = 'center';
      ctx.fillStyle = TEXT_COLOR;
      ctx.fillText('\u2016q\u2016 = ' + qRadius.toFixed(2), (sliderLeft + sliderRight) / 2, sliderY + 32);

      // Info
      ctx.font = '13px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = CYAN + '0.9)';
      var dist = Math.abs(qRadius - 1);
      ctx.fillText('\u03C0(q) = q / \u2016q\u2016', 15, 22);
      ctx.font = LABEL_FONT;
      ctx.fillStyle = CYAN + '0.6)';
      ctx.fillText('\u2016q \u2212 \u03C0(q)\u2016 = ' + dist.toFixed(3), 15, 40);

      if (qRadius < 0.3) {
        ctx.fillStyle = RED + '0.8)';
        ctx.fillText('q \u2248 0: projection undefined (all points equidistant)', 15, 58);
      }

      ctx.font = SMALL_FONT;
      ctx.fillStyle = 'rgba(122, 143, 166, 0.4)';
      ctx.textAlign = 'center';
      ctx.fillText('drag on sphere to move q direction, slider for \u2016q\u2016', sCx, H - 12);
    }

    draw();
  })();


  // ============================================================
  // Viz 2: Exponential Map on S² (split view)
  // ============================================================
  // Left: tangent plane (2D) with draggable vector v
  // Right: sphere showing geodesic from p to exp_p(v)

  (function () {
    var c = initCanvas('ch7-expmap', 0.6);
    if (!c) return;
    var ctx = c.ctx;
    var canvas = c.canvas;

    var rotYA = 0.4, rotXA = 0.3;
    // Base point on sphere
    var pTheta = Math.PI * 0.4, pPhi = 0.2;
    // Tangent vector in local 2D coords (a, b) -> v = a*eTheta + b*ePhi
    var va = 0.8, vb = 0.5;
    var draggingVec = false;
    var draggingPt = false;

    canvas.addEventListener('mousedown', function (e) {
      var rect = canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      var W = c.width(), H = c.height();
      var split = W * 0.4;

      if (mx < split) {
        // Left panel: tangent plane
        draggingVec = true;
        updateVec(mx, my, W, H);
      } else {
        // Right panel: move base point
        var sCx = split + (W - split) * 0.5, sCy = H * 0.5;
        var sR = Math.min((W - split) * 0.32, H * 0.38);
        var hit = screenToSphere(mx, my, sCx, sCy, sR, rotYA, rotXA);
        if (hit) {
          draggingPt = true;
          pTheta = Math.max(0.15, Math.min(Math.PI - 0.15, hit.theta));
          pPhi = hit.phi;
        }
      }
    });

    canvas.addEventListener('mousemove', function (e) {
      var rect = canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      var W = c.width(), H = c.height();
      if (draggingVec) {
        updateVec(mx, my, W, H);
      } else if (draggingPt) {
        var split = W * 0.4;
        var sCx = split + (W - split) * 0.5, sCy = H * 0.5;
        var sR = Math.min((W - split) * 0.32, H * 0.38);
        var hit = screenToSphere(mx, my, sCx, sCy, sR, rotYA, rotXA);
        if (hit) {
          pTheta = Math.max(0.15, Math.min(Math.PI - 0.15, hit.theta));
          pPhi = hit.phi;
        }
      }
    });

    window.addEventListener('mouseup', function () { draggingVec = false; draggingPt = false; });

    function updateVec(mx, my, W, H) {
      var tpCx = W * 0.2, tpCy = H * 0.5;
      var tpScale = Math.min(W * 0.15, H * 0.3);
      va = (mx - tpCx) / tpScale * Math.PI;
      vb = (my - tpCy) / tpScale * Math.PI;
      // Clamp to reasonable range
      var len = Math.sqrt(va * va + vb * vb);
      if (len > Math.PI * 1.5) {
        va *= Math.PI * 1.5 / len;
        vb *= Math.PI * 1.5 / len;
      }
    }

    function draw() {
      requestAnimationFrame(draw);
      if (!c.isVisible()) return;
      var W = c.width(), H = c.height();
      ctx.clearRect(0, 0, W, H);

      var split = W * 0.4;
      var vLen = Math.sqrt(va * va + vb * vb);
      var pastInj = vLen > Math.PI;

      // ── Left panel: tangent plane ──
      var tpCx = W * 0.2, tpCy = H * 0.5;
      var tpScale = Math.min(W * 0.15, H * 0.3);

      // Divider
      ctx.beginPath();
      ctx.moveTo(split, 30);
      ctx.lineTo(split, H - 30);
      ctx.strokeStyle = 'rgba(122, 143, 166, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Grid
      ctx.strokeStyle = 'rgba(122, 143, 166, 0.1)';
      ctx.lineWidth = 0.5;
      for (var i = -4; i <= 4; i++) {
        var gx = tpCx + i * tpScale / Math.PI * Math.PI * 0.5;
        ctx.beginPath(); ctx.moveTo(gx, tpCy - tpScale * 1.2); ctx.lineTo(gx, tpCy + tpScale * 1.2); ctx.stroke();
        var gy = tpCy + i * tpScale / Math.PI * Math.PI * 0.5;
        ctx.beginPath(); ctx.moveTo(tpCx - tpScale * 1.2, gy); ctx.lineTo(tpCx + tpScale * 1.2, gy); ctx.stroke();
      }

      // Injectivity radius circle (radius = π in tangent space)
      var injR = tpScale; // tpScale corresponds to π
      ctx.beginPath();
      ctx.arc(tpCx, tpCy, injR, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(122, 143, 166, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = SMALL_FONT;
      ctx.fillStyle = TEXT_COLOR;
      ctx.textAlign = 'center';
      ctx.fillText('inj(p) = \u03C0', tpCx + injR + 2, tpCy - 8);

      // Origin dot
      ctx.beginPath();
      ctx.arc(tpCx, tpCy, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fill();
      ctx.font = SMALL_FONT;
      ctx.fillStyle = TEXT_COLOR;
      ctx.textAlign = 'right';
      ctx.fillText('0', tpCx - 6, tpCy + 4);

      // Tangent vector arrow
      var vsx = tpCx + va / Math.PI * tpScale;
      var vsy = tpCy + vb / Math.PI * tpScale;
      var vecColor = pastInj ? RED : CYAN;
      drawArrow(ctx, tpCx, tpCy, vsx, vsy, vecColor, '0.9', 2.5);

      // Vector tip dot
      ctx.beginPath();
      ctx.arc(vsx, vsy, 5, 0, Math.PI * 2);
      ctx.fillStyle = vecColor + '0.95)';
      ctx.fill();

      // Labels
      ctx.font = LABEL_FONT;
      ctx.textAlign = 'center';
      ctx.fillStyle = vecColor + '0.8)';
      ctx.fillText('v', vsx + 12, vsy - 8);
      ctx.fillText('\u2016v\u2016 = ' + vLen.toFixed(2), tpCx, tpCy + tpScale * 1.25 + 15);

      ctx.fillStyle = CYAN + '0.7)';
      ctx.fillText('T\u209AM', tpCx, 25);

      // ── Right panel: sphere ──
      var sCx = split + (W - split) * 0.5, sCy = H * 0.5;
      var sR = Math.min((W - split) * 0.32, H * 0.38);

      drawSphereWireframe(ctx, sCx, sCy, sR, rotYA, rotXA, 1, 14, 20, 0.08);

      // Base point p
      var p3d = sphereVertex(pTheta, pPhi, 1);
      var basis = tangentBasis(pTheta, pPhi);

      // Tangent vector in R³
      var vR3 = vecAdd(vecScale(basis.eTheta, va), vecScale(basis.ePhi, vb));

      // Geodesic arc from p to exp_p(v)
      var expPt = expMap(p3d, vR3);
      var nSteps = Math.max(20, Math.floor(vLen * 30));
      var geoColor = pastInj ? RED : CYAN;

      for (var i = 0; i < nSteps; i++) {
        var t0 = i / nSteps, t1 = (i + 1) / nSteps;
        var pt0 = expMap(p3d, vecScale(vR3, t0));
        var pt1 = expMap(p3d, vecScale(vR3, t1));
        var a = rotateX(rotateY(pt0, rotYA), rotXA);
        var pa = project(a, sCx, sCy, sR);
        var b = rotateX(rotateY(pt1, rotYA), rotXA);
        var pb = project(b, sCx, sCy, sR);
        var avgD = (pa.depth + pb.depth) / 2;
        if (avgD < -0.3) continue;
        var al = 0.3 + 0.6 * ((avgD + 1) / 2);
        drawLine(ctx, pa.sx, pa.sy, pb.sx, pb.sy, al.toFixed(3), 3, geoColor);
      }

      // Draw base point p
      var pRot = rotateX(rotateY(p3d, rotYA), rotXA);
      var pScreen = project(pRot, sCx, sCy, sR);
      if (pScreen.depth > -0.3) {
        ctx.beginPath();
        ctx.arc(pScreen.sx, pScreen.sy, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fill();
        ctx.font = LABEL_FONT;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.textAlign = 'center';
        ctx.fillText('p', pScreen.sx, pScreen.sy - 12);
      }

      // Draw exp_p(v) endpoint
      var eRot = rotateX(rotateY(expPt, rotYA), rotXA);
      var eScreen = project(eRot, sCx, sCy, sR);
      if (eScreen.depth > -0.3) {
        ctx.beginPath();
        ctx.arc(eScreen.sx, eScreen.sy, 6, 0, Math.PI * 2);
        ctx.fillStyle = geoColor + '0.95)';
        ctx.fill();
        ctx.font = LABEL_FONT;
        ctx.fillStyle = geoColor + '0.8)';
        ctx.textAlign = 'center';
        ctx.fillText('exp\u209A(v)', eScreen.sx, eScreen.sy - 12);
      }

      // Draw antipodal point marker when near injectivity radius
      if (vLen > Math.PI * 0.8) {
        var antipode = vecScale(p3d, -1);
        var aRot = rotateX(rotateY(antipode, rotYA), rotXA);
        var aScreen = project(aRot, sCx, sCy, sR);
        if (aScreen.depth > -0.3) {
          ctx.beginPath();
          ctx.arc(aScreen.sx, aScreen.sy, 4, 0, Math.PI * 2);
          ctx.strokeStyle = RED + '0.7)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.font = SMALL_FONT;
          ctx.fillStyle = RED + '0.7)';
          ctx.textAlign = 'center';
          ctx.fillText('cut point', aScreen.sx, aScreen.sy + 14);
        }
      }

      // Right panel title
      ctx.font = LABEL_FONT;
      ctx.textAlign = 'center';
      ctx.fillStyle = CYAN + '0.7)';
      ctx.fillText('S\u00B2', sCx, 25);

      // Info
      ctx.font = LABEL_FONT;
      ctx.textAlign = 'left';
      ctx.fillStyle = CYAN + '0.7)';
      ctx.fillText('exp\u209A(v) = cos(\u2016v\u2016)\u00B7p + sin(\u2016v\u2016)\u00B7v\u0302', split + 10, H - 30);

      if (pastInj) {
        ctx.fillStyle = RED + '0.7)';
        ctx.fillText('\u2016v\u2016 > \u03C0: past injectivity radius', split + 10, H - 12);
      }

      ctx.font = SMALL_FONT;
      ctx.fillStyle = 'rgba(122, 143, 166, 0.4)';
      ctx.textAlign = 'center';
      ctx.fillText('drag vector in T\u209AM (left), click sphere to move p (right)', W * 0.5, H - 12);
    }

    draw();
  })();


  // ============================================================
  // Viz 3: Normal Coordinates — Geodesic grid on S²
  // ============================================================
  // Radial geodesics + geodesic circles emanating from a base point.
  // Shows how the grid converges at the antipodal point.

  (function () {
    var c = initCanvas('ch7-normalcoord');
    if (!c) return;
    var ctx = c.ctx;
    var canvas = c.canvas;

    var rotYA = 0.4, rotXA = 0.3;
    var pTheta = Math.PI * 0.35, pPhi = -0.2;
    var maxDist = 2.0; // animated / slider controlled
    var draggingPt = false;
    var draggingSlider = false;
    var autoAnimate = true;
    var animTime = 0;

    canvas.addEventListener('mousedown', function (e) {
      var rect = canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      var W = c.width(), H = c.height();
      // Check slider
      var sliderY = H - 50;
      if (Math.abs(my - sliderY) < 20) {
        draggingSlider = true;
        autoAnimate = false;
        updateSlider(mx, W);
        return;
      }
      // Try to move base point
      var sCx = W * 0.5, sCy = H * 0.48;
      var sR = Math.min(W * 0.28, H * 0.38);
      var hit = screenToSphere(mx, my, sCx, sCy, sR, rotYA, rotXA);
      if (hit) {
        draggingPt = true;
        pTheta = Math.max(0.15, Math.min(Math.PI - 0.15, hit.theta));
        pPhi = hit.phi;
      }
    });

    canvas.addEventListener('mousemove', function (e) {
      var rect = canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      var W = c.width();
      if (draggingSlider) {
        updateSlider(mx, W);
        return;
      }
      if (!draggingPt) return;
      var H = c.height();
      var sCx = W * 0.5, sCy = H * 0.48;
      var sR = Math.min(W * 0.28, H * 0.38);
      var hit = screenToSphere(mx, my, sCx, sCy, sR, rotYA, rotXA);
      if (hit) {
        pTheta = Math.max(0.15, Math.min(Math.PI - 0.15, hit.theta));
        pPhi = hit.phi;
      }
    });

    window.addEventListener('mouseup', function () { draggingPt = false; draggingSlider = false; });

    function updateSlider(mx, W) {
      var sliderLeft = W * 0.1, sliderRight = W * 0.9;
      var t = (mx - sliderLeft) / (sliderRight - sliderLeft);
      t = Math.max(0, Math.min(1, t));
      maxDist = 0.2 + t * (Math.PI - 0.2);
    }

    function draw() {
      requestAnimationFrame(draw);
      if (!c.isVisible()) return;
      var W = c.width(), H = c.height();
      ctx.clearRect(0, 0, W, H);
      var sCx = W * 0.5, sCy = H * 0.48;
      var sR = Math.min(W * 0.28, H * 0.38);

      // Auto-animate maxDist
      if (autoAnimate) {
        animTime += 0.008;
        maxDist = 0.3 + (Math.PI - 0.3) * (0.5 + 0.5 * Math.sin(animTime));
      }

      drawSphereWireframe(ctx, sCx, sCy, sR, rotYA, rotXA, 1, 14, 20, 0.06);

      var p3d = sphereVertex(pTheta, pPhi, 1);
      var basis = tangentBasis(pTheta, pPhi);
      var nRadial = 16;
      var nCircles = 6;
      var nPtsPerGeodesic = 60;

      // Draw radial geodesics
      for (var k = 0; k < nRadial; k++) {
        var angle = (k / nRadial) * Math.PI * 2;
        var dir = vecAdd(vecScale(basis.eTheta, Math.cos(angle)), vecScale(basis.ePhi, Math.sin(angle)));

        for (var i = 0; i < nPtsPerGeodesic; i++) {
          var t0 = (i / nPtsPerGeodesic) * maxDist;
          var t1 = ((i + 1) / nPtsPerGeodesic) * maxDist;
          var pt0 = expMap(p3d, vecScale(dir, t0));
          var pt1 = expMap(p3d, vecScale(dir, t1));
          var a = rotateX(rotateY(pt0, rotYA), rotXA);
          var pa = project(a, sCx, sCy, sR);
          var b = rotateX(rotateY(pt1, rotYA), rotXA);
          var pb = project(b, sCx, sCy, sR);
          var avgD = (pa.depth + pb.depth) / 2;
          if (avgD < -0.3) continue;
          var depthFade = 0.2 + 0.7 * ((avgD + 1) / 2);
          // Color gradient: cyan near p, orange far
          var distFrac = t1 / Math.PI;
          var cr = Math.floor(0 + 255 * distFrac);
          var cg = Math.floor(212 - 72 * distFrac);
          var cb = Math.floor(255 - 205 * distFrac);
          var al = depthFade * 0.6;
          ctx.beginPath();
          ctx.moveTo(pa.sx, pa.sy);
          ctx.lineTo(pb.sx, pb.sy);
          ctx.strokeStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + al.toFixed(3) + ')';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }

      // Draw geodesic circles
      for (var j = 1; j <= nCircles; j++) {
        var r = (j / (nCircles + 1)) * maxDist;
        var circle = geodesicCircle(p3d, r, 80);
        var distFrac = r / Math.PI;
        var cr = Math.floor(0 + 255 * distFrac);
        var cg = Math.floor(212 - 72 * distFrac);
        var cb = Math.floor(255 - 205 * distFrac);

        for (var i = 1; i < circle.length; i++) {
          var a = rotateX(rotateY(circle[i - 1], rotYA), rotXA);
          var pa = project(a, sCx, sCy, sR);
          var b = rotateX(rotateY(circle[i], rotYA), rotXA);
          var pb = project(b, sCx, sCy, sR);
          var avgD = (pa.depth + pb.depth) / 2;
          if (avgD < -0.3) continue;
          var depthFade = 0.2 + 0.7 * ((avgD + 1) / 2);
          var al = depthFade * 0.5;
          ctx.beginPath();
          ctx.moveTo(pa.sx, pa.sy);
          ctx.lineTo(pb.sx, pb.sy);
          ctx.strokeStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + al.toFixed(3) + ')';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // Draw base point p
      var pRot = rotateX(rotateY(p3d, rotYA), rotXA);
      var pScreen = project(pRot, sCx, sCy, sR);
      if (pScreen.depth > -0.3) {
        ctx.beginPath();
        ctx.arc(pScreen.sx, pScreen.sy, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fill();
        ctx.font = LABEL_FONT;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.textAlign = 'center';
        ctx.fillText('p', pScreen.sx, pScreen.sy - 12);
      }

      // Draw antipodal point when maxDist > π * 0.8
      if (maxDist > Math.PI * 0.8) {
        var antipode = vecScale(p3d, -1);
        var aRot = rotateX(rotateY(antipode, rotYA), rotXA);
        var aScreen = project(aRot, sCx, sCy, sR);
        if (aScreen.depth > -0.3) {
          ctx.beginPath();
          ctx.arc(aScreen.sx, aScreen.sy, 5, 0, Math.PI * 2);
          ctx.fillStyle = ORANGE + '0.9)';
          ctx.fill();
          ctx.font = SMALL_FONT;
          ctx.fillStyle = ORANGE + '0.7)';
          ctx.textAlign = 'center';
          ctx.fillText('\u2212p (antipode)', aScreen.sx, aScreen.sy + 14);
        }
      }

      // Slider for maxDist
      var sliderY = H - 50;
      var sliderLeft = W * 0.1, sliderRight = W * 0.9;
      var sliderT = (maxDist - 0.2) / (Math.PI - 0.2);
      var sliderX = sliderLeft + sliderT * (sliderRight - sliderLeft);

      ctx.beginPath();
      ctx.moveTo(sliderLeft, sliderY);
      ctx.lineTo(sliderRight, sliderY);
      ctx.strokeStyle = 'rgba(122, 143, 166, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(sliderX, sliderY, 8, 0, Math.PI * 2);
      ctx.fillStyle = CYAN + '0.9)';
      ctx.fill();

      ctx.font = LABEL_FONT;
      ctx.textAlign = 'center';
      ctx.fillStyle = TEXT_COLOR;
      ctx.fillText('max geodesic distance = ' + maxDist.toFixed(2) + ' rad', (sliderLeft + sliderRight) / 2, sliderY + 22);

      // Info
      ctx.font = '13px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = CYAN + '0.8)';
      ctx.fillText('normal coordinates at p', 15, 22);
      ctx.font = LABEL_FONT;
      ctx.fillStyle = TEXT_COLOR;
      ctx.fillText(nRadial + ' radial geodesics, ' + nCircles + ' geodesic circles', 15, 40);

      if (maxDist > Math.PI * 0.85) {
        ctx.fillStyle = ORANGE + '0.7)';
        ctx.fillText('all geodesics converge at the antipodal point (K > 0)', 15, 58);
      }

      ctx.font = SMALL_FONT;
      ctx.fillStyle = 'rgba(122, 143, 166, 0.4)';
      ctx.textAlign = 'center';
      ctx.fillText('click sphere to move p, drag slider for distance range', sCx, H - 12);
    }

    draw();
  })();

})();
