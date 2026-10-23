/// <reference types="vite/client" />
import { beforeEach, describe, expect, test, vi } from "vitest";
import { getFunctionName } from "convex/server";
import { api, internal } from "../convex/_generated/api";
import { newTest } from "./testSetup";

type T = ReturnType<typeof newTest>;

async function addUser(t: T, email: string, role?: "owner" | "editor" | "instructor" | "moderator", verified = true) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      email,
      ...(verified ? { emailVerificationTime: Date.now() } : {}),
    });
    if (role) await ctx.db.insert("adminProfiles", { userId, role, addedAt: Date.now() });
    else await ctx.db.insert("profiles", { userId, createdAt: Date.now(), signupCompletedAt: Date.now() });
    return userId;
  });
}


// Minimal valid documents, used only to mint well-formed ids for the test above.
const sub = { submittedAt: 0, status: "new" as const };
const MINIMAL_DOCS: Record<string, Record<string, unknown>> = {
  portfolioItems: { title: "t", description: "d", category: "website", tags: [], published: true, order: 0 },
  sponsors: { name: "n", kind: "individual", published: true },
  faqEntries: { question: "q", answer: "a", order: 0, published: true },
  pricingTiers: { checker: "website", name: "n", minScore: 0, priceRange: "p", description: "d", timeline: "t", approach: "a", order: 0 },
  projectBriefs: { ...sub, name: "n", email: "e@x.co", projectType: "web_app", details: "d" },
  trainingApplications: { ...sub, program: "ai_utility", track: "t", fullName: "n", email: "e@x.co" },
  hackathonWaitlist: { ...sub, fullName: "n", email: "e@x.co", role: "participant" },
  ambassadorApplications: { ...sub, fullName: "n", email: "e@x.co", school: "s", whyYou: "w" },
  partnershipProposals: { ...sub, contactName: "n", email: "e@x.co", organisation: "o", partnershipType: "other", details: "d" },
  sponsorInquiries: { ...sub, contactName: "n", email: "e@x.co", sponsorType: "individual" },
  productNotify: { ...sub, email: "e@x.co", product: "all" },
  contactMessages: { ...sub, fullName: "n", email: "e@x.co", message: "m" },
  courses: { slug: "s", title: "t", type: "focused", status: "draft", description: "d", recommendedOrder: 1, createdAt: 0 },
  modules: { courseId: "PLACEHOLDER", number: 1, title: "t", order: 1 },
  lessons: {
    courseId: "PLACEHOLDER", number: 1, order: 1, title: "t", status: "draft", isFreePreview: false, summary: "", durationSec: 0,
    objectives: [], keyConcepts: [], notesMd: "", promptCards: [], taskMd: "", pitfalls: [], chapters: [], tools: [],
    studentOutput: "", evidenceMd: "", assetsNote: "", resources: [], recordingFlow: [],
  },
  comments: { lessonId: "PLACEHOLDER_LESSON", userId: "PLACEHOLDER_USER", body: "b", status: "reported", createdAt: 0 },
};

/** Builds a value that satisfies an exported Convex validator (JSON form). */
function sampleValue(v: any, ids: Record<string, string>): any {
  switch (v.type) {
    case "string": return "x";
    case "number": return 1;
    case "boolean": return true;
    case "null": return null;
    case "id": return ids[v.tableName];
    case "literal": return v.value;
    case "array": return [];
    case "union": return sampleValue(v.value[0], ids);
    case "object": return sampleArgs(v, ids);
    default: throw new Error(`test helper doesn't know validator type ${v.type}`);
  }
}
function sampleArgs(obj: any, ids: Record<string, string>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [key, field] of Object.entries<any>(obj.value)) {
    if (field.optional) continue;
    out[key] = sampleValue(field.fieldType, ids);
  }
  return out;
}

beforeEach(() => {
  vi.stubEnv("SITE_URL", "http://localhost:5174");
  vi.stubEnv("JWT_PRIVATE_KEY", "unused-in-these-tests");
});

