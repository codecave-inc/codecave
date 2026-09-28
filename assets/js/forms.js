/* ==========================================================
   CodeCave — native forms wired to Convex
   Renders into [data-form] boxes (same slots the old Google Form
   embeds used), validates, submits via window.convex, shows a
   clear success/error state. No iframes, no third party.
   ========================================================== */
(function () {
  "use strict";
  var $ = function (s, c) { return (c || document).querySelector(s); };

  // ---- field helpers ----------------------------------------------------
  function field(f) {
    var id = "f_" + f.name;
    var req = f.required ? " required" : "";
    var label = '<label for="' + id + '">' + f.label + (f.required ? ' <span aria-hidden="true">*</span>' : "") + "</label>";
    var input;
    if (f.type === "select") {
      input = '<select id="' + id + '" name="' + f.name + '"' + req + ">" +
        (f.placeholder ? '<option value="" disabled selected>' + f.placeholder + "</option>" : "") +
        f.options.map(function (o) { return '<option value="' + o[0] + '">' + o[1] + "</option>"; }).join("") +
        "</select>";
    } else if (f.type === "textarea") {
      input = '<textarea id="' + id + '" name="' + f.name + '" rows="' + (f.rows || 4) + '"' + req + (f.placeholder ? ' placeholder="' + f.placeholder + '"' : "") + "></textarea>";
    } else {
      input = '<input id="' + id + '" name="' + f.name + '" type="' + (f.type || "text") + '"' + req + (f.placeholder ? ' placeholder="' + f.placeholder + '"' : "") + (f.min != null ? ' min="' + f.min + '"' : "") + ">";
    }
    return '<div class="fld' + (f.wide ? " fld--wide" : "") + '">' + label + input + '<p class="fld__err" role="alert"></p></div>';
  }

  function readValue(form, f) {
    var el = form.elements[f.name];
    if (!el) return undefined;
    var raw = el.value;
    if (f.type === "number") return raw === "" ? undefined : Number(raw);
    if (raw === "" && !f.required) return undefined;
    return raw;
  }

  // ---- per-form definitions ----------------------------------------------
  // Each maps to one Convex mutation. "project" variants (website/mobile/
  // automation) all post to formSubmissions-style projectBriefs with a
  // fixed projectType so the admin dashboard can filter by service line.
  function projectFields(fixedType) {
    var f = [];
    if (!fixedType) {
      f.push({ name: "projectType", label: "What are you building?", type: "select", required: true,
        placeholder: "Choose one",
        options: [["web_app","A website"],["mobile_app","A mobile app"],["automation","An automation / workflow"],["not_sure","Not sure yet"]] });
    }
    return f.concat([
      { name: "name", label: "Your name", required: true, wide: true },
      { name: "email", label: "Email", type: "email", required: true, wide: true },
      { name: "budgetRange", label: "Rough budget (optional)", placeholder: "e.g. $1,000–$3,000" },
      { name: "timeline", label: "Timeline (optional)", placeholder: "e.g. 4–6 weeks" },
      { name: "details", label: "Tell us about the project", type: "textarea", required: true, wide: true, rows: 5 },
    ]);
  }

  var FORMS = {
    project: { mutation: "forms:submitProjectBrief", fields: projectFields(), submitLabel: "Send project brief" },
    website: { mutation: "forms:submitProjectBrief", fixed: { projectType: "web_app" }, fields: projectFields(true), submitLabel: "Send website brief" },
    mobile: { mutation: "forms:submitProjectBrief", fixed: { projectType: "mobile_app" }, fields: projectFields(true), submitLabel: "Send app brief" },
    automation: { mutation: "forms:submitProjectBrief", fixed: { projectType: "automation" }, fields: projectFields(true), submitLabel: "Send automation brief" },

    aiUtility: {
      mutation: "forms:submitTrainingApplication", fixed: { program: "ai_utility" }, submitLabel: "Apply for AI Utility Training",
      fields: [
        { name: "track", label: "Which track fits you?", type: "select", required: true, placeholder: "Choose one",
          options: [["managers_staff","Managers & Staff"],["operational_teams","Operational Teams"],["higher_institution","Higher Institution Student"],["high_school","High School Learner"]] },
        { name: "fullName", label: "Full name", required: true, wide: true },
        { name: "email", label: "Email", type: "email", required: true, wide: true },
        { name: "organisation", label: "Organisation / school (optional)" },
        { name: "cohortSize", label: "Group size, if applying as a team (optional)", type: "number", min: 1 },
        { name: "notes", label: "Anything else we should know? (optional)", type: "textarea", wide: true },
      ],
    },
    aiDev: {
      mutation: "forms:submitTrainingApplication", fixed: { program: "ai_assisted_dev" }, submitLabel: "Apply for AI-Assisted Dev Training",
      fields: [
        { name: "track", label: "Which track fits you?", type: "select", required: true, placeholder: "Choose one",
          options: [["senior_engineers","Senior Engineers & Teams"],["startups_teams","Startups & Small Teams"],["higher_institution","Higher Institution Student"],["high_school","High School Learner"]] },
        { name: "fullName", label: "Full name", required: true, wide: true },
        { name: "email", label: "Email", type: "email", required: true, wide: true },
        { name: "organisation", label: "Organisation / school (optional)" },
        { name: "cohortSize", label: "Group size, if applying as a team (optional)", type: "number", min: 1 },
        { name: "notes", label: "Anything else we should know? (optional)", type: "textarea", wide: true },
      ],
    },
    hackathon: {
      mutation: "forms:submitHackathonWaitlist", submitLabel: "Join the waitlist",
      fields: [
        { name: "fullName", label: "Full name", required: true, wide: true },
        { name: "email", label: "Email", type: "email", required: true, wide: true },
        { name: "role", label: "Joining as", type: "select", required: true, placeholder: "Choose one",
          options: [["participant","Participant"],["mentor","Mentor"],["sponsor","Sponsor"]] },
        { name: "school", label: "School / organisation (optional)" },
        { name: "notes", label: "Anything else? (optional)", type: "textarea", wide: true },
      ],
    },
    ambassador: {
      mutation: "forms:submitAmbassadorApplication", submitLabel: "Submit application",
      fields: [
        { name: "fullName", label: "Full name", required: true, wide: true },
        { name: "email", label: "Email", type: "email", required: true, wide: true },
        { name: "school", label: "School", required: true },
        { name: "graduationYear", label: "Expected graduation year (optional)", type: "number", min: 2025 },
        { name: "whyYou", label: "Why do you want to be a Campus Ambassador?", type: "textarea", required: true, wide: true },
        { name: "linksOrPortfolio", label: "Portfolio / social links (optional)", wide: true },
      ],
    },
    partner: {
      mutation: "forms:submitPartnershipProposal", submitLabel: "Send proposal",
      fields: [
        { name: "contactName", label: "Your name", required: true },
        { name: "email", label: "Email", type: "email", required: true },
        { name: "organisation", label: "Organisation", required: true, wide: true },
        { name: "partnershipType", label: "What kind of partnership?", type: "select", required: true, wide: true, placeholder: "Choose one",
          options: [["university_hub","University / hub partnership"],["hackathon_sprint","Hackathon / builder sprint"],["tooling_platform","Tooling / platform partner"],["sponsorship_grant","Sponsorship / grant"],["other","Something else"]] },
        { name: "details", label: "Tell us more", type: "textarea", required: true, wide: true },
      ],
    },
    sponsor: {
      mutation: "forms:submitSponsorInquiry", submitLabel: "Become a sponsor",
      fields: [
        { name: "contactName", label: "Your name", required: true },
        { name: "email", label: "Email", type: "email", required: true },
        { name: "sponsorType", label: "Sponsoring as", type: "select", required: true,
          options: [["individual","An individual"],["organisation","An organisation"]] },
        { name: "organisation", label: "Organisation (if applicable)" },
        { name: "initiative", label: "Initiative you'd like to back (optional)", wide: true },
        { name: "details", label: "Anything else? (optional)", type: "textarea", wide: true },
      ],
    },
    productNotify: {
      mutation: "forms:submitProductNotify", submitLabel: "Notify me",
      fields: [
        { name: "email", label: "Email", type: "email", required: true, wide: true },
        { name: "product", label: "Which product?", type: "select", required: true, wide: true,
          options: [["all","All three"],["smart_ai_reminder","Smart AI Reminder"],["ai_powered_lms","AI-Powered LMS"],["muta","Muta"]] },
      ],
    },
    contact: {
      mutation: "forms:submitContactMessage", submitLabel: "Send message",
      fields: [
        { name: "fullName", label: "Your name", required: true },
        { name: "email", label: "Email", type: "email", required: true },
        { name: "subject", label: "Subject (optional)", wide: true },
        { name: "message", label: "Message", type: "textarea", required: true, wide: true, rows: 5 },
      ],
    },
  };

  // ---- render + wire one box ----------------------------------------------
  function build(box) {
    var key = box.dataset.form;
    var def = FORMS[key];
    var body = $(".form-shell__body", box);
    if (!def) { body.innerHTML = '<div class="form-shell__empty"><p>This form isn\u2019t set up yet.</p></div>'; return; }
    if (!(window.CODECAVE && window.CODECAVE.convexUrl)) {
      body.innerHTML = '<div class="form-shell__empty"><span class="icon" data-icon="tool"></span><h3>This form is warming up</h3>' +
        '<p style="max-width:34ch;color:var(--ink-2)">Our backend isn\u2019t connected yet. Email us at <a href="mailto:' + ((window.CODECAVE && window.CODECAVE.email) || "support.codecave@gmail.com") + '" style="font-weight:700;text-decoration:underline">' + ((window.CODECAVE && window.CODECAVE.email) || "support.codecave@gmail.com") + "</a>.</p></div>";
      if (window.CC_ICONS) window.CC_ICONS.swap();
      return;
    }

    var noteEl = box.querySelector("[data-tier-note]") || document.getElementById(key === "project" || def.fixed ? "onboard" : "")?.querySelector("[data-tier-note]");

    body.innerHTML =
      '<form class="cc-form" novalidate>' +
        '<div class="fld-grid">' + def.fields.map(field).join("") + "</div>" +
        '<div class="cc-form__foot">' +
          '<button type="submit" class="btn btn--lime">' + def.submitLabel + "</button>" +
          '<span class="cc-form__status" aria-live="polite"></span>' +
        "</div>" +
      "</form>";

    var form = $("form", body), status = $(".cc-form__status", body), btn = $("button[type=submit]", body);

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var valid = true;
      def.fields.forEach(function (f) {
        var el = form.elements[f.name];
        var errEl = el.closest(".fld").querySelector(".fld__err");
        errEl.textContent = "";
        el.classList.remove("is-invalid");
        if (f.required && !el.value.trim()) { errEl.textContent = "Required."; el.classList.add("is-invalid"); valid = false; }
        else if (f.type === "email" && el.value && !/^\S+@\S+\.\S+$/.test(el.value)) { errEl.textContent = "Enter a valid email."; el.classList.add("is-invalid"); valid = false; }
      });
      if (!valid) { status.textContent = "Please fix the highlighted fields."; status.className = "cc-form__status is-error"; return; }

      var args = {};
      def.fields.forEach(function (f) { var v = readValue(form, f); if (v !== undefined) args[f.name] = v; });
      Object.assign(args, def.fixed || {});
      args.source = location.pathname;
      var tierNoteEl = box.parentElement.querySelector("[data-tier-note]");
      if (tierNoteEl && tierNoteEl.textContent) args.tierEstimate = tierNoteEl.textContent.replace(/^Selected estimate:\s*/, "").split(".")[0];

      btn.disabled = true; btn.textContent = "Sending\u2026"; status.textContent = ""; status.className = "cc-form__status";
      try {
        await window.convex.mutation(def.mutation, args);
        body.innerHTML = '<div class="form-shell__empty"><span class="icon" data-icon="check-circle"></span><h3>Thanks \u2014 that\u2019s in.</h3><p style="color:var(--ink-2)">We\u2019ll be in touch by email.</p></div>';
        if (window.CC_ICONS) window.CC_ICONS.swap();
      } catch (err) {
        btn.disabled = false; btn.textContent = def.submitLabel;
        status.textContent = "Something went wrong \u2014 " + (err && err.message ? err.message : "please try again") + ".";
        status.className = "cc-form__status is-error";
      }
    });
  }

  function boot() { document.querySelectorAll("[data-form]").forEach(build); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  document.addEventListener("cc:ready", function(){}); // no-op hook, kept for symmetry with main.js lifecycle
})();
