(function () {
  "use strict";

  var C = {
    up: "#4BD6A0",
    down: "#FF6F5E",
    ice: "#8AC5FF",
    amber: "#F0C070",
    grid: "rgba(255,255,255,0.055)",
    gridSoft: "rgba(255,255,255,0.028)",
    axis: "#64727E",
    dim: "#3B4A56"
  };

  var MONO = 'ui-monospace, "Cascadia Mono", Consolas, monospace';

  function rnd(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function series(n, seed, base) {
    n = n || 150;
    var r = rnd(seed || 11);
    var p = base || 100 + r() * 8;
    var out = [];
    var vol = 0.85;
    for (var i = 0; i < n; i++) {
      if (i % 26 === 0) vol = 0.55 + r() * 1.7;
      var drift = Math.sin(i / 21) * 0.24 + (r() - 0.48) * 0.42;
      var o = p;
      var c = Math.max(2, o + drift * vol + (r() - 0.5) * vol * 2.4);
      var h = Math.max(o, c) + r() * vol * 1.15;
      var l = Math.min(o, c) - r() * vol * 1.15;
      out.push({ o: o, h: h, l: l, c: c, v: 34 + r() * 90 + Math.abs(c - o) * 26 });
      p = c;
    }
    return out;
  }

  function fit(cv) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var rect = cv.getBoundingClientRect();
    var w = Math.max(240, Math.round(rect.width));
    var h = Math.max(150, Math.round(rect.height));
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    }
    var ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx: ctx, w: w, h: h };
  }

  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    if (r < 0.5) { ctx.rect(x, y, w, h); return; }
    if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }

  function pill(ctx, x, y, w, h, color, label, align) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    rr(ctx, x, y - h / 2, w, h, 4);
    ctx.fill();
    ctx.fillStyle = "#06090C";
    ctx.font = "600 10px " + MONO;
    ctx.textAlign = align || "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + (align === "left" ? 6 : w / 2), y + 0.5);
    ctx.restore();
  }

  /* ------- axes ------- */

  function priceAxis(ctx, w, h, min, max, pad, rows) {
    rows = rows || 4;
    ctx.save();
    ctx.font = "10px " + MONO;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (var i = 0; i <= rows; i++) {
      var y = Math.round(pad.t + ((h - pad.t - pad.b) * i) / rows) + 0.5;
      ctx.strokeStyle = i === rows ? "rgba(255,255,255,0.09)" : C.grid;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 5]);
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(w - pad.r, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.axis;
      ctx.fillText((max - ((max - min) * i) / rows).toFixed(2), w - pad.r - 8, y);
    }
    ctx.restore();
  }

  function timeAxis(ctx, w, h, pad, n, count) {
    count = count || 6;
    ctx.save();
    ctx.font = "9px " + MONO;
    ctx.fillStyle = "rgba(255,255,255,0.20)";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (var i = 0; i < count; i++) {
      var idx = Math.round((n - 1) * (i / (count - 1)));
      var x = pad.l + ((w - pad.l - pad.r) / n) * (idx + 0.5);
      ctx.fillText(String(idx + 1), x, h - pad.b + 6);
      if (i > 0) {
        ctx.strokeStyle = C.gridSoft;
        ctx.beginPath();
        ctx.moveTo(Math.round(x) + 0.5, pad.t);
        ctx.lineTo(Math.round(x) + 0.5, h - pad.b);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function watermark(ctx, label) {
    ctx.save();
    ctx.font = "600 9px " + MONO;
    ctx.fillStyle = "rgba(255,255,255,0.13)";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(label, 14, 12);
    ctx.restore();
  }

  function lastPrice(ctx, w, y, color, value, rightEdge) {
    var label = value.toFixed(2);
    var bw = 52;
    var x = (rightEdge || w) - bw + 2;
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    rr(ctx, x, y - 9, bw - 4, 18, 4);
    ctx.fill();
    ctx.fillStyle = "#06090C";
    ctx.font = "600 10px " + MONO;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + (bw - 4) / 2, y + 0.5);
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(x - 2, y);
    ctx.stroke();
    ctx.restore();
  }

  function bounds(data) {
    var min = Infinity, max = -Infinity;
    data.forEach(function (d) {
      if (d.l < min) min = d.l;
      if (d.h > max) max = d.h;
    });
    var pad = (max - min) * 0.08 || 1;
    return { min: min - pad, max: max + pad };
  }

  function layoutOHLC(w, h, data) {
    var withVol = true;
    var pad = { l: 8, r: 62, t: 16, b: 22 };
    var b = bounds(data);
    var usable = h - pad.t - pad.b;
    var volH = withVol ? Math.max(18, usable * 0.18) : 0;
    var priceBottom = h - pad.b - (volH ? volH + 12 : 0);
    var area = { top: pad.t, bottom: priceBottom, height: priceBottom - pad.t };
    var volMax = 0;
    data.forEach(function (d) { if (d.v > volMax) volMax = d.v; });
    var iw = (w - pad.l - pad.r) / data.length;
    return {
      pad: pad, min: b.min, max: b.max, iw: iw,
      y: function (v) { return area.top + area.height * (1 - (v - b.min) / (b.max - b.min)); },
      volTop: priceBottom + 12,
      volH: volH,
      volMax: volMax,
      volY: function (v) { return priceBottom + 12 + volH * (1 - v / volMax); },
      area: area
    };
  }

  function drawVolume(ctx, data, L, w) {
    if (!L.volH) return;
    data.forEach(function (d, i) {
      var up = d.c >= d.o;
      var x = L.pad.l + L.iw * i + L.iw * 0.2;
      var bw = Math.max(1, L.iw * 0.6);
      var y = L.volY(d.v);
      var hh = L.volTop + L.volH - y;
      ctx.fillStyle = up ? "rgba(75,214,160,0.26)" : "rgba(255,111,94,0.26)";
      ctx.fillRect(x, y, bw, Math.max(1, hh));
    });
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath();
    ctx.moveTo(L.pad.l, L.volTop - 0.5);
    ctx.lineTo(w - L.pad.r, L.volTop - 0.5);
    ctx.stroke();
    ctx.save();
    ctx.font = "9px " + MONO;
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText("VOL", L.pad.l + 1, L.volTop - 4);
    ctx.restore();
  }

  function drawCandles(cv, data, hero) {
    var f = fit(cv), ctx = f.ctx, w = f.w, h = f.h;
    var L = layoutOHLC(w, h, data);
    priceAxis(ctx, w, h, L.min, L.max, { l: L.pad.l, r: L.pad.r, t: L.pad.t, b: h - L.area.bottom }, 4);
    drawVolume(ctx, data, L, w);

    var bw = Math.max(1.6, Math.min(13, L.iw * 0.62));
    data.forEach(function (d, i) {
      var x = L.pad.l + L.iw * (i + 0.5);
      var up = d.c >= d.o;
      var col = up ? C.up : C.down;
      var yH = L.y(d.h), yL = L.y(d.l);
      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(x) + 0.5, yH);
      ctx.lineTo(Math.round(x) + 0.5, yL);
      ctx.stroke();
      ctx.globalAlpha = 1;

      var yO = L.y(d.o), yC = L.y(d.c);
      var top = Math.min(yO, yC);
      var hgt = Math.max(1.5, Math.abs(yC - yO));
      var g = ctx.createLinearGradient(0, top, 0, top + hgt);
      if (up) {
        g.addColorStop(0, "rgba(75,214,160,0.95)");
        g.addColorStop(1, "rgba(75,214,160,0.55)");
      } else {
        g.addColorStop(0, "rgba(255,111,94,0.85)");
        g.addColorStop(1, "rgba(255,111,94,0.5)");
      }
      ctx.fillStyle = g;
      ctx.beginPath();
      rr(ctx, x - bw / 2, top, bw, hgt, Math.min(2.5, bw / 2));
      ctx.fill();
    });

    if (!hero) {
      timeAxis(ctx, w, h, L.pad, data.length, 6);
      watermark(ctx, "TIK · УЧЕБНЫЙ РЯД");
    }
    var last = data[data.length - 1];
    lastPrice(ctx, w, L.y(last.c), last.c >= last.o ? C.up : C.down, last.c, w);
    return { type: "ohlc", L: L, data: data, w: w, h: h };
  }

  function smooth(ctx, pts) {
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i];
      var p1 = pts[i];
      var p2 = pts[i + 1];
      var p3 = pts[i + 2] || p2;
      ctx.bezierCurveTo(
        p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
        p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6,
        p2[0], p2[1]
      );
    }
  }

  function layoutLine(w, h, data) {
    var pad = { l: 8, r: 62, t: 16, b: 24 };
    var min = Infinity, max = -Infinity;
    data.forEach(function (d) { min = Math.min(min, d.c); max = Math.max(max, d.c); });
    var span = (max - min) || 1;
    min -= span * 0.12; max += span * 0.12;
    var step = (w - pad.l - pad.r) / (data.length - 1);
    return {
      pad: pad, min: min, max: max, step: step,
      y: function (v) { return pad.t + (h - pad.t - pad.b) * (1 - (v - min) / (max - min)); },
      x: function (i) { return pad.l + step * i; }
    };
  }

  function drawLineChart(cv, data, filled) {
    var f = fit(cv), ctx = f.ctx, w = f.w, h = f.h;
    var L = layoutLine(w, h, data);
    priceAxis(ctx, w, h, L.min, L.max, L.pad, 4);

    var pts = data.map(function (d, i) { return [L.x(i), L.y(d.c)]; });
    var rising = data[data.length - 1].c >= data[0].c;
    var col = rising ? C.up : C.down;

    if (filled) {
      var g = ctx.createLinearGradient(0, L.pad.t, 0, h - L.pad.b);
      g.addColorStop(0, rising ? "rgba(75,214,160,0.34)" : "rgba(255,111,94,0.30)");
      g.addColorStop(0.55, rising ? "rgba(75,214,160,0.10)" : "rgba(255,111,94,0.09)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.moveTo(pts[0][0], h - L.pad.b);
      smooth(ctx, pts);
      ctx.lineTo(pts[pts.length - 1][0], h - L.pad.b);
      ctx.closePath();
      ctx.fillStyle = g;
      ctx.fill();
    }

    ctx.save();
    ctx.beginPath();
    smooth(ctx, pts);
    var sg = ctx.createLinearGradient(L.pad.l, 0, w - L.pad.r, 0);
    sg.addColorStop(0, filled ? col : C.ice);
    sg.addColorStop(1, filled ? col : "#C9E6FF");
    ctx.strokeStyle = sg;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.shadowColor = filled ? (rising ? "rgba(75,214,160,.55)" : "rgba(255,111,94,.5)") : "rgba(138,197,255,.55)";
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.restore();

    var last = data[data.length - 1];
    var lx = L.x(data.length - 1), ly = L.y(last.c);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(lx, ly, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.arc(lx, ly, 7.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    timeAxis(ctx, w, h, L.pad, data.length, 6);
    watermark(ctx, "TIK · УЧЕБНЫЙ РЯД");
    lastPrice(ctx, w, ly, col, last.c, w);
    return { type: "line", L: L, data: data, w: w, h: h };
  }

  function drawBars(cv, data) {
    var f = fit(cv), ctx = f.ctx, w = f.w, h = f.h;
    var L = layoutOHLC(w, h, data);
    priceAxis(ctx, w, h, L.min, L.max, { l: L.pad.l, r: L.pad.r, t: L.pad.t, b: h - L.area.bottom }, 4);
    drawVolume(ctx, data, L, w);
    var bw = Math.max(5, Math.min(15, L.iw * 0.62));
    data.forEach(function (d, i) {
      var x = L.pad.l + L.iw * (i + 0.5);
      var col = d.c >= d.o ? C.up : C.down;
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x, L.y(d.h));
      ctx.lineTo(x, L.y(d.l));
      ctx.stroke();
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(x - bw / 2, L.y(d.o));
      ctx.lineTo(x, L.y(d.o));
      ctx.moveTo(x, L.y(d.c));
      ctx.lineTo(x + bw / 2, L.y(d.c));
      ctx.stroke();
    });
    timeAxis(ctx, w, h, L.pad, data.length, 6);
    var last = data[data.length - 1];
    lastPrice(ctx, w, L.y(last.c), last.c >= last.o ? C.up : C.down, last.c, w);
    return { type: "ohlc", L: L, data: data, w: w, h: h };
  }

  function heikin(data) {
    var out = [];
    for (var i = 0; i < data.length; i++) {
      var d = data[i];
      var hc = (d.o + d.h + d.l + d.c) / 4;
      var ho = i === 0 ? (d.o + d.c) / 2 : (out[i - 1].o + out[i - 1].c) / 2;
      out.push({ o: ho, c: hc, h: Math.max(d.h, ho, hc), l: Math.min(d.l, ho, hc), v: d.v });
    }
    return out;
  }

  function drawRenko(cv, data) {
    var f = fit(cv), ctx = f.ctx, w = f.w, h = f.h;
    var closes = data.map(function (d) { return d.c; });
    var lo = Math.min.apply(null, closes), hi = Math.max.apply(null, closes);
    var brick = (hi - lo) / 24 || 1;
    var bricks = [];
    var last = Math.floor(closes[0] / brick);
    closes.forEach(function (c) {
      var l = Math.floor(c / brick), guard = 0;
      while (l > last && guard++ < 300) { bricks.push({ low: last, high: last + 1, dir: 1 }); last++; }
      while (l < last && guard++ < 300) { bricks.push({ low: last - 1, high: last, dir: -1 }); last--; }
    });
    var pad = { l: 10, r: 62, t: 18, b: 24 };
    var min = Infinity, max = -Infinity;
    bricks.forEach(function (b) { min = Math.min(min, b.low); max = Math.max(max, b.high); });
    var minP = min * brick, maxP = (max + 1) * brick;
    priceAxis(ctx, w, h, minP, maxP, pad, 4);
    watermark(ctx, "TIK · РЕНКО · ШАГ " + brick.toFixed(2));
    var colW = Math.min((h - pad.t - pad.b) / Math.max(1, max - min), (w - pad.l - pad.r) / Math.max(1, bricks.length));
    var ox = pad.l + Math.max(0, (w - pad.l - pad.r - colW * bricks.length) / 2);
    bricks.forEach(function (b, i) {
      var x = ox + i * colW;
      var yTop = pad.t + (h - pad.t - pad.b) * (1 - (b.high * brick - minP) / (maxP - minP));
      var yBot = pad.t + (h - pad.t - pad.b) * (1 - (b.low * brick - minP) / (maxP - minP));
      var hh = Math.max(2, yBot - yTop);
      var g = ctx.createLinearGradient(0, yTop, 0, yTop + hh);
      if (b.dir === 1) {
        g.addColorStop(0, "rgba(75,214,160,0.40)");
        g.addColorStop(1, "rgba(75,214,160,0.12)");
      } else {
        g.addColorStop(0, "rgba(255,111,94,0.34)");
        g.addColorStop(1, "rgba(255,111,94,0.10)");
      }
      ctx.fillStyle = g;
      ctx.strokeStyle = b.dir === 1 ? "rgba(75,214,160,0.85)" : "rgba(255,111,94,0.85)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      rr(ctx, x + 1, yTop + 1, Math.max(2, colW - 2.5), Math.max(2, hh - 2), 2);
      ctx.fill();
      ctx.stroke();
    });
    return { type: "none" };
  }

  function drawPnf(cv, data) {
    var f = fit(cv), ctx = f.ctx, w = f.w, h = f.h;
    var closes = data.map(function (d) { return d.c; });
    var lo = Math.min.apply(null, closes), hi = Math.max.apply(null, closes);
    var box = (hi - lo) / 18 || 1;
    var REV = 3;
    var cols = [], cur = null;
    closes.forEach(function (c) {
      var l = Math.floor(c / box);
      if (!cur) { cur = { dir: 1, from: l, to: l }; cols.push(cur); return; }
      if (cur.dir === 1) {
        if (l > cur.to) cur.to = l;
        else if (cur.to - l >= REV) { cur = { dir: -1, from: cur.to - 1, to: l }; cols.push(cur); }
      } else {
        if (l < cur.to) cur.to = l;
        else if (l - cur.to >= REV) { cur = { dir: 1, from: cur.to + 1, to: l }; cols.push(cur); }
      }
    });
    var pad = { l: 10, r: 62, t: 18, b: 24 };
    var min = Infinity, max = -Infinity;
    cols.forEach(function (c) { min = Math.min(min, c.from, c.to); max = Math.max(max, c.from, c.to); });
    priceAxis(ctx, w, h, min * box, (max + 1) * box, pad, 4);
    var colW = (w - pad.l - pad.r) / Math.max(1, cols.length);
    var rows = max - min + 1;
    var size = Math.min(colW, (h - pad.t - pad.b) / rows) * 0.5;

    cols.forEach(function (c2, i) {
      if (i % 2 === 0) {
        ctx.fillStyle = "rgba(255,255,255,0.016)";
        ctx.fillRect(pad.l + colW * i, pad.t, colW, h - pad.t - pad.b);
      }
    });

    cols.forEach(function (c2, i) {
      var cx = pad.l + colW * (i + 0.5);
      var a = Math.min(c2.from, c2.to), z = Math.max(c2.from, c2.to);
      for (var lv = a; lv <= z; lv++) {
        var y = pad.t + (h - pad.t - pad.b) * (1 - ((lv * box + box / 2) - min * box) / ((max + 1) * box - min * box));
        ctx.strokeStyle = c2.dir === 1 ? C.up : C.down;
        ctx.lineWidth = 1.4;
        ctx.lineCap = "round";
        if (c2.dir === 1) {
          ctx.beginPath();
          ctx.moveTo(cx - size, y - size);
          ctx.lineTo(cx + size, y + size);
          ctx.moveTo(cx + size, y - size);
          ctx.lineTo(cx - size, y + size);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(cx, y, size, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    });
    watermark(ctx, "TIK · КРЕСТИКИ-НОЛИКИ · ШАГ " + box.toFixed(2));
    return { type: "none" };
  }

  function drawProfile(cv, data) {
    var f = fit(cv), ctx = f.ctx, w = f.w, h = f.h;
    var bins = 26;
    var lo = Infinity, hi = -Infinity;
    data.forEach(function (d) { lo = Math.min(lo, d.l); hi = Math.max(hi, d.h); });
    var step = (hi - lo) / bins;
    var vol = new Array(bins).fill(0);
    data.forEach(function (d) {
      var a = Math.max(0, Math.min(bins - 1, Math.floor((d.l - lo) / step)));
      var z = Math.max(0, Math.min(bins - 1, Math.floor((d.h - lo) / step)));
      var span = z - a + 1;
      for (var i = a; i <= z; i++) vol[i] += d.v / span;
    });
    var maxV = Math.max.apply(null, vol);
    var total = vol.reduce(function (s, x) { return s + x; }, 0);
    var sorted = vol.slice().sort(function (x, y) { return y - x; });
    var acc = 0, va = [], need = total * 0.7;
    for (var k = 0; k < sorted.length; k++) { acc += sorted[k]; va.push(sorted[k]); if (acc >= need) break; }
    var vaMin = Math.min.apply(null, va);
    var poc = vol.indexOf(maxV);

    var pad = { l: 10, r: 62, t: 18, b: 24 };
    var area = { top: pad.t, bottom: h - pad.b };
    var rowH = (area.bottom - area.top) / bins;
    var avail = (w - pad.l - pad.r) * 0.94;

    ctx.save();
    ctx.font = "10px " + MONO;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (var i = 0; i < bins; i++) {
      var y = area.bottom - rowH * (i + 0.5);
      var bw = Math.max(2, (vol[i] / maxV) * avail);
      var g = ctx.createLinearGradient(pad.l, 0, pad.l + bw, 0);
      if (i === poc) {
        g.addColorStop(0, "rgba(240,192,112,0.9)");
        g.addColorStop(1, "rgba(240,192,112,0.35)");
      } else if (vol[i] >= vaMin) {
        g.addColorStop(0, "rgba(138,197,255,0.62)");
        g.addColorStop(1, "rgba(138,197,255,0.16)");
      } else {
        g.addColorStop(0, "rgba(138,197,255,0.24)");
        g.addColorStop(1, "rgba(138,197,255,0.05)");
      }
      ctx.fillStyle = g;
      ctx.beginPath();
      rr(ctx, pad.l, y - rowH * 0.33, bw, rowH * 0.66, Math.min(4, rowH * 0.33));
      ctx.fill();
      if (i % 3 === 0) {
        ctx.fillStyle = C.axis;
        ctx.fillText((lo + step * (i + 0.5)).toFixed(2), w - pad.r - 8, y);
      }
    }
    ctx.restore();

    var pocY = area.bottom - rowH * (poc + 0.5);
    ctx.save();
    ctx.strokeStyle = "rgba(240,192,112,0.5)";
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.l, pocY);
    ctx.lineTo(w - pad.r, pocY);
    ctx.stroke();
    ctx.restore();
    var pocW = (vol[poc] / maxV) * avail;
    pill(ctx, Math.min(w - pad.r - 40, pad.l + pocW + 6), pocY, 38, 16, C.amber, "POC");
    watermark(ctx, "TIK · ПРОФИЛЬ ОБЪЁМА");
    return { type: "none" };
  }

  function drawDepth(cv, data) {
    var f = fit(cv), ctx = f.ctx, w = f.w, h = f.h;
    var mid = data[data.length - 1].c;
    var r = rnd(31);
    var levels = 34, tick = mid * 0.0009;
    var bids = [], asks = [], cb = 0, ca = 0;
    for (var i = 1; i <= levels; i++) {
      cb += 12 + r() * 28 + i * 1.2;
      ca += 11 + r() * 26 + i * 1.1;
      bids.push({ p: mid - tick * i, s: cb });
      asks.push({ p: mid + tick * i, s: ca });
    }
    var pad = { l: 12, r: 20, t: 34, b: 30 };
    var maxS = Math.max(cb, ca) * 1.1;
    var padP = tick * levels * 1.12;
    var minP = mid - padP, maxP = mid + padP;
    var xOf = function (p) { return pad.l + ((p - minP) / (maxP - minP)) * (w - pad.l - pad.r); };
    var midX = xOf(mid);
    var yBase = h - pad.b;
    var plotH = yBase - pad.t;

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.setLineDash([3, 5]);
    for (var gy = 0; gy <= 3; gy++) {
      var yy = pad.t + (plotH * gy) / 3;
      ctx.beginPath();
      ctx.moveTo(pad.l, yy);
      ctx.lineTo(w - pad.r, yy);
      ctx.stroke();
    }
    ctx.restore();

    function area(pts, from, to) {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], yBase);
      pts.forEach(function (p) { ctx.lineTo(p[0], p[1]); });
      ctx.lineTo(pts[pts.length - 1][0], yBase);
      ctx.closePath();
      var g = ctx.createLinearGradient(0, pad.t, 0, yBase);
      g.addColorStop(0, from);
      g.addColorStop(1, to);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.beginPath();
      pts.forEach(function (p, i) { if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); });
      ctx.strokeStyle = from.replace(/[\d.]+\)$/, "0.95)");
      ctx.lineWidth = 1.8;
      ctx.lineJoin = "round";
      ctx.stroke();
    }
    area(bids.slice().reverse().map(function (b2) { return [xOf(b2.p), yBase - (b2.s / maxS) * plotH]; }), "rgba(75,214,160,0.34)", "rgba(75,214,160,0.02)");
    area(asks.map(function (a) { return [xOf(a.p), yBase - (a.s / maxS) * plotH]; }), "rgba(255,111,94,0.32)", "rgba(255,111,94,0.02)");

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(midX, pad.t);
    ctx.lineTo(midX, yBase);
    ctx.stroke();
    ctx.restore();

    var spread = tick * 2;
    pill(ctx, midX - 26, pad.t - 14, 52, 20, "#E9F2F8", mid.toFixed(2));
    ctx.save();
    ctx.font = "9px " + MONO;
    ctx.fillStyle = "rgba(255,255,255,0.42)";
    ctx.textAlign = "center";
    ctx.fillText("спред " + spread.toFixed(3), midX, yBase + 14);
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(75,214,160,0.75)";
    ctx.fillText("BID", pad.l + 2, pad.t - 8);
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255,111,94,0.75)";
    ctx.fillText("ASK", w - pad.r, pad.t - 8);
    ctx.restore();
    watermark(ctx, "TIK · ГЛУБИНА РЫНКА");
    return { type: "none" };
  }

  function drawHero(cv, data) {
    var f = fit(cv), ctx = f.ctx, w = f.w, h = f.h;
    var pad = { l: 4, r: 4, t: 6, b: 6 };
    var b = bounds(data);
    var iw = (w - pad.l - pad.r) / data.length;
    var bw = Math.max(1.2, Math.min(9, iw * 0.6));
    data.forEach(function (d, i) {
      var x = pad.l + iw * (i + 0.5);
      var up = d.c >= d.o;
      var col = up ? C.up : C.down;
      var yH = pad.t + (h - pad.t - pad.b) * (1 - (d.h - b.min) / (b.max - b.min));
      var yL = pad.t + (h - pad.t - pad.b) * (1 - (d.l - b.min) / (b.max - b.min));
      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(x) + 0.5, yH);
      ctx.lineTo(Math.round(x) + 0.5, yL);
      ctx.stroke();
      ctx.globalAlpha = 1;
      var yO = pad.t + (h - pad.t - pad.b) * (1 - (d.o - b.min) / (b.max - b.min));
      var yC = pad.t + (h - pad.t - pad.b) * (1 - (d.c - b.min) / (b.max - b.min));
      var top = Math.min(yO, yC);
      ctx.fillStyle = up ? "rgba(75,214,160,0.9)" : "rgba(255,111,94,0.8)";
      ctx.beginPath();
      rr(ctx, x - bw / 2, top, bw, Math.max(1.5, Math.abs(yC - yO)), Math.min(2, bw / 2));
      ctx.fill();
    });
    return { type: "none" };
  }

  /* ------- crosshair ------- */

  function overlayFor(cv) {
    var host = cv.parentNode;
    if (!host) return null;
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    var ov = host.querySelector("canvas.chart-overlay");
    if (!ov) {
      ov = document.createElement("canvas");
      ov.className = "chart-overlay";
      ov.setAttribute("aria-hidden", "true");
      ov.style.position = "absolute";
      ov.style.inset = "0";
      ov.style.width = "100%";
      ov.style.height = "100%";
      ov.style.pointerEvents = "none";
      host.appendChild(ov);
    }
    return ov;
  }

  function sizeOverlay(ov, cv) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var rect = cv.getBoundingClientRect();
    var hrect = ov.parentNode.getBoundingClientRect();
    ov.style.left = cv.offsetLeft + "px";
    ov.style.top = cv.offsetTop + "px";
    ov.style.width = rect.width + "px";
    ov.style.height = rect.height + "px";
    if (ov.width !== Math.round(rect.width * dpr) || ov.height !== Math.round(rect.height * dpr)) {
      ov.width = Math.round(rect.width * dpr);
      ov.height = Math.round(rect.height * dpr);
    }
    var ctx = ov.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    return { ctx: ctx, w: rect.width, h: rect.height, offsetX: cv.offsetLeft, offsetY: cv.offsetTop, host: hrect };
  }

  function crosshair(cv, state, clientX) {
    var ov = overlayFor(cv);
    if (!ov) return;
    var o = sizeOverlay(ov, cv);
    var rect = cv.getBoundingClientRect();
    var x = clientX - rect.left;
    var L = state.layout;
    if (!L || L.type !== "ohlc" && L.type !== "line") return;

    var idx;
    if (L.type === "ohlc") idx = Math.floor((x - L.L.pad.l) / L.L.iw);
    else idx = Math.round((x - L.L.pad.l) / L.L.step);
    idx = Math.max(0, Math.min(state.data.length - 1, idx));
    var d = state.data[idx];

    var cx = L.type === "ohlc" ? L.L.pad.l + L.L.iw * (idx + 0.5) : L.L.x(idx);
    var cy = L.type === "ohlc" ? L.L.y(d.c) : L.L.y(d.c);
    var ctx = o.ctx, w = o.w, h = o.h;

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.setLineDash([3, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.round(cx) + 0.5, 0);
    ctx.lineTo(Math.round(cx) + 0.5, h);
    ctx.moveTo(0, Math.round(cy) + 0.5);
    ctx.lineTo(w, Math.round(cy) + 0.5);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();

    var lines = L.type === "ohlc"
      ? [
          "св. " + (idx + 1),
          "откр " + d.o.toFixed(2),
          "макс " + d.h.toFixed(2),
          "мин  " + d.l.toFixed(2),
          "закр " + d.c.toFixed(2),
          "объём " + Math.round(d.v)
        ]
      : ["#" + (idx + 1), "цена " + d.c.toFixed(2)];

    ctx.save();
    ctx.font = "10px " + MONO;
    var lh = 14, bw = 104, bh = lines.length * lh + 14;
    var bx = cx + 16;
    if (bx + bw > w - 8) bx = cx - bw - 16;
    if (bx < 4) bx = 4;
    var by = Math.max(6, Math.min(cy - bh / 2, h - bh - 6));
    ctx.fillStyle = "rgba(9,14,19,0.94)";
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    rr(ctx, bx, by, bw, bh, 8);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    lines.forEach(function (line, i) {
      ctx.fillStyle = i === 0 ? "rgba(255,255,255,0.55)" : "rgba(226,236,244,0.92)";
      ctx.fillText(line, bx + 10, by + 9 + i * lh);
    });
    ctx.restore();
  }

  /* ------- mount ------- */

  var mounted = [];

  function render(cv) {
    var st = cv.__tik;
    if (!st) return;
    var state = st.type === "depth" ? drawDepth(cv, st.data)
      : st.type === "profile" ? drawProfile(cv, st.data)
      : st.type === "pnf" ? drawPnf(cv, st.data)
      : st.type === "renko" ? drawRenko(cv, st.data)
      : st.type === "heikin" ? drawCandles(cv, heikin(st.data))
      : st.type === "hero" ? drawHero(cv, st.data)
      : st.type === "line" ? drawLineChart(cv, st.data, false)
      : st.type === "area" ? drawLineChart(cv, st.data, true)
      : st.type === "bars" ? drawBars(cv, st.data)
      : drawCandles(cv, st.data);
    cv.__tikLayout = state;
    var ov = cv.parentNode && cv.parentNode.querySelector("canvas.chart-overlay");
    if (ov) sizeOverlay(ov, cv);
  }

  function mount(cv, type, data) {
    cv.__tik = { type: type, data: data };
    mounted.push(cv);
    render(cv);
    if (!cv.__tikBound) {
      cv.__tikBound = true;
      cv.addEventListener("pointermove", function (e) {
        crosshair(cv, { layout: cv.__tikLayout, data: cv.__tik.data }, e.clientX);
      });
      cv.addEventListener("pointerleave", function () {
        var ov = cv.parentNode && cv.parentNode.querySelector("canvas.chart-overlay");
        if (ov) {
          var ctx = ov.getContext("2d");
          ctx.clearRect(0, 0, ov.width, ov.height);
        }
      });
      cv.style.touchAction = "pan-y";
    }
    return {
      setType: function (t) { cv.__tik.type = t; render(cv); },
      render: function () { render(cv); }
    };
  }

  window.addEventListener("site:resize", function () {
    mounted.forEach(function (cv) { if (document.body.contains(cv)) render(cv); });
  });

  window.Charts = {
    series: series,
    mount: mount,
    draw: function (type, canvas, data) {
      canvas.__tik = { type: type, data: data };
      render(canvas);
    }
  };
})();