describe("admin functions — who can call them", () => {
  test("every public admin function refuses a signed-out caller and a student — for authorization reasons", async () => {
    const t = newTest();
    const studentId = await addUser(t, "student@example.com");
    const student = t.withIdentity({ subject: studentId });

    // Build ARGUMENTS THAT PASS VALIDATION, so the only thing that can reject
    // the call is the permission check. (With empty args, Convex rejects bad
    // arguments first and this test would pass even with the check deleted.)
    const ids: Record<string, string> = {};
    for (const [table, doc] of Object.entries(MINIMAL_DOCS)) {
      ids[table] = await t.run(async (ctx) => {
        const withRefs = { ...doc } as Record<string, unknown>;
        if (withRefs.courseId === "PLACEHOLDER") withRefs.courseId = ids.courses;
        if (withRefs.lessonId === "PLACEHOLDER_LESSON") withRefs.lessonId = ids.lessons;
        if (withRefs.userId === "PLACEHOLDER_USER") withRefs.userId = studentId;
        const id = await (ctx.db as any).insert(table, withRefs);
        await ctx.db.delete(id); // well-formed id of the right table, pointing at nothing
        return id as string;
      });
    }
    ids.users = studentId as string;

    const AUTH_ERROR = /Not signed in|doesn't have admin access|role doesn't allow/;
    const files = import.meta.glob(["../convex/admin*.ts", "../convex/staff.ts", "../convex/courseAdmin.ts", "../convex/commentAdmin.ts", "../convex/aiAdmin.ts"], { eager: true }) as Record<string, Record<string, any>>;
    let checked = 0;
    for (const [file, mod] of Object.entries(files)) {
      for (const [name, fn] of Object.entries(mod)) {
        if (!fn || !(fn as any).isPublic) continue;
        const path = `${file.replace("../convex/", "").replace(".ts", "")}:${name}`;
        // whoAmI is a deliberate exception: it returns null for non-staff.
        if (path === "adminAuth:whoAmI") continue;
        const args = sampleArgs(JSON.parse((fn as any).exportArgs()), ids);
        const run = async (c: any) => {
          if ((fn as any).isQuery) return await c.query(fn, args);
          if ((fn as any).isMutation) return await c.mutation(fn, args);
          return await c.action(fn, args);
        };
        checked++;
        await expect(run(t), `${path} (signed out)`).rejects.toThrow(AUTH_ERROR);
        await expect(run(student), `${path} (student)`).rejects.toThrow(AUTH_ERROR);
      }
    }
    expect(checked).toBeGreaterThan(40);
  });

  test("a student gets null from whoAmI and cannot read submissions or team data", async () => {
    const t = newTest();
    const studentId = await addUser(t, "student@example.com");
    const student = t.withIdentity({ subject: studentId });
    expect(await student.query(api.adminAuth.whoAmI, {})).toBeNull();
    await expect(student.query(api.adminSubmissions.listContactMessages, {})).rejects.toThrow(/admin access/);
    await expect(student.query(api.staff.listStaff, {})).rejects.toThrow(/admin access/);
    await expect(student.query(api.adminContent.listSettingsAdmin, {})).rejects.toThrow(/admin access/);
  });

  test("role boundaries: instructors and moderators can't touch the site; editors can't manage the team", async () => {
    const t = newTest();
    const owner = t.withIdentity({ subject: await addUser(t, "owner@example.com", "owner") });
    const editor = t.withIdentity({ subject: await addUser(t, "editor@example.com", "editor") });
    const instructor = t.withIdentity({ subject: await addUser(t, "inst@example.com", "instructor") });
    const moderator = t.withIdentity({ subject: await addUser(t, "mod@example.com", "moderator") });

    await expect(owner.query(api.adminSubmissions.listContactMessages, {})).resolves.toEqual([]);
    await expect(editor.query(api.adminSubmissions.listContactMessages, {})).resolves.toEqual([]);
    await expect(instructor.query(api.adminSubmissions.listContactMessages, {})).rejects.toThrow(/role doesn't allow/);
    await expect(moderator.query(api.adminContent.listFaqAdmin, {})).rejects.toThrow(/role doesn't allow/);

    await expect(editor.query(api.staff.listStaff, {})).rejects.toThrow(/role doesn't allow/);
    await expect(owner.query(api.staff.listStaff, {})).resolves.toHaveLength(4);

    // whoAmI reports what each role may do
    expect(await editor.query(api.adminAuth.whoAmI, {})).toMatchObject({ canManageSite: true, canManageTeam: false });
    expect(await instructor.query(api.adminAuth.whoAmI, {})).toMatchObject({ canManageSite: false, canManageTeam: false });
    expect(await owner.query(api.adminAuth.whoAmI, {})).toMatchObject({ canManageSite: true, canManageTeam: true });
  });
});

describe("audit finding #1 — submission ids are table-checked", () => {
  test("an admin can't delete or patch another table's documents through the submission functions", async () => {
    const t = newTest();
    const ownerId = await addUser(t, "owner@example.com", "owner");
    const owner = t.withIdentity({ subject: ownerId });
    const studentId = await addUser(t, "student@example.com");
    const studentProfileId = await t.run(async (ctx) => (await ctx.db.query("profiles").first())!._id);
    const adminProfileId = await t.run(async (ctx) => (await ctx.db.query("adminProfiles").first())!._id);

    for (const victim of [studentId, studentProfileId, adminProfileId]) {
      await expect(owner.mutation(api.adminSubmissions.removeContactMessage, { id: victim as any })).rejects.toThrow();
      await expect(
        owner.mutation(api.adminSubmissions.updateContactMessageStatus, { id: victim as any, status: "read" })
      ).rejects.toThrow();
    }
    // …and nothing was deleted
    expect(await t.run(async (ctx) => ctx.db.get(studentId))).not.toBeNull();
    expect(await t.run(async (ctx) => ctx.db.get(adminProfileId))).not.toBeNull();
  });

  test("deleting a real submission works and is written to the audit log", async () => {
    const t = newTest();
    const ownerId = await addUser(t, "owner@example.com", "owner");
    const owner = t.withIdentity({ subject: ownerId });
    const id = await t.mutation(api.forms.submitContactMessage, {
      fullName: "Ada", email: "ada@example.com", message: "Hello there",
    });
    await owner.mutation(api.adminSubmissions.removeContactMessage, { id });
    expect(await t.run(async (ctx) => ctx.db.get(id))).toBeNull();
    const log = await t.run(async (ctx) => ctx.db.query("auditLog").collect());
    expect(log.map((l) => l.action)).toContain("submission.removed");
  });
});

describe("audit finding #2 — team management", () => {
  test("an owner can change roles; the last owner can't be demoted or removed; changes are logged", async () => {
    const t = newTest();
    const ownerId = await addUser(t, "owner@example.com", "owner");
    const editorId = await addUser(t, "editor@example.com", "editor");
    const owner = t.withIdentity({ subject: ownerId });

    await owner.mutation(api.staff.setStaffRole, { userId: editorId, role: "instructor" });
    const staff = await owner.query(api.staff.listStaff, {});
    expect(staff.find((s) => s.email === "editor@example.com")?.role).toBe("instructor");

    await expect(owner.mutation(api.staff.setStaffRole, { userId: ownerId, role: "editor" })).rejects.toThrow(/last owner/);
    await expect(owner.mutation(api.staff.removeStaff, { userId: ownerId })).rejects.toThrow(/last owner/);

    await owner.mutation(api.staff.removeStaff, { userId: editorId });
    expect(await owner.query(api.staff.listStaff, {})).toHaveLength(1);

    const log = await owner.query(api.staff.listAuditLog, { paginationOpts: { numItems: 20, cursor: null } });
    expect(log.page.map((l) => l.action)).toEqual(expect.arrayContaining(["staff.role_set", "staff.removed"]));
  });

  test("a non-owner cannot change roles (no self-promotion)", async () => {
    const t = newTest();
    await addUser(t, "owner@example.com", "owner");
    const editorId = await addUser(t, "editor@example.com", "editor");
    const editor = t.withIdentity({ subject: editorId });
    await expect(editor.mutation(api.staff.setStaffRole, { userId: editorId, role: "owner" })).rejects.toThrow(/role doesn't allow/);
  });

  test("promoteToAdmin only finds admin-login accounts, never a student with the same email", async () => {
    const t = newTest();
    // A student signs up first, with the email the owner is about to promote.
    const studentId = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { email: "boss@example.com", emailVerificationTime: Date.now() });
      await ctx.db.insert("authAccounts", { userId, provider: "student", providerAccountId: "boss@example.com" });
      return userId;
    });
    await expect(
      t.mutation(internal.adminAuth.promoteToAdmin, { email: "boss@example.com" })
    ).rejects.toThrow(/No admin-login account/);
    expect(await t.run(async (ctx) => ctx.db.query("adminProfiles").collect())).toHaveLength(0);

    // A real admin-login account IS promotable.
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { email: "real@example.com" });
      await ctx.db.insert("authAccounts", { userId, provider: "password", providerAccountId: "real@example.com" });
    });
    await t.mutation(internal.adminAuth.promoteToAdmin, { email: "real@example.com", role: "editor" });
    const rows = await t.run(async (ctx) => ctx.db.query("adminProfiles").collect());
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).not.toBe(studentId);
  });
});

