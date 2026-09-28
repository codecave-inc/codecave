/* ==========================================================
   CodeCave — pricing category checker (Website + Mobile pages)
   Renders from window.CC_PRICING[key] into <div data-checker="key">.
   Edit pricing-data.js to change questions or ranges.
   ========================================================== */
(function () {
  "use strict";
  function el(html) { var t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; }

  function build(root) {
    var cfg = window.CC_PRICING[root.dataset.checker];
    if (!cfg) return;
    var qHtml = cfg.questions.map(function (q, qi) {
      var opts = q.options.map(function (o, oi) {
        return '<label class="opt"><input type="' + (q.multi ? "checkbox" : "radio") + '" name="' + q.name + '" value="' + o.value + '"' + (!q.multi && oi === 0 ? " checked" : "") + '><b>' + o.label + "</b><span>" + o.sub + "</span></label>";
      }).join("");
      return '<div class="q-group"><h3><span class="q-num">' + (qi + 1) + "</span>" + q.title + '</h3>' + (q.hint ? '<p class="q-hint">' + q.hint + "</p>" : "") + '<div class="opt-grid">' + opts + "</div></div>";
    }).join("");

    root.innerHTML =
      '<div class="checker"><form novalidate>' + qHtml + '</form>' +
      '<div class="result" data-reveal><span class="result__tag">Live estimate</span><div class="result__tier"></div>' +
      '<div class="result__price"></div><div class="result__bar"><i></i></div><p class="result__desc"></p>' +
      '<div class="result__row"><span>Timeline</span><span data-r-time></span></div>' +
      '<div class="result__row"><span>Approach</span><span data-r-stack></span></div>' +
      '<a class="btn btn--lime" href="#' + cfg.formAnchor + '" style="width:100%;margin-top:1.25rem" data-magnetic>Start this project →</a>' +
      "<small>Estimate only. Final quote after a short discovery call.</small></div></div>";

    var form = root.querySelector("form"), result = root.querySelector(".result"), bar = result.querySelector(".result__bar i");
    function score() {
      var s = 0, data = new FormData(form);
      cfg.questions.forEach(function (q) {
        data.getAll(q.name).forEach(function (v) {
          var opt = q.options.find(function (o) { return o.value === v; });
          if (opt) s += opt.weight;
        });
      });
      return s;
    }
    function pickTier(s) { var t = cfg.tiers[0]; cfg.tiers.forEach(function (tier) { if (s >= tier.min) t = tier; }); return t; }
    function render() {
      var s = score(), tier = pickTier(s), max = cfg.tiers[cfg.tiers.length - 1].min + 8;
      var pct = Math.max(8, Math.min(100, Math.round((s / max) * 100)));
      result.querySelector(".result__tier").textContent = tier.name;
      result.querySelector(".result__price").textContent = tier.price;
      result.querySelector(".result__desc").textContent = tier.desc;
      result.querySelector("[data-r-time]").textContent = tier.timeline;
      result.querySelector("[data-r-stack]").textContent = tier.stack;
      bar.style.width = pct + "%";
      var startBtn = result.querySelector(".btn"); startBtn.dataset.tier = tier.name;
    }
    form.addEventListener("input", render); render();
    result.querySelector(".btn").addEventListener("click", function () {
      var target = document.getElementById(cfg.formAnchor);
      if (target) { var note = target.querySelector("[data-tier-note]"); if (note) note.textContent = "Selected estimate: " + this.dataset.tier + ". Mention this in your form so we start from the right scope."; }
    });
    if (window.gsap && root.querySelectorAll) { /* tilt/hooks are picked up automatically since .opt uses hover CSS only */ }
  }
  document.querySelectorAll("[data-checker]").forEach(build);
})();
