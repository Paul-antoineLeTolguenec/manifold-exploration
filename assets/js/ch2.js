// ============================================================
// Chapter 2: Tangent Spaces — Interactive Visualizations
// ============================================================

(function () {
  var CYAN = 'rgba(0, 212, 255, ';
  var ORANGE = 'rgba(255, 140, 50, ';
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

  function screenToSphere(mx, my, cx, cy, scale, rotYAngle, rotXAngle) {
    var sx = (mx - cx) / scale;
    var sy = (my - cy) / scale;
    var r2 = sx * sx + sy * sy;
    if (r2 > 1) return null;
    var sz = Math.sqrt(1 - r2);
    var p = { x: sx, y: sy, z: sz };
    p = rotateX(p, -rotXAngle);
    p = rotateY(p, -rotYAngle);
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
      canvas.height = Math.max(380, rect.width * 0.55) * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = Math.max(380, rect.width * 0.55) + 'px';
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

  // ============================================================
  // Viz 1: Tangent plane on S² with basis vectors ∂/∂θ and ∂/∂φ
  // ============================================================

  (function () {
    var c = initCanvas('ch2-tangent');
    if (!c) return;
    var ctx = c.ctx;
    var canvas = c.canvas;
    var rotAngle = 0.5;
    var rotXA = 0.3;
    var pointTheta = Math.PI * 0.45;
    var pointPhi = 0.6;
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
        pointTheta = hit.theta;
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
        // Avoid poles where ∂/∂φ degenerates
        pointTheta = Math.max(0.15, Math.min(Math.PI - 0.15, hit.theta));
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
      drawSphereWireframe(ctx, sCx, sCy, sR, rotAngle, rotXA, 1, 14, 20, 0.15);

      // Point on sphere
      var pt = sphereVertex(pointTheta, pointPhi, 1);
      var ptR = rotateX(rotateY(pt, rotAngle), rotXA);
      var ptS = project(ptR, sCx, sCy, sR);

      // Compute tangent vectors in world coordinates
      // ∂/∂θ: derivative of (sinθ cosφ, cosθ, sinθ sinφ) w.r.t. θ
      var dTheta = {
        x: Math.cos(pointTheta) * Math.cos(pointPhi),
        y: -Math.sin(pointTheta),
        z: Math.cos(pointTheta) * Math.sin(pointPhi)
      };
      // ∂/∂φ: derivative w.r.t. φ
      var dPhi = {
        x: -Math.sin(pointTheta) * Math.sin(pointPhi),
        y: 0,
        z: Math.sin(pointTheta) * Math.cos(pointPhi)
      };

      var vecLen = 0.45;

      // Project tangent vectors
      var thetaEnd = {
        x: pt.x + dTheta.x * vecLen,
        y: pt.y + dTheta.y * vecLen,
        z: pt.z + dTheta.z * vecLen
      };
      var phiEnd = {
        x: pt.x + dPhi.x * vecLen,
        y: pt.y + dPhi.y * vecLen,
        z: pt.z + dPhi.z * vecLen
      };

      var thetaEndR = rotateX(rotateY(thetaEnd, rotAngle), rotXA);
      var thetaEndS = project(thetaEndR, sCx, sCy, sR);
      var phiEndR = rotateX(rotateY(phiEnd, rotAngle), rotXA);
      var phiEndS = project(phiEndR, sCx, sCy, sR);

      // Draw tangent plane (translucent quad)
      var planeSize = 0.5;
      var corners = [];
      for (var si = -1; si <= 1; si += 2) {
        for (var sj = -1; sj <= 1; sj += 2) {
          var cp = {
            x: pt.x + dTheta.x * si * planeSize + dPhi.x * sj * planeSize,
            y: pt.y + dTheta.y * si * planeSize + dPhi.y * sj * planeSize,
            z: pt.z + dTheta.z * si * planeSize + dPhi.z * sj * planeSize
          };
          cp = rotateX(rotateY(cp, rotAngle), rotXA);
          corners.push(project(cp, sCx, sCy, sR));
        }
      }

      // Draw filled quad (corners order: [-1,-1], [-1,1], [1,-1], [1,1])
      if (ptS.depth > -0.3) {
        ctx.beginPath();
        ctx.moveTo(corners[0].sx, corners[0].sy);
        ctx.lineTo(corners[1].sx, corners[1].sy);
        ctx.lineTo(corners[3].sx, corners[3].sy);
        ctx.lineTo(corners[2].sx, corners[2].sy);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 212, 255, 0.06)';
        ctx.fill();
        ctx.strokeStyle = CYAN + '0.15)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Draw basis vectors
      if (ptS.depth > -0.3) {
        // ∂/∂θ (cyan)
        drawArrow(ctx, ptS.sx, ptS.sy, thetaEndS.sx, thetaEndS.sy, CYAN, 0.9, 2.5);
        // ∂/∂φ (orange)
        drawArrow(ctx, ptS.sx, ptS.sy, phiEndS.sx, phiEndS.sy, ORANGE, 0.9, 2.5);

        // Labels
        ctx.font = LABEL_FONT;
        ctx.textAlign = 'center';
        ctx.fillStyle = CYAN + '0.9)';
        ctx.fillText('\u2202/\u2202\u03B8', thetaEndS.sx + 12, thetaEndS.sy - 8);
        ctx.fillStyle = ORANGE + '0.9)';
        ctx.fillText('\u2202/\u2202\u03C6', phiEndS.sx + 12, phiEndS.sy - 8);
      }

      // Draw point
      if (ptS.depth > -0.3) {
        ctx.beginPath();
        ctx.arc(ptS.sx, ptS.sy, 5, 0, Math.PI * 2);
        ctx.fillStyle = CYAN + '0.9)';
        ctx.fill();
      }

      // Labels
      ctx.font = LABEL_FONT;
      ctx.fillStyle = TEXT_COLOR;
      ctx.textAlign = 'center';
      if (ptS.depth > -0.3) {
        ctx.fillText('p', ptS.sx - 12, ptS.sy - 10);
        ctx.fillText('T\u209A S\u00B2', ptS.sx, ptS.sy + sR * 0.15 + 30);
      }

      ctx.font = SMALL_FONT;
      ctx.fillStyle = 'rgba(122, 143, 166, 0.4)';
      ctx.fillText('drag the point on S\u00B2', sCx, 20);

      // Coordinate display
      ctx.font = SMALL_FONT;
      ctx.fillStyle = CYAN + '0.5)';
      ctx.textAlign = 'center';
      ctx.fillText('\u03B8 = ' + pointTheta.toFixed(2) + ', \u03C6 = ' + pointPhi.toFixed(2), sCx, H - 15);

      requestAnimationFrame(draw);
    }

    function drawArrow(ctx, x1, y1, x2, y2, color, alpha, width) {
      var dx = x2 - x1, dy = y2 - y1;
      var len = Math.sqrt(dx * dx + dy * dy);
      if (len < 2) return;
      var ux = dx / len, uy = dy / len;

      // Shaft
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = color + alpha + ')';
      ctx.lineWidth = width;
      ctx.stroke();

      // Arrowhead
      var headLen = 8;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - ux * headLen - uy * headLen * 0.4, y2 - uy * headLen + ux * headLen * 0.4);
      ctx.lineTo(x2 - ux * headLen + uy * headLen * 0.4, y2 - uy * headLen - ux * headLen * 0.4);
      ctx.closePath();
      ctx.fillStyle = color + alpha + ')';
      ctx.fill();
    }

    draw();
  })();

  // ============================================================
  // Viz 2: Tangent vector as derivation — v(f) on S²
  // ============================================================
  //
  // Shows S² with level curves of f = z (altitude = cosθ).
  // A draggable vector v at point p. v(f) displayed in real-time.
  // The gradient ∇f is also shown projected onto T_pS² for reference.

  (function () {
    var c = initCanvas('ch2-derivation');
    if (!c) return;
    var ctx = c.ctx;
    var canvas = c.canvas;
    var rotAngle = 0.5;
    var rotXA = 0.3;
    var pointTheta = Math.PI * 0.4;
    var pointPhi = 0.5;
    var velAngle = 0.3; // angle of v in tangent plane (0 = ∂θ, π/2 = ∂φ direction)
    var dragging = null; // 'point' or 'dir'

    // Current function index
    var funcIdx = 0;
    var funcNames = ['f = cos θ  (altitude)', 'f = sin θ cos φ  (x-coord)', 'f = sin θ sin φ  (y-coord)'];
    var funcShort = ['f = z', 'f = x', 'f = y'];

    // Evaluate f and its partial derivatives at (θ, φ)
    function evalFunc(idx, th, ph) {
      if (idx === 0) {
        // f = cosθ, ∂f/∂θ = -sinθ, ∂f/∂φ = 0
        return { val: Math.cos(th), dth: -Math.sin(th), dph: 0 };
      } else if (idx === 1) {
        // f = sinθ cosφ, ∂f/∂θ = cosθ cosφ, ∂f/∂φ = -sinθ sinφ
        return { val: Math.sin(th) * Math.cos(ph), dth: Math.cos(th) * Math.cos(ph), dph: -Math.sin(th) * Math.sin(ph) };
      } else {
        // f = sinθ sinφ, ∂f/∂θ = cosθ sinφ, ∂f/∂φ = sinθ cosφ
        return { val: Math.sin(th) * Math.sin(ph), dth: Math.cos(th) * Math.sin(ph), dph: Math.sin(th) * Math.cos(ph) };
      }
    }

    // Level curves of f on sphere (draw contours at fixed f-values)
    function drawLevelCurves(idx) {
      var nLevels = 12;
      var nPtsPerLevel = 120;
      for (var l = 1; l < nLevels; l++) {
        var fval = -1 + 2 * l / nLevels;
        // Find points on sphere where f ≈ fval
        ctx.beginPath();
        var started = false;
        var prevVisible = false;
        for (var j = 0; j <= nPtsPerLevel; j++) {
          var param = (j / nPtsPerLevel) * Math.PI * 2;
          var pt = null;

          if (idx === 0) {
            // f = cosθ = fval → θ = acos(fval), φ = param
            var th = Math.acos(Math.max(-1, Math.min(1, fval)));
            pt = sphereVertex(th, param, 1);
          } else if (idx === 1) {
            // f = sinθ cosφ = fval. Parametrize: fix φ = param, solve sinθ = fval/cosφ
            var cosP = Math.cos(param);
            if (Math.abs(cosP) < 0.01) continue;
            var sinTh = fval / cosP;
            if (Math.abs(sinTh) > 1) continue;
            var th = Math.asin(Math.max(-1, Math.min(1, sinTh)));
            if (th < 0) th += Math.PI;
            pt = sphereVertex(th, param, 1);
          } else {
            // f = sinθ sinφ = fval. Fix φ = param, solve sinθ = fval/sinφ
            var sinP = Math.sin(param);
            if (Math.abs(sinP) < 0.01) continue;
            var sinTh = fval / sinP;
            if (Math.abs(sinTh) > 1) continue;
            var th = Math.asin(Math.max(-1, Math.min(1, sinTh)));
            if (th < 0) th += Math.PI;
            pt = sphereVertex(th, param, 1);
          }

          if (!pt) continue;
          var W = c.width(), H = c.height();
          var sCx = W * 0.5, sCy = H * 0.5;
          var sR = Math.min(W * 0.28, H * 0.4);
          var pr = rotateX(rotateY(pt, rotAngle), rotXA);
          var ps = project(pr, sCx, sCy, sR);

          var isVisible = pr.z > -0.05;
          if (isVisible) {
            if (!started || !prevVisible) {
              ctx.moveTo(ps.sx, ps.sy);
              started = true;
            } else {
              ctx.lineTo(ps.sx, ps.sy);
            }
          }
          prevVisible = isVisible;
        }
        // Color: blue for negative f, white for zero, red/warm for positive
        var t = (fval + 1) / 2; // 0 to 1
        var r = Math.floor(40 + 180 * t);
        var g = Math.floor(60 + 40 * (1 - Math.abs(fval)));
        var b = Math.floor(220 - 180 * t);
        ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ', 0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Cycle function on click (not on sphere)
    canvas.addEventListener('dblclick', function (e) {
      funcIdx = (funcIdx + 1) % 3;
    });

    canvas.addEventListener('mousedown', function (e) {
      var rect = canvas.getBoundingClientRect();
      var W = c.width(), H = c.height();
      var sCx = W * 0.5, sCy = H * 0.5;
      var sR = Math.min(W * 0.28, H * 0.4);
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;

      // Check direction handle
      var startP = sphereVertex(pointTheta, pointPhi, 1);
      var sinT = Math.sin(pointTheta) || 0.01;
      var dTh = { x: Math.cos(pointTheta) * Math.cos(pointPhi), y: -Math.sin(pointTheta), z: Math.cos(pointTheta) * Math.sin(pointPhi) };
      var dPh = { x: -sinT * Math.sin(pointPhi), y: 0, z: sinT * Math.cos(pointPhi) };
      var handleLen = 0.4;
      var hWorld = {
        x: startP.x + (Math.cos(velAngle) * dTh.x + Math.sin(velAngle) * dPh.x / sinT) * handleLen,
        y: startP.y + (Math.cos(velAngle) * dTh.y + Math.sin(velAngle) * dPh.y / sinT) * handleLen,
        z: startP.z + (Math.cos(velAngle) * dTh.z + Math.sin(velAngle) * dPh.z / sinT) * handleLen
      };
      var hR = rotateX(rotateY(hWorld, rotAngle), rotXA);
      var hS = project(hR, sCx, sCy, sR);
      if ((mx - hS.sx) * (mx - hS.sx) + (my - hS.sy) * (my - hS.sy) < 400) {
        dragging = 'dir';
        return;
      }

      var hit = screenToSphere(mx, my, sCx, sCy, sR, rotAngle, rotXA);
      if (hit) {
        dragging = 'point';
        pointTheta = Math.max(0.15, Math.min(Math.PI - 0.15, hit.theta));
        pointPhi = hit.phi;
      }
    });

    canvas.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var rect = canvas.getBoundingClientRect();
      var W = c.width(), H = c.height();
      var sCx = W * 0.5, sCy = H * 0.5;
      var sR = Math.min(W * 0.28, H * 0.4);

      if (dragging === 'point') {
        var hit = screenToSphere(e.clientX - rect.left, e.clientY - rect.top, sCx, sCy, sR, rotAngle, rotXA);
        if (hit) {
          pointTheta = Math.max(0.15, Math.min(Math.PI - 0.15, hit.theta));
          pointPhi = hit.phi;
        }
      } else if (dragging === 'dir') {
        var startP = sphereVertex(pointTheta, pointPhi, 1);
        var sR2 = rotateX(rotateY(startP, rotAngle), rotXA);
        var sS = project(sR2, sCx, sCy, sR);
        var mx = e.clientX - rect.left - sS.sx;
        var my = e.clientY - rect.top - sS.sy;
        var dTh = { x: Math.cos(pointTheta) * Math.cos(pointPhi), y: -Math.sin(pointTheta), z: Math.cos(pointTheta) * Math.sin(pointPhi) };
        var sinT = Math.sin(pointTheta) || 0.01;
        var dPh = { x: -sinT * Math.sin(pointPhi), y: 0, z: sinT * Math.cos(pointPhi) };
        var dThR = rotateX(rotateY(dTh, rotAngle), rotXA);
        var dPhR = rotateX(rotateY(dPh, rotAngle), rotXA);
        var projTh = mx * dThR.x * sR + my * dThR.y * sR;
        var projPh = mx * dPhR.x * sR + my * dPhR.y * sR;
        velAngle = Math.atan2(projPh, projTh);
      }
    });

    window.addEventListener('mouseup', function () { dragging = null; });

    function drawArrowLocal(ctx, x1, y1, x2, y2, color, alpha, width) {
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

    function draw() {
      var W = c.width(), H = c.height();
      ctx.clearRect(0, 0, W, H);
      var sCx = W * 0.5, sCy = H * 0.5;
      var sR = Math.min(W * 0.28, H * 0.4);

      // Sphere wireframe
      drawSphereWireframe(ctx, sCx, sCy, sR, rotAngle, rotXA, 1, 14, 20, 0.08);

      // Level curves
      drawLevelCurves(funcIdx);

      var th = pointTheta, ph = pointPhi;
      var sinT = Math.sin(th) || 0.01;
      var p = sphereVertex(th, ph, 1);
      var pR = rotateX(rotateY(p, rotAngle), rotXA);
      var pS = project(pR, sCx, sCy, sR);

      // Tangent basis in R³
      var dTh = { x: Math.cos(th) * Math.cos(ph), y: -Math.sin(th), z: Math.cos(th) * Math.sin(ph) };
      var dPh = { x: -sinT * Math.sin(ph), y: 0, z: sinT * Math.cos(ph) };

      // Vector v in tangent plane
      var vTh = Math.cos(velAngle);   // component along ∂/∂θ
      var vPh = Math.sin(velAngle);   // component along ∂/∂φ (coordinate component, not normalized)

      var arrowLen = 0.4;
      var vWorld = {
        x: dTh.x * vTh * arrowLen + dPh.x * (vPh / sinT) * arrowLen,
        y: dTh.y * vTh * arrowLen + dPh.y * (vPh / sinT) * arrowLen,
        z: dTh.z * vTh * arrowLen + dPh.z * (vPh / sinT) * arrowLen
      };
      var vEnd = { x: p.x + vWorld.x, y: p.y + vWorld.y, z: p.z + vWorld.z };

      // Evaluate function and directional derivative
      var fData = evalFunc(funcIdx, th, ph);
      var vf = vTh * fData.dth + vPh * fData.dph;

      // Gradient of f projected onto tangent plane (∇f)^i = g^{ij} ∂f/∂x^j
      // g^θθ = 1, g^φφ = 1/sin²θ
      var gradTh = fData.dth;        // g^θθ · ∂f/∂θ
      var gradPh = fData.dph / (sinT * sinT);  // g^φφ · ∂f/∂φ
      var gradWorld = {
        x: dTh.x * gradTh * arrowLen + dPh.x * (gradPh / sinT) * arrowLen,
        y: dTh.y * gradTh * arrowLen + dPh.y * (gradPh / sinT) * arrowLen,
        z: dTh.z * gradTh * arrowLen + dPh.z * (gradPh / sinT) * arrowLen
      };
      var gradEnd = { x: p.x + gradWorld.x, y: p.y + gradWorld.y, z: p.z + gradWorld.z };

      if (pS.depth > -0.5) {
        // Draw gradient vector (dim)
        var geR = rotateX(rotateY(gradEnd, rotAngle), rotXA);
        var geS = project(geR, sCx, sCy, sR);
        drawArrowLocal(ctx, pS.sx, pS.sy, geS.sx, geS.sy, 'rgba(150, 150, 150, ', '0.5', 2);

        // Draw v vector (cyan)
        var veR = rotateX(rotateY(vEnd, rotAngle), rotXA);
        var veS = project(veR, sCx, sCy, sR);
        drawArrowLocal(ctx, pS.sx, pS.sy, veS.sx, veS.sy, CYAN, '0.9', 2.5);

        // Direction handle
        ctx.beginPath();
        ctx.arc(veS.sx, veS.sy, 5, 0, Math.PI * 2);
        ctx.fillStyle = CYAN + '0.9)';
        ctx.fill();

        // Point
        ctx.beginPath();
        ctx.arc(pS.sx, pS.sy, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fill();

        // Labels
        ctx.font = LABEL_FONT;
        ctx.textAlign = 'left';
        ctx.fillStyle = CYAN + '0.9)';
        ctx.fillText('v', veS.sx + 10, veS.sy - 6);
        ctx.fillStyle = 'rgba(150, 150, 150, 0.6)';
        ctx.fillText('\u2207f', geS.sx + 10, geS.sy - 6);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText('p', pS.sx - 14, pS.sy - 8);
      }

      // v(f) display — large, prominent
      var vfColor = vf > 0 ? 'rgba(50, 255, 140, ' : (vf < 0 ? 'rgba(255, 80, 80, ' : 'rgba(200, 200, 200, ');
      ctx.font = '14px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      var infoX = 15, infoY = 22;
      ctx.fillStyle = 'rgba(200, 200, 200, 0.7)';
      ctx.fillText(funcNames[funcIdx], infoX, infoY);
      ctx.fillStyle = vfColor + '0.95)';
      ctx.fillText('v(f) = ' + vf.toFixed(3), infoX, infoY + 20);
      ctx.font = LABEL_FONT;
      ctx.fillStyle = CYAN + '0.5)';
      ctx.fillText('v = ' + vTh.toFixed(2) + ' \u2202/\u2202\u03B8 + ' + vPh.toFixed(2) + ' \u2202/\u2202\u03C6', infoX, infoY + 38);
      ctx.fillStyle = 'rgba(150, 150, 150, 0.5)';
      ctx.fillText('\u2207f (gradient, for reference)', infoX, infoY + 53);

      // Function value at p
      ctx.textAlign = 'right';
      ctx.font = LABEL_FONT;
      ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
      ctx.fillText('f(p) = ' + fData.val.toFixed(3), W - 15, infoY);

      // Hint
      ctx.font = SMALL_FONT;
      ctx.fillStyle = 'rgba(122, 143, 166, 0.4)';
      ctx.textAlign = 'center';
      ctx.fillText('drag point or vector \u2022 double-click to change f', sCx, H - 12);

      requestAnimationFrame(draw);
    }

    draw();
  })();
})();
