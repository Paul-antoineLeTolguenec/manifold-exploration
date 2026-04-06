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
})();
