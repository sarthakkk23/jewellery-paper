/* The owner's playbook: eight calculators. Each formula is the one shown on its page, and each
   starts from that page's worked example, so the default inputs give the example's numbers.
   Money shown is rounded to the rupee; a difference between two shown amounts is taken from the
   shown (rounded) amounts, as the worked examples do, so every sum can be redone from the page. */
(function () {
  "use strict";

  // ---------- numbers ----------
  function R(x, d) {
    d = d || 0;
    var s = String(x);
    if (/e/i.test(s)) { var f = Math.pow(10, d); return Math.round(x * f) / f; }
    return Number(Math.round(Number(s + "e" + d)) + "e-" + d);
  }
  var nfCache = {};
  function nf(d, loc) {
    var key = (loc || "en-IN") + d;
    return nfCache[key] || (nfCache[key] = new Intl.NumberFormat(loc || "en-IN", { minimumFractionDigits: d, maximumFractionDigits: d }));
  }
  function num(x, d) { return nf(d || 0).format(R(x, d || 0)); }
  function trim0(s) { return s.indexOf(".") < 0 ? s : s.replace(/\.?0+$/, ""); }
  function plain(x) { return trim0(nf(2).format(R(x, 2))); }           // 20, 12, 0.5, 1,500
  function inr(x, d) { return (R(x, d || 0) < 0 ? "−" : "") + "₹" + nf(d || 0).format(Math.abs(R(x, d || 0))); }
  function inr1(x) { return R(x, 1) === R(x, 0) ? inr(x, 0) : inr(x, 1); }  // ₹88.5, ₹118
  function lakh(x) { return "₹" + nf(2).format(R(x / 1e5, 2)) + " lakh"; }
  function pct(frac, d) { return nf(d).format(R(frac * 100, d)) + "%"; }
  function usd(x) { return (x < 0 ? "−" : "") + "$" + nf(2, "en-US").format(Math.abs(R(x, 2))); }
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September",
    "October", "November", "December"];
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function parse(input) {
    var s = String(input.value).replace(/[,\s₹$%]/g, "").replace(/[−–]/g, "-");
    if (s === "") return null;
    var n = Number(s);
    return isFinite(n) ? n : NaN;
  }

  // ---------- small DOM helpers ----------
  function $(box, sel) { return box.querySelector(sel); }
  function $$(box, sel) { return Array.prototype.slice.call(box.querySelectorAll(sel)); }
  function values(box) {
    var v = {};
    $$(box, "[data-in]").forEach(function (inp) {
      var n = inp.type === "range" ? Number(inp.value) : parse(inp);
      v[inp.getAttribute("data-in")] = n;
      if (inp.type !== "range") inp.setAttribute("aria-invalid", n !== n ? "true" : "false");
    });
    return v;
  }
  function ok(v, names) {
    return names.every(function (k) { return typeof v[k] === "number" && isFinite(v[k]); });
  }
  function has(v, k) { return typeof v[k] === "number" && isFinite(v[k]); }
  function out(box, key, text) {
    var o = $(box, '[data-out="' + key + '"]');
    if (!o) return;
    if (text == null) { o.hidden = true; return; }
    o.hidden = false;
    o.textContent = text;
  }
  function waiting(box, keys, msg) {
    keys.forEach(function (k, i) { out(box, k, i === 0 ? (msg || "Fill in every box with a number to see the result.") : null); });
  }
  function table(head, rows, opts) {
    opts = opts || {};
    var h = '<div class="tbl-wrap"' + (opts.label ? ' role="region" tabindex="0" aria-label="' + opts.label + '"' : "") +
      '><table class="tbl"><thead><tr>' +
      head.map(function (c) { return '<th scope="col">' + c + "</th>"; }).join("") + "</tr></thead><tbody>";
    rows.forEach(function (r) {
      h += "<tr" + (r.current ? ' class="is-current"' : "") + ">" + r.cells.map(function (c, i) {
        return i === 0 ? '<th scope="row">' + c + "</th>" : "<td>" + c + "</td>";
      }).join("") + "</tr>";
    });
    return h + "</tbody></table></div>";
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  function article(word) { return /^[AEIO]/i.test(word) ? "an" : "a"; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function either(list) { return list.length < 2 ? list.join("") : list.slice(0, -1).join(", ") + " or " + list[list.length - 1]; }

  // ---------- the eight calculators ----------
  var CALC = {};

  // 1. Making charges
  CALC["making-charges"] = {
    keys: ["rise", "hold", "pergram"],
    run: function (box, v) {
      if (!ok(v, ["w", "rn", "rt", "m", "g"]) || v.w <= 0 || v.rn <= 0) return waiting(box, this.keys), $(box, '[data-out="bill"]').innerHTML = "";
      var m = v.m / 100, g = v.g / 100;
      var goldN = v.w * v.rn, goldT = v.w * v.rt;                 // gold_now, gold_then
      var mkN = m * goldN, mkT = m * goldT;                       // making_now, making_then
      var totN = (goldN + mkN) * (1 + g), totT = (goldT + mkT) * (1 + g);
      var held = (goldN + mkT) * (1 + g);                         // held_total
      var heldPct = mkT / goldN;                                  // held_pct
      var rise = R(mkN) - R(mkT);
      var saving = R(totN) - R(held);                             // saving = total_now − held_total
      var change = rise > 0 ? "has risen from " + inr(mkT) + " to " + inr(mkN) + " (" + inr(rise) + ")"
        : rise < 0 ? "has fallen from " + inr(mkT) + " to " + inr(mkN) + " (" + inr(-rise) + ")"
          : "is the same as last year, " + inr(mkN) + ",";
      out(box, "rise", "Your making on this piece " + change + " with no change in the work.");
      var tail = saving > 0 ? "saving " + inr(saving) + " (" + pct(saving / R(totN), 1) + ")."
        : saving < 0 ? inr(-saving) + " (" + pct(-saving / R(totN), 1) + ") more than with making as a percentage."
          : "the same as now.";
      out(box, "hold", "Hold it at " + inr(mkT) + " (" + pct(heldPct, 1) + " of today's gold) and the customer pays " +
        inr(held) + ", " + tail);
      out(box, "pergram", "Making per gram: " + inr(mkT / v.w) + " a year ago, " + inr(mkN / v.w) + " now.");
      $(box, '[data-out="bill"]').innerHTML = table(["", "A year ago", "Now"], [
        { cells: ["Gold: " + plain(v.w) + " g × rate", inr(goldT), inr(goldN)] },
        { cells: ["Making: " + plain(v.m) + "% of gold", inr(mkT), inr(mkN)] },
        { cells: ["GST: " + plain(v.g) + "% of (gold + making)", inr((goldT + mkT) * g), inr((goldN + mkN) * g)] },
        { cells: ["<strong>Customer pays</strong>", "<strong>" + inr(totT) + "</strong>", "<strong>" + inr(totN) + "</strong>"] }
      ], { label: "The bill, then and now" });
    }
  };

  // 2. Lighter pieces
  CALC["lighter-pieces"] = {
    keys: ["buys", "same", "then"],
    run: function (box, v) {
      if (!ok(v, ["B", "m", "r22", "r18"]) || v.r22 <= 0 || v.r18 <= 0) return waiting(box, this.keys);
      var m = v.m / 100;
      function allIn(r) { return r * (1 + m) * 1.03; }            // all_in(r) = r × (1 + m) × 1.03
      var g22 = v.B / allIn(v.r22), g18 = v.B / allIn(v.r18);   // grams(r) = B ÷ all_in(r)
      out(box, "buys", inr(v.B) + " buys " + num(g22, 2) + " g in 22K or " + num(g18, 2) + " g in 18K.");
      var same = g22 * allIn(v.r18);                              // same_design_18K
      var diff = R(v.B) - R(same);
      out(box, "same", "The same " + num(g22, 2) + " g design costs " + inr(same) + " in 18K, " +
        (diff > 0 ? inr(diff) + " less." : diff < 0 ? inr(-diff) + " more." : "the same as in 22K."));
      if (has(v, "rt") && v.rt > 0) {
        var gThen = v.B / allIn(v.rt);
        var wc = g22 / gThen - 1;                                 // weight_change
        out(box, "then", "A year ago this budget bought " + num(gThen, 2) + " g of 22K. " +
          (wc < 0 ? "Today it buys " + pct(-wc, 1) + " less for the same money."
            : wc > 0 ? "Today it buys " + pct(wc, 1) + " more for the same money." : "Today it buys the same."));
      } else out(box, "then", null);
    }
  };

  // 3. Wedding dates
  CALC["wedding-dates"] = {
    keys: ["expect"],
    run: function (box, v) {
      var show = $(box, '[data-show="c"]');
      if (show) show.textContent = plain(v.c);
      if (!ok(v, ["S", "Dl", "Dt", "c"]) || v.Dl <= 0 || v.Dt <= 0) {
        $(box, '[data-out="table"]').innerHTML = "";
        return waiting(box, this.keys);
      }
      function forecast(c) { return v.S * (c + (1 - c) * v.Dt / v.Dl); }  // S × [c + (1 − c) × D_this ÷ D_last]
      var f = forecast(v.c), a = forecast(0), b = forecast(1);
      var lo = Math.min(a, b), hi = Math.max(a, b);
      out(box, "expect", "Expect about " + trim0(num(f, 1)) + " pieces (" + trim0(num(lo, 1)) + " to " + trim0(num(hi, 1)) +
        " depending on crowding), with " + num(f / v.Dt, 2) + " pieces per wedding date against " + num(v.S / v.Dl, 2) + " last year.");
      $(box, '[data-out="table"]').innerHTML = table(["Crowding share", "This season", "Per date"], [0, 0.5, 1].map(function (c) {
        var label = c === 0 ? "0 (falls with dates)" : c === 1 ? "1 (same weddings)" : plain(c);
        return { current: R(c, 2) === R(v.c, 2), cells: [label, num(forecast(c), 1), num(forecast(c) / v.Dt, 2)] };
      }), { label: "Forecast by crowding share" });
    }
  };

  // 4. Hallmarking
  CALC["hallmarking"] = {
    keys: ["a", "b", "total"],
    init: function (box, recalc) {
      var presets = { gold: [75, 200], silver: [35, 150] };  // the BIS charges quoted on the page
      $$(box, "[data-preset]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var p = presets[btn.getAttribute("data-preset")];
          $(box, '[data-in="rate"]').value = p[0];
          $(box, '[data-in="min"]').value = p[1];
          $$(box, "[data-preset]").forEach(function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
          recalc();
        });
      });
    },
    run: function (box, v) {
      if (!ok(v, ["rate", "min", "t", "n", "k", "price"]) || v.n <= 0 || v.price <= 0) return waiting(box, this.keys);
      var t = v.t / 100;
      function lot(n) { return Math.max(n * v.rate, v.min) * (1 + t); }  // fee_lot = max(n × rate, minimum) × (1 + t)
      function line(n, k, price) {
        var fee = lot(n), per = fee / n;                                  // per_piece
        var s = inr1(per) + " a piece (" + pct(per / price, 2) + " of a " + inr(price) + " piece), " +
          inr(k * fee) + " a month for this lot size.";
        if (n * v.rate < v.min) s += " The " + inr(v.min) + " minimum applies to this lot.";
        return { text: s, monthly: R(k * fee) };
      }
      var a = line(v.n, v.k, v.price);
      out(box, "a", a.text);
      if (ok(v, ["n2", "k2", "price2"]) && v.n2 > 0 && v.price2 > 0) {
        var b = line(v.n2, v.k2, v.price2);
        out(box, "b", b.text);
        out(box, "total", "Both lot sizes together: " + inr(a.monthly + b.monthly) + " a month.");
      } else { out(box, "b", null); out(box, "total", null); }
    }
  };

  // 5. Gold stock
  CALC["gold-stock"] = {
    keys: ["keep", "move", "stock"],
    mode: "piece",
    init: function (box, recalc) {
      var self = this;
      $$(box, "[data-mode-btn]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          self.mode = btn.getAttribute("data-mode-btn");
          $$(box, "[data-mode-btn]").forEach(function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
          recalc();
        });
      });
    },
    run: function (box, v) {
      var mode = this.mode;
      $$(box, ".field[data-mode], [data-out][data-mode]").forEach(function (el) {
        if (el.classList.contains("field")) el.hidden = el.getAttribute("data-mode") !== mode;
      });
      var tbl = $(box, '[data-out="table"]');
      if (mode === "stock") {
        out(box, "keep", null); out(box, "move", null); tbl.innerHTML = "";
        if (!ok(v, ["grams", "r", "i"])) return out(box, "stock", "Fill in every box with a number to see the result.");
        var annual = v.grams * v.r * v.i / 100;
        return out(box, "stock", "Holding " + plain(v.grams) + " g costs " + inr(annual) + " a year, about " + lakh(annual / 12) +
          " a month. That's the cost of money only, before insurance or security.");
      }
      out(box, "stock", null);
      if (!ok(v, ["w", "r", "m", "i", "months"]) || v.m <= 0) { tbl.innerHTML = ""; return waiting(box, ["keep", "move"]); }
      var value = v.w * v.r;                                   // value = w × r
      var mk = v.m / 100 * value;                              // making_value = m × value
      function carry(months) { return value * v.i / 100 * months / 12; }  // carry = value × i × months ÷ 12
      var c = carry(v.months);
      out(box, "keep", "This piece has cost " + inr(c) + " to keep for " + plain(v.months) + (v.months === 1 ? " month, " : " months, ") +
        pct(c / mk, 0) + " of its " + inr(mk) + " making.");
      if (has(v, "rt") && v.rt > 0) {
        var gm = v.w * (v.r - v.rt);                           // gold_move = w × (r − r_then)
        var net = R(gm) - R(c);                                // net = gold_move − carry
        var s = "Its gold has moved by " + (R(gm) > 0 ? "+" : "") + inr(gm) + " over the same time, so it is " +
          (net > 0 ? inr(net) + " ahead." : net < 0 ? inr(-net) + " behind." : "level with the cost of keeping it.");
        if (R(gm) > 0) s += " A fall in gold would add to the cost instead.";
        else if (R(gm) < 0) s += " Here the fall in gold adds to the cost.";
        out(box, "move", s);
      } else out(box, "move", null);
      tbl.innerHTML = table(["Held for", "Cost to keep", "Share of its making"], [3, 6, 12].map(function (mo) {
        return { current: mo === v.months, cells: [mo + " months", inr(carry(mo)), pct(carry(mo) / mk, 0)] };
      }), { label: "Cost to keep by months held" });
    }
  };

  // 6. Export markets
  CALC["export-markets"] = {
    keys: ["gap"],
    init: function (box) {
      $$(box, "[data-mname]").forEach(function (inp) {
        inp.addEventListener("input", function () { inp.closest("[data-market]").removeAttribute("data-short"); });
      });
    },
    run: function (box, v) {
      var tbl = $(box, '[data-out="table"]');
      if (!ok(v, ["fob", "freight"]) || v.fob < 0) { tbl.innerHTML = ""; return waiting(box, this.keys); }
      var rows = [];
      $$(box, "[data-market]").forEach(function (row) {
        var name = $(row, "[data-mname]").value.trim();
        var dIn = $(row, "[data-mduty]");
        var d = parse(dIn);
        dIn.setAttribute("aria-invalid", d !== d ? "true" : "false");
        if (!name || d == null || d !== d) return;
        var short = row.getAttribute("data-short") || name;
        rows.push({ name: name, short: short, d: d, landed: R(v.fob * (1 + d / 100) + v.freight, 2) });  // landed = FOB × (1 + d) + freight
      });
      if (!rows.length) { tbl.innerHTML = ""; return out(box, "gap", "Add at least one market with a duty."); }
      var min = Math.min.apply(null, rows.map(function (r) { return r.landed; }));
      var max = Math.max.apply(null, rows.map(function (r) { return r.landed; }));
      var cheap = rows.filter(function (r) { return r.landed === min; }).map(function (r) { return r.short; });
      var dear = rows.filter(function (r) { return r.landed === max; }).map(function (r) { return r.short; });
      var hasUS = rows.some(function (r) { return r.short === "US" || /^(USA?|United States)\b/i.test(r.name); });
      var gap = R(max - min, 2);                                 // gap vs cheapest
      var s;
      if (gap === 0) s = "Every market lands at " + usd(min) + ".";
      else s = cap(article(dear[0])) + " " + dear.join(" or ") + " buyer pays " + usd(max) + " landed, " + usd(gap) + " (" +
        pct(gap / min, 1) + ") more than " + article(cheap[0]) + " " + either(cheap) + " buyer at " + usd(min) + ".";
      if (hasUS) s += " Normal US duty, if any, is extra.";
      out(box, "gap", s);
      tbl.innerHTML = table(["Market", "Duty", "Landed cost", "More than the cheapest"], rows.map(function (r) {
        return { cells: [esc(r.name), plain(r.d) + "%", usd(r.landed), r.landed === min ? "cheapest" : usd(r.landed - min) + " (" + pct((r.landed - min) / min, 1) + ")"] };
      }), { label: "Landed cost by market" });
    }
  };

  // 7. Lab reports
  CALC["lab-reports"] = {
    keys: ["be", "gain"],
    run: function (box, v) {
      var tbl = $(box, '[data-out="table"]');
      if (!ok(v, ["v", "fee", "n"]) || v.v <= 0 || v.n <= 0) { tbl.innerHTML = ""; return waiting(box, this.keys); }
      var feePer = v.fee / v.n;                                  // fee_per_stone = fee ÷ n
      var be = feePer / v.v;                                     // break_even = fee_per_stone ÷ value_per_stone
      var many = v.n !== 1;
      out(box, "be", "At " + inr(v.v) + " a stone, a " + inr(v.fee) + " report " +
        (many ? "covering " + plain(v.n) + " stones (" + inr(feePer) + " a stone) pays if it lifts each stone's price"
          : "pays if it lifts the price") + " by more than " + pct(be, 1) + ".");
      if (has(v, "L")) {
        var gain = v.L / 100 * v.v - feePer;                     // gain = L × value − fee_per_stone
        var who = many ? "each stone" : "the stone";
        out(box, "gain", "With a " + plain(v.L) + "% lift, " + who + (R(gain) > 0 ? " gains " + inr(gain) + " after the fee."
          : R(gain) < 0 ? " loses " + inr(-gain) + " after the fee." : " just covers the fee."));
      } else out(box, "gain", null);
      tbl.innerHTML = table(["Stone value", "The report pays if it lifts the price by more than…"], [25000, 50000, 100000, 200000].map(function (sv) {
        return { current: sv === v.v, cells: [inr(sv), pct(feePer / sv, 1)] };
      }), { label: "Break-even by stone value" });
    }
  };

  // 8. Tourist season
  CALC["tourist-season"] = {
    keys: ["peak", "stock"],
    sel: null,
    own: false,
    state: null,
    init: function (box, recalc) {
      var self = this;
      // The state's split, as in the page's table; November and June at full precision from figures.json.
      self.state = $$(box, "[data-share]").map(function (inp) { return Number(inp.value); });
      var btn = $(box, "[data-own]");
      var panel = document.getElementById(btn.getAttribute("aria-controls"));
      btn.addEventListener("click", function () {
        self.own = !self.own;
        btn.setAttribute("aria-expanded", self.own ? "true" : "false");
        btn.textContent = self.own ? "Use the state's split again" : "Use my own monthly split";
        panel.hidden = !self.own;
        recalc();
      });
      box.addEventListener("click", function (e) {
        var bar = e.target.closest("[data-bar]");
        if (!bar) return;
        self.sel = Number(bar.getAttribute("data-bar"));
        recalc();
        var again = box.querySelector('[data-bar="' + self.sel + '"]');
        if (again) again.focus();
      });
      var ready = window.JJI && window.JJI.figures ? window.JJI.figures : Promise.resolve(null);
      var timer = new Promise(function (res) { setTimeout(res, 4000); });
      return Promise.race([ready, timer]).then(function (data) {
        var f = data && data.figures;
        if (f && f.n8_nov_foreign_share_pct && isFinite(f.n8_nov_foreign_share_pct.value)) self.state[10] = f.n8_nov_foreign_share_pct.value;
        if (f && f.n8_jun_foreign_share_pct && isFinite(f.n8_jun_foreign_share_pct.value)) self.state[5] = f.n8_jun_foreign_share_pct.value;
      });
    },
    run: function (box, v) {
      var self = this, chart = $(box, '[data-out="chart"]');
      var shares = self.state.slice();
      if (self.own) {
        var bad = false;
        shares = $$(box, "[data-share]").map(function (inp) {
          var n = parse(inp);
          inp.setAttribute("aria-invalid", n !== n ? "true" : "false");
          if (n == null || n !== n) bad = true;
          return n || 0;
        });
        var sum = shares.reduce(function (a, b) { return a + b; }, 0);
        out(box, "sum", "Your months add up to " + plain(sum) + "%.");
        if (bad) { chart.innerHTML = ""; return waiting(box, this.keys, "Fill in all twelve months to see the result."); }
      }
      if (!ok(v, ["A", "k", "lead"]) || v.k < 1 || v.lead < 0) { chart.innerHTML = ""; return waiting(box, this.keys); }
      var k = Math.min(12, Math.round(v.k));
      var sales = shares.map(function (s) { return v.A * s / 100; });          // month_sales(m) = annual × share(m)
      var peak = 0, low = 0;
      sales.forEach(function (s, i) { if (s > sales[peak]) peak = i; if (s < sales[low]) low = i; });
      if (self.sel == null) self.sel = peak;
      var m = self.sel;
      var need = 0, win = {};
      for (var j = 0; j < k; j++) { need += sales[(m + j) % 12]; win[(m + j) % 12] = true; }  // Σ over the next k months
      var today = new Date();
      var first = new Date(today.getFullYear(), m, 1);
      if (first < new Date(today.getFullYear(), today.getMonth(), today.getDate())) first = new Date(today.getFullYear() + 1, m, 1);
      var order = new Date(first.getFullYear(), m, 1 - Math.round(v.lead * 7));  // order_by(m) = first day of m − lead time
      out(box, "peak", MONTHS[peak] + " brings about " + lakh(sales[peak]) + "; " + MONTHS[low] + " about " + lakh(sales[low]) + ".");
      out(box, "stock", "Going into " + MONTHS[m] + " you'll want about " + lakh(need) + " of stock. Order it by about " +
        order.getDate() + " " + MONTHS[order.getMonth()] + ".");

      var top = Math.max.apply(null, sales) || 1;
      var bars = sales.map(function (s, i) {
        var h = Math.max(0, s / top * 100);
        return '<button type="button" class="bar' + (win[i] ? " in-window" : "") + '" data-bar="' + i + '" aria-pressed="' + (i === m) +
          '" aria-label="' + MONTHS[i] + ", about " + lakh(s) + (i === m ? ", selected" : "") + '"><span class="col" style="height:' + h.toFixed(2) + '%"></span></button>';
      }).join("");
      var axis = MON.map(function (lab, i) {
        var cls = i === order.getMonth() ? "is-order" : i === m ? "is-sel" : "";
        return '<span class="' + cls + '">' + lab + "</span>";
      }).join("");
      var rows = sales.map(function (s, i) { return { current: !!win[i], cells: [MONTHS[i], plain(shares[i]) + "%", lakh(s)] }; });
      chart.innerHTML = '<div class="season-chart"><p class="cap">Expected sales to foreign visitors, month by month. Tap a month to plan for it.</p>' +
        '<div class="bars" role="group" aria-label="Expected sales by month">' + bars + '</div><div class="months-axis" aria-hidden="true">' + axis + "</div>" +
        '<ul class="chart-key"><li><span class="sw k-win"></span>The ' + (k === 1 ? "month" : k + " months") + " your stock covers</li>" +
        '<li><span class="sw k-other"></span>Other months</li><li><span class="sw k-order"></span>Order by ' + order.getDate() + " " + MONTHS[order.getMonth()] + "</li></ul></div>" +
        '<details class="disc formula"><summary><span>Month by month</span></summary><div class="disc-body">' +
        table(["Month", "Share of the year", "Expected sales"], rows, { label: "Expected sales by month" }) + "</div></details>";
    }
  };

  // ---------- wiring ----------
  document.querySelectorAll("[data-calc]").forEach(function (box) {
    var calc = CALC[box.getAttribute("data-calc")];
    if (!calc) return;
    function recalc() { calc.run(box, values(box)); }
    $$(box, "[data-unlock]").forEach(function (btn) {
      var inp = $(box, '[data-in="' + btn.getAttribute("data-unlock") + '"]');
      var note = document.getElementById(inp.id + "-note");
      btn.addEventListener("click", function () {
        inp.readOnly = false;
        if (note) note.hidden = false;
        btn.hidden = true;
        inp.focus();
      });
    });
    var started = calc.init ? calc.init(box, recalc) : null;
    box.addEventListener("input", recalc);
    if (started && typeof started.then === "function") started.then(recalc); else recalc();
  });
})();
