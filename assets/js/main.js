/* ==========================================================
   CodeCave — site engine
   shell (header/footer) · themes · page transitions · smooth scroll
   · scroll reveals · split text · tilt/magnetic · cursor glow · counters
   · timeline · terminal typing · Google Form embeds
   ========================================================== */
(function () {
  "use strict";
  var CFG = window.CODECAVE || {};
  var root = document.documentElement;
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = matchMedia("(hover:hover) and (pointer:fine)").matches;
  var hasGsap = typeof gsap !== "undefined";
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var lenis = null;

  /* ---------- icons ---------- */
  var ICON = {
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    normal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    bright: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z"/></svg>',
    dark: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'
  };
  var THEMES = [["normal", "Normal theme"], ["bright", "Bright theme"], ["dark", "Dark theme"]];

  /* ---------- theme ---------- */
  function currentTheme() { return root.getAttribute("data-theme") || "normal"; }
  function syncThemeButtons() {
    $$(".theme button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.theme === currentTheme())); });
  }
  function setTheme(t, ev) {
    var apply = function () {
      root.setAttribute("data-theme", t);
      try { localStorage.setItem("cc-theme", t); } catch (e) {}
      syncThemeButtons(); dispatchEvent(new Event("cc:theme"));
    };
    if (!document.startViewTransition || reduced || !ev) return apply();
    var x = ev.clientX, y = ev.clientY, r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    var tr = document.startViewTransition(apply);
    tr.ready.then(function () {
      root.animate({ clipPath: ["circle(0px at " + x + "px " + y + "px)", "circle(" + r + "px at " + x + "px " + y + "px)"] },
        { duration: 750, easing: "cubic-bezier(.22,1,.36,1)", pseudoElement: "::view-transition-new(root)" });
    }).catch(function () {});
  }
  var vt = document.createElement("style");
  vt.textContent = "::view-transition-old(root),::view-transition-new(root){animation:none;mix-blend-mode:normal}::view-transition-old(root){z-index:1}::view-transition-new(root){z-index:2}";
  document.head.appendChild(vt);
  function themeSwitch() {
    return '<div class="theme" role="group" aria-label="Theme">' + THEMES.map(function (t) {
      return '<button type="button" data-theme="' + t[0] + '" title="' + t[1] + '" aria-label="' + t[1] + '" aria-pressed="false">' + ICON[t[0]] + "</button>";
    }).join("") + "</div>";
  }

  /* ---------- shell: header, drawer, footer ---------- */
  function isCurrent(href) {
    var p = location.pathname.replace(/\.html$/, "").replace(/\/index$/, "/").replace(/(.)\/$/, "$1");
    return href === p;
  }
  function buildShell() {
    var path = function (h) { return h; };
    var nav = (CFG.nav || []).map(function (n) {
      if (!n.items) return '<div class="nav__item"><a class="nav__link" href="' + n.href + '"' + (isCurrent(n.href) ? ' aria-current="page"' : "") + ">" + n.label + "</a></div>";
      var cur = n.items.some(function (i) { return isCurrent(i.href); });
      return '<div class="nav__item' + (cur ? " is-current" : "") + '"><button class="nav__link" type="button" aria-haspopup="true">' + (n.short || n.label) + ICON.chev + '</button><div class="menu">' +
        n.items.map(function (i) { return '<a href="' + i.href + '"' + (isCurrent(i.href) ? ' aria-current="page"' : "") + "><span>" + i.label + "</span>" + (i.badge ? '<span class="sticker">' + i.badge + "</span>" : "") + "</a>"; }).join("") + "</div></div>";
    }).join("");
    var sp = CFG.sponsor;
    nav += '<div class="nav__item"><a class="nav__link" href="' + sp.href + '"' + (isCurrent(sp.href) ? ' aria-current="page"' : "") + ">" + sp.label + "</a></div>";
    var drawer = (CFG.nav || []).map(function (n) {
      if (!n.items) return '<a class="drawer__link" href="' + n.href + '">' + n.label + "</a>";
      return "<details><summary>" + n.label + ICON.chev.replace("<svg", '<svg width="22" height="22"') + "</summary><div>" +
        n.items.map(function (i) { return '<a href="' + i.href + '">' + i.label + (i.badge ? ' <span class="sticker">' + i.badge + "</span>" : "") + "</a>"; }).join("") + "</div></details>";
    }).join("") + '<a class="drawer__link" href="' + sp.href + '">' + sp.label + "</a>" + themeSwitch() +
      '<a class="btn btn--lime" href="/#tell-us">Tell us your project</a>';

    var h = document.createElement("header");
    h.className = "header";
    h.innerHTML = '<div class="container header__in"><a class="logo" href="/" aria-label="CodeCave Inc. home"><img src="/assets/img/logo.png" alt="CodeCave Incorporated" width="107" height="30"></a>' +
      '<nav class="nav" aria-label="Main">' + nav + "</nav>" +
      '<div class="header__tools">' + themeSwitch() +
      '<a class="btn btn--sm btn--lime header__cta" href="/#tell-us">Tell us your project</a>' +
      '<button class="burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="drawer"><span></span><span></span><span></span></button></div></div>';
    var d = document.createElement("div"); d.className = "drawer"; d.id = "drawer"; d.innerHTML = drawer;
    var p = document.createElement("div"); p.className = "progress";
    var cur = document.createElement("div"); cur.className = "cursor";
    var c = document.createElement("div"); c.className = "curtain"; c.setAttribute("aria-hidden", "true"); c.innerHTML = "<i></i><i></i><i></i><i></i><i></i>";
    document.body.prepend(c, cur, p, d, h);
    var skip = document.createElement("a"); skip.className = "skip"; skip.href = "#main"; skip.textContent = "Skip to content"; document.body.prepend(skip);
    var main = $("main"); if (main) main.id = "main";

    var f = document.createElement("footer"); f.className = "footer";
    f.innerHTML = '<div class="container"><div class="footer__grid"><div class="footer__brand"><a class="logo" href="/" aria-label="CodeCave Inc. home" style="display:inline-block"><img src="/assets/img/logo.png" alt="CodeCave Incorporated" width="150" height="42" style="height:40px"></a>' +
      '<p style="margin-top:1.25rem;color:#CBD5E1">Building the next generation of builders, innovators, and intelligent software.</p><p><a href="mailto:' + CFG.email + '" style="color:#fff;font-weight:600">' + CFG.email + "</a></p>" + themeSwitch() + "</div>" +
      (CFG.footer || []).map(function (c2) { return "<div><h4>" + c2.title + "</h4><ul>" + c2.links.map(function (l) { return '<li><a href="' + l[1] + '">' + l[0] + "</a></li>"; }).join("") + "</ul></div>"; }).join("") +
      '</div><div class="footer__word" aria-hidden="true">CodeCave.inc</div><div class="footer__bar"><span>© ' + new Date().getFullYear() + " CodeCave Inc. All rights reserved.</span><span>Made for builders, by builders.</span></div></div>";
    (main || document.body).insertAdjacentElement("afterend", f);

    $$(".theme button").forEach(function (b) { b.addEventListener("click", function (e) { setTheme(b.dataset.theme, e); }); });
    syncThemeButtons();

    var burger = $(".burger"), drawerEl = $("#drawer");
    function toggle(open) {
      burger.setAttribute("aria-expanded", String(open)); drawerEl.classList.toggle("is-open", open);
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      document.body.style.overflow = open ? "hidden" : ""; if (lenis) open ? lenis.stop() : lenis.start();
    }
    burger.addEventListener("click", function () { toggle(burger.getAttribute("aria-expanded") !== "true"); });
    addEventListener("keydown", function (e) { if (e.key === "Escape") toggle(false); });
    addEventListener("resize", function () { if (innerWidth >= 1100) toggle(false); });
    return h;
  }

  /* ---------- page transitions ---------- */
  var leaving = false;
  function curtainIn(done) {
    if (!hasGsap || reduced) return done();
    gsap.set(".curtain i", { transformOrigin: "50% 100%" });
    gsap.to(".curtain i", { scaleY: 1, duration: 0.55, ease: "expo.inOut", stagger: { each: 0.06, from: "start" }, onComplete: done });
  }
  function curtainOut(done) {
    if (!hasGsap || reduced) { root.classList.remove("is-loading"); return done && done(); }
    gsap.set(".curtain i", { scaleY: 1, transformOrigin: "50% 0%" });
    root.classList.remove("is-loading");
    gsap.to(".curtain i", { scaleY: 0, duration: 0.8, ease: "expo.inOut", stagger: { each: 0.07, from: "end" }, onComplete: done });
  }
  function bindLinks() {
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a[href]");
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
      var href = a.getAttribute("href");
      if (a.target === "_blank" || a.hasAttribute("download") || /^(mailto:|tel:|javascript:)/.test(href)) return;
      var url; try { url = new URL(a.href, location.href); } catch (er) { return; }
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.hash) {
        e.preventDefault(); var t = $(url.hash);
        if (t) { lenis ? lenis.scrollTo(t, { offset: -70, duration: 1.4 }) : t.scrollIntoView({ behavior: reduced ? "auto" : "smooth" }); }
        return;
      }
      if (url.pathname === location.pathname && url.search === location.search) return;
      e.preventDefault(); if (leaving) return; leaving = true;
      curtainIn(function () { location.href = url.href; });
    });
    addEventListener("pageshow", function (e) { if (e.persisted) { leaving = false; if (hasGsap) gsap.set(".curtain i", { scaleY: 0 }); } });
  }

  /* ---------- smooth scroll + ScrollTrigger ---------- */
  function initScroll() {
    if (!hasGsap) return;
    if (typeof ScrollTrigger !== "undefined") gsap.registerPlugin(ScrollTrigger);
    if (typeof Lenis !== "undefined" && !reduced) {
      lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1 });
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
      if (typeof ScrollTrigger !== "undefined") lenis.on("scroll", ScrollTrigger.update);
    }
  }

  /* ---------- header behaviour + progress ---------- */
  function initHeader(h) {
    var last = 0;
    var bar = $(".progress");
    function onScroll() {
      var y = scrollY;
      h.classList.toggle("is-small", y > 40);
      h.classList.toggle("is-hidden", y > last && y > 300 && $(".drawer.is-open") === null);
      last = y;
      var max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = "scaleX(" + (max > 0 ? Math.min(y / max, 1) : 0) + ")";
    }
    addEventListener("scroll", onScroll, { passive: true }); onScroll();
  }

  /* ---------- split text ---------- */
  function splitWords(el) {
    var label = el.textContent.replace(/\s+/g, " ").trim();
    el.setAttribute("aria-label", label);
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (w) {
            if (!w) return;
            if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(" ")); return; }
            var m = document.createElement("span"); m.className = "split-mask"; m.setAttribute("aria-hidden", "true");
            var s = document.createElement("span"); s.className = "split-word"; s.textContent = w; m.appendChild(s); frag.appendChild(m);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) walk(n);
      });
    })(el);
    return $$(".split-word", el);
  }

  /* ---------- scroll-driven effects ---------- */
  function initMotion() {
    if (!hasGsap || typeof ScrollTrigger === "undefined") { $$("[data-reveal]").forEach(function (e) { e.style.opacity = 1; e.style.transform = "none"; }); return; }

    // headings that reveal word-by-word (hero handled separately)
    $$("[data-split]:not([data-split='hero'])").forEach(function (el) {
      var words = splitWords(el);
      if (reduced) return;
      gsap.set(words, { yPercent: 115, rotate: 6 });
      ScrollTrigger.create({ trigger: el, start: "top 88%", once: true, onEnter: function () {
        gsap.to(words, { yPercent: 0, rotate: 0, duration: 0.9, ease: "power4.out", stagger: 0.045 });
      } });
    });

    // batch reveals
    if (!reduced) {
      ScrollTrigger.batch("[data-reveal]", {
        start: "top 90%", once: true,
        onEnter: function (els) { gsap.to(els, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.09, overwrite: true }); }
      });
    }

    // safety sweep: if a fast jump scrolled past reveals, show anything already in/above view
    if (!reduced) {
      var sweepT;
      var sweep = function () {
        $$("[data-reveal]").forEach(function (el) {
          if (el._shown || parseFloat(getComputedStyle(el).opacity) > 0.99) { el._shown = true; return; }
          var r = el.getBoundingClientRect();
          if (r.top < innerHeight * 0.92) { el._shown = true; gsap.to(el, { opacity: 1, y: 0, duration: r.bottom < 0 ? 0.01 : 0.7, ease: "power3.out" }); }
        });
      };
      addEventListener("scroll", function () { clearTimeout(sweepT); sweepT = setTimeout(sweep, 180); }, { passive: true });
      addEventListener("cc:ready", function () { setTimeout(sweep, 400); });
    }

    // parallax
    $$("[data-parallax]").forEach(function (el) {
      var k = parseFloat(el.dataset.parallax) || 0.15;
      gsap.to(el, { yPercent: k * -100, ease: "none", scrollTrigger: { trigger: el.parentElement || el, start: "top bottom", end: "bottom top", scrub: true } });
    });

    // counters
    $$("[data-count]").forEach(function (el) {
      var end = parseFloat(el.dataset.count), dec = (el.dataset.count.split(".")[1] || "").length, suf = el.dataset.suffix || "";
      if (reduced) { el.textContent = end.toFixed(dec) + suf; return; }
      var o = { v: 0 };
      ScrollTrigger.create({ trigger: el, start: "top 92%", once: true, onEnter: function () {
        gsap.to(o, { v: end, duration: 1.8, ease: "power2.out", onUpdate: function () { el.textContent = o.v.toFixed(dec) + suf; } });
      } });
    });

    // timeline scrub
    $$("[data-timeline]").forEach(function (tl) {
      var fill = $(".timeline__fill", tl), steps = $$(".step", tl);
      gsap.matchMedia().add({ wide: "(min-width:900px)", narrow: "(max-width:899px)" }, function (ctx) {
        var wide = ctx.conditions.wide;
        gsap.set(fill, { scaleX: 1, scaleY: 1 });
        gsap.fromTo(fill, wide ? { scaleX: 0 } : { scaleY: 0 }, Object.assign(wide ? { scaleX: 1 } : { scaleY: 1 }, { ease: "none",
          scrollTrigger: { trigger: tl, start: wide ? "top 75%" : "top 70%", end: wide ? "bottom 60%" : "bottom 60%", scrub: 0.4 } }));
      });
      steps.forEach(function (s) { ScrollTrigger.create({ trigger: s, start: "top 72%", onEnter: function () { s.classList.add("is-on"); }, onLeaveBack: function () { s.classList.remove("is-on"); } }); });
    });

    // floating decorations drift with scroll
    $$("[data-drift]").forEach(function (el) {
      var k = parseFloat(el.dataset.drift) || 60;
      gsap.to(el, { y: k, rotate: (k > 0 ? 8 : -8), ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 1 } });
    });
  }

  /* ---------- pointer effects ---------- */
  function initPointer() {
    if (!hasGsap || reduced || !canHover) return;
    var cur = $(".cursor");
    if (cur) {
      var cx = gsap.quickTo(cur, "x", { duration: 0.6, ease: "power3" }), cy = gsap.quickTo(cur, "y", { duration: 0.6, ease: "power3" });
      addEventListener("pointermove", function (e) { cur.classList.add("on"); cx(e.clientX); cy(e.clientY); }, { passive: true });
      document.addEventListener("pointerleave", function () { cur.classList.remove("on"); });
    }
    $$("[data-tilt]").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(el, { rotateY: px * 10, rotateX: -py * 10, transformPerspective: 900, duration: 0.4, ease: "power2.out", overwrite: "auto" });
      });
      el.addEventListener("pointerleave", function () { gsap.to(el, { rotateX: 0, rotateY: 0, duration: 0.8, ease: "elastic.out(1,.5)", overwrite: "auto" }); });
    });
    $$("[data-magnetic]").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        gsap.to(el, { x: (e.clientX - (r.left + r.width / 2)) * 0.3, y: (e.clientY - (r.top + r.height / 2)) * 0.3, duration: 0.4, ease: "power3.out" });
      });
      el.addEventListener("pointerleave", function () { gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1,.4)" }); });
    });
  }

  /* ---------- marquee ---------- */
  function initMarquee() {
    $$(".marquee__track").forEach(function (t) { t.innerHTML += t.innerHTML; });
  }

  /* ---------- terminal typing ---------- */
  function initTerminal() {
    var pre = $("[data-terminal] pre"); if (!pre) return;
    var lines = ["// booting neural execution unit", '> engine.connect("CodeCave-Core")', '> status: <span class="ok">200 OK</span> [18ms]', "> deploying campus nodes..."];
    var html = lines.join("\n");
    if (reduced) { pre.innerHTML = html + "\n"; return; }
    var i = 0, plain = html, out = "", tag = false;
    (function tick() {
      if (i >= plain.length) { pre.innerHTML = html + '\n<span class="caret"></span>'; return; }
      var ch = plain[i++];
      if (ch === "<") { var end = plain.indexOf(">", i); ch = plain.slice(i - 1, end + 1); i = end + 1; }
      out += ch; pre.innerHTML = out + '<span class="caret"></span>';
      setTimeout(tick, ch === "\n" ? 260 : 24);
    })();
  }

  /* ---------- Google Form embeds ---------- */
  // Form rendering moved to assets/js/forms.js (native forms wired to
  // Convex). This function is kept as a no-op so the boot() call below
  // doesn't need touching.
  function initForms() {}

  /* ---------- hero intro (homepage) ---------- */
  function heroIntro() {
    var h1 = $("[data-split='hero']"); if (!h1) return;
    var words = splitWords(h1);
    if (!hasGsap || reduced) { initTerminal(); return; }
    gsap.set(words, { yPercent: 120, rotate: 8 });
    gsap.set(".hero [data-hero]", { opacity: 0, y: 30 });
    gsap.set(".stage", { opacity: 0, scale: 0.85 });
    gsap.set(".hero .float", { opacity: 0, scale: 0.4, rotate: -20 });
    var tl = gsap.timeline({ paused: true, defaults: { ease: "power4.out" } });
    addEventListener("cc:ready", function () { tl.play(); });
    tl.to(".hero__bar", { opacity: 1, y: 0, duration: 0.7 })
      .to(words, { yPercent: 0, rotate: 0, duration: 1.1, stagger: 0.06 }, "-=.4")
      .to(".hero [data-hero]", { opacity: 1, y: 0, duration: 0.8, stagger: 0.1 }, "-=.7")
      .to(".stage", { opacity: 1, scale: 1, duration: 1.4, ease: "expo.out" }, "-=1.2")
      .to(".hero .float", { opacity: 1, scale: 1, rotate: function (i, el) { return parseFloat(el.dataset.rot || 0); }, duration: 0.9, stagger: 0.12, ease: "back.out(2.4)" }, "-=.9")
      .add(initTerminal, "-=.6");
    $$(".hero .float").forEach(function (el, i) {
      gsap.to(el, { y: (i % 2 ? -1 : 1) * 14, x: (i % 2 ? 1 : -1) * 6, duration: 2.4 + i * 0.4, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 1.5 });
    });
  }

  /* ---------- countdown ---------- */
  function initCountdown() {
    var box = $("[data-countdown]"); if (!box) return;
    var iso = (CFG.hackathonDate || "").trim();
    var els = { d: $("[data-cd-d]", box), h: $("[data-cd-h]", box), m: $("[data-cd-m]", box), s: $("[data-cd-s]", box) };
    if (!iso) { box.closest(".countdown-wrap").querySelector(".cd-status").textContent = "Date to be announced — join the waitlist to hear first."; return; }
    var target = new Date(iso).getTime();
    function tick() {
      var diff = target - Date.now();
      if (diff <= 0) { box.closest(".countdown-wrap").querySelector(".cd-status").textContent = "It's happening now!"; return; }
      var d = Math.floor(diff / 86400000), h = Math.floor(diff / 3600000) % 24, m = Math.floor(diff / 60000) % 60, s = Math.floor(diff / 1000) % 60;
      els.d.textContent = d; els.h.textContent = String(h).padStart(2, "0"); els.m.textContent = String(m).padStart(2, "0"); els.s.textContent = String(s).padStart(2, "0");
      requestAnimationFrame(function () { setTimeout(tick, 250); });
    }
    tick();
  }

  /* ---------- boot ---------- */
  function boot() {
    var header = buildShell();
    initHeader(header); bindLinks(); initMarquee(); initForms();
    initScroll(); heroIntro(); initMotion(); initPointer(); initCountdown();
    if (!$("[data-split='hero']")) initTerminal();
    var go = function () {
      curtainOut(function () { if (window.ScrollTrigger) ScrollTrigger.refresh(); });
      dispatchEvent(new Event("cc:ready"));
    };
    var fonts = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 900); })]) : Promise.resolve();
    fonts.then(function () { setTimeout(go, 120); });
    setTimeout(function () { root.classList.remove("is-loading"); }, 4000); // safety net
    if (window.ScrollTrigger) addEventListener("load", function () { ScrollTrigger.refresh(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
