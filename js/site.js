/* Jaipur Jewellery Index: fills every figure from figures.json and adds the small interactions.
   All text is in the HTML; this file only fills numbers and opens and closes layers.
   Markup contract (for the build that will later write figures into the HTML):
     <span class="fig" data-fig="ID">{{ID}}</span>        ID = figures key, "pulse.KEY" or "pulse_month"
     <span data-fig-period="pulse.KEY"></span>             the pulse item's period, made readable
     <span data-fig-meta="pulse.KEY"></span>               the pulse item's source and method
     <span data-fig-width="ID"></span>                     a bar segment sized by the figure's value
     <ul data-fig-notes></ul>                              filled with the figures used in that finding */
(function () {
  "use strict";

  var doc = document.documentElement;
  doc.classList.add("js");
  var root = doc.getAttribute("data-root") || "./";
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"];
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var resolveReady;
  var ready = new Promise(function (res) { resolveReady = res; });
  window.JJI = { figures: ready, monthName: function (i) { return MONTHS[i]; } };

  function lookup(data, id) {
    if (!data) return null;
    if (id === "pulse_month") {
      return data.pulse_month ? { display: readableMonth(data.pulse_month) } : null;
    }
    if (id.indexOf("pulse.") === 0) return (data.pulse || {})[id.slice(6)] || null;
    return (data.figures || {})[id] || null;
  }

  // "2026-10" -> "October 2026"; "2026-10-23" -> "23 October 2026"
  function readableMonth(s) {
    var m = /^(\d{4})-(\d{2})$/.exec(s);
    if (m) return MONTHS[+m[2] - 1] + " " + m[1];
    var d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (d) return (+d[3]) + " " + MONTHS[+d[2] - 1] + " " + d[1];
    return s;
  }

  // Makes ISO dates inside a period readable; leaves any other words as they are.
  function readablePeriod(s) {
    if (!s) return "";
    var str = String(s);
    var range = /^(\d{4})-(\d{2}) to (\d{4})-(\d{2})$/.exec(str);
    if (range) {
      var a = MONTHS[+range[2] - 1], b = MONTHS[+range[4] - 1];
      return range[1] === range[3] ? a + " to " + b + " " + range[3]
        : a + " " + range[1] + " to " + b + " " + range[3];
    }
    return str.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, function (_, y, mo, da) {
      return (+da) + " " + MONTHS[+mo - 1] + " " + y;
    }).replace(/\b(\d{4})-(\d{2})\b/g, function (_, y, mo) {
      return MONTHS[+mo - 1] + " " + y;
    });
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function fill(data) {
    var missing = [];
    document.querySelectorAll("[data-fig]").forEach(function (node) {
      var id = node.getAttribute("data-fig");
      var f = lookup(data, id);
      if (f && f.display != null) {
        node.textContent = f.display;
        node.classList.remove("is-missing");
        if (f.what && !node.title) node.title = f.what;
      } else {
        node.classList.add("is-missing");
        missing.push(id);
      }
    });
    document.querySelectorAll("[data-fig-period]").forEach(function (node) {
      var f = lookup(data, node.getAttribute("data-fig-period"));
      if (f && f.period) node.textContent = readablePeriod(f.period);
    });
    document.querySelectorAll("[data-fig-meta]").forEach(function (node) {
      var f = lookup(data, node.getAttribute("data-fig-meta"));
      if (f) node.textContent = [f.source, f.method].filter(Boolean).join(" · ");
    });
    document.querySelectorAll("[data-fig-width]").forEach(function (node) {
      var f = lookup(data, node.getAttribute("data-fig-width"));
      if (f && typeof f.value === "number" && isFinite(f.value)) {
        node.style.flexBasis = Math.max(0, Math.min(100, f.value)) + "%";
        node.style.flexGrow = "0";
      }
    });
    if (missing.length && window.console) console.warn("figures.json has no entry for:", missing.join(", "));
  }

  // "How I know": list each figure used in the finding with its tag, scope and source.
  function notes(data) {
    document.querySelectorAll("[data-fig-notes]").forEach(function (list) {
      var scope = list.closest("[data-finding]");
      if (!scope) return;
      var seen = {};
      scope.querySelectorAll("[data-fig]").forEach(function (n) {
        var id = n.getAttribute("data-fig");
        if (seen[id] || id.indexOf("pulse") === 0) return;
        seen[id] = true;
        var f = lookup(data, id);
        if (!f) return;
        var li = el("li");
        var top = el("span", "fn-top");
        top.appendChild(el("span", "fn-fig", f.display));
        if (f.label) top.appendChild(el("span", "chip l-" + String(f.label).toLowerCase(), f.label));
        li.appendChild(top);
        if (f.what) li.appendChild(el("span", "fn-what", f.what + "."));
        var meta = [f.period, f.geography].filter(Boolean).join(" · ");
        var src = f.source && data.sources ? data.sources[f.source] : null;
        var metaEl = el("span", "fn-meta", meta ? meta + ". " : "");
        if (src) {
          metaEl.appendChild(document.createTextNode("Source: "));
          if (src.url) {
            var a = el("a", null, src.name);
            a.href = src.url;
            a.rel = "noopener";
            metaEl.appendChild(a);
          } else {
            metaEl.appendChild(document.createTextNode(src.name));
          }
          metaEl.appendChild(document.createTextNode("."));
        }
        li.appendChild(metaEl);
        if (f.caveat) li.appendChild(el("span", "fn-caveat", f.caveat));
        list.appendChild(li);
      });
    });
  }

  // How I know page: every source named in figures.json.
  function sources(data) {
    document.querySelectorAll("[data-sources]").forEach(function (list) {
      var s = data.sources || {};
      Object.keys(s).forEach(function (k) {
        var li = el("li");
        if (s[k].url) {
          var a = el("a", null, s[k].name);
          a.href = s[k].url;
          a.rel = "noopener";
          li.appendChild(a);
        } else {
          li.textContent = s[k].name;
        }
        list.appendChild(li);
      });
      list.hidden = false;
    });
  }

  // Layers: without JS every layer is open text. With JS each becomes one tap away.
  function layers() {
    document.querySelectorAll("[data-layers]").forEach(function (box) {
      var bar = box.querySelector(".layer-buttons");
      if (!bar) return;
      bar.hidden = false;
      bar.querySelectorAll("button[aria-controls]").forEach(function (btn) {
        var panel = document.getElementById(btn.getAttribute("aria-controls"));
        if (!panel) return;
        panel.hidden = true;
        btn.setAttribute("aria-expanded", "false");
        btn.addEventListener("click", function () {
          var open = btn.getAttribute("aria-expanded") === "true";
          btn.setAttribute("aria-expanded", open ? "false" : "true");
          panel.hidden = open;
          if (!open) {
            panel.classList.remove("is-opening");
            void panel.offsetWidth;
            panel.classList.add("is-opening");
          }
        });
      });
    });
  }

  // The close: guess before you see it. Reads correctly whatever the figures are.
  function guess(data) {
    document.querySelectorAll("[data-guess]").forEach(function (box) {
      var maxF = lookup(data, box.getAttribute("data-guess-max"));
      var answer = document.querySelector(box.getAttribute("data-guess-answer"));
      if (!maxF || typeof maxF.value !== "number" || !answer) return;
      var range = box.querySelector("input[type=range]");
      var out = box.querySelector("output");
      var btn = box.querySelector("button");
      var said = box.querySelector(".guess-said");
      range.min = "0";
      range.max = String(Math.round(maxF.value));
      range.value = String(Math.round(maxF.value / 2));
      out.textContent = range.value;
      range.addEventListener("input", function () { out.textContent = range.value; });
      answer.classList.add("is-hidden-answer");
      box.hidden = false;
      btn.addEventListener("click", function () {
        said.textContent = "You guessed " + range.value + ".";
        answer.classList.remove("is-hidden-answer");
        answer.classList.add("is-revealed");
        range.disabled = true;
        btn.hidden = true;
      });
    });
  }

  function reveal() {
    if (reduceMotion || !("IntersectionObserver" in window)) return;
    var items = document.querySelectorAll("[data-reveal]");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (it) {
      var r = it.getBoundingClientRect();
      if (r.top < window.innerHeight) return; // already on screen: leave it still
      it.classList.add("reveal");
      io.observe(it);
    });
  }

  function failed(err) {
    if (window.console) console.error("Could not load figures.json", err);
    var main = document.getElementById("main");
    if (main && !document.querySelector(".load-error")) {
      var p = el("p", "load-error", "The figures on this page could not be loaded. Please reload the page.");
      p.setAttribute("role", "status");
      main.parentNode.insertBefore(p, main);
    }
    resolveReady(null);
  }

  layers();
  reveal();

  fetch(root + "figures.json", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error(r.status + " " + r.statusText); return r.json(); })
    .then(function (data) {
      fill(data);
      notes(data);
      sources(data);
      guess(data);
      resolveReady(data);
    })
    .catch(failed);
})();
