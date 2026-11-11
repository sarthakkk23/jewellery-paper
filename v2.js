// The Café Paper v2. Progressive enhancement only: the page is complete without this file.
(() => {
  window.__pulse = true;
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const motion = !reduce && "IntersectionObserver" in window;
  if (motion) root.classList.add("motion");
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); parent && parent.appendChild(n); return n; };

  // ---------- the loader: while the ink is up, entrances wait for it; a click to another page brings the ink back first ----------
  const loader = document.querySelector(".loader");
  const lag = loader && getComputedStyle(loader).display !== "none" ? 650 : 0;
  if (motion && loader) {
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[href]");
      if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin || (u.pathname === location.pathname && u.search === location.search) || /\.(?!html?$)\w+$/.test(u.pathname)) return;
      e.preventDefault();
      root.classList.add("leaving");
      setTimeout(() => { location.href = u.href; }, 480);
    });
    addEventListener("pageshow", (e) => { if (e.persisted) root.classList.remove("leaving"); });   // back to a page kept in memory
  }

  // ---------- entrances: heading, then text, then picture; once; never a gate ----------
  const reveals = [...document.querySelectorAll(".reveal")];
  const showAll = () => { reveals.forEach((r) => r.classList.add("is-in")); document.querySelector(".hero")?.classList.add("is-in"); };
  if (motion) setTimeout(() => {
    let alive = false;
    setTimeout(() => { if (!alive) { root.classList.remove("motion", "js"); showAll(); } }, 2000);
    const io = new IntersectionObserver((es) => {
      alive = true;
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        const sib = [...(e.target.parentElement?.querySelectorAll(":scope > .reveal") || [])];
        e.target.style.transitionDelay = `${Math.max(0, sib.indexOf(e.target)) * 75}ms`;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    reveals.forEach((r) => io.observe(r));
    requestAnimationFrame(() => requestAnimationFrame(() => document.querySelector(".hero")?.classList.add("is-in")));
  }, lag); else showAll();

  // ---------- watch: run once when an element comes into view. If the observer never reports, run anyway; never a gate ----------
  const watch = (els, onIn, margin = "0px 0px -8% 0px") => {
    if (!els.length) return;
    if (!motion) { els.forEach(onIn); return; }
    let alive = false;
    setTimeout(() => { if (!alive) els.forEach(onIn); }, 2000);
    const io = new IntersectionObserver((es) => {
      alive = true;
      es.forEach((e) => { if (e.isIntersecting) { onIn(e.target); io.unobserve(e.target); } });
    }, { rootMargin: margin });
    els.forEach((t) => io.observe(t));
  };
  const curtain = !!document.querySelector(".curtain") && !root.classList.contains("seen");

  // ---------- headings rise word by word: each word in a clipped span, the text itself unchanged ----------
  if (motion) {
    const heads = [...document.querySelectorAll("main h2")].filter((h) => !h.closest(".hero"));
    heads.forEach((h) => {
      let k = 0;
      const walk = (node) => [...node.childNodes].forEach((n) => {
        if (n.nodeType === 1) return walk(n);
        if (n.nodeType !== 3 || !n.textContent.trim()) return;
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(part); return; }
          const w = document.createElement("span"), i = document.createElement("span");
          w.className = "w"; i.textContent = part; i.style.setProperty("--k", k++); w.append(i); frag.append(w);
        });
        n.replaceWith(frag);
      });
      walk(h);
      h.classList.add("split");
    });
    setTimeout(() => watch(heads, (h) => h.classList.add("in"), "0px 0px -10% 0px"), lag);
  }

  // ---------- big figures count up from zero when they arrive; the page's own number is always what's left ----------
  const easeOut = (t) => 1 - Math.pow(2, -10 * t);
  const countUp = (el, delay) => {
    if (el.dataset.counted) return;               // once only: a late observer must not restart it from a half-counted value
    el.dataset.counted = "1";
    const node = [...el.childNodes].find((n) => n.nodeType === 3 && n.nodeValue.trim());
    if (!node) return;
    const txt = node.nodeValue, m = txt.trim().match(/^(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?$/);
    if (!m) return;
    const dec = m[2] ? m[2].length - 1 : 0, end = parseFloat(txt.replace(/,/g, ""));
    const fmt = new Intl.NumberFormat("en-US", { useGrouping: m[1].includes(","), minimumFractionDigits: dec, maximumFractionDigits: dec });
    node.nodeValue = fmt.format(0);
    setTimeout(() => {
      const t0 = performance.now(), dur = end < 20 ? 900 : 1400;
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        node.nodeValue = p < 1 ? fmt.format(end * easeOut(p)) : txt;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      setTimeout(() => { node.nodeValue = txt; }, dur + 400);   // if frames stall (a background tab), the real figure still lands
    }, delay);
  };
  if (motion) watch([...document.querySelectorAll(".hero-num, .fd-num, .tz-num")],
    (n) => countUp(n, (n.closest(".hero") ? (curtain ? 1500 : 350) : 150) + lag), "0px 0px -8% 0px");

  // ---------- sideways: the row pins to the screen and scrolling down moves it across. Without the script it is a row you swipe ----------
  const rows = motion ? [...document.querySelectorAll(".hs")] : [];
  if (rows.length) {
    let run = 0;
    const move = () => {
      run = 0;
      rows.forEach((r) => {
        const d = r._d || 0, p = d ? clamp(-r.getBoundingClientRect().top / d) : 0;
        r._t.style.transform = `translate3d(${(-p * d).toFixed(1)}px, 0, 0)`;
        r.style.setProperty("--p", p.toFixed(4));
        r._c.forEach((c) => {                    // each card knows where it sits across the screen, for a little parallax
          const b = c.getBoundingClientRect();
          c.style.setProperty("--x", clamp((b.left + b.width / 2) / innerWidth - 0.5, -1, 1).toFixed(3));
        });
      });
    };
    const fit = () => {
      rows.forEach((r) => {
        r.classList.add("hs-on");
        r._t = r.querySelector(".hs-track"); r._c = [...r._t.children];
        r.querySelectorAll(".tz-num").forEach((n) => {            // a long figure (US$9.72) shrinks to fit its card
          n.style.fontSize = "";
          const room = n.parentElement.clientWidth - parseFloat(getComputedStyle(n.parentElement).paddingLeft) * 2;
          if (n.scrollWidth > room) n.style.fontSize = `${(parseFloat(getComputedStyle(n).fontSize) * room / n.scrollWidth * 0.96).toFixed(1)}px`;
        });
        r._d = Math.max(0, r._t.scrollWidth - r.querySelector(".hs-view").clientWidth);
        r.style.height = r._d ? `${r._d + r.querySelector(".hs-pin").offsetHeight}px` : "";
        if (!r._d) r.classList.remove("hs-on");
      });
      move();
    };
    // a keyboard user tabbing into a card off to the side: scroll the page to where that card is in view
    rows.forEach((r) => r.addEventListener("focusin", (e) => {
      const c = e.target.closest(".hs-track > *");
      if (!c || !r._d) return;
      scrollTo({ top: r.offsetTop + Math.min(r._d, Math.max(0, c.offsetLeft - 16)), behavior: "auto" });
    }));
    addEventListener("scroll", () => { if (!run) run = requestAnimationFrame(move); }, { passive: true });
    addEventListener("resize", fit);
    addEventListener("load", fit);
    fit();
  }

  // ---------- the bar steps aside while you read down, and comes back when you scroll up ----------
  const topBar = document.querySelector(".bar"), menu = document.querySelector(".menu");
  if (topBar) {
    let lastY = scrollY, busy = false;
    addEventListener("scroll", () => {
      if (busy) return;
      busy = true;
      requestAnimationFrame(() => {
        const y = scrollY, d = y - lastY;
        if (Math.abs(d) > 6) {
          const tuck = d > 0 && y > 240 && !menu?.open;
          topBar.classList.toggle("tuck", tuck); root.classList.toggle("bar-tucked", tuck);
          lastY = y;
        }
        busy = false;
      });
    }, { passive: true });
  }

  // ---------- the main buttons lean toward the pointer, a little ----------
  if (motion && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.querySelectorAll(".hero-copy .btn, .bar .btn").forEach((b) => {
      b.addEventListener("pointermove", (e) => {
        const r = b.getBoundingClientRect();
        const dx = (e.clientX - r.left - r.width / 2) / (r.width / 2), dy = (e.clientY - r.top - r.height / 2) / (r.height / 2);
        b.style.translate = `${(dx * 6).toFixed(1)}px ${(dy * 4).toFixed(1)}px`;
      });
      b.addEventListener("pointerleave", () => { b.style.translate = ""; });
    });
  }

  // ---------- the sundial ----------
  const dataEl = document.getElementById("dial-data");
  const dial = document.querySelector(".dial");
  let setHour = null;
  if (dataEl && dial) {
    const D = JSON.parse(dataEl.textContent);
    const pts = new Map(D.all.map(([m, p]) => [m % 1440, p]));
    const areaPts = Object.fromEntries(Object.entries(D.areas).map(([a, ps]) => [a, new Map(ps.map(([m, p]) => [m % 1440, p]))]));
    const at = (map, m) => { const lo = Math.floor(m / 30) * 30 % 1440, hi = (lo + 30) % 1440; const a = map.get(lo), b = map.get(hi); if (a == null) return null; if (b == null) return a; return a + (b - a) * ((m % 30) / 30); };
    const R0 = 46, R = 200;
    const ang = (h) => ((h / 24) * 360 + 180) * Math.PI / 180;           // midnight at the foot, noon at the crown
    const P = (h, r) => [Math.sin(ang(h)) * r, -Math.cos(ang(h)) * r];
    const wedges = dial.querySelector(".wedges"), marks = dial.querySelector(".marks");
    const fills = [];
    for (let h = 0; h < 24; h++) {
      const a0 = h + 0.04, a1 = h + 0.96;
      const arc = (r) => { const [x0, y0] = P(a0, r), [x1, y1] = P(a1, r); return [x0, y0, x1, y1]; };
      const wedge = (r) => { const [x0, y0, x1, y1] = arc(r), [u0, v0, u1, v1] = arc(R0);
        return `M${u0},${v0} L${x0},${y0} A${r},${r} 0 0 1 ${x1},${y1} L${u1},${v1} A${R0},${R0} 0 0 0 ${u0},${v0} Z`; };
      el("path", { d: wedge(R), class: "w-bg" }, wedges);
      const share = pts.get(h * 60);
      const f = el("path", { d: wedge(R0 + (R - R0) * ((share ?? 0) / 100)), class: "w-fill later" }, wedges);
      fills.push(f);
    }
    for (const [h, lab] of [[6, "6am"], [12, "noon"], [18, "6pm"], [0, "midnight"]]) {
      const [x, y] = P(h, R + 20);
      el("text", { x, y: y + 5, "text-anchor": h === 6 ? "end" : h === 18 ? "start" : "middle" }, marks).textContent = lab;
    }
    const gnomon = dial.querySelector(".gnomon");
    const tEl = document.querySelector(".sd-time"), sEl = document.querySelector(".sd-share"), aEl = document.querySelector(".sd-areas");
    const fmt = (m) => { const h = Math.floor(m / 60) % 24, mi = Math.round(m % 60 / 15) * 15 % 60; if (h === 0 && mi === 0) return "midnight"; if (h === 12 && mi === 0) return "noon";
      return `${h % 12 || 12}${mi ? ":" + String(mi).padStart(2, "0") : ""}${h < 12 ? "am" : "pm"}`; };  // clock minutes, taste-skill-ignore
    setHour = (m) => {
      const mm = ((m % 1440) + 1440) % 1440, h = mm / 60;
      const deg = (h / 24) * 360 + 180;
      gnomon.setAttribute("transform", `rotate(${deg})`);
      fills.forEach((f, i) => { const passed = ((i * 60 - 300 + 1440) % 1440) <= ((mm - 300 + 1440) % 1440); f.classList.toggle("later", !passed); });
      const s = at(pts, mm);
      tEl.textContent = fmt(mm);
      sEl.textContent = s == null ? "Few cafés list these hours" : `${Math.round(s)}% of cafés open`;
      aEl.textContent = Object.entries(areaPts).map(([a, mp]) => { const v = at(mp, mm); return v == null ? "" : `${a} ${Math.round(v)}%`; }).filter(Boolean).join(" · ");
    };
    setHour(480);
    if (reduce) fills.forEach((f) => f.classList.remove("later"));
  }

  // ---------- many into one ----------
  const many = document.querySelector(".many");
  if (many) {
    const nL = Math.min(170, Math.round((+many.dataset.listings || 2800) / 20));
    const nV = Math.round((+many.dataset.venues || 1100) / 20);
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const S = 11, G = 4;
    const ordered = [];
    for (let i = 0; i < nL; i++) {
      const x = 10 + rnd() * 360, y = 10 + rnd() * 240;
      el("rect", { x, y, width: S, height: S, fill: i % 3 ? "#cfcec9" : "#dddcd7" }, many);
    }
    for (let i = 0; i < 60; i++) {
      const col = Math.floor(i / 3), row = i % 3;
      el("rect", { x: 420 + col * (S + 3), y: 112 + row * (S + 3), width: S, height: S, fill: "#a3a29d" }, many);
    }
    const perRow = 12;
    for (let i = 0; i < nV; i++) {
      const col = i % perRow, row = Math.floor(i / perRow);
      const r = el("rect", { x: 900 + col * (S + G + 5), y: 30 + row * (S + G + 14), width: S, height: S, fill: "#b0533d" }, many);
      ordered.push(r);
    }
    if (motion) {
      ordered.forEach((r, i) => { r.style.transform = `translate(${-(+r.getAttribute("x") - 600)}px, ${130 - +r.getAttribute("y")}px)`; r.style.opacity = 0; r.style.transitionDelay = `${i * 14}ms`; });
      new IntersectionObserver(([e], o) => { if (!e.isIntersecting) return; ordered.forEach((r) => { r.style.transform = "none"; r.style.opacity = 1; }); o.disconnect(); },
        { rootMargin: "0px 0px -20% 0px" }).observe(many);
    }
  }

  // ---------- scroll-linked: sundial needle, photo drift ----------
  const sundial = document.querySelector(".sundial");
  const photos = [...document.querySelectorAll("[data-drift] img")];
  const bar = parseFloat(getComputedStyle(root).getPropertyValue("--bar-h")) || 64;
  let ticking = false;
  const frame = () => {
    ticking = false;
    if (sundial && setHour && root.classList.contains("motion")) {
      const r = sundial.getBoundingClientRect();
      const p = clamp((bar - r.top) / Math.max(1, r.height - (innerHeight - bar)));
      setHour(300 + p * 1320);                       // 5am to 3am
    }
    if (root.classList.contains("motion")) for (const ph of photos) {   // each picture drifts against the scroll, so the page has depth
      const r = ph.closest("figure").getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) continue;
      const p = clamp((innerHeight - r.top) / (innerHeight + r.height));
      ph.style.setProperty("--drift", `${(0.5 - p) * 9}%`);
    }
  };
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener("scroll", request, { passive: true });
  addEventListener("resize", request);
  request();

  // ---------- the hero's finding, rotating through all of them in a shuffled order ----------
  const rot = document.querySelector("[data-rot]"), rotData = document.getElementById("rot-data");
  if (rot && rotData) {
    const items = JSON.parse(rotData.textContent);
    const first = items.findIndex((f) => rot.querySelector(".rot-link").getAttribute("href").endsWith("#f-" + f.id));
    const rest = items.filter((_, i) => i !== first);
    for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
    const order = [items[Math.max(0, first)], ...rest];
    const link = rot.querySelector(".rot-link"), num = rot.querySelector(".hero-num"), cap = rot.querySelector(".hero-cap");
    const how = document.querySelector(".rot-how"), bar = rot.querySelector(".rot-bar"), btn = rot.querySelector(".rot-btn"), count = rot.querySelector(".rot-count");
    const MS = 6500, auto = true;           // reduced motion still changes the finding, just without the fade
    let idx = 0, timer = 0, paused = false, held = false;
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const label = () => { count.textContent = `${idx + 1} of ${order.length}`; };
    const restartBar = () => { bar.classList.remove("run"); void bar.offsetWidth; if (auto && !paused) bar.classList.add("run"); };
    function show(i) {
      idx = (i + order.length) % order.length;
      const f = order[idx], href = `insights/#f-${f.id}`;
      const swap = () => {
        num.innerHTML = `${esc(f.value)}<small>${esc(f.unit)}</small>`; cap.textContent = f.headline;
        link.setAttribute("href", href); if (how) how.setAttribute("href", href); label();
      };
      if (reduce) { swap(); return; }
      rot.classList.add("out");
      setTimeout(() => { swap(); rot.classList.remove("out"); rot.classList.add("in"); void rot.offsetWidth; rot.classList.remove("in"); }, 450);
    }
    const schedule = () => { clearTimeout(timer); if (!auto || paused || held) return; restartBar(); timer = setTimeout(() => { show(idx + 1); schedule(); }, MS); };
    const hold = (on) => { held = on; rot.classList.toggle("paused", on || paused); if (on) clearTimeout(timer); else schedule(); };
    rot.style.setProperty("--rot-ms", MS + "ms");
    rot.querySelector(".rot-ctrl").hidden = false;
    label();
    if (auto) {
      btn.addEventListener("click", () => { paused = !paused; btn.textContent = paused ? "Play" : "Pause"; btn.setAttribute("aria-pressed", String(paused)); rot.classList.toggle("paused", paused); paused ? clearTimeout(timer) : schedule(); });
      rot.addEventListener("mouseenter", () => hold(true)); rot.addEventListener("mouseleave", () => hold(false));
      rot.addEventListener("focusin", () => hold(true)); rot.addEventListener("focusout", () => hold(false));
      document.addEventListener("visibilitychange", () => hold(document.hidden));
      schedule();
    }
  }

  // ---------- get in touch: copy the email address in one tap ----------
  document.querySelectorAll(".c-copy-btn").forEach((b) => b.addEventListener("click", async () => {
    const say = b.closest(".c-card")?.querySelector(".c-copied");
    try { await navigator.clipboard.writeText(b.dataset.copy); if (say) say.textContent = "Copied. Paste it into any email."; }
    catch { if (say) say.textContent = b.dataset.copy; }
  }));

  // ---------- free updates: sign-up ----------
  const up = document.querySelector(".up-form");
  if (up) {
    const status = up.querySelector(".up-status"), inputs = up.querySelectorAll("input");
    const contactEl = inputs[inputs.length - 1], nameEl = inputs.length > 1 ? inputs[0] : null;
    const isPhone = (v) => /^(\+?91|0)?[6-9]\d{9}$/.test(v.replace(/[\s()-]/g, ""));
    up.addEventListener("submit", async (e) => {
      e.preventDefault();
      const contact = contactEl.value.trim();
      if (nameEl && !nameEl.value.trim()) { status.textContent = "Please add your name."; nameEl.focus(); return; }
      if (!isPhone(contact)) { status.textContent = "Please add a 10-digit Indian mobile number."; contactEl.focus(); return; }
      const { provider, action } = up.dataset;
      if (!action || provider === "none") { status.textContent = "Sign-ups open soon."; return; }
      up.classList.add("sending"); status.textContent = "Sending…";
      try {
        const body = new FormData(up);
        if (provider === "google_form") await fetch(action, { method: "POST", mode: "no-cors", body });   // Google Forms gives no readable reply
        else { const r = await fetch(action, { method: "POST", body, headers: { Accept: "application/json" } }); if (!r.ok) throw new Error(r.status); }
        up.classList.add("done"); status.textContent = "Thank you. The next update comes to your WhatsApp.";
        up.reset();
      } catch { status.textContent = "That didn't go through. Please try again in a moment."; }
      up.classList.remove("sending");
    });
  }

  // ---------- bar: mark the section in view ----------
  const links = [...document.querySelectorAll(".bar-links a")];
  if ("IntersectionObserver" in window && links.length) {
    const by = new Map(links.map((l) => [l.hash.slice(1), l]));
    const so = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((l) => l.removeAttribute("aria-current"));
      by.get(e.target.id)?.setAttribute("aria-current", "true");
    }), { rootMargin: "-45% 0px -50% 0px" });
    by.forEach((_, id) => { const s = document.getElementById(id); s && so.observe(s); });
  }
})();

