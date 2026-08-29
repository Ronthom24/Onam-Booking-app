/* ═══════════════════════════════════════════════════════════
   SANGAMAM 2026 — Family get-together · Santhome Youth
   Design-phase scaffolding. No network calls, no persistence,
   no real booking, payment or capacity logic.
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

  /* ─────────────── 8. Stepper · chips · summary (display only) ─────────────── */
  // No venue cap on the event; MAX is only a sane bound for the stepper UI.
  var qty = 1, MIN = 1, MAX = 30, rate = null;

  var qtyEl = document.getElementById("qty-value");
  var minus = document.getElementById("qty-minus");
  var plus = document.getElementById("qty-plus");
  var sumQty = document.getElementById("sum-qty");
  var sumRate = document.getElementById("sum-rate");
  var sumTotal = document.getElementById("sum-total");
  var chips = document.querySelectorAll(".chip");
  var customWrap = document.getElementById("custom-wrap");
  var customInput = document.getElementById("custom-amount");

  function money(n) { return "₹" + Number(n).toLocaleString("en-IN"); }

  function render() {
    qtyEl.textContent = qty;
    sumQty.textContent = qty;
    minus.disabled = qty <= MIN;
    plus.disabled = qty >= MAX;
    sumRate.textContent = rate ? money(rate) + " / ticket" : "—";
    sumTotal.textContent = rate ? money(rate * qty) : "—";
    if (!reduced) {
      qtyEl.animate([{ transform: "scale(1.22)" }, { transform: "none" }],
                    { duration: 220, easing: "cubic-bezier(.22,1,.36,1)" });
    }
  }

  minus.addEventListener("click", function () { if (qty > MIN) { qty--; render(); } });
  plus.addEventListener("click", function () { if (qty < MAX) { qty++; render(); } });

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      chips.forEach(function (c) { c.classList.remove("on"); });
      chip.classList.add("on");
      if (chip.dataset.chip === "custom") {
        customWrap.hidden = false;
        customInput.focus();
        rate = parseFloat(customInput.value) || null;
      } else {
        customWrap.hidden = true;
        rate = parseFloat(chip.dataset.amt);
      }
      render();
    });
  });

  customInput.addEventListener("input", function () {
    customInput.value = customInput.value.replace(/[^\d.]/g, "");
    rate = parseFloat(customInput.value) || null;
    render();
  });

  render();

  /* ─────────────── 9. Booking: UPI pay + proof upload ───────────────
     There is no payment gateway. The payer sends money by UPI, then
     gives us the reference number and a screenshot. This records a
     CLAIM of payment — a volunteer verifies it against the bank
     statement afterwards. Nothing here can confirm money arrived. */

  var CFG  = window.SANGAMAM_CONFIG || {};
  var LIVE = !!(CFG.UPI_VPA && CFG.BACKEND_URL);

  var stepForm = document.querySelector(".sheet-body");
  var stepPay  = document.getElementById("sheet-pay");
  var stepDone = document.getElementById("sheet-done");

  var nameEl  = document.getElementById("bk-name");
  var phoneEl = document.getElementById("bk-phone");
  var emailEl = document.getElementById("bk-email");
  var refEl   = document.getElementById("bk-ref");
  var fileEl  = document.getElementById("bk-file");

  var nextBtn   = document.getElementById("btn-next");
  var backBtn   = document.getElementById("btn-back");
  var submitBtn = document.getElementById("btn-submit");
  var errEl     = document.getElementById("form-error");
  var payErrEl  = document.getElementById("pay-error");
  var noteEl    = document.getElementById("sheet-note");

  var upload = null; // {name,type,size,data}

  // Until config.js has the UPI id and backend URL, the panel shows the
  // real design but takes nothing. Worded for a visitor, not a developer.
  if (!LIVE) {
    noteEl.hidden = false;
    document.getElementById("next-label").textContent = "Booking opens soon";
  }

  phoneEl.addEventListener("input", function () {
    phoneEl.value = phoneEl.value.replace(/\D/g, "").slice(0, 10);
    validateForm();
  });
  refEl.addEventListener("input", function () {
    refEl.value = refEl.value.replace(/[^\w]/g, "").slice(0, 24);
    validatePay();
  });
  [nameEl, emailEl].forEach(function (el) { el.addEventListener("input", validateForm); });

  function emailOk(v) { return !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v); }

  function validateForm() {
    var ok = LIVE &&
             nameEl.value.trim().length >= 2 &&
             phoneEl.value.length === 10 &&
             emailOk(emailEl.value.trim()) &&
             rate > 0; // no fixed minimum — any positive contribution is accepted
    nextBtn.disabled = !ok;
    return ok;
  }
  function validatePay() {
    var ok = refEl.value.trim().length >= 6 && !!upload;
    submitBtn.disabled = !ok;
    return ok;
  }

  // keep the Continue button in step with tickets/contribution changes
  var _render = render;
  render = function () { _render(); validateForm(); };
  render();

  /* ── Step 1 → 2 ── */
  nextBtn.addEventListener("click", function () {
    if (!validateForm()) return;
    errEl.hidden = true;
    buildPayStep();
    stepForm.hidden = true;
    stepPay.hidden = false;
    stepPay.scrollTop = 0;
  });

  backBtn.addEventListener("click", function () {
    stepPay.hidden = true;
    stepForm.hidden = false;
  });

  function buildPayStep() {
    var total = qty * rate;
    document.getElementById("pay-amount").textContent = money(total);
    document.getElementById("pay-breakdown").textContent =
      qty + " ticket" + (qty > 1 ? "s" : "") + " × " + money(rate);
    document.getElementById("qr-vpa").textContent = CFG.UPI_VPA;

    // UPI intent string — am= fixes the amount so nobody can mistype it
    var params =
      "pa=" + encodeURIComponent(CFG.UPI_VPA) +
      "&pn=" + encodeURIComponent(CFG.UPI_PAYEE_NAME || "Santhome Youth") +
      "&am=" + total.toFixed(2) +
      "&cu=INR" +
      "&tn=" + encodeURIComponent((CFG.EVENT_NAME || "Sangamam") + " " + qty + " ticket" + (qty > 1 ? "s" : ""));

    var upi = "upi://pay?" + params;
    document.getElementById("btn-upi").setAttribute("href", upi);
    document.getElementById("upi-btn-amt").textContent = total.toLocaleString("en-IN");

    // App-specific schemes, for phones and in-app browsers that ignore upi://
    document.getElementById("ua-gpay").setAttribute("href", "tez://upi/pay?" + params);
    document.getElementById("ua-phonepe").setAttribute("href", "phonepe://pay?" + params);
    document.getElementById("ua-paytm").setAttribute("href", "paytmmp://pay?" + params);

    // On desktop no UPI app exists — lead with the QR instead of a dead button
    var isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    document.getElementById("btn-upi").hidden = !isMobile;
    document.getElementById("upi-apps").hidden = !isMobile;
    document.querySelector(".or").hidden = !isMobile;

    var box = document.getElementById("qr");
    box.innerHTML = "";
    try {
      var q = qrcode(0, "M");
      q.addData(upi);
      q.make();
      box.innerHTML = q.createSvgTag({ cellSize: 5, margin: 0, scalable: true });
    } catch (e) {
      box.textContent = "Could not draw the QR — use the UPI id above.";
    }
  }

  /* ── Copy the UPI id — the universal fallback when no deep link fires
       (desktop, iOS, or an in-app browser like Instagram's) ── */
  var copyBtn = document.getElementById("copy-vpa");
  copyBtn.addEventListener("click", function () {
    var vpa = CFG.UPI_VPA || "";
    function done() {
      copyBtn.textContent = "Copied";
      copyBtn.classList.add("copied");
      setTimeout(function () {
        copyBtn.textContent = "Copy";
        copyBtn.classList.remove("copied");
      }, 1800);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(vpa).then(done, fallbackCopy);
    } else {
      fallbackCopy();
    }
    function fallbackCopy() {
      var ta = document.createElement("textarea");
      ta.value = vpa;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); done(); } catch (e) { /* ignore */ }
      document.body.removeChild(ta);
    }
  });

  /* ── Screenshot picker ── */
  fileEl.addEventListener("change", function () {
    var f = fileEl.files && fileEl.files[0];
    if (!f) return;

    var maxMb = CFG.MAX_UPLOAD_MB || 5;
    if (f.size > maxMb * 1024 * 1024) {
      showPayError("That file is too large (max " + maxMb + " MB).");
      fileEl.value = ""; return;
    }

    var reader = new FileReader();
    reader.onload = function () {
      upload = {
        name: f.name, type: f.type, size: f.size,
        data: String(reader.result).split(",")[1] // strip the data: prefix
      };
      showPreview(f, reader.result);
      showPayError("");
      validatePay();
    };
    reader.readAsDataURL(f);
  });

  function showPreview(f, dataUrl) {
    document.getElementById("drop-inner").hidden = true;
    var wrap = document.getElementById("drop-preview");
    var img = document.getElementById("preview-img");
    if (f.type === "application/pdf") {
      img.removeAttribute("src");
      img.style.display = "none";
    } else {
      img.src = dataUrl;
      img.style.display = "";
    }
    document.getElementById("preview-name").textContent = f.name;
    document.getElementById("preview-size").textContent = (f.size / 1024).toFixed(0) + " KB";
    wrap.hidden = false;
  }

  function showPayError(msg) {
    payErrEl.textContent = msg;
    payErrEl.hidden = !msg;
  }

  /* ── Submit ── */
  submitBtn.addEventListener("click", function () {
    if (!validatePay()) return;
    showPayError("");
    submitBtn.disabled = true;
    submitBtn.classList.add("is-busy");
    document.getElementById("submit-label").textContent = "Uploading…";

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
        tickets: qty,
        perTicket: rate,
        ref: refEl.value.trim(),
        file: upload
      })
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        resetSubmit();
        if (!res.ok) return showPayError(res.error || "Could not save your booking.");
        showDone(res.bookingId);
      })
      .catch(function () {
        resetSubmit();
        showPayError("Network problem — your payment is safe. Please try submitting again.");
      });
  });

  function resetSubmit() {
    submitBtn.classList.remove("is-busy");
    document.getElementById("submit-label").textContent = "Submit booking";
    validatePay();
  }

  function showDone(bookingId) {
    document.getElementById("done-id").textContent = bookingId;
    document.getElementById("done-qty").textContent = qty;
    document.getElementById("done-total").textContent = money(qty * rate);
    stepPay.hidden = true;
    stepDone.hidden = false;
  }
})();

