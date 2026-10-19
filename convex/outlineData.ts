// Generated from "CodeCave Academy: AI-Assisted Web Development, Lesson Development Specification v1.0".
// Used by the one-click "Import course outline" in the admin (convex/courseAdmin.ts).

export const WEB_DEV_COURSE = {
  slug: "ai-website-development",
  title: "AI-Assisted Web Development",
  tagline: "Build and launch real web applications by directing AI tools, with no coding experience.",
  description: "Go from a business idea to a deployed web application. You will learn how websites work, how to plan before you build, how to direct AI coding tools, how to check what they produce, and how to test, ship and maintain your project. 7 modules, 21 lessons, about 12 hours.",
  setupGuide: [
  {
    "id": "github",
    "title": "Create a GitHub account",
    "detail": "Sign up at github.com and confirm your email address. You'll store your projects here."
  },
  {
    "id": "git",
    "title": "Install Git or a GitHub client",
    "detail": "Install Git (or GitHub Desktop) so you can save and share your project history."
  },
  {
    "id": "opencode",
    "title": "Install OpenCode and connect a model",
    "detail": "Install OpenCode using the currently supported method and connect an AI model provider or account."
  },
  {
    "id": "supabase",
    "title": "Create a Supabase account",
    "detail": "Sign up and find where your project URL and publishable key live. You'll use them from Module 4."
  },
  {
    "id": "node",
    "title": "Install Node.js",
    "detail": "Install Node.js and the package manager your course starter template needs."
  },
  {
    "id": "browser",
    "title": "Set up your screen for learning",
    "detail": "Use a modern browser and a screen layout that lets you watch the lesson and follow along side by side."
  },
  {
    "id": "folders",
    "title": "Create your project folders",
    "detail": "Make one folder for all CodeCave projects and a separate backup or sync location."
  }
],
  modules: [
  {
    "number": 1,
    "title": "The New Way of Building Software",
    "outcome": "Students leave the module understanding what they are building, how AI participates, and why the development workflow is staged.",
    "lessons": [
      {
        "number": 1,
        "title": "What Is AI-Assisted Web Development?",
        "durationMin": 34,
        "purpose": "Orient complete beginners, reduce intimidation, and establish the course worldview: AI accelerates development but does not replace product thinking, verification, or responsibility.",
        "tools": [
          "OpenCode",
          "browser",
          "course starter repository"
        ],
        "studentOutput": "Create a one-page landing page for a fictional or real business idea and make two visual changes through AI follow-up instructions.",
        "objectives": [
          "Define website, web application, AI-assisted development, no-code, low-code, and AI coding agent in simple language.",
          "Identify at least five things an AI tool can help with during development.",
          "Explain why a human still needs to specify requirements and verify the result.",
          "Build and preview a tiny webpage using natural-language instructions."
        ],
        "keyConcepts": [
          "Website vs web application",
          "No-code/low-code vs AI-assisted development",
          "AI as a development partner",
          "Human-in-the-loop workflow",
          "Preview vs production"
        ],
        "pitfalls": [
          "Treating AI as a search engine or chatbot only.",
          "Accepting generated output without checking the preview.",
          "Trying to build the full capstone immediately."
        ],
        "recordingFlow": [
          "0-3 min: hook - show a finished app and ask what would traditionally be required to build it.",
          "3-10 min: explain the development landscape in plain language.",
          "10-25 min: live demo - start with a plain-language request, inspect the result, make two iterative changes.",
          "25-31 min: guided learner task.",
          "31-34 min: recap and next-step challenge."
        ],
        "prompt": "\"You are my development partner. I am a complete beginner. Help me build a simple, responsive landing page for [idea]. First explain what you are going to create in plain language. Then propose the files you expect to change before you make the changes.\"",
        "task": "Create a one-page landing page for a fictional or real business idea and make two visual changes through AI follow-up instructions.",
        "evidence": "3-question knowledge check + screenshot of working page.",
        "assets": "Beginner glossary; first-prompt worksheet; development workflow one-page reference."
      },
      {
        "number": 2,
        "title": "How a Web Application Works",
        "durationMin": 34,
        "purpose": "Give beginners a mental model of the application stack so later AI requests make architectural sense.",
        "tools": [
          "OpenCode",
          "browser",
          "simple reference app diagram"
        ],
        "studentOutput": "Choose one common app feature (login, adding a product, booking a service) and draw its flow with AI assistance.",
        "objectives": [
          "Describe the role of the frontend, backend, database, authentication, API, and hosting layer.",
          "Trace a simple user action from browser to database and back.",
          "Distinguish authentication from authorization.",
          "Use AI to explain an unfamiliar application architecture without generating new code."
        ],
        "keyConcepts": [
          "Client/server basics",
          "Frontend and UI",
          "Database and persistence",
          "Authentication vs authorization",
          "APIs and HTTP",
          "Hosting/deployment"
        ],
        "pitfalls": [
          "Confusing a database with the backend.",
          "Thinking an API is the same thing as a database.",
          "Treating authentication and authorization as synonyms."
        ],
        "recordingFlow": [
          "0-5 min: start with a relatable action such as logging into a shopping site.",
          "5-17 min: explain the application layers using a simple diagram.",
          "17-25 min: ask AI to trace a request through the stack.",
          "25-31 min: learner architecture mapping exercise.",
          "31-34 min: recap."
        ],
        "prompt": "\"Explain what happens from the moment a user clicks 'Save profile' in a web app until the updated data appears in the browser. Assume I know nothing about software development. Name the frontend, backend/service, database, authentication, and response steps.\"",
        "task": "Choose one common app feature (login, adding a product, booking a service) and draw its flow with AI assistance.",
        "evidence": "Submit a simple six-part architecture diagram with one-sentence descriptions.",
        "assets": "Application anatomy diagram; architecture vocabulary sheet."
      },
      {
        "number": 3,
        "title": "The AI Developer Workflow",
        "durationMin": 34,
        "purpose": "Introduce the repeatable end-to-end workflow that every later lesson uses.",
        "tools": [
          "OpenCode",
          "GitHub repository"
        ],
        "studentOutput": "Take one feature from the learner idea and produce a five-step implementation plan plus acceptance criteria.",
        "objectives": [
          "Sequence the stages of an AI-assisted development workflow.",
          "Explain why planning and context reduce rework.",
          "Use a structured request instead of a one-shot mega-prompt.",
          "Create a simple feature plan before implementation."
        ],
        "keyConcepts": [
          "Plan before build",
          "Task decomposition",
          "Context",
          "Constraints",
          "Acceptance criteria",
          "Verification"
        ],
        "pitfalls": [
          "Skipping acceptance criteria.",
          "Mixing unrelated feature requests in one task.",
          "Asking for implementation before understanding scope."
        ],
        "recordingFlow": [
          "0-6 min: compare one giant prompt with a staged workflow.",
          "6-15 min: teach the core workflow.",
          "15-26 min: live example from idea to small feature plan.",
          "26-31 min: learners create a plan for one feature.",
          "31-34 min: recap."
        ],
        "prompt": "\"Act as a product-minded development partner. Do not write code yet. For this feature: [feature], produce: user goal, assumptions, acceptance criteria, affected areas, likely data needed, implementation steps, and a verification checklist. Wait for my approval before proposing code.\"",
        "task": "Take one feature from the learner idea and produce a five-step implementation plan plus acceptance criteria.",
        "evidence": "Plan reviewed against a checklist: clear goal, scope, success criteria, data needs, test method.",
        "assets": "AI Development Workflow card; feature-planning template."
      }
    ]
  },
  {
    "number": 2,
    "title": "Organize Before You Build",
    "outcome": "Students leave with a defined personal product, user flows, technical specification, and persistent project context.",
    "lessons": [
      {
        "number": 4,
        "title": "From Business Idea to Product Idea",
        "durationMin": 34,
        "purpose": "Help learners transform a vague business idea into a buildable product concept.",
        "tools": [
          "OpenCode",
          "learner project notebook"
        ],
        "studentOutput": "Create a one-page product brief for the learner's own idea.",
        "objectives": [
          "Define a target user and problem statement.",
          "Distinguish must-have features from nice-to-have ideas.",
          "Create a first version of a product scope using AI.",
          "Recognize when an idea is too broad for a first release."
        ],
        "keyConcepts": [
          "Problem statement",
          "Target user",
          "Value proposition",
          "MVP",
          "Feature prioritization"
        ],
        "pitfalls": [
          "Trying to serve everyone.",
          "Listing features without linking them to user problems.",
          "Calling a long feature list an MVP."
        ],
        "recordingFlow": [
          "0-5 min: show a vague idea vs a buildable product idea.",
          "5-14 min: explain user/problem/value/MVP.",
          "14-25 min: live AI workshop using a sample startup idea.",
          "25-31 min: learners work on their own idea.",
          "31-34 min: recap."
        ],
        "prompt": "\"Act as a product discovery assistant. My idea is: [idea]. Help me define the target user, problem, proposed solution, primary user action, core value, and a realistic MVP. Identify features that should be postponed and explain why. Do not write code.\"",
        "task": "Create a one-page product brief for the learner's own idea.",
        "evidence": "Product brief submission.",
        "assets": "Product brief canvas; MVP feature-priority matrix."
      },
      {
        "number": 5,
        "title": "Product Requirements and User Flows",
        "durationMin": 34,
        "purpose": "Teach students to communicate behavior clearly before asking AI to implement it.",
        "tools": [
          "OpenCode",
          "diagram tool or paper",
          "project notes"
        ],
        "studentOutput": "Create a user flow for signup and for one core business action.",
        "objectives": [
          "Write simple functional requirements.",
          "Create user stories and user flows.",
          "Identify edge cases and error states.",
          "Convert product requirements into a sequence AI can implement."
        ],
        "keyConcepts": [
          "User story",
          "Acceptance criteria",
          "Happy path",
          "Edge case",
          "Empty/error/loading states"
        ],
        "pitfalls": [
          "Writing requirements as vague wishes.",
          "Ignoring errors.",
          "Defining UI before defining user behavior."
        ],
        "recordingFlow": [
          "0-7 min: requirements vs wishes.",
          "7-16 min: user stories and acceptance criteria.",
          "16-25 min: live user-flow design.",
          "25-31 min: learner creates two flows.",
          "31-34 min: recap."
        ],
        "prompt": "\"For this feature: [feature], write 3-5 user stories and acceptance criteria. Then describe the happy path, three edge cases, and the loading, empty, and error states the UI should handle. Keep the language beginner-friendly.\"",
        "task": "Create a user flow for signup and for one core business action.",
        "evidence": "User-flow diagram + acceptance criteria.",
        "assets": "Requirements template; user-flow worksheet; acceptance-criteria checklist."
      },
      {
        "number": 6,
        "title": "Technical Specification and Project Context",
        "durationMin": 34,
        "purpose": "Introduce structured specifications and persistent project context so AI becomes more consistent across sessions.",
        "tools": [
          "OpenCode",
          "GitHub"
        ],
        "studentOutput": "Create or refine an AGENTS.md file for the learner's project and commit it to Git.",
        "objectives": [
          "Assemble a basic technical specification from the product brief.",
          "Explain the purpose of project instructions such as AGENTS.md.",
          "Create durable project guidance covering stack, structure, conventions, and verification.",
          "Understand that project context should be maintained as the product evolves."
        ],
        "keyConcepts": [
          "Technical specification",
          "Architecture notes",
          "Project instructions",
          "AGENTS.md",
          "Context drift"
        ],
        "pitfalls": [
          "Putting secrets in project instructions.",
          "Creating vague rules that do not change behavior.",
          "Treating context files as one-time paperwork."
        ],
        "recordingFlow": [
          "0-6 min: demonstrate context drift with repeated sessions.",
          "6-16 min: explain specification components and persistent instructions.",
          "16-25 min: run OpenCode project initialization and inspect the generated/updated project guidance.",
          "25-31 min: edit the instructions for the course project.",
          "31-34 min: commit the context files and recap."
        ],
        "prompt": "\"Review this project and help me create or improve the project instructions. The file should state the app purpose, stack, key directories, coding conventions, database conventions, commands for verification, and rules that should be followed before making broad changes. Do not change source code.\"",
        "task": "Create or refine an AGENTS.md file for the learner's project and commit it to Git.",
        "evidence": "Instructor checklist on clarity, scope, verification instructions, and consistency.",
        "assets": "AGENTS.md starter template; technical specification template; architecture decision log template."
      }
    ]
  },
  {
    "number": 3,
    "title": "Design and Build the Frontend",
    "outcome": "Students leave with a professional-looking public website and dashboard for their own product.",
    "lessons": [
      {
        "number": 7,
        "title": "UI/UX for AI-Assisted Developers",
        "durationMin": 34,
        "purpose": "Give beginners enough UI/UX literacy to make useful design decisions and communicate them to AI.",
        "tools": [
          "OpenCode",
          "browser",
          "optional Figma"
        ],
        "studentOutput": "Annotate or sketch the dashboard of the learner's app, then use AI to convert the sketch into a structured UI brief.",
        "objectives": [
          "Explain hierarchy, spacing, typography, responsive layout, and component reuse.",
          "Describe a desired interface precisely enough for AI to implement.",
          "Recognize common beginner UI problems.",
          "Use reference images or sketches as design context without surrendering judgment to AI."
        ],
        "keyConcepts": [
          "Visual hierarchy",
          "Spacing",
          "Typography",
          "Color roles",
          "Components",
          "Responsive design",
          "Accessibility basics"
        ],
        "pitfalls": [
          "Using too many visual styles.",
          "Ignoring mobile behavior.",
          "Treating accessibility as an optional polish step."
        ],
        "recordingFlow": [
          "0-6 min: before/after interface comparison.",
          "6-16 min: explain the design fundamentals.",
          "16-25 min: turn a rough interface description into an AI build brief.",
          "25-31 min: learner critiques an AI-generated screen.",
          "31-34 min: recap."
        ],
        "prompt": "\"Create an implementation brief for a responsive dashboard UI based on these requirements: [requirements]. Describe page hierarchy, major components, content priority, responsive behavior, empty/loading/error states, and accessibility considerations. Do not write code yet.\"",
        "task": "Annotate or sketch the dashboard of the learner's app, then use AI to convert the sketch into a structured UI brief.",
        "evidence": "UI brief + five-point design critique.",
        "assets": "UI critique checklist; dashboard wireframe template."
      },
      {
        "number": 8,
        "title": "Build Your Business Website with AI",
        "durationMin": 34,
        "purpose": "Build the public-facing website as the first substantial product surface.",
        "tools": [
          "OpenCode",
          "React/TypeScript",
          "Tailwind CSS",
          "browser"
        ],
        "studentOutput": "Build the public website for the learner's own idea using staged changes.",
        "objectives": [
          "Create a responsive multi-section business website.",
          "Use iterative prompts to implement sections one at a time.",
          "Review AI output for consistency and responsive behavior.",
          "Apply the project specification and design rules while building."
        ],
        "keyConcepts": [
          "Components",
          "Reusable sections",
          "Navigation",
          "Responsive behavior",
          "Content-driven UI"
        ],
        "pitfalls": [
          "Letting AI change unrelated files.",
          "Building all pages in one giant task.",
          "Failing to compare the implementation with the original brief."
        ],
        "recordingFlow": [
          "0-4 min: define the build target.",
          "4-10 min: inspect project context and request a plan.",
          "10-25 min: live build - page shell, hero, services, about, contact, footer.",
          "25-31 min: responsive review + two iterative fixes.",
          "31-34 min: recap."
        ],
        "prompt": "\"Using the approved project specification and project instructions, implement only the public website shell and primary sections. Before editing, list the files you expect to change and explain the component structure. After implementation, run the available checks and tell me what you verified.\"",
        "task": "Build the public website for the learner's own idea using staged changes.",
        "evidence": "Responsive website checkpoint.",
        "assets": "Website content checklist; staged-build prompt pack."
      },
      {
        "number": 9,
        "title": "Build Your Dashboard",
        "durationMin": 34,
        "purpose": "Move from marketing UI to application UI, emphasizing reusable components and meaningful application states.",
        "tools": [
          "OpenCode",
          "React/TypeScript",
          "Tailwind CSS"
        ],
        "studentOutput": "Build dashboard screens relevant to the chosen product: overview, one primary workflow, and profile/settings.",
        "objectives": [
          "Build a dashboard layout with navigation and data-oriented components.",
          "Explain the role of reusable components.",
          "Add loading, empty, error, and success states.",
          "Use AI to refactor repeated UI patterns."
        ],
        "keyConcepts": [
          "Dashboard patterns",
          "Reusable components",
          "State-driven UI",
          "Tables/cards/forms"
        ],
        "pitfalls": [
          "Hard-coding data everywhere.",
          "Skipping empty/error states.",
          "Creating one huge component that is hard to modify."
        ],
        "recordingFlow": [
          "0-5 min: compare a website homepage with an application dashboard.",
          "5-14 min: design dashboard anatomy.",
          "14-26 min: build layout and representative data views.",
          "26-31 min: add application states and refactor repeated UI.",
          "31-34 min: recap."
        ],
        "prompt": "\"Build the dashboard UI from the approved design brief. Separate reusable components from page-specific content. Use realistic placeholder data only. Include loading, empty, error, and success states. Do not connect the database yet.\"",
        "task": "Build dashboard screens relevant to the chosen product: overview, one primary workflow, and profile/settings.",
        "evidence": "Dashboard checkpoint with state coverage.",
        "assets": "Dashboard state checklist; component decomposition worksheet."
      }
    ]
  },
  {
    "number": 4,
    "title": "Give Your Application a Brain",
    "outcome": "Students leave with real interaction logic, authentication, database-backed CRUD, and a clearer ability to read generated code.",
    "lessons": [
      {
        "number": 10,
        "title": "Application Logic and Forms",
        "durationMin": 34,
        "purpose": "Introduce interaction logic and form behavior while beginning deliberate code reading.",
        "tools": [
          "OpenCode",
          "React/TypeScript"
        ],
        "studentOutput": "Create one form that captures meaningful business data and validate required fields.",
        "objectives": [
          "Explain variables, functions, event handlers, conditions, and basic component state in context.",
          "Create a form with validation and user feedback.",
          "Ask AI to explain a generated function before modifying it.",
          "Trace a user action through the frontend code."
        ],
        "keyConcepts": [
          "Variables",
          "Functions",
          "Events",
          "State",
          "Conditional rendering",
          "Validation"
        ],
        "pitfalls": [
          "Blindly accepting validation logic.",
          "Confusing UI state with database state.",
          "Editing code before understanding it."
        ],
        "recordingFlow": [
          "0-7 min: explain the code concepts using the learner's existing UI.",
          "7-15 min: code-reading demonstration.",
          "15-26 min: build a real form for the capstone.",
          "26-31 min: add validation and error feedback.",
          "31-34 min: recap."
        ],
        "prompt": "\"Explain this function to me as a beginner. Tell me what inputs it receives, what it changes, what it returns, and what could go wrong. Do not rewrite it until I ask.\"",
        "task": "Create one form that captures meaningful business data and validate required fields.",
        "evidence": "Form works for valid input, rejects invalid input, and provides clear user feedback.",
        "assets": "Code-reading worksheet; form-validation checklist."
      },
      {
        "number": 11,
        "title": "Authentication and User Accounts",
        "durationMin": 34,
        "purpose": "Implement real user accounts and introduce the difference between identity and permissions.",
        "tools": [
          "OpenCode",
          "Supabase Auth",
          "browser"
        ],
        "studentOutput": "Create an account, sign in, access the dashboard, sign out, and verify that signed-out users cannot access protected content.",
        "objectives": [
          "Explain authentication and authorization in simple terms.",
          "Implement signup, login, logout, and session-aware UI using Supabase Auth.",
          "Protect application areas that require a signed-in user.",
          "Identify where authorization rules belong."
        ],
        "keyConcepts": [
          "Auth",
          "Session",
          "JWT concept",
          "Protected route/page",
          "Authorization"
        ],
        "pitfalls": [
          "Exposing secret keys.",
          "Assuming login automatically means data is secure.",
          "Testing only the happy path."
        ],
        "recordingFlow": [
          "0-6 min: explain authentication vs authorization.",
          "6-13 min: configure Supabase Auth for the course project.",
          "13-25 min: build signup/login/logout flow.",
          "25-31 min: protect dashboard access and test failure cases.",
          "31-34 min: recap."
        ],
        "prompt": "\"Implement authentication for this app using Supabase Auth. Before changing code, inspect the existing app and list the files and flows you will touch. Include signup, login, logout, session handling, protected application areas, and clear error states. Do not expose or hard-code secrets.\"",
        "task": "Create an account, sign in, access the dashboard, sign out, and verify that signed-out users cannot access protected content.",
        "evidence": "Auth checkpoint + test checklist.",
        "assets": "Auth flow diagram; auth test matrix; safe-key handling checklist."
      },
      {
        "number": 12,
        "title": "Database-Backed Applications",
        "durationMin": 34,
        "purpose": "Connect the UI to Supabase Postgres and teach CRUD plus basic relational thinking.",
        "tools": [
          "OpenCode",
          "Supabase Database",
          "SQL editor",
          "browser"
        ],
        "studentOutput": "Create the primary business data table(s), connect the dashboard, and implement one complete CRUD workflow.",
        "objectives": [
          "Explain tables, rows, columns, primary keys, and relationships.",
          "Create a simple database schema from requirements.",
          "Implement create/read/update/delete functionality.",
          "Connect the UI to live Supabase data and verify behavior."
        ],
        "keyConcepts": [
          "Relational data",
          "Schema",
          "CRUD",
          "Queries",
          "Foreign keys",
          "RLS introduction"
        ],
        "pitfalls": [
          "Storing everything in one table.",
          "Skipping ownership/access thinking.",
          "Testing only through the Supabase dashboard instead of through the app."
        ],
        "recordingFlow": [
          "0-7 min: database concepts using a simple metaphor.",
          "7-15 min: derive a schema from the learner's requirements.",
          "15-26 min: create tables and connect the app.",
          "26-31 min: implement CRUD and run basic access checks.",
          "31-34 min: recap."
        ],
        "prompt": "\"Based on this product specification, propose the minimum relational database schema. For each table, list columns, types, primary key, relationships, and which user owns the data. Explain why each table exists. Do not run SQL yet.\"",
        "task": "Create the primary business data table(s), connect the dashboard, and implement one complete CRUD workflow.",
        "evidence": "Database + CRUD checkpoint; instructor verifies schema matches product requirements.",
        "assets": "Database design worksheet; CRUD verification checklist."
      }
    ]
  },
  {
    "number": 5,
    "title": "APIs, Integrations and AI Agents",
    "outcome": "Students leave understanding APIs, secure server-side logic, and the basics of AI coding agents.",
    "lessons": [
      {
        "number": 13,
        "title": "Understanding APIs",
        "durationMin": 34,
        "purpose": "Demystify APIs and show learners how applications exchange information with external systems.",
        "tools": [
          "OpenCode",
          "browser",
          "Supabase project",
          "selected public API"
        ],
        "studentOutput": "Add an external API relevant to the learner's product, such as currency, weather, geolocation, messaging, AI, or public data.",
        "objectives": [
          "Explain endpoint, request, response, JSON, and HTTP method in plain language.",
          "Use AI to read API documentation and create a small integration plan.",
          "Connect one safe external API to the project.",
          "Recognize why API keys may need server-side protection."
        ],
        "keyConcepts": [
          "Endpoint",
          "GET/POST",
          "JSON",
          "Headers",
          "API key",
          "Client vs server"
        ],
        "pitfalls": [
          "Putting secret keys in frontend code.",
          "Skipping API documentation.",
          "Treating third-party data as guaranteed."
        ],
        "recordingFlow": [
          "0-6 min: explain an API as a service boundary.",
          "6-14 min: inspect an API docs page and identify endpoint/request/response.",
          "14-25 min: build a small integration.",
          "25-31 min: troubleshoot a deliberate API failure.",
          "31-34 min: recap."
        ],
        "prompt": "\"Read this API documentation: [URL or pasted excerpt]. Summarize authentication, endpoint(s), request format, response shape, rate limits, and security considerations. Then propose the smallest useful integration for my app. Do not write code yet.\"",
        "task": "Add an external API relevant to the learner's product, such as currency, weather, geolocation, messaging, AI, or public data.",
        "evidence": "Working API integration + evidence that the learner can explain request/response flow.",
        "assets": "API vocabulary card; API integration checklist; API documentation reading worksheet."
      },
      {
        "number": 14,
        "title": "Server-Side Logic with Supabase",
        "durationMin": 34,
        "purpose": "Introduce server-side logic for authenticated calls, secrets, webhooks, and integrations without requiring students to become backend specialists.",
        "tools": [
          "OpenCode",
          "Supabase Edge Functions",
          "Supabase Auth"
        ],
        "studentOutput": "Build a small authenticated Edge Function or equivalent server-side operation for the capstone.",
        "objectives": [
          "Explain why some operations belong on the server.",
          "Create or plan a Supabase Edge Function for a scoped task.",
          "Use secrets safely for a third-party integration.",
          "Understand how authenticated requests and Row Level Security can work together."
        ],
        "keyConcepts": [
          "Server-side logic",
          "Edge Functions",
          "Secrets",
          "Webhooks",
          "Authentication context",
          "RLS interaction"
        ],
        "pitfalls": [
          "Putting secrets in client code.",
          "Assuming a publishable key is sufficient protection.",
          "Skipping authorization checks."
        ],
        "recordingFlow": [
          "0-7 min: frontend vs server-side responsibility.",
          "7-15 min: walk through Edge Function anatomy.",
          "15-26 min: create a simple authenticated function.",
          "26-31 min: verify unauthorized and authorized requests.",
          "31-34 min: recap."
        ],
        "prompt": "\"Design a secure server-side function for [task]. Explain what should stay client-side, what should happen server-side, what secrets are required, how the caller is authenticated, and how authorization should be enforced. Only after the plan is approved, implement the function.\"",
        "task": "Build a small authenticated Edge Function or equivalent server-side operation for the capstone.",
        "evidence": "Function works for valid auth and fails safely for unauthorized requests.",
        "assets": "Server-side function template; secrets checklist; auth-to-function flow diagram."
      },
      {
        "number": 15,
        "title": "AI Agents: Delegating Development Tasks",
        "durationMin": 34,
        "purpose": "Shift students from simple prompt-response interactions to scoped agentic tasks across a real repository.",
        "tools": [
          "OpenCode primary; optional comparison to Cursor/Claude Code"
        ],
        "studentOutput": "Delegate a bounded feature that touches no more than 4-6 files, then review the diff before accepting it.",
        "objectives": [
          "Explain what makes an AI coding agent different from chat autocomplete.",
          "Delegate a scoped multi-file task to an agent.",
          "Review the agent plan before allowing broad changes.",
          "Understand permissions, boundaries, and rollback strategies."
        ],
        "keyConcepts": [
          "Agentic workflow",
          "Tool use",
          "Task scope",
          "Permissions",
          "Review before apply",
          "Subagents"
        ],
        "pitfalls": [
          "Giving agents ambiguous tasks.",
          "Allowing destructive broad changes without a checkpoint.",
          "Skipping the diff review."
        ],
        "recordingFlow": [
          "0-7 min: chat assistant vs coding agent.",
          "7-15 min: show an agent exploring a repository.",
          "15-25 min: delegate a scoped feature.",
          "25-31 min: review diff, run checks, and make a follow-up correction.",
          "31-34 min: recap."
        ],
        "prompt": "\"Inspect the repository and implement only this feature: [feature]. First produce a plan and list the files you intend to change. Do not edit yet. After implementation, run the relevant checks and summarize changed files, risks, and verification results.\"",
        "task": "Delegate a bounded feature that touches no more than 4-6 files, then review the diff before accepting it.",
        "evidence": "Agent task journal: goal, plan, changes, checks, review decision.",
        "assets": "Agent task brief; permission/scope checklist; review-before-merge checklist."
      }
    ]
  },
  {
    "number": 6,
    "title": "Control the AI",
    "outcome": "Students leave able to inspect code, manage context, iterate prompts, and debug methodically.",
    "lessons": [
      {
        "number": 16,
        "title": "How to Read AI-Generated Code",
        "durationMin": 34,
        "purpose": "Give beginners a survival-level code literacy layer so they can reason about what AI produces.",
        "tools": [
          "OpenCode",
          "editor",
          "browser"
        ],
        "studentOutput": "Choose one important function in the capstone and write a plain-language explanation of its inputs, outputs, side effects, and failure points.",
        "objectives": [
          "Identify variables, functions, components, props, conditions, imports, API calls, and database calls in context.",
          "Explain a short AI-generated code fragment in plain language.",
          "Spot obvious hard-coded values, duplicated logic, and suspicious behavior.",
          "Use AI as a tutor without asking it to make changes."
        ],
        "keyConcepts": [
          "JavaScript/TypeScript basics",
          "React components/props",
          "Imports/exports",
          "Async operations",
          "API/database calls"
        ],
        "pitfalls": [
          "Trying to memorize every syntax rule.",
          "Assuming readable code is automatically secure.",
          "Letting AI explain without verifying against actual behavior."
        ],
        "recordingFlow": [
          "0-8 min: explain the minimum code literacy toolkit.",
          "8-16 min: annotate real project code.",
          "16-25 min: AI-assisted code reading exercise.",
          "25-31 min: learners explain a function and identify one risk.",
          "31-34 min: recap."
        ],
        "prompt": "\"Act as a code teacher, not a code editor. Explain the selected code line by line, then summarize the main data flow and tell me what I should read next to understand the feature. Do not change anything.\"",
        "task": "Choose one important function in the capstone and write a plain-language explanation of its inputs, outputs, side effects, and failure points.",
        "evidence": "Code comprehension worksheet.",
        "assets": "Beginner code map; JavaScript/TypeScript survival glossary."
      },
      {
        "number": 17,
        "title": "Iterative Prompting and Context Management",
        "durationMin": 34,
        "purpose": "Teach learners how to manage longer development tasks without losing control of the AI or polluting the project context.",
        "tools": [
          "OpenCode",
          "project instructions",
          "GitHub"
        ],
        "studentOutput": "Rewrite a vague feature request into a four-step implementation sequence with checkpoints.",
        "objectives": [
          "Break a large feature into staged prompts.",
          "Use project context, acceptance criteria, constraints, and verification steps together.",
          "Recognize context drift and over-broad requests.",
          "Use a plan → implement → review → refine loop."
        ],
        "keyConcepts": [
          "Prompt decomposition",
          "Context management",
          "Constraints",
          "Acceptance criteria",
          "Iteration",
          "Context drift"
        ],
        "pitfalls": [
          "Repeatedly pasting huge context instead of maintaining durable project context.",
          "Combining planning and implementation in every prompt.",
          "Changing goals mid-task without restating constraints."
        ],
        "recordingFlow": [
          "0-6 min: show failure caused by overloaded context.",
          "6-15 min: teach the structured prompt pattern.",
          "15-25 min: turn one big feature into four staged prompts.",
          "25-31 min: execute one stage and review.",
          "31-34 min: recap."
        ],
        "prompt": "\"Work only on stage 1 of this feature: [stage]. Use the project instructions and existing code as the source of truth. State assumptions before editing. Keep the change narrowly scoped. After implementation, list how the acceptance criteria were verified and what remains for the next stage.\"",
        "task": "Rewrite a vague feature request into a four-step implementation sequence with checkpoints.",
        "evidence": "Prompt sequence quality reviewed with a rubric.",
        "assets": "Structured prompting framework; context hygiene checklist; iterative development log."
      },
      {
        "number": 18,
        "title": "Debugging with AI",
        "durationMin": 34,
        "purpose": "Teach a repeatable debugging method that uses AI for diagnosis and verification rather than magical repair.",
        "tools": [
          "OpenCode",
          "browser devtools",
          "GitHub history"
        ],
        "studentOutput": "Debug an intentionally broken capstone feature and document the diagnosis/fix/verification cycle.",
        "objectives": [
          "Distinguish symptoms from likely root causes.",
          "Capture useful bug context: expected behavior, actual behavior, reproduction steps, errors, and recent changes.",
          "Use AI to investigate before changing code.",
          "Verify that a fix resolves the issue without breaking adjacent behavior."
        ],
        "keyConcepts": [
          "Bug report",
          "Reproduction",
          "Root cause",
          "Logs/errors",
          "Regression",
          "Verification"
        ],
        "pitfalls": [
          "Asking AI to \"fix everything\".",
          "Changing multiple unrelated areas at once.",
          "Failing to reproduce before editing."
        ],
        "recordingFlow": [
          "0-6 min: introduce a broken feature.",
          "6-14 min: model a useful bug report.",
          "14-24 min: AI-assisted diagnosis and controlled fix.",
          "24-31 min: regression test and Git checkpoint.",
          "31-34 min: recap."
        ],
        "prompt": "\"I have a bug. Expected behavior: [expected]. Actual behavior: [actual]. Steps to reproduce: [steps]. Error/output: [error]. Recent changes: [changes]. First investigate and identify likely root causes. Do not edit code until you explain the diagnosis and the smallest safe fix.\"",
        "task": "Debug an intentionally broken capstone feature and document the diagnosis/fix/verification cycle.",
        "evidence": "Bug report + verified fix + regression test.",
        "assets": "Bug report template; debugging loop card; regression checklist."
      }
    ]
  },
  {
    "number": 7,
    "title": "Test, Ship and Maintain",
    "outcome": "Students leave with a tested, secured, versioned, documented, deployed application and a maintenance plan.",
    "lessons": [
      {
        "number": 19,
        "title": "GitHub, Version Control and Safe AI Development",
        "durationMin": 34,
        "purpose": "Make version control an essential safety skill for AI-assisted development.",
        "tools": [
          "Git",
          "GitHub",
          "OpenCode"
        ],
        "studentOutput": "Create three meaningful commits across the capstone and practice reverting one deliberately introduced mistake.",
        "objectives": [
          "Explain repository, commit, branch, diff, push, and pull.",
          "Create recoverable checkpoints during AI-assisted work.",
          "Review a diff before committing.",
          "Use Git history as a debugging and recovery tool."
        ],
        "keyConcepts": [
          "Git",
          "GitHub",
          "Commit",
          "Branch",
          "Diff",
          "Revert",
          "Recovery"
        ],
        "pitfalls": [
          "Committing huge unrelated batches.",
          "Committing secrets.",
          "Assuming GitHub is a backup without understanding local history."
        ],
        "recordingFlow": [
          "0-5 min: show an AI change gone wrong and recover from Git.",
          "5-14 min: teach Git concepts visually.",
          "14-25 min: learner creates repo/commit workflow.",
          "25-31 min: review a diff and revert a bad change.",
          "31-34 min: recap."
        ],
        "prompt": "\"Before making the next change, tell me the current Git status and what files have changed. After the feature is complete, summarize the diff, identify risky changes, run the relevant checks, and propose a commit message. Do not commit until I approve.\"",
        "task": "Create three meaningful commits across the capstone and practice reverting one deliberately introduced mistake.",
        "evidence": "Git workflow checkpoint.",
        "assets": "Git cheat sheet; commit-message guide; AI + Git safety checklist."
      },
      {
        "number": 20,
        "title": "Testing, Security and Production Readiness",
        "durationMin": 34,
        "purpose": "Teach students to challenge their own application before launch, with special emphasis on data access and secret handling.",
        "tools": [
          "OpenCode",
          "browser devtools",
          "Supabase",
          "GitHub"
        ],
        "studentOutput": "Run a 20-point launch checklist against the learner's app and fix at least three high-value issues.",
        "objectives": [
          "Create a basic test matrix from user stories.",
          "Test forms, auth, CRUD, APIs, and responsive behavior.",
          "Explain why Row Level Security matters for exposed data.",
          "Perform a beginner-level production readiness review."
        ],
        "keyConcepts": [
          "Manual testing",
          "Test cases",
          "Regression",
          "RLS",
          "Environment variables",
          "Secret management",
          "Least privilege"
        ],
        "pitfalls": [
          "Relying on frontend hiding for authorization.",
          "Leaving secrets in source code.",
          "Testing only the creator account instead of different user states."
        ],
        "recordingFlow": [
          "0-6 min: demonstrate a visually correct app with a broken security rule.",
          "6-14 min: create a test matrix from acceptance criteria.",
          "14-25 min: run functional and responsive tests.",
          "25-31 min: security review: secrets, RLS, auth boundaries, exposed data.",
          "31-34 min: recap."
        ],
        "prompt": "\"Audit this application for beginner-level production readiness. Review authentication/authorization, database access rules, secret handling, input validation, error handling, dependency risks, responsive behavior, and obvious privacy issues. Do not change code. Return findings grouped by severity with file/table references where possible.\"",
        "task": "Run a 20-point launch checklist against the learner's app and fix at least three high-value issues.",
        "evidence": "Production-readiness checklist with evidence.",
        "assets": "20-point launch checklist; RLS review worksheet; security prompt pack."
      },
      {
        "number": 21,
        "title": "Deploy, Launch and Maintain Your Application",
        "durationMin": 40,
        "purpose": "Complete the transformation from local project to publicly accessible product and teach the maintenance loop that follows launch.",
        "tools": [
          "GitHub",
          "Vercel or approved host",
          "Supabase",
          "OpenCode"
        ],
        "studentOutput": "Deploy the capstone, run the post-deployment smoke test, document the live URL and architecture, and record a 2-3 minute demo walkthrough.",
        "objectives": [
          "Prepare an application for production deployment.",
          "Configure environment variables safely.",
          "Deploy to a beginner-friendly host and verify the public URL.",
          "Create a lightweight maintenance plan for bugs, feedback, updates, and project context.",
          "Present the capstone and explain the AI-assisted workflow used to build it."
        ],
        "keyConcepts": [
          "Development vs production",
          "Deployment",
          "Environment variables",
          "Custom domain concept",
          "Post-deployment checks",
          "Maintenance",
          "User feedback loop"
        ],
        "pitfalls": [
          "Deploying without testing environment variables.",
          "Assuming a successful build means a successful user flow.",
          "Failing to document how the application is maintained."
        ],
        "recordingFlow": [
          "0-6 min: define \"live\" and production readiness.",
          "6-15 min: connect repository/deployment settings.",
          "15-25 min: deploy and configure environment variables.",
          "25-32 min: smoke-test the public application and fix one deployment issue.",
          "32-37 min: create a maintenance backlog and improvement cycle.",
          "37-40 min: capstone presentation checklist + course close."
        ],
        "prompt": "\"Review the project for deployment readiness. Check build scripts, environment variable usage, client/server boundaries, production configuration, database connectivity, error handling, and README instructions. Do not make changes yet. Produce a deployment checklist and identify blockers.\"",
        "task": "Deploy the capstone, run the post-deployment smoke test, document the live URL and architecture, and record a 2-3 minute demo walkthrough.",
        "evidence": "Final capstone submission and presentation.",
        "assets": "Deployment checklist; post-launch smoke test; maintenance backlog template; capstone presentation template."
      }
    ]
  }
],
} as const;
