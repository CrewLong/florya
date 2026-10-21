(function () {
  "use strict";

  var bar = document.querySelector(".progress");
  function onScroll() {
    if (!bar) return;
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    bar.style.width = Math.min(100, Math.max(0, pct)) + "%";
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var items = document.querySelectorAll(".rv");
  if (reduce || !("IntersectionObserver" in window)) {
    items.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  }

  var railLinks = document.querySelectorAll(".rail a[href^='#']");
  if (railLinks.length && "IntersectionObserver" in window) {
    var map = {};
    railLinks.forEach(function (a) {
      var id = a.getAttribute("href").slice(1);
      var target = document.getElementById(id);
      if (target) map[id] = a;
    });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var a = map[e.target.id];
        if (!a) return;
        if (e.isIntersecting) {
          railLinks.forEach(function (x) { x.classList.remove("on"); });
          a.classList.add("on");
        }
      });
    }, { rootMargin: "-20% 0px -60% 0px" });
    Object.keys(map).forEach(function (id) { spy.observe(document.getElementById(id)); });
  }

  var t;
  window.addEventListener("resize", function () {
    clearTimeout(t);
    t = setTimeout(function () {
      drawSparks();
      window.dispatchEvent(new CustomEvent("site:resize"));
    }, 160);
  });

  function seedRnd(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      var x = Math.imul(s ^ (s >>> 15), 1 | s);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  function drawSparks() {
    document.querySelectorAll("canvas.spark").forEach(function (cv) {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var rect = cv.getBoundingClientRect();
      var w = Math.round(rect.width), h = Math.round(rect.height);
      if (!w || !h) return;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      var ctx = cv.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      var r = seedRnd(parseInt(cv.dataset.spark, 10) || 3);
      var n = 46, v = 100, pts = [];
      for (var i = 0; i < n; i++) {
        v += Math.sin(i / 7) * 0.9 + (r() - 0.46) * 3.2;
        pts.push(v);
      }
      var min = Math.min.apply(null, pts), max = Math.max.apply(null, pts);
      var span = (max - min) || 1;
      var xOf = function (i) { return (w * i) / (n - 1); };
      var yOf = function (val) { return 6 + (h - 12) * (1 - (val - min) / span); };

      var g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "rgba(75,214,160,0.30)");
      g.addColorStop(1, "rgba(75,214,160,0)");
      ctx.beginPath();
      ctx.moveTo(0, h);
      pts.forEach(function (p, i) { ctx.lineTo(xOf(i), yOf(p)); });
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = g;
      ctx.fill();

      ctx.beginPath();
      for (var k = 0; k < pts.length; k++) {
        var px = xOf(k), py = yOf(pts[k]);
        if (k === 0) { ctx.moveTo(px, py); continue; }
        var p0 = pts[k - 1], p2 = pts[k + 1] === undefined ? pts[k] : pts[k + 1];
        ctx.bezierCurveTo(
          xOf(k - 1) + (px - xOf(Math.max(0, k - 2))) / 6, yOf(p0) + (py - yOf(pts[Math.max(0, k - 2)])) / 6,
          px - (xOf(Math.min(n - 1, k + 2)) - xOf(k - 1)) / 6, py - (yOf(p2) - yOf(p0)) / 6,
          px, py
        );
      }
      ctx.strokeStyle = "#4BD6A0";
      ctx.lineWidth = 1.6;
      ctx.lineJoin = "round";
      ctx.shadowColor = "rgba(75,214,160,.5)";
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = "#EAF4EF";
      ctx.beginPath();
      ctx.arc(w - 1, yOf(pts[n - 1]), 2.4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", drawSparks);
  } else {
    drawSparks();
  }
})();
