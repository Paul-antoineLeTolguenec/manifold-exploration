// ============================================================
// Chapter 5: Curvature — Visualizations
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

  function vecAdd(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; }
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

  function sphereDist(p1, p2) {
    var d = dot(p1, p2);
    return Math.acos(Math.max(-1, Math.min(1, d)));
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


  // ============================================================
  // Viz 1: Shrinking triangle — holonomy/area → K
  // ============================================================

  (function () {
    var c = initCanvas('ch5-shrink');
    if (!c) return;
    var ctx = c.ctx;
    var canvas = c.canvas;
    var rotYA = 0.3, rotXA = 0.25;

    // Center of triangle: compute the front-facing point by inverse-rotating (0,0,1)
    // Inverse of rotX(b)·rotY(a) is rotY(-a)·rotX(-b)
    var _fz = { x: 0, y: Math.sin(rotXA), z: Math.cos(rotXA) }; // rotX(-rotXA) on (0,0,1)
    var _front = { x: _fz.x * Math.cos(-rotYA) + _fz.z * Math.sin(-rotYA), y: _fz.y, z: -_fz.x * Math.sin(-rotYA) + _fz.z * Math.cos(-rotYA) };
    var centerTheta = Math.acos(Math.max(-1, Math.min(1, _front.y)));
    var centerPhi = Math.atan2(_front.z, _front.x);
    var triScale = 0.8; // 0.05 to 1.0
    var draggingSlider = false;

    canvas.addEventListener('mousedown', function (e) { draggingSlider = true; updateScale(e); });
    canvas.addEventListener('mousemove', function (e) { if (draggingSlider) updateScale(e); });
    window.addEventListener('mouseup', function () { draggingSlider = false; });

    function updateScale(e) {
      var rect = canvas.getBoundingClientRect();
      var W = c.width();
      var sliderLeft = W * 0.1, sliderRight = W * 0.9;
      var mx = e.clientX - rect.left;
      var t = (mx - sliderLeft) / (sliderRight - sliderLeft);
      t = Math.max(0, Math.min(1, t));
      triScale = 0.05 + t * 0.95;
    }

    // Build triangle vertices around center at given scale
    function getTriVerts(scale) {
      var cp = sphereVertex(centerTheta, centerPhi, 1);
      // Tangent basis at center
      var dTh = { x: Math.cos(centerTheta) * Math.cos(centerPhi), y: -Math.sin(centerTheta), z: Math.cos(centerTheta) * Math.sin(centerPhi) };
      var sinT = Math.sin(centerTheta) || 0.01;
      var dPh = { x: -sinT * Math.sin(centerPhi), y: 0, z: sinT * Math.cos(centerPhi) };
      // Three directions at 120° in tangent plane
      var verts = [];
      for (var i = 0; i < 3; i++) {
        var angle = i * Math.PI * 2 / 3;
        var offset = vecAdd(vecScale(dTh, Math.cos(angle) * scale * 0.6), vecScale(dPh, Math.sin(angle) * scale * 0.6 / sinT));
        var pt = vecNorm(vecAdd(cp, offset));
        verts.push(pt);
      }
      return verts;
    }

    function draw() {
      requestAnimationFrame(draw);
      if (!c.isVisible()) return;
      var W = c.width(), H = c.height();
      ctx.clearRect(0, 0, W, H);
      var sCx = W * 0.5, sCy = H * 0.52;
      var sR = Math.min(W * 0.28, H * 0.4);

      drawSphereWireframe(ctx, sCx, sCy, sR, rotYA, rotXA, 1, 14, 20, 0.08);

      var verts = getTriVerts(triScale);

      // Draw triangle edges
      for (var edge = 0; edge < 3; edge++) {
        var arc = greatCircleArc(verts[edge], verts[(edge + 1) % 3], 50);
        for (var i = 1; i < arc.length; i++) {
          var a = rotateX(rotateY(arc[i - 1], rotYA), rotXA);
          var pa = project(a, sCx, sCy, sR);
          var b = rotateX(rotateY(arc[i], rotYA), rotXA);
          var pb = project(b, sCx, sCy, sR);
          var avgD = (pa.depth + pb.depth) / 2;
          if (avgD < -0.3) continue;
          var al = 0.3 + 0.6 * ((avgD + 1) / 2);
          drawLine(ctx, pa.sx, pa.sy, pb.sx, pb.sy, al.toFixed(3), 2.5);
        }
      }

      // Draw vertices
      for (var i = 0; i < 3; i++) {
        var vr = rotateX(rotateY(verts[i], rotYA), rotXA);
        var vs = project(vr, sCx, sCy, sR);
        if (vs.depth > -0.3) {
          ctx.beginPath();
          ctx.arc(vs.sx, vs.sy, 4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.fill();
        }
      }

      // Fill triangle (shaded)
      var screenVerts = [];
      var allVisible = true;
      for (var i = 0; i < 3; i++) {
        var vr = rotateX(rotateY(verts[i], rotYA), rotXA);
        var vs = project(vr, sCx, sCy, sR);
        screenVerts.push(vs);
        if (vs.depth < -0.3) allVisible = false;
      }
      if (allVisible) {
        ctx.beginPath();
        ctx.moveTo(screenVerts[0].sx, screenVerts[0].sy);
        ctx.lineTo(screenVerts[1].sx, screenVerts[1].sy);
        ctx.lineTo(screenVerts[2].sx, screenVerts[2].sy);
        ctx.closePath();
        ctx.fillStyle = CYAN + '0.08)';
        ctx.fill();
      }

      // Compute area (spherical excess via L'Huilier)
      var a01 = sphereDist(verts[0], verts[1]);
      var a12 = sphereDist(verts[1], verts[2]);
      var a20 = sphereDist(verts[2], verts[0]);
      var s = (a01 + a12 + a20) / 2;
      var tanQE = Math.sqrt(
        Math.max(0, Math.tan(s / 2) * Math.tan((s - a01) / 2) * Math.tan((s - a12) / 2) * Math.tan((s - a20) / 2))
      );
      var area = 4 * Math.atan(tanQE);
      var holonomy = area; // On unit sphere, Ω = area * K = area * 1
      var ratio = area > 1e-8 ? holonomy / area : 1;

      // Slider
      var sliderY = H - 50;
      var sliderLeft = W * 0.1, sliderRight = W * 0.9;
      var sliderX = sliderLeft + (triScale - 0.05) / 0.95 * (sliderRight - sliderLeft);

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
      ctx.fillText('triangle size', (sliderLeft + sliderRight) / 2, sliderY + 22);

      // Info display
      ctx.font = LABEL_FONT;
      ctx.textAlign = 'left';
      var lx = 15, ly = 22;
      ctx.fillStyle = CYAN + '0.7)';
      ctx.fillText('holonomy \u03A9 = ' + (holonomy * 180 / Math.PI).toFixed(2) + '\u00B0', lx, ly);
      ctx.fillText('area A = ' + area.toFixed(4) + ' sr', lx, ly + 16);
      ctx.font = '13px "JetBrains Mono", monospace';
      ctx.fillStyle = GREEN + '0.9)';
      ctx.fillText('K = \u03A9/A = ' + ratio.toFixed(4), lx, ly + 36);

      if (triScale < 0.15) {
        ctx.fillStyle = GREEN + '0.7)';
        ctx.fillText('\u2192 converges to K = 1 (unit sphere)', lx, ly + 54);
      }

      ctx.font = SMALL_FONT;
      ctx.fillStyle = 'rgba(122, 143, 166, 0.4)';
      ctx.textAlign = 'center';
      ctx.fillText('drag the slider to shrink the triangle', sCx, H - 12);
    }

    draw();
  })();


  // ============================================================
  // Viz 2: Gaussian curvature heatmap — sphere, torus, saddle
  // ============================================================

  (function () {
    var c = initCanvas('ch5-heatmap');
    if (!c) return;
    var ctx = c.ctx;
    var canvas = c.canvas;

    var surfaceIdx = 0; // 0: sphere, 1: torus, 2: saddle
    var surfaceNames = ['sphere (K = 1)', 'torus (K varies)', 'saddle (K < 0)'];
    var autoRotate = true;
    var rotAngle = 0;

    canvas.addEventListener('click', function (e) {
      var rect = canvas.getBoundingClientRect();
      var W = c.width(), H = c.height();
      // Check if click is on the surface label buttons
      var btnY = H - 35;
      var btnW = 100;
      var totalW = 3 * btnW + 2 * 15;
      var startX = (W - totalW) / 2;
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      if (my > btnY - 12 && my < btnY + 12) {
        for (var i = 0; i < 3; i++) {
          var bx = startX + i * (btnW + 15) + btnW / 2;
          if (Math.abs(mx - bx) < btnW / 2) {
            surfaceIdx = i;
            return;
          }
        }
      }
    });

    // Curvature color: positive = cyan, zero = dark, negative = red
    function curvatureColor(K, alpha) {
      if (K > 0.01) {
        var t = Math.min(1, K / 2);
        return 'rgba(' + Math.floor(0 + 50 * (1 - t)) + ',' + Math.floor(100 + 155 * t) + ',' + Math.floor(150 + 105 * t) + ',' + alpha + ')';
      } else if (K < -0.01) {
        var t = Math.min(1, -K / 2);
        return 'rgba(' + Math.floor(150 + 105 * t) + ',' + Math.floor(50 + 30 * (1 - t)) + ',' + Math.floor(50) + ',' + alpha + ')';
      } else {
        return 'rgba(60, 70, 80, ' + alpha + ')';
      }
    }

    // Surface generators: return { pos, K } for given (u, v)
    function sphereSurface(u, v) {
      // u ∈ [0, π], v ∈ [0, 2π]
      return {
        pos: { x: Math.sin(u) * Math.cos(v), y: Math.cos(u), z: Math.sin(u) * Math.sin(v) },
        K: 1
      };
    }

    function torusSurface(u, v) {
      // u ∈ [0, 2π] (around tube), v ∈ [0, 2π] (around torus)
      var R = 0.7, r = 0.3;
      var x = (R + r * Math.cos(u)) * Math.cos(v);
      var y = r * Math.sin(u);
      var z = (R + r * Math.cos(u)) * Math.sin(v);
      var K = Math.cos(u) / (r * (R + r * Math.cos(u)));
      return { pos: { x: x, y: y, z: z }, K: K };
    }

    function saddleSurface(u, v) {
      // Parametric saddle: z = x² - y², restricted to a disk
      var x = (u - 0.5) * 2; // [-1, 1]
      var y = (v - 0.5) * 2;
      var r2 = x * x + y * y;
      if (r2 > 1) return null;
      var z = 0.5 * (x * x - y * y);
      // Gaussian curvature of z = f(x,y): K = (fxx·fyy - fxy²) / (1 + fx² + fy²)²
      var fx = x, fy = -y;
      var fxx = 1, fyy = -1, fxy = 0;
      var denom = 1 + fx * fx + fy * fy;
      var K = (fxx * fyy - fxy * fxy) / (denom * denom);
      return { pos: { x: x * 0.6, y: z * 0.8, z: y * 0.6 }, K: K };
    }

    function draw() {
      requestAnimationFrame(draw);
      if (!c.isVisible()) return;
      var W = c.width(), H = c.height();
      ctx.clearRect(0, 0, W, H);
      var sCx = W * 0.5, sCy = H * 0.47;
      var sR = Math.min(W * 0.30, H * 0.38);

      if (autoRotate) rotAngle += 0.005;
      var rotXA = 0.3;

      var nU, nV, uRange, vRange, surfFn;
      if (surfaceIdx === 0) {
        nU = 40; nV = 60;
        uRange = [0.05, Math.PI - 0.05];
        vRange = [0, Math.PI * 2];
        surfFn = sphereSurface;
      } else if (surfaceIdx === 1) {
        nU = 40; nV = 60;
        uRange = [0, Math.PI * 2];
        vRange = [0, Math.PI * 2];
        surfFn = torusSurface;
      } else {
        nU = 30; nV = 30;
        uRange = [0, 1];
        vRange = [0, 1];
        surfFn = saddleSurface;
      }

      // Collect quads with depth for sorting
      var quads = [];
      var du = (uRange[1] - uRange[0]) / nU;
      var dv = (vRange[1] - vRange[0]) / nV;

      for (var i = 0; i < nU; i++) {
        for (var j = 0; j < nV; j++) {
          var u0 = uRange[0] + i * du;
          var v0 = vRange[0] + j * dv;
          var s00 = surfFn(u0, v0);
          var s10 = surfFn(u0 + du, v0);
          var s11 = surfFn(u0 + du, v0 + dv);
          var s01 = surfFn(u0, v0 + dv);
          if (!s00 || !s10 || !s11 || !s01) continue;

          var corners = [s00, s10, s11, s01];
          var avgK = (s00.K + s10.K + s11.K + s01.K) / 4;
          var projected = [];
          var depthSum = 0;
          for (var k = 0; k < 4; k++) {
            var pr = rotateX(rotateY(corners[k].pos, rotAngle), rotXA);
            projected.push(project(pr, sCx, sCy, sR));
            depthSum += projected[k].depth;
          }
          quads.push({ proj: projected, K: avgK, depth: depthSum / 4 });
        }
      }

      // Sort by depth (painter's algorithm)
      quads.sort(function (a, b) { return a.depth - b.depth; });

      // Draw quads
      for (var q = 0; q < quads.length; q++) {
        var quad = quads[q];
        var alpha = 0.6 + 0.3 * ((quad.depth + 1.5) / 3);
        alpha = Math.max(0.2, Math.min(0.9, alpha));

        ctx.beginPath();
        ctx.moveTo(quad.proj[0].sx, quad.proj[0].sy);
        ctx.lineTo(quad.proj[1].sx, quad.proj[1].sy);
        ctx.lineTo(quad.proj[2].sx, quad.proj[2].sy);
        ctx.lineTo(quad.proj[3].sx, quad.proj[3].sy);
        ctx.closePath();
        ctx.fillStyle = curvatureColor(quad.K, alpha);
        ctx.fill();
        ctx.strokeStyle = curvatureColor(quad.K, alpha * 0.3);
        ctx.lineWidth = 0.3;
        ctx.stroke();
      }

      // Color legend (gradient bar)
      var barX = W - 35, barY = 40, barH = 120, barW = 12;
      for (var i = 0; i < barH; i++) {
        var t = 1 - i / barH; // 1 at top, 0 at bottom
        var kVal = (t - 0.5) * 4; // K range [-2, 2]
        ctx.fillStyle = curvatureColor(kVal, 0.8);
        ctx.fillRect(barX, barY + i, barW, 1);
      }
      ctx.strokeStyle = 'rgba(122, 143, 166, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barW, barH);
      ctx.font = SMALL_FONT;
      ctx.textAlign = 'left';
      ctx.fillStyle = CYAN + '0.7)';
      ctx.fillText('K>0', barX + barW + 4, barY + 10);
      ctx.fillStyle = 'rgba(122, 143, 166, 0.5)';
      ctx.fillText('K=0', barX + barW + 4, barY + barH / 2 + 4);
      ctx.fillStyle = RED + '0.7)';
      ctx.fillText('K<0', barX + barW + 4, barY + barH - 2);

      // Surface selector buttons
      var btnY = H - 35;
      var btnW = 100;
      var totalBtnW = 3 * btnW + 2 * 15;
      var startX = (W - totalBtnW) / 2;
      ctx.font = LABEL_FONT;
      ctx.textAlign = 'center';
      for (var i = 0; i < 3; i++) {
        var bx = startX + i * (btnW + 15) + btnW / 2;
        var isActive = (i === surfaceIdx);
        ctx.fillStyle = isActive ? CYAN + '0.15)' : 'rgba(30, 40, 55, 0.5)';
        ctx.strokeStyle = isActive ? CYAN + '0.5)' : 'rgba(122, 143, 166, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(bx - btnW / 2, btnY - 12, btnW, 24, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = isActive ? CYAN + '0.95)' : 'rgba(122, 143, 166, 0.6)';
        ctx.fillText(surfaceNames[i], bx, btnY + 4);
      }

      // Title
      ctx.font = LABEL_FONT;
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(200, 200, 200, 0.7)';
      ctx.fillText('Gaussian curvature K', 15, 22);
    }

    draw();
  })();

})();
