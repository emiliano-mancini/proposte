/*! VNG kit — comportamento dei componenti di vng.css. Nessuna dipendenza.
   Riscritto da VengeanceUI (MIT, © 2025-2026 Ashutoshx7). Uso: <script src="vng.js" defer></script>
   Si avvia da solo su DOMContentLoaded; per contenuti aggiunti dopo: VNG.init(radice).
   Modalità foto: ?shot=1 → html.vng-static, contatori al valore finale, niente autoplay. */
(function () {
  "use strict";
  var STATIC = /[?&]shot=1\b/.test(location.search);
  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (STATIC) document.documentElement.classList.add("vng-static");
  var still = STATIC || REDUCED;
  function $$(root, sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }
  function once(el, key) { if (el["__vng" + key]) return false; el["__vng" + key] = true; return true; }

  /* 4. Flip text: divide il testo in lettere con ritardo a curva sinusoidale. */
  function flip(el) {
    if (!once(el, "flip")) return;
    var text = el.textContent, dur = parseFloat(el.dataset.duration || "2.4"), n = text.length;
    el.textContent = "";
    el.classList.add("vng-flip");
    var sr = document.createElement("span"); sr.className = "vng-sr"; sr.textContent = text; el.appendChild(sr);
    for (var i = 0; i < n; i++) {
      var ch = text[i];
      if (ch === " ") { var sp = document.createElement("span"); sp.innerHTML = "&nbsp;"; sp.setAttribute("aria-hidden", "true"); el.appendChild(sp); continue; }
      var s = document.createElement("span");
      s.className = "vng-flip__c"; s.dataset.c = ch; s.textContent = ch; s.setAttribute("aria-hidden", "true");
      s.style.setProperty("--d", dur + "s");
      s.style.setProperty("--delay", (Math.sin((i / n) * Math.PI / 2) * dur * 0.25).toFixed(3) + "s");
      el.appendChild(s);
    }
  }

  /* 6. Spotlight nav: luce sul cursore, linea che scivola sulla voce attiva. */
  function spot(nav) {
    if (!once(nav, "spot")) return;
    var links = $$(nav, "a"); if (!links.length) return;
    var active = links.filter(function (a) { return a.classList.contains("is-active"); })[0] || links[0];
    var ax = 0, target = 0, raf = 0;
    function center(a) { var r = nav.getBoundingClientRect(), b = a.getBoundingClientRect(); return b.left - r.left + b.width / 2; }
    function tick() { ax += (target - ax) * (still ? 1 : 0.18); nav.style.setProperty("--ax", ax + "px"); if (Math.abs(target - ax) > 0.5) raf = requestAnimationFrame(tick); else raf = 0; }
    function go(a) { active = a; links.forEach(function (l) { l.classList.toggle("is-active", l === a); }); target = center(a); if (!raf) raf = requestAnimationFrame(tick); }
    ax = target = center(active); nav.style.setProperty("--ax", ax + "px");
    nav.addEventListener("pointermove", function (e) { var r = nav.getBoundingClientRect(); nav.style.setProperty("--x", (e.clientX - r.left) + "px"); nav.classList.add("is-hover"); });
    nav.addEventListener("pointerleave", function () { nav.classList.remove("is-hover"); });
    links.forEach(function (a) { a.addEventListener("click", function () { go(a); }); });
    window.addEventListener("resize", function () { target = ax = center(active); nav.style.setProperty("--ax", ax + "px"); });
    // segue le sezioni durante lo scroll, se i link puntano ad ancore della pagina
    if ("IntersectionObserver" in window) {
      var map = links.map(function (a) { var h = a.getAttribute("href") || "", id = h.charAt(0) === "#" ? h.slice(1) : ""; return [a, id && document.getElementById(id)]; }).filter(function (p) { return p[1]; });
      if (map.length) {
        var io = new IntersectionObserver(function (ents) { ents.forEach(function (en) { if (en.isIntersecting) map.forEach(function (p) { if (p[1] === en.target) go(p[0]); }); }); }, { rootMargin: "-45% 0px -50% 0px" });
        map.forEach(function (p) { io.observe(p[1]); });
      }
    }
  }

  /* 7. Contatore: parte quando entra in vista; il valore finale è già nell'HTML. */
  function count(el) {
    if (!once(el, "count")) return;
    var to = parseFloat(el.dataset.vngCount), dec = parseInt(el.dataset.decimals || "0", 10);
    var pre = el.dataset.prefix || "", suf = el.dataset.suffix || "", dur = parseFloat(el.dataset.duration || "1.6") * 1000;
    function fmt(v) { return pre + v.toLocaleString(document.documentElement.lang || "it-IT", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf; }
    if (still || !("IntersectionObserver" in window) || isNaN(to)) { if (!isNaN(to)) el.textContent = fmt(to); return; }
    el.textContent = fmt(0);
    var io = new IntersectionObserver(function (ents) {
      if (!ents[0].isIntersecting) return; io.disconnect();
      var t0 = performance.now();
      (function step(t) { var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4); el.textContent = fmt(to * e); if (k < 1) requestAnimationFrame(step); })(t0);
    }, { rootMargin: "0px 0px -15% 0px" });
    io.observe(el);
  }

  /* 8. Marquee: duplica la fila per un giro continuo senza buchi. */
  function marquee(el) {
    if (!once(el, "marquee")) return;
    var track = el.querySelector(".vng-marquee__track"); if (!track) return;
    // La fila deve essere due metà identiche (translateX(-50%)): si raddoppia sempre TUTTO il contenuto.
    function dup() {
      Array.prototype.slice.call(track.children).forEach(function (n) {
        var c = n.cloneNode(true); c.setAttribute("aria-hidden", "true"); c.setAttribute("inert", "");
        c.removeAttribute("id"); $$(c, "[id]").forEach(function (x) { x.removeAttribute("id"); });
        $$(c, "a,button,input,[tabindex]").forEach(function (f) { f.setAttribute("tabindex", "-1"); });
        track.appendChild(c);
      });
    }
    dup(); var guard = 0; while (track.scrollWidth < el.clientWidth * 2 && guard++ < 4) dup();
    if (!still) el.classList.add("is-ready");
  }

  /* 11. Griglia in prospettiva: crea le piastrelle. */
  function pgrid(el) {
    if (!once(el, "pgrid")) return;
    var n = Math.max(8, Math.min(48, parseInt(el.dataset.vngPgrid || "24", 10)));
    var plane = document.createElement("div"); plane.className = "vng-pgrid__plane";
    plane.style.gridTemplateColumns = plane.style.gridTemplateRows = "repeat(" + n + ",1fr)";
    var frag = document.createDocumentFragment(); for (var i = 0; i < n * n; i++) frag.appendChild(document.createElement("i"));
    plane.appendChild(frag); el.appendChild(plane); el.setAttribute("aria-hidden", "true");
  }

  /* 12. Pila di card: la card attiva vola davanti, le altre restano inclinate dietro. */
  function stack(el) {
    if (!once(el, "stack")) return;
    var cards = $$(el, ".vng-stack__cards figure"); if (!cards.length) return;
    var h3 = el.querySelector(".vng-stack__text h3"), p = el.querySelector(".vng-stack__text p"), cnt = el.querySelector("[data-count]");
    var prev = el.querySelector("[data-prev]"), next = el.querySelector("[data-next]");
    var rot = [4, -2, -9, 7], i = 0, timer = 0;
    function show(k) {
      i = (k + cards.length) % cards.length;
      cards.forEach(function (c, j) {
        var off = j - i, a = Math.abs(off);
        c.style.zIndex = j === i ? 50 : 10 - a;
        c.style.opacity = j === i ? 1 : a > 3 ? 0 : 0.55;
        c.style.transform = j === i ? "translateZ(0) rotateZ(0deg) scale(1)"
          : "translate(" + off * 15 + "px," + a * 6 + "px) translateZ(" + (-150 * a) + "px) rotateZ(" + rot[j % 4] + "deg) scale(" + (0.85 - a * 0.04) + ")";
        c.setAttribute("aria-hidden", j === i ? "false" : "true");
      });
      var cur = cards[i];
      if (h3) h3.textContent = cur.dataset.title || ""; if (p) p.textContent = cur.dataset.text || "";
      if (cnt) cnt.textContent = (i + 1) + " / " + cards.length;
    }
    if (prev) prev.addEventListener("click", function () { stop(); show(i - 1); });
    if (next) next.addEventListener("click", function () { stop(); show(i + 1); });
    function stop() { if (timer) { clearInterval(timer); timer = 0; } }
    var ms = parseInt(el.dataset.autoplay || "0", 10);
    if (ms && !still) {
      timer = setInterval(function () { show(i + 1); }, ms);
      el.addEventListener("pointerenter", stop); el.addEventListener("focusin", stop);
    }
    show(0);
  }

  function init(root) {
    root = root || document;
    $$(root, "[data-vng-flip]").forEach(flip);
    $$(root, "[data-vng-spot]").forEach(spot);
    $$(root, "[data-vng-count]").forEach(count);
    $$(root, "[data-vng-marquee]").forEach(marquee);
    $$(root, "[data-vng-pgrid]").forEach(pgrid);
    $$(root, "[data-vng-stack]").forEach(stack);
  }
  window.VNG = { init: init, isStatic: STATIC, isReduced: REDUCED };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { init(); }); else init();
})();