describe("audit finding #3 — public forms", () => {
  const good = { fullName: "Ada Obi", email: "Ada@Example.com", message: "Hello, I'd like to talk." };

  test("accepts a normal submission and normalises the email", async () => {
    const t = newTest();
    const id = await t.mutation(api.forms.submitContactMessage, good);
    const row = await t.run(async (ctx) => ctx.db.get(id));
    expect(row?.email).toBe("ada@example.com");
    expect(row?.status).toBe("new");
  });

  test("rejects bad emails, empty fields and oversized input with readable messages", async () => {
    const t = newTest();
    await expect(t.mutation(api.forms.submitContactMessage, { ...good, email: "not-an-email" })).rejects.toThrow(/valid email/);
    await expect(t.mutation(api.forms.submitContactMessage, { ...good, fullName: "   " })).rejects.toThrow(/Full name is required/);
    await expect(
      t.mutation(api.forms.submitContactMessage, { ...good, message: "x".repeat(5001) })
    ).rejects.toThrow(/too long/);
    expect(await t.run(async (ctx) => ctx.db.query("contactMessages").collect())).toHaveLength(0);
  });

  test("rate-limits repeated submissions to the same address, but not other addresses", async () => {
    const t = newTest();
    for (let i = 0; i < 5; i++) await t.mutation(api.forms.submitContactMessage, good);
    await expect(t.mutation(api.forms.submitContactMessage, good)).rejects.toThrow(/wait a little while/);
    // a different visitor is unaffected
    await expect(
      t.mutation(api.forms.submitContactMessage, { ...good, email: "someone.else@example.com" })
    ).resolves.toBeTruthy();
  });

  test("every public form mutation is limited, not just the contact form", async () => {
    const t = newTest();
    const email = "flood@example.com";
    const calls: Array<[any, any]> = [
      [api.forms.submitProductNotify, { email, product: "all" }],
      [api.forms.submitHackathonWaitlist, { fullName: "A", email, role: "participant" }],
      [api.forms.submitProjectBrief, { name: "A", email, projectType: "web_app", details: "d" }],
    ];
    for (const [fn, args] of calls) {
      for (let i = 0; i < 5; i++) await t.mutation(fn, args);
      await expect(t.mutation(fn, args), getFunctionName(fn)).rejects.toThrow(/wait a little while/);
      // reset the per-address bucket between forms by using a fresh address for the next one
      calls.forEach((c) => (c[1].email = `x${Math.random()}@example.com`));
    }
  });
});

describe("public settings", () => {
  test("keys beginning with private. are never served to the public", async () => {
    const t = newTest();
    await t.run(async (ctx) => {
      await ctx.db.insert("siteSettings", { key: "private.secret", value: "hidden" });
      await ctx.db.insert("siteSettings", { key: "contactPhone", value: "123" });
    });
    expect(await t.query(api.content.getSetting, { key: "private.secret" })).toBeNull();
    expect(await t.query(api.content.getSetting, { key: "contactPhone" })).toBe("123");
  });
});
