/* ═══════════════════════════════════════════════════════════
   SANGAMAM 2026 — Family get-together · Santhome Youth
   Page animation plus the free booking form (see section 9).
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ─────────────── 1. Pookalam geometry ───────────────
     Concentric petal rings drawn procedurally, so the motif
     stays crisp at any size and costs nothing to download. */
  function petal(r1, r2, half) {
    // teardrop petal pointing outward, mirrored about the y axis
    return "M0 " + -r1 +
           "C" + half + " " + -r1 + "," + half + " " + -r2 + ",0 " + -r2 +
           "C" + -half + " " + -r2 + "," + -half + " " + -r1 + ",0 " + -r1 + "Z";
  }

  function buildPookalam(svg, rings, opts) {
    if (!svg) return;
    opts = opts || {};
    var ns = "http://www.w3.org/2000/svg";
    var frag = document.createDocumentFragment();

    rings.forEach(function (ring, ri) {
      var g = document.createElementNS(ns, "g");
      g.setAttribute("fill", ring.fill || "none");
      if (ring.stroke) {
        g.setAttribute("stroke", ring.stroke);
        g.setAttribute("stroke-width", ring.sw || 1);
      }
      if (ring.opacity != null) g.setAttribute("opacity", ring.opacity);

      for (var i = 0; i < ring.n; i++) {
        var p = document.createElementNS(ns, "path");
        p.setAttribute("d", petal(ring.r1, ring.r2, ring.half));
        p.setAttribute("transform", "rotate(" + (i * 360 / ring.n + (ring.offset || 0)) + ")");
        g.appendChild(p);
      }
      // thin guide circle between rings
      if (ring.ring) {
        var c = document.createElementNS(ns, "circle");
        c.setAttribute("r", ring.r1);
        c.setAttribute("fill", "none");
        c.setAttribute("stroke", ring.stroke || ring.fill);
        c.setAttribute("stroke-width", ".6");
        c.setAttribute("opacity", ".5");
        g.appendChild(c);
      }
      if (!reduced && opts.animate) {
        g.style.transformOrigin = "center";
        g.style.animation = "spin " + (34 + ri * 13) + "s linear infinite" +
                            (ri % 2 ? " reverse" : "");
      }
      frag.appendChild(g);
    });

    var core = document.createElementNS(ns, "circle");
    core.setAttribute("r", opts.core || 15);
    core.setAttribute("fill", opts.coreFill || "#e6bf6a");
    frag.appendChild(core);
    svg.appendChild(frag);
  }

  // Hero sits on marigold, so the rings are drawn in deep tones —
  // gold petals would disappear into the background.
  buildPookalam(document.getElementById("pookalam"), [
    { n: 8,  r1: 34,  r2: 74,  half: 20, fill: "#7c1d2b", opacity: .7 },
    { n: 12, r1: 70,  r2: 108, half: 17, fill: "#0b3a22", opacity: .62, offset: 15, ring: 1 },
    { n: 16, r1: 104, r2: 142, half: 15, fill: "#a8481f", opacity: .55 },
    { n: 24, r1: 138, r2: 172, half: 11, fill: "#124a2c", opacity: .6, offset: 7 },
    { n: 32, r1: 168, r2: 198, half: 8,  fill: "#7c1d2b", opacity: .45 }
  ], { animate: true, core: 16, coreFill: "#5e1420" });

  buildPookalam(document.getElementById("foot-motif"), [
    { n: 8,  r1: 20, r2: 46, half: 13, fill: "currentColor" },
    { n: 12, r1: 44, r2: 68, half: 11, fill: "currentColor", offset: 15 },
    { n: 16, r1: 66, r2: 88, half: 9,  fill: "currentColor" },
    { n: 24, r1: 86, r2: 104, half: 6, fill: "currentColor", offset: 7 }
  ], { core: 9, coreFill: "currentColor" });

  /* ─────────────── 2. Countdown ─────────────── */
  // Sunday 13 September 2026. Counts down to 10:30, when the main
  // programme opens — the 6:30 pookalam is an early, come-if-you-can item.
  var EVENT_DATE = new Date("2026-09-13T10:30:00");
  var out = {
    days: document.getElementById("cd-days"),
    hours: document.getElementById("cd-hours"),
    mins: document.getElementById("cd-mins"),
    secs: document.getElementById("cd-secs")
  };
  function pad(n) { return String(n).padStart(2, "0"); }
  function tick() {
    var diff = Math.max(0, EVENT_DATE - Date.now());
    var t = Math.floor(diff / 1000);
    set(out.days,  pad(Math.floor(t / 86400)));
    set(out.hours, pad(Math.floor(t % 86400 / 3600)));
    set(out.mins,  pad(Math.floor(t % 3600 / 60)));
    set(out.secs,  pad(t % 60));
  }
  function set(el, v) {
    if (!el || el.textContent === v) return;
    el.textContent = v;
    if (reduced) return;
    // roll the new digits up into place
    el.animate(
      [{ transform: "translateY(28%)", opacity: 0 },
       { transform: "none",            opacity: 1 }],
      { duration: 300, easing: "cubic-bezier(.22,1,.36,1)" }
    );
  }
  tick();
  setInterval(tick, 1000);

  /* ─────────────── 3. Scroll reveal ─────────────── */
  var items = document.querySelectorAll(".reveal");
  function revealAll() { items.forEach(function (el) { el.classList.add("in"); }); }

  if (reduced || !("IntersectionObserver" in window)) {
    revealAll();
  } else {
    // failsafe: never leave content invisible if the observer never fires
    // (e.g. a background/hidden tab that is never composited)
    setTimeout(revealAll, 4000);
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var sibs = Array.prototype.slice.call(e.target.parentNode.children)
                        .filter(function (n) { return n.classList.contains("reveal"); });
        e.target.style.transitionDelay = Math.min(sibs.indexOf(e.target), 6) * 70 + "ms";
        e.target.classList.add("in");
        io.unobserve(e.target);
      });
    }, { threshold: .12, rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ─────────────── 4. Maveli's walk ───────────────
     Maveli crosses his band as you scroll it through view,
     and faces the direction of travel. */
  var maveli = document.getElementById("maveli");
  var maveliBand = document.getElementById("maveli-band");

  if (maveli && maveliBand && !reduced) {
    var lastX = 0, ticking = false;

    function walk() {
      ticking = false;
      var r = maveliBand.getBoundingClientRect();
      var vh = window.innerHeight;
      // 0 → 1 as the band travels from entering to leaving the viewport
      var p = (vh - r.top) / (vh + r.height);
      p = Math.max(0, Math.min(1, p));

      var travel = maveliBand.clientWidth - maveli.clientWidth;
      var x = p * travel;

      maveli.style.transform = "translateX(" + x + "px) scaleX(" + (x < lastX ? -1 : 1) + ")";
      // legs only cycle while he is actually moving
      maveli.classList.toggle("walking", Math.abs(x - lastX) > .35);
      lastX = x;
    }

    var stopTimer;
    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(walk); }
      clearTimeout(stopTimer);
      stopTimer = setTimeout(function () { maveli.classList.remove("walking"); }, 140);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    walk();
  }

  /* ─────────────── 7. Booking sheet ─────────────── */
  var overlay = document.getElementById("overlay");
  var sheet = document.getElementById("sheet");
  var lastFocus = null;

  function openSheet() {
    lastFocus = document.activeElement;
    overlay.classList.add("open");
    sheet.classList.add("open");
    sheet.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    var first = sheet.querySelector(".sheet-x");
    if (first) setTimeout(function () { first.focus(); }, 60);
  }
  function closeSheet() {
    overlay.classList.remove("open");
    sheet.classList.remove("open");
    sheet.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }

  document.querySelectorAll("[data-open-booking]").forEach(function (b) {
    b.addEventListener("click", openSheet);
  });
  document.querySelectorAll("[data-close-booking]").forEach(function (b) {
    b.addEventListener("click", closeSheet);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && sheet.classList.contains("open")) closeSheet();
  });

  /* ─────────────── 8. Ticket stepper ─────────────── */
  // No venue cap on the event; MAX is only a sane bound for the stepper UI.
  var qty = 1, MIN = 1, MAX = 30;

  var qtyEl = document.getElementById("qty-value");
  var minus = document.getElementById("qty-minus");
  var plus = document.getElementById("qty-plus");

  function render() {
    qtyEl.textContent = qty;
    minus.disabled = qty <= MIN;
    plus.disabled = qty >= MAX;
    if (!reduced) {
      qtyEl.animate([{ transform: "scale(1.22)" }, { transform: "none" }],
                    { duration: 220, easing: "cubic-bezier(.22,1,.36,1)" });
    }
  }

  minus.addEventListener("click", function () { if (qty > MIN) { qty--; render(); } });
  plus.addEventListener("click", function () { if (qty < MAX) { qty++; render(); } });

  render();

  /* ─────────────── 9. Booking: details → backend ───────────────
     Free registration. The visitor gives a name and mobile number,
     the backend records a row and returns a booking ID. */

  var CFG  = window.SANGAMAM_CONFIG || {};
  var LIVE = !!(CFG.BOOKINGS_OPEN && CFG.BACKEND_URL);

  var stepForm = document.querySelector(".sheet-body");
  var stepDone = document.getElementById("sheet-done");

  var nameEl  = document.getElementById("bk-name");
  var phoneEl = document.getElementById("bk-phone");
  var emailEl = document.getElementById("bk-email");

  var submitBtn = document.getElementById("btn-submit");
  var errEl     = document.getElementById("form-error");
  var noteEl    = document.getElementById("sheet-note");

  // Until bookings are switched on, the panel shows the real design but
  // takes nothing. Worded for a visitor, not a developer.
  if (!LIVE) {
    noteEl.hidden = false;
    document.getElementById("submit-label").textContent = "Bookings open soon";
  }

  phoneEl.addEventListener("input", function () {
    phoneEl.value = phoneEl.value.replace(/\D/g, "").slice(0, 10);
    validateForm();
  });
  [nameEl, emailEl].forEach(function (el) { el.addEventListener("input", validateForm); });

  function emailOk(v) { return !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v); }

  function validateForm() {
    var ok = LIVE &&
             nameEl.value.trim().length >= 2 &&
             phoneEl.value.length === 10 &&
             emailOk(emailEl.value.trim());
    submitBtn.disabled = !ok;
    return ok;
  }

  // keep the submit button in step with ticket-count changes
  var _render = render;
  render = function () { _render(); validateForm(); };
  render();

  function showError(msg) {
    errEl.textContent = msg;
    errEl.hidden = !msg;
  }

  /* ── Submit ── */
  submitBtn.addEventListener("click", function () {
    if (!validateForm()) return;
    showError("");
    submitBtn.disabled = true;
    submitBtn.classList.add("is-busy");
    document.getElementById("submit-label").textContent = "Saving…";

    fetch(CFG.BACKEND_URL, {
      method: "POST",
      // text/plain keeps this a "simple" request, so the browser skips a
      // CORS preflight that Apps Script cannot answer.
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "submitBooking",
        name: nameEl.value.trim(),
        phone: phoneEl.value,
        email: emailEl.value.trim(),
        tickets: qty
      })
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        resetSubmit();
        if (!res.ok) return showError(res.error || "Could not save your booking.");
        showDone(res.bookingId);
      })
      .catch(function () {
        resetSubmit();
        showError("Network problem — please try submitting again.");
      });
  });

  function resetSubmit() {
    submitBtn.classList.remove("is-busy");
    document.getElementById("submit-label").textContent = "Confirm booking";
    validateForm();
  }

  function showDone(bookingId) {
    document.getElementById("done-id").textContent = bookingId;
    document.getElementById("done-qty").textContent = qty;
    stepForm.hidden = true;
    stepDone.hidden = false;
  }
})();
