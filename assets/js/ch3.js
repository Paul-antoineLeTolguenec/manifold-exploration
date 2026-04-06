// ============================================================
// Chapter 3: Connections & Christoffel Symbols — Visualization
// ============================================================

(function () {
  var CYAN = 'rgba(0, 212, 255, ';
  var ORANGE = 'rgba(255, 140, 50, ';
  var RED = 'rgba(255, 80, 80, ';
  var TEXT_COLOR = '#7a8fa6';
  var LABEL_FONT = '11px "JetBrains Mono", monospace';
  var SMALL_FONT = '10px "JetBrains Mono", monospace';

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

  function initCanvas(id) {
    var canvas = document.getElementById(id);
    if (!canvas) return null;
    var ctx = canvas.getContext('2d');
    var container = canvas.parentElement;
    function resize() {
      var rect = container.getBoundingClientRect();
      var dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = Math.max(400, rect.width * 0.55) * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = Math.max(400, rect.width * 0.55) + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);
    return {
      canvas: canvas, ctx: ctx,
      width: function () { return canvas.width / (window.devicePixelRatio || 1); },
      height: function () { return canvas.height / (window.devicePixelRatio || 1); }
    };
  }

  function vecAdd(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; }
  function vecScale(a, s) { return { x: a.x * s, y: a.y * s, z: a.z * s }; }
  function dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
  function vecLen(a) { return Math.sqrt(dot(a, a)); }

  // ============================================================
  // Viz: Ordinary derivative vs Covariant derivative on S²
  // ============================================================
  //
  // We take Y = ∂/∂φ (a vector field pointing "east").
  // We differentiate it along ∂/∂φ (moving east along a latitude).
  //
  // The ordinary derivative d/dφ(∂/∂φ) = (-sinθ cosφ, 0, -sinθ sinφ)
  // This has a radial (normal) component pointing inward!
  //
  // The covariant derivative removes that normal component:
  //   ∇_φ (∂/∂φ) = -sinθ cosθ ∂/∂θ  (the Γ^θ_φφ term)

  (function () {
    var c = initCanvas('ch3-covariant');
    if (!c) return;
    var ctx = c.ctx;
    var canvas = c.canvas;
    var rotAngle = 0.5;
    var rotXA = 0.35;
    var pointTheta = Math.PI * 0.35;
    var pointPhi = 0.4;
    var dragging = false;

    canvas.addEventListener('mousedown', function (e) {
      var rect = canvas.getBoundingClientRect();
      var W = c.width(), H = c.height();
      var sCx = W * 0.5, sCy = H * 0.5;
      var sR = Math.min(W * 0.28, H * 0.4);
      var hit = screenToSphere(e.clientX - rect.left, e.clientY - rect.top, sCx, sCy, sR, rotAngle, rotXA);
      if (hit) {
        dragging = true;
        pointTheta = Math.max(0.25, Math.min(Math.PI - 0.25, hit.theta));
        pointPhi = hit.phi;
      }
    });

    canvas.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var rect = canvas.getBoundingClientRect();
      var W = c.width(), H = c.height();
      var sCx = W * 0.5, sCy = H * 0.5;
      var sR = Math.min(W * 0.28, H * 0.4);
      var hit = screenToSphere(e.clientX - rect.left, e.clientY - rect.top, sCx, sCy, sR, rotAngle, rotXA);
      if (hit) {
        pointTheta = Math.max(0.25, Math.min(Math.PI - 0.25, hit.theta));
        pointPhi = hit.phi;
      }
    });

    window.addEventListener('mouseup', function () { dragging = false; });

    function draw() {
      var W = c.width(), H = c.height();
      ctx.clearRect(0, 0, W, H);

      var sCx = W * 0.5, sCy = H * 0.5;
      var sR = Math.min(W * 0.28, H * 0.4);

      // Sphere wireframe
      drawSphereWireframe(ctx, sCx, sCy, sR, rotAngle, rotXA, 1, 14, 20, 0.12);

      var th = pointTheta, ph = pointPhi;
      var p = sphereVertex(th, ph, 1);

      // Draw the vector field Y = ∂/∂φ along the latitude circle
      var nField = 16;
      var fieldLen = 0.25;
      for (var k = 0; k < nField; k++) {
        var fphi = (k / nField) * Math.PI * 2;
        var fp = sphereVertex(th, fphi, 1);
        // ∂/∂φ = (-sinθ sinφ, 0, sinθ cosφ)
        var fv = {
          x: -Math.sin(th) * Math.sin(fphi),
          y: 0,
          z: Math.sin(th) * Math.cos(fphi)
        };
        // Normalize display length
        var fl = vecLen(fv);
        if (fl > 0.001) fv = vecScale(fv, fieldLen / fl);
        var fEnd = vecAdd(fp, fv);

        var fpR = rotateX(rotateY(fp, rotAngle), rotXA);
        var fpS = project(fpR, sCx, sCy, sR);
        var feR = rotateX(rotateY(fEnd, rotAngle), rotXA);
        var feS = project(feR, sCx, sCy, sR);

        if (fpS.depth > -0.1) {
          var da = 0.15 + 0.5 * ((fpS.depth + 1) / 2);
          drawArrow(ctx, fpS.sx, fpS.sy, feS.sx, feS.sy, CYAN, da.toFixed(2), 1.5);
        }
      }

      // ── At point p, compute the three vectors ──

      // Y at p: ∂/∂φ = (-sinθ sinφ, 0, sinθ cosφ)
      var Y = {
        x: -Math.sin(th) * Math.sin(ph),
        y: 0,
        z: Math.sin(th) * Math.cos(ph)
      };

      // Ordinary derivative d/dφ(∂/∂φ) = (-sinθ cosφ, 0, -sinθ sinφ)
      // This is the derivative of Y's components in ℝ³ as we move along φ.
      var ordDeriv = {
        x: -Math.sin(th) * Math.cos(ph),
        y: 0,
        z: -Math.sin(th) * Math.sin(ph)
      };

      // Surface normal at p (outward)
      var n = sphereVertex(th, ph, 1);

      // Normal component of ordinary derivative
      var nComp = dot(ordDeriv, n);
      var normalVec = vecScale(n, nComp);

      // Covariant derivative = ordinary - normal
      var covDeriv = {
        x: ordDeriv.x - normalVec.x,
        y: ordDeriv.y - normalVec.y,
        z: ordDeriv.z - normalVec.z
      };

      // Scale for visibility
      var arrowS = 0.7;

      // Project everything
      var pR = rotateX(rotateY(p, rotAngle), rotXA);
      var pS = project(pR, sCx, sCy, sR);

      var ordEnd = vecAdd(p, vecScale(ordDeriv, arrowS));
      var ordEndR = rotateX(rotateY(ordEnd, rotAngle), rotXA);
      var ordEndS = project(ordEndR, sCx, sCy, sR);

      var normEnd = vecAdd(p, vecScale(normalVec, arrowS));
      var normEndR = rotateX(rotateY(normEnd, rotAngle), rotXA);
      var normEndS = project(normEndR, sCx, sCy, sR);

      var covEnd = vecAdd(p, vecScale(covDeriv, arrowS));
      var covEndR = rotateX(rotateY(covEnd, rotAngle), rotXA);
      var covEndS = project(covEndR, sCx, sCy, sR);

      // Also draw the tangent plane at p
      var dTh = {
        x: Math.cos(th) * Math.cos(ph),
        y: -Math.sin(th),
        z: Math.cos(th) * Math.sin(ph)
      };
      var dPh = {
        x: -Math.sin(th) * Math.sin(ph),
        y: 0,
        z: Math.sin(th) * Math.cos(ph)
      };
      var planeS = 0.45;
      var corners = [];
      for (var si = -1; si <= 1; si += 2) {
        for (var sj = -1; sj <= 1; sj += 2) {
          var cp = vecAdd(p, vecAdd(vecScale(dTh, si * planeS), vecScale(dPh, sj * planeS)));
          cp = rotateX(rotateY(cp, rotAngle), rotXA);
          corners.push(project(cp, sCx, sCy, sR));
        }
      }

      if (pS.depth > -0.6) {
        // Tangent plane
        ctx.beginPath();
        ctx.moveTo(corners[0].sx, corners[0].sy);
        ctx.lineTo(corners[1].sx, corners[1].sy);
        ctx.lineTo(corners[3].sx, corners[3].sy);
        ctx.lineTo(corners[2].sx, corners[2].sy);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 212, 255, 0.04)';
        ctx.fill();
        ctx.strokeStyle = CYAN + '0.1)';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // 1) Ordinary derivative (red, leaves surface)
        drawArrow(ctx, pS.sx, pS.sy, ordEndS.sx, ordEndS.sy, RED, 0.85, 3);

        // 2) Normal component (dashed red)
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.moveTo(pS.sx, pS.sy);
        ctx.lineTo(normEndS.sx, normEndS.sy);
        ctx.strokeStyle = RED + '0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);

        // 3) Projection line from ordEnd to covEnd (dashed, shows projection)
        ctx.beginPath();
        ctx.setLineDash([3, 3]);
        ctx.moveTo(ordEndS.sx, ordEndS.sy);
        ctx.lineTo(covEndS.sx, covEndS.sy);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);

        // 4) Covariant derivative (cyan, stays tangent)
        drawArrow(ctx, pS.sx, pS.sy, covEndS.sx, covEndS.sy, CYAN, 0.95, 3);

        // Draw point
        ctx.beginPath();
        ctx.arc(pS.sx, pS.sy, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fill();

        // Labels near arrow tips
        ctx.font = LABEL_FONT;
        ctx.textAlign = 'left';
        ctx.fillStyle = RED + '0.9)';
        ctx.fillText('\u2202Y/\u2202\u03C6  (ordinary)', ordEndS.sx + 10, ordEndS.sy - 6);
        ctx.fillStyle = CYAN + '0.95)';
        ctx.fillText('\u2207_\u03C6 Y  (covariant)', covEndS.sx + 10, covEndS.sy + 14);
        ctx.fillStyle = RED + '0.5)';
        ctx.fillText('normal', normEndS.sx + 8, normEndS.sy - 4);
      }

      // Legend at top
      ctx.font = SMALL_FONT;
      ctx.textAlign = 'left';
      var lx = 15, ly = 20;
      ctx.fillStyle = CYAN + '0.6)';
      ctx.fillText('Y = \u2202/\u2202\u03C6 (vector field along latitude)', lx, ly);
      ctx.fillStyle = RED + '0.7)';
      ctx.fillText('ordinary derivative \u2202Y/\u2202\u03C6 leaves the surface', lx, ly + 15);
      ctx.fillStyle = CYAN + '0.8)';
      ctx.fillText('covariant derivative \u2207_\u03C6 Y stays tangent', lx, ly + 30);

      ctx.fillStyle = 'rgba(122, 143, 166, 0.4)';
      ctx.textAlign = 'center';
      ctx.fillText('drag the point on S\u00B2', sCx, H - 12);

      requestAnimationFrame(draw);
    }

    draw();
  })();
})();
