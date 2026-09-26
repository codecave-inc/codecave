/* ==========================================================
   CodeCave — minimal Convex browser client (no SDK / no bundler)
   Talks to Convex's HTTP API directly via fetch, since this site
   ships as plain static files. Needs window.CODECAVE.convexUrl set
   in config.js (your deployment's https://xxx.convex.cloud URL).
   ========================================================== */
(function () {
  "use strict";
  function base() {
    var url = (window.CODECAVE && window.CODECAVE.convexUrl) || "";
    return url.replace(/\/$/, "");
  }
  async function call(kind, path, args) {
    var url = base();
    if (!url) throw new Error("Convex is not configured yet (convexUrl is empty in config.js).");
    var res = await fetch(url + "/api/" + kind, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: path, args: args || {}, format: "json" }),
    });
    var body = await res.json().catch(function () { return null; });
    if (!res.ok || !body || body.status === "error") {
      var msg = (body && (body.errorMessage || body.error)) || "Request failed (" + res.status + ")";
      throw new Error(msg);
    }
    return body.value;
  }
  window.convex = {
    mutation: function (path, args) { return call("mutation", path, args); },
    query: function (path, args) { return call("query", path, args); },
  };
})();
