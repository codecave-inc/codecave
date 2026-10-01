/* ==========================================================
   CodeCave — live content overlay
   Fetches editable content from Convex (pricing tiers, hackathon
   date, homepage stats, contact info) and overlays it onto the
   static fallbacks already in the page, once it arrives. Never
   blocks first render; silently keeps the static version if
   Convex is unreachable, slow, or the admin hasn't added content
   yet. Requires assets/js/convex-client.js loaded first.
   ========================================================== */
(function () {
  "use strict";
  var TIMEOUT_MS = 4000;

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise(function (_, reject) { setTimeout(function () { reject(new Error("timeout")); }, ms); }),
    ]);
  }

  async function safeQuery(path, args) {
    try {
      if (!(window.CODECAVE && window.CODECAVE.convexUrl) || !window.convex) return null;
      return await withTimeout(window.convex.query(path, args || {}), TIMEOUT_MS);
    } catch (e) {
      return null;
    }
  }

  /** Returns tiers shaped for pricing.js, or null if none set / unreachable. */
  async function loadPricingTiers(checker) {
    var rows = await safeQuery("content:listPricingTiers", { checker: checker });
    if (!rows || !rows.length) return null;
    return rows.map(function (r) {
      return { min: r.minScore, name: r.name, price: r.priceRange, desc: r.description, timeline: r.timeline, stack: r.approach };
    });
  }

  /** Returns a setting's string value, or null if unset / unreachable. */
  async function loadSetting(key) {
    var value = await safeQuery("content:getSetting", { key: key });
    return value || null;
  }

  window.CC_LIVE = { loadPricingTiers: loadPricingTiers, loadSetting: loadSetting };
})();
