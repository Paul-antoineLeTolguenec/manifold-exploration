// ============================================================
// Chapter 6: Metric Geometry — Visualizations
// ============================================================

(function () {
  var CYAN = 'rgba(0, 212, 255, ';
  var ORANGE = 'rgba(255, 140, 50, ';
  var RED = 'rgba(255, 80, 80, ';
  var GREEN = 'rgba(50, 255, 140, ';
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

  function vecAdd(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; }
  function vecScale(a, s) { return { x: a.x * s, y: a.y * s, z: a.z * s }; }
  function dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }

  function drawLine(ctx, x1, y1, x2, y2, alpha, width, color) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = (color || CYAN) + alpha + ')';
    ctx.lineWidth = width || 0.6;
    ctx.stroke();
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


  // ============================================================
  // Viz 1: Geodesic distance on S²
  // ============================================================
  // Two draggable points. Show the great circle (geodesic) and
  // display d(p,q) = arccos(<p,q>). Also show a non-geodesic
  // curve and its (longer) length for comparison.

  (function () {
    var c = initCanvas('ch6-distance');
    if (!c) return;
    var ctx = c.ctx;
    var canvas = c.canvas;
    var rotYA = 0.4, rotXA = 0.3;

    var ptA = { theta: Math.PI * 0.35, phi: -0.4 };
    var ptB = { theta: Math.PI * 0.6, phi: 1.0 };
    var dragging = null;

    function getPos(pt) { return sphereVertex(pt.theta, pt.phi, 1); }

    canvas.addEventListener('mousedown', function (e) {
      var rect = canvas.getBoundingClientRect();
      var W = c.width(), H = c.height();
      var sCx = W * 0.5, sCy = H * 0.5;
      var sR = Math.min(W * 0.28, H * 0.4);
      var hit = screenToSphere(e.clientX - rect.left, e.clientY - rect.top, sCx, sCy, sR, rotYA, rotXA);
      if (!hit) return;
      var dA = Math.abs(hit.theta - ptA.theta) + Math.abs(hit.phi - ptA.phi);
      var dB = Math.abs(hit.theta - ptB.theta) + Math.abs(hit.phi - ptB.phi);
      dragging = (dA < dB) ? 'A' : 'B';
      var pt = dragging === 'A' ? ptA : ptB;
      pt.theta = Math.max(0.1, Math.min(Math.PI - 0.1, hit.theta));
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
      pt.theta = Math.max(0.1, Math.min(Math.PI - 0.1, hit.theta));
      pt.phi = hit.phi;
    });

    window.addEventListener('mouseup', function () { dragging = null; });

    // Draw a circle of radius r around point p on the sphere
    function drawGeodesicCircle(pCenter, radius, nPts) {
      // Build circle in tangent plane then project to sphere
      var th = Math.acos(Math.max(-1, Math.min(1, pCenter.y)));
      var ph = Math.atan2(pCenter.z, pCenter.x);
      var sinT = Math.sin(th) || 0.01;
      var dTh = { x: Math.cos(th) * Math.cos(ph), y: -Math.sin(th), z: Math.cos(th) * Math.sin(ph) };
      var dPh = { x: -sinT * Math.sin(ph), y: 0, z: sinT * Math.cos(ph) };
      // Normalize dPh
      var dPhLen = Math.sqrt(dot(dPh, dPh));
      if (dPhLen > 0.001) dPh = vecScale(dPh, 1 / dPhLen);

      var pts = [];
      for (var i = 0; i <= nPts; i++) {
        var angle = (i / nPts) * Math.PI * 2;
        var dir = vecAdd(vecScale(dTh, Math.cos(angle)), vecScale(dPh, Math.sin(angle)));
        // Point at geodesic distance `radius` from center in direction `dir`
        var pt = vecAdd(vecScale(pCenter, Math.cos(radius)), vecScale(dir, Math.sin(radius)));
        pts.push(pt);
      }
      return pts;
    }

    function draw() {
      requestAnimationFrame(draw);
      if (!c.isVisible()) return;
      var W = c.width(), H = c.height();
      ctx.clearRect(0, 0, W, H);
      var sCx = W * 0.5, sCy = H * 0.5;
      var sR = Math.min(W * 0.28, H * 0.4);

      drawSphereWireframe(ctx, sCx, sCy, sR, rotYA, rotXA, 1, 14, 20, 0.08);

      var pA = getPos(ptA), pB = getPos(ptB);
      var geoDist = Math.acos(Math.max(-1, Math.min(1, dot(pA, pB))));

      // Draw geodesic circle around A with radius = d(A,B)
      var circle = drawGeodesicCircle(pA, geoDist, 80);
      for (var i = 1; i < circle.length; i++) {
        var a = rotateX(rotateY(circle[i - 1], rotYA), rotXA);
        var pa = project(a, sCx, sCy, sR);
        var b = rotateX(rotateY(circle[i], rotYA), rotXA);
        var pb = project(b, sCx, sCy, sR);
        if ((pa.depth + pb.depth) / 2 < -0.2) continue;
        var al = 0.1 + 0.15 * (((pa.depth + pb.depth) / 2 + 1) / 2);
        drawLine(ctx, pa.sx, pa.sy, pb.sx, pb.sy, al.toFixed(3), 1, CYAN);
      }

      // Draw great circle arc (geodesic)
      var arc = greatCircleArc(pA, pB, 80);
      for (var i = 1; i < arc.length; i++) {
        var a = rotateX(rotateY(arc[i - 1], rotYA), rotXA);
        var pa = project(a, sCx, sCy, sR);
        var b = rotateX(rotateY(arc[i], rotYA), rotXA);
        var pb = project(b, sCx, sCy, sR);
        if ((pa.depth + pb.depth) / 2 < -0.3) continue;
        var al = 0.4 + 0.5 * (((pa.depth + pb.depth) / 2 + 1) / 2);
        drawLine(ctx, pa.sx, pa.sy, pb.sx, pb.sy, al.toFixed(3), 3, CYAN);
      }

      // Points
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
        ctx.fillText('p', pAs.sx, pAs.sy - 12);
      }
      if (pBs.depth > -0.3) {
        ctx.beginPath();
        ctx.arc(pBs.sx, pBs.sy, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fill();
        ctx.font = LABEL_FONT;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.textAlign = 'center';
        ctx.fillText('q', pBs.sx, pBs.sy - 12);
      }

      // Info
      ctx.font = '13px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = CYAN + '0.9)';
      ctx.fillText('d(p, q) = arccos\u27E8p, q\u27E9 = ' + geoDist.toFixed(3) + ' rad', 15, 22);
      ctx.font = LABEL_FONT;
      ctx.fillStyle = CYAN + '0.5)';
      ctx.fillText('= ' + (geoDist * 180 / Math.PI).toFixed(1) + '\u00B0', 15, 38);
      ctx.fillStyle = 'rgba(122, 143, 166, 0.4)';
      ctx.fillText('geodesic circle of radius d(p,q)', 15, 56);

      ctx.font = SMALL_FONT;
      ctx.fillStyle = 'rgba(122, 143, 166, 0.4)';
      ctx.textAlign = 'center';
      ctx.fillText('drag p and q on the sphere', sCx, H - 12);
    }

    draw();
  })();


  // ============================================================
  // Viz 2: Volume element — coordinate grid distortion on S²
  // ============================================================
  // Show the (θ, φ) grid on the sphere with cells colored by their
  // area element √det(g) = sinθ. Cells near the poles are visibly
  // smaller even though they have the same coordinate extents.

  (function () {
    var c = initCanvas('ch6-volume');
    if (!c) return;
    var ctx = c.ctx;
    var canvas = c.canvas;
    var rotAngle = 0;
    var rotXA = 0.35;

    function draw() {
      requestAnimationFrame(draw);
      if (!c.isVisible()) return;
      var W = c.width(), H = c.height();
      ctx.clearRect(0, 0, W, H);

      rotAngle += 0.003;

      // Left: sphere with colored grid cells
      var sCx = W * 0.35, sCy = H * 0.5;
      var sR = Math.min(W * 0.22, H * 0.38);

      // Right: flat (θ, φ) coordinate rectangle
      var rLeft = W * 0.58, rTop = H * 0.12;
      var rW = W * 0.36, rH = H * 0.7;

      var nTh = 16, nPh = 24;
      var dTh = Math.PI / nTh;
      var dPh = (2 * Math.PI) / nPh;

      // Draw sphere grid cells
      for (var i = 0; i < nTh; i++) {
        var th0 = i * dTh;
        var th1 = (i + 1) * dTh;
        var thMid = (th0 + th1) / 2;
        var sinThMid = Math.sin(thMid);

        for (var j = 0; j < nPh; j++) {
          var ph0 = j * dPh;
          var ph1 = (j + 1) * dPh;

          // Color by sinθ (volume element)
          var t = sinThMid; // 0 at poles, 1 at equator
          var r = Math.floor(0 + 212 * t);
          var g = Math.floor(50 + 205 * t);
          var b = Math.floor(80 + 175 * t);

          // Sphere quad
          var corners3d = [
            sphereVertex(th0, ph0, 1), sphereVertex(th0, ph1, 1),
            sphereVertex(th1, ph1, 1), sphereVertex(th1, ph0, 1)
          ];
          var proj = [];
          var depthSum = 0;
          for (var k = 0; k < 4; k++) {
            var pr = rotateX(rotateY(corners3d[k], rotAngle), rotXA);
            proj.push(project(pr, sCx, sCy, sR));
            depthSum += proj[k].depth;
          }
          var avgDepth = depthSum / 4;
          if (avgDepth > -0.15) {
            var alpha = 0.25 + 0.5 * ((avgDepth + 1) / 2);
            ctx.beginPath();
            ctx.moveTo(proj[0].sx, proj[0].sy);
            ctx.lineTo(proj[1].sx, proj[1].sy);
            ctx.lineTo(proj[2].sx, proj[2].sy);
            ctx.lineTo(proj[3].sx, proj[3].sy);
            ctx.closePath();
            ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + (alpha * 0.6).toFixed(2) + ')';
            ctx.fill();
            ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + (alpha * 0.3).toFixed(2) + ')';
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }

          // Flat rectangle quad
          var rx0 = rLeft + (ph0 / (2 * Math.PI)) * rW;
          var rx1 = rLeft + (ph1 / (2 * Math.PI)) * rW;
          var ry0 = rTop + (th0 / Math.PI) * rH;
          var ry1 = rTop + (th1 / Math.PI) * rH;

          ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ', 0.4)';
          ctx.fillRect(rx0, ry0, rx1 - rx0, ry1 - ry0);
          ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ', 0.15)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(rx0, ry0, rx1 - rx0, ry1 - ry0);
        }
      }

      // Flat rect border and labels
      ctx.strokeStyle = 'rgba(122, 143, 166, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(rLeft, rTop, rW, rH);

      ctx.font = SMALL_FONT;
      ctx.textAlign = 'center';
      ctx.fillStyle = TEXT_COLOR;
      ctx.fillText('\u03C6 \u2192', rLeft + rW / 2, rTop + rH + 18);
      ctx.save();
      ctx.translate(rLeft - 14, rTop + rH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('\u03B8 \u2192', 0, 0);
      ctx.restore();

      // Pole / equator labels
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(122, 143, 166, 0.5)';
      ctx.fillText('north pole (\u03B8=0)', rLeft - 4, rTop + 10);
      ctx.fillText('equator (\u03B8=\u03C0/2)', rLeft - 4, rTop + rH / 2 + 4);
      ctx.fillText('south pole (\u03B8=\u03C0)', rLeft - 4, rTop + rH - 2);

      // Title labels
      ctx.font = LABEL_FONT;
      ctx.textAlign = 'center';
      ctx.fillStyle = CYAN + '0.7)';
      ctx.fillText('S\u00B2 (actual area)', sCx, 18);
      ctx.fillText('(\u03B8, \u03C6) coordinate space', rLeft + rW / 2, 18);

      // Legend
      ctx.font = LABEL_FONT;
      ctx.textAlign = 'left';
      ctx.fillStyle = CYAN + '0.6)';
      ctx.fillText('bright = large sin\u03B8 (equator)', 15, H - 30);
      ctx.fillStyle = 'rgba(50, 80, 100, 0.8)';
      ctx.fillText('dim = small sin\u03B8 (poles)', 15, H - 15);
    }

    draw();
  })();

})();
