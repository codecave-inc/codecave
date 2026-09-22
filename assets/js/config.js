/* ==========================================================
   CodeCave — site config. Edit nav, contact and form links here.
   ========================================================== */
window.CODECAVE = {
  email: "support.codecave@gmail.com",

  /* Google Forms embed links. Paste each form's "Send → Embed HTML" src URL
     (looks like https://docs.google.com/forms/d/e/XXXX/viewform?embedded=true).
     Leave "" to show a friendly "coming soon" placeholder. */
  forms: {
    project:        "",   // Homepage — Tell us your project
    aiUtility:      "",   // AI Utility Training onboarding
    aiDev:          "",   // AI-Assisted Development Training onboarding
    hackathon:      "",   // Hackathon 27 waitlist
    website:        "",   // Website Development onboarding
    mobile:         "",   // Mobile App Development onboarding
    automation:     "",   // Automation Workflows onboarding
    ambassador:     "",   // Campus Ambassador application
    partner:        "",   // Partnership form
    sponsor:        "",   // Sponsor form
    productNotify:  "",   // Product "notify me"
    contact:        ""    // Contact / questions
  },

  nav: [
    { label: "Learning Programs", items: [
      { label: "AI Utility Training", href: "/learning/ai-utility-training" },
      { label: "AI-Assisted Dev Training", href: "/learning/ai-assisted-development-training" },
      { label: "Hackathon 27", href: "/learning/hackathon-27", badge: "Soon" } ] },
    { label: "Software Development Solutions", short: "Software Solutions", items: [
      { label: "Website Development", href: "/solutions/website-development" },
      { label: "Mobile App Development", href: "/solutions/mobile-app-development" },
      { label: "Automation Workflows", href: "/solutions/automation-workflows" } ] },
    { label: "Brand Ambassador Programs", short: "Brand Ambassadors", items: [
      { label: "Campus Ambassadors", href: "/ambassadors/campus-ambassadors" },
      { label: "Partnership Initiatives", href: "/ambassadors/partnership-initiatives" } ] },
    { label: "Products", href: "/products" },
    { label: "Contact Us", href: "/contact" }
  ],
  sponsor: { label: "Sponsor Initiatives", href: "/sponsor-initiatives" },

  footer: [
    { title: "Learning", links: [["AI Utility Training","/learning/ai-utility-training"],["AI Dev Training","/learning/ai-assisted-development-training"],["Hackathon 27","/learning/hackathon-27"]] },
    { title: "Solutions", links: [["Website Development","/solutions/website-development"],["Mobile Apps","/solutions/mobile-app-development"],["Automation Workflows","/solutions/automation-workflows"]] },
    { title: "Community", links: [["Campus Ambassadors","/ambassadors/campus-ambassadors"],["Partnerships","/ambassadors/partnership-initiatives"],["Sponsor Initiatives","/sponsor-initiatives"]] },
    { title: "Company", links: [["Products","/products"],["Contact","/contact"],["Home","/"]] }
  ]
};
