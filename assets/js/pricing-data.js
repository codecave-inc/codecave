/* Pricing checker data — placeholder figures. Edit ranges/currency here only. */
window.CC_PRICING = {
  website: {
    formAnchor: "onboard",
    questions: [
      { name: "scope", title: "Page breadth", hint: "How many distinct pages or views will the site need?", options: [
        { value: "1-5", weight: 1, label: "1–5 pages", sub: "Core launch site" },
        { value: "6-15", weight: 3, label: "6–15 pages", sub: "Product or service matrix" },
        { value: "16+", weight: 5, label: "16+ pages", sub: "Enterprise scale" } ] },
      { name: "type", title: "Type of website", hint: "Pick the closest match.", options: [
        { value: "static", weight: 0, label: "Static / marketing site", sub: "Fast, content-led" },
        { value: "lms", weight: 3, label: "LMS or education portal", sub: "Courses, cohorts, quizzes" },
        { value: "ecommerce", weight: 3, label: "eCommerce", sub: "Products, cart, checkout" },
        { value: "fintech", weight: 4, label: "FinTech", sub: "Payments, compliance-aware" },
        { value: "dbms", weight: 4, label: "Custom DBMS / SaaS", sub: "Multi-tenant data platform" } ] },
      { name: "modules", multi: true, title: "Functional modules", hint: "Select all that apply.", options: [
        { value: "auth", weight: 1, label: "Accounts & roles", sub: "Login, permissions" },
        { value: "payments", weight: 2, label: "Payments", sub: "Subscriptions or one-off" },
        { value: "ai", weight: 2, label: "AI features", sub: "Search, assistants, automation" },
        { value: "admin", weight: 1, label: "Admin dashboard", sub: "Internal control panel" } ] },
      { name: "speed", title: "Delivery pace", options: [
        { value: "standard", weight: 0, label: "Standard pace", sub: "4–6 weeks" },
        { value: "fast", weight: 2, label: "Fast-track", sub: "2–3 weeks, priority" } ] }
    ],
    tiers: [
      { min: 0, name: "Starter", price: "$800 – $1,800", desc: "A focused, fast-loading site that gets you live quickly.", timeline: "2–3 weeks", stack: "Static/CMS build" },
      { min: 4, name: "Growth", price: "$2,000 – $5,500", desc: "A fullstack build with accounts, payments or admin tooling.", timeline: "4–6 weeks", stack: "Fullstack web app" },
      { min: 9, name: "Enterprise", price: "$6,000 – $15,000+", desc: "A multi-tenant platform engineered for scale and compliance.", timeline: "6–10 weeks", stack: "Custom architecture" }
    ]
  },
  mobile: {
    formAnchor: "onboard",
    questions: [
      { name: "platform", title: "Target platforms", hint: "How should the app be built?", options: [
        { value: "cross", weight: 1, label: "Cross-platform", sub: "iOS + Android, one codebase" },
        { value: "dual", weight: 3, label: "Dual native", sub: "Swift + Kotlin" },
        { value: "single", weight: 0, label: "Single platform", sub: "Android or iOS only" } ] },
      { name: "screens", title: "Screen breadth", hint: "How many key user flows?", options: [
        { value: "1-6", weight: 1, label: "1–6 flows", sub: "Auth, feed, profile, settings" },
        { value: "7-15", weight: 3, label: "7–15 flows", sub: "Dashboards, checkout, alerts" },
        { value: "16+", weight: 5, label: "16+ flows", sub: "Multi-role, multi-language" } ] },
      { name: "bridges", multi: true, title: "Native features", hint: "Select all that apply.", options: [
        { value: "offline", weight: 1, label: "Offline sync", sub: "Local database + background sync" },
        { value: "bio", weight: 1, label: "Biometrics", sub: "FaceID / fingerprint" },
        { value: "pay", weight: 2, label: "Payments", sub: "In-app or gateway checkout" },
        { value: "push", weight: 1, label: "Push notifications", sub: "Alerts & deep links" },
        { value: "camera", weight: 1, label: "Camera / scanner", sub: "QR or document scanning" } ] },
      { name: "speed", title: "Delivery pace", options: [
        { value: "standard", weight: 0, label: "Standard pace", sub: "5–8 weeks to stores" },
        { value: "fast", weight: 2, label: "Fast-track", sub: "3–4 weeks, priority" } ] }
    ],
    tiers: [
      { min: 0, name: "Starter", price: "$1,500 – $3,000", desc: "A lean MVP on one platform to test your idea fast.", timeline: "3–4 weeks", stack: "Single platform" },
      { min: 4, name: "Growth", price: "$3,500 – $8,000", desc: "A cross-platform app with real device features and store submission.", timeline: "5–8 weeks", stack: "Cross-platform + native bridges" },
      { min: 10, name: "Enterprise", price: "$9,000 – $20,000+", desc: "A dual-native app for high-performance, multi-role experiences.", timeline: "8–12 weeks", stack: "Dual native architecture" }
    ]
  }
};