// ---------- motion, third pass: ink that soaks in, a marker under the figures, sheets that slide, sums that add up, digits that roll ----------
// Its own block, and progressive like the rest: with reduced motion, no observer, or a stalled tab, none of it applies.
(() => {
  const root = document.documentElement;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const span = (cls, text) => { const s = document.createElement("span"); s.className = cls; s.textContent = text; return s; };
  root.classList.add("m3");
  let alive = false, wake = () => {};                  // if the observer hasn't reported yet (a tab opened in the background), drop every
                                                       // "not yet" state so nothing waits on it; the moment it does report, the motion comes back
  setTimeout(() => { if (!alive) root.classList.remove("m3", "m3-curtain"); }, 2500);
  const once = (els, fn, margin = "0px 0px -10% 0px") => {
    if (!els.length) return;
    const io = new IntersectionObserver((es) => { if (!alive) { alive = true; root.classList.add("m3"); setTimeout(wake, 0); } es.forEach((e) => { if (e.isIntersecting) { fn(e.target); io.unobserve(e.target); } }); }, { rootMargin: margin });
    els.forEach((t) => io.observe(t));
  };
  once([document.body], () => {}, "0px");

  // wrap every match of `re` (one capturing group) in the element's own text; the words themselves are untouched
  const wrap = (el, re, cls) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = [], made = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((n) => {
      if (!n.nodeValue.trim() || n.parentElement.closest(".ev, .mk, .iw, .btn, svg")) return;
      const parts = n.nodeValue.split(re);
      if (parts.length < 2) return;
      const frag = document.createDocumentFragment();
      parts.forEach((t, i) => { if (!t) return; if (i % 2) { const s = span(cls, t); made.push(s); frag.append(s); } else frag.append(t); });
      n.replaceWith(frag);
    });
    return made;
  };

  // ---------- a statement inks in as you read: only one that starts below the first screen ----------
  const inks = $$("main p.lead").filter((p) => !p.closest(".hero, .ph, .hx, .page-head, .p-head") && p.getBoundingClientRect().top > innerHeight * 0.7)
    .map((p) => { p.classList.add("m3-ink"); return { p, w: wrap(p, /(\S+)/, "iw"), n: -1 }; });

  // ---------- the marker: money, shares and multiples in running text ----------
  const FIG = /((?:₹|US\$)\s?\d[\d,]*(?:\.\d+)?|\d[\d,]*(?:\.\d+)?\s?(?:%|×))/;
  const marked = new Map();
  $$(".fd-body, .cs-body > p, .rule-row p").forEach((p) => { const m = wrap(p, FIG, "mk"); if (m.length) marked.set(p, m); });
  once([...marked.keys()], (p) => marked.get(p).forEach((m, i) => setTimeout(() => m.classList.add("on"), 350 + i * 160)), "0px 0px -18% 0px");

  // ---------- the sums: rows in order, then the total with the marker under it ----------
  once($$("table.pt"), (t) => {
    const rows = $$("tbody tr", t);
    rows.forEach((r, i) => r.style.setProperty("--r", i));
    t.classList.add("m3-go");
    const b = rows.length > 1 && rows[rows.length - 1].querySelector("td:last-child b");
    if (b) { b.classList.add("mk"); setTimeout(() => b.classList.add("on"), 650 + rows.length * 110); }
  }, "0px 0px -15% 0px");

  // ---------- the hero's rotating figure: when it changes, its digits roll in one by one ----------
  const num = document.querySelector("[data-rot] .hero-num");
  if (num) {
    const mo = new MutationObserver(() => {
      const t = [...num.childNodes].find((n) => n.nodeType === 3 && n.nodeValue.trim());
      if (!t) return;
      mo.disconnect();
      const frag = document.createDocumentFragment();
      [...t.nodeValue].forEach((ch, i) => { const o = span("rc", ""), s = span("", ch); s.removeAttribute("class"); s.style.setProperty("--c", i); o.append(s); frag.append(o); });
      t.replaceWith(frag);
      mo.observe(num, { childList: true });
    });
    mo.observe(num, { childList: true });
  }

  // ---------- sheets: each finding, and each step of a worked example, slides a little under the next ----------
  const sheets = [];
  $$(".chapter, .cs-list").forEach((box) => {
    const kids = $$(":scope > .fd, :scope > .cs-step", box);
    if (kids.length < 2) return;
    kids.forEach((el, i) => {
      el.classList.add("m3-sheet");
      el.style.zIndex = i + 1;
      if (getComputedStyle(el).backgroundColor === "rgba(0, 0, 0, 0)") {       // a sheet needs a ground to cover the one beneath
        let up = el.parentElement, bg = "";
        while (up && !bg) { const c = getComputedStyle(up).backgroundColor; if (c !== "rgba(0, 0, 0, 0)") bg = c; up = up.parentElement; }
        if (bg) el.style.setProperty("--sheet-bg", bg);
        el.classList.add("m3-bare");
      }
      if (kids[i + 1]) sheets.push({ el, next: kids[i + 1], c: 0 });
    });
  });

  // ---------- the page lifts off its footer (only where the footer follows the page directly, fits on one screen and has no build of its own) ----------
  const foot = document.querySelector(".foot"), main = document.querySelector("main");
  const fitCurtain = () => root.classList.toggle("m3-curtain", !!(foot && main && main.nextElementSibling === foot && !foot.querySelector(".blocks") && foot.offsetHeight <= innerHeight));
  fitCurtain();

  // ---------- the ticker hurries when you scroll, then settles (main site) ----------
  const track = document.querySelector(".hx-track");
  const tape = track && track.getAnimations ? track.getAnimations()[0] : null;
  let lastY = scrollY, vel = 0, rate = 1, tick = 0;

  const update = () => {
    tick = 0;
    const vh = innerHeight;
    inks.forEach((k) => {
      const r = k.p.getBoundingClientRect();
      if (r.top > vh * 1.2 && k.n <= 0) return;
      const lit = Math.round(clamp((vh * 0.9 - r.top) / (r.height + vh * 0.38)) * k.w.length);
      if (lit === k.n) return;
      k.n = lit;
      k.w.forEach((w, i) => w.classList.toggle("on", i < lit));
    });
    const lag = Math.min(44, vh * 0.055);
    sheets.forEach((s) => {
      const top = s.next.getBoundingClientRect().top;
      const c = top > vh * 1.1 || top < -vh ? 0 : clamp((vh - top) / vh);
      if (Math.abs(c - s.c) < 0.004) return;
      s.c = c;
      s.el.style.translate = c ? `0 ${(c * lag).toFixed(1)}px` : "";
      s.el.style.setProperty("--c", c.toFixed(3));
    });
    if (foot && main && root.classList.contains("m3-curtain")) {
      const f = clamp((vh - main.getBoundingClientRect().bottom) / Math.max(1, foot.offsetHeight));
      foot.style.setProperty("--f", f.toFixed(3));
    }
    if (tape) {
      const y = scrollY;
      vel = vel * 0.8 + (y - lastY) * 0.2; lastY = y;
      rate += (1 + Math.min(9, Math.abs(vel) * 0.5) - rate) * 0.12;
      tape.playbackRate = rate;
      if (Math.abs(rate - 1) > 0.02 || Math.abs(vel) > 0.1) request();
    }
  };
  const request = () => { if (!tick) tick = requestAnimationFrame(update); };
  addEventListener("scroll", request, { passive: true });
  addEventListener("resize", () => { fitCurtain(); request(); });
  addEventListener("load", () => { fitCurtain(); request(); });
  wake = () => { fitCurtain(); request(); };
  request();

  // ---------- guess first: a close guess gets a handful of paper squares (main site) ----------
  const bits = (from) => {
    const css = getComputedStyle(root), cols = ["--red", "--pink", "--blush", "--clay", "--stone-2"].map((v) => css.getPropertyValue(v).trim()).filter(Boolean);
    const cv = document.createElement("canvas"), dpr = Math.min(devicePixelRatio || 1, 2), r = from.getBoundingClientRect();
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:90";
    cv.setAttribute("aria-hidden", "true");
    document.body.append(cv);
    const ctx = cv.getContext("2d"), ox = (r.left + r.width / 2) * dpr, oy = (r.top + Math.min(r.height, innerHeight) * 0.35) * dpr;
    const ps = Array.from({ length: 70 }, () => { const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, v = (5 + Math.random() * 11) * dpr;
      return { x: ox + (Math.random() - 0.5) * r.width * 0.5 * dpr, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: Math.random() * 6, vt: (Math.random() - 0.5) * 0.3, s: (6 + Math.random() * 8) * dpr, c: cols[Math.random() * cols.length | 0] }; });
    const t0 = performance.now();
    const step = (now) => {
      const k = (now - t0) / 1900;
      ctx.clearRect(0, 0, cv.width, cv.height);
      if (k >= 1) { cv.remove(); return; }
      ps.forEach((p) => { p.vy += 0.4 * dpr; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.t += p.vt;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t); ctx.globalAlpha = clamp(2.4 - k * 2.4); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s); ctx.restore(); });
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    setTimeout(() => cv.remove(), 2600);
  };
  $$(".gq").forEach((c) => {
    let was = c.classList.contains("shown");
    new MutationObserver(() => {
      const now = c.classList.contains("shown");
      if (now && !was) { const inp = c.querySelector("input"); if (inp && Math.abs(+inp.value - parseFloat(c.dataset.value)) <= 10) bits(c); }
      was = now;
    }).observe(c, { attributes: true, attributeFilter: ["class"] });
  });
})();
