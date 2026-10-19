/// <reference types="vite/client" />
import { beforeEach, describe, expect, test, vi } from "vitest";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";
import { api, internal } from "../convex/_generated/api";
import { newTest } from "./testSetup";

type T = ReturnType<typeof newTest>;

let sentEmails: Array<{ to: string; subject: string; code: string }>;

beforeEach(async () => {
  const { publicKey, privateKey } = await generateKeyPair("RS256", { extractable: true });
  const jwk = await exportJWK(publicKey);
  vi.stubEnv("JWT_PRIVATE_KEY", (await exportPKCS8(privateKey)).trimEnd().replace(/\n/g, " "));
  vi.stubEnv("JWKS", JSON.stringify({ keys: [{ use: "sig", ...jwk }] }));
  vi.stubEnv("SITE_URL", "http://localhost:5174");
  vi.stubEnv("CONVEX_SITE_URL", "https://example.convex.site");
  vi.stubEnv("BREVO_API_KEY", "test-key");

  sentEmails = [];
  vi.stubGlobal("fetch", async (url: string, init: any) => {
    if (String(url).includes("brevo")) {
      const body = JSON.parse(init.body);
      sentEmails.push({
        to: body.to[0].email,
        subject: body.subject,
        code: /(\d{8})/.exec(body.subject)?.[1] ?? "",
      });
      return new Response("{}", { status: 201 });
    }
    throw new Error(`unexpected fetch to ${url}`);
  });
});

const goodSignup = {
  flow: "signUp",
  email: "Ada@Example.com",
  password: "a-good-password-1",
  name: "Ada Obi",
  country: "Nigeria",
  ageBand: "18+",
  guardianConsent: false,
  termsAccepted: true,
  conductAccepted: true,
};

const signUpStudent = (t: T, overrides: Record<string, unknown> = {}) =>
  t.action(api.auth.signIn, { provider: "student", params: { ...goodSignup, ...overrides } });

const count = (t: T, table: "users" | "profiles") => t.run(async (ctx) => (await ctx.db.query(table).collect()).length);

describe("student sign-up", () => {
  test("creates the account, emails an 8-digit code, and does NOT sign the user in until the code is entered", async () => {
    const t = newTest();
    const result: any = await signUpStudent(t);
    expect(result.tokens ?? null).toBeNull();
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].to).toBe("ada@example.com");
    expect(sentEmails[0].code).toMatch(/^\d{8}$/);
    // account exists but is unverified
    const user = await t.run(async (ctx) => (await ctx.db.query("users").first())!);
    expect(user.emailVerificationTime).toBeUndefined();
    expect(user.email).toBe("ada@example.com");
  });

  test("entering the emailed code verifies the email and signs the student in; profile has consent fields", async () => {
    const t = newTest();
    await signUpStudent(t);
    const verified: any = await t.action(api.auth.signIn, {
      provider: "student",
      params: { flow: "email-verification", email: "ada@example.com", code: sentEmails[0].code },
    });
    expect(verified.tokens?.token).toBeTruthy();
    const { user, profile } = await t.run(async (ctx) => {
      const user = (await ctx.db.query("users").first())!;
      const profile = (await ctx.db.query("profiles").first())!;
      return { user, profile };
    });
    expect(user.emailVerificationTime).toBeTypeOf("number");
    expect(user.name).toBe("Ada Obi");
    expect(profile.userId).toBe(user._id);
    expect(profile).toMatchObject({ country: "Nigeria", ageBand: "18+", guardianConsent: false });
    expect(profile.signupCompletedAt).toBeTypeOf("number");
    expect(profile.termsAcceptedAt).toBeTypeOf("number");
    // and never a staff role
    expect(await t.run(async (ctx) => ctx.db.query("adminProfiles").collect())).toHaveLength(0);
  });

  test("a wrong code does not verify or sign in", async () => {
    const t = newTest();
    await signUpStudent(t);
    await expect(
      t.action(api.auth.signIn, {
        provider: "student",
        params: { flow: "email-verification", email: "ada@example.com", code: "00000000" },
      })
    ).rejects.toThrow();
    const user = await t.run(async (ctx) => (await ctx.db.query("users").first())!);
    expect(user.emailVerificationTime).toBeUndefined();
  });

  test("an unverified account can't sign in with its password — it just gets a fresh code", async () => {
    const t = newTest();
    await signUpStudent(t);
    const attempt: any = await t.action(api.auth.signIn, {
      provider: "student",
      params: { flow: "signIn", email: "ada@example.com", password: goodSignup.password },
    });
    expect(attempt.tokens ?? null).toBeNull();
    expect(sentEmails).toHaveLength(2);
  });

  test("after verifying, the password signs in; a wrong password does not", async () => {
    const t = newTest();
    await signUpStudent(t);
    await t.action(api.auth.signIn, {
      provider: "student",
      params: { flow: "email-verification", email: "ada@example.com", code: sentEmails[0].code },
    });
    const ok: any = await t.action(api.auth.signIn, {
      provider: "student",
      params: { flow: "signIn", email: "ADA@example.com", password: goodSignup.password },
    });
    expect(ok.tokens?.token).toBeTruthy();
    await expect(
      t.action(api.auth.signIn, {
        provider: "student",
        params: { flow: "signIn", email: "ada@example.com", password: "wrong-password-1" },
      })
    ).rejects.toThrow();
  });

  test.each([
    ["no age band", { ageBand: undefined }, /aged 16 and over/],
    ["under 16 claimed", { ageBand: "under-16" }, /aged 16 and over/],
    ["16-17 without guardian", { ageBand: "16-17", guardianConsent: false }, /parent or guardian/],
    ["terms not accepted", { termsAccepted: false }, /Terms of Service/],
    ["code of conduct not accepted", { conductAccepted: false }, /code of conduct/],
    ["no country", { country: "" }, /country|required/i],
    ["short password", { password: "short" }, /at least 8/],
    ["numbers-only password", { password: "12345678901" }, /only numbers/],
    ["bad email", { email: "nope" }, /valid email/],
  ])("rejects: %s — and creates nothing", async (_label, overrides, message) => {
    const t = newTest();
    await expect(signUpStudent(t, overrides as any)).rejects.toThrow(message as RegExp);
    expect(await count(t, "users")).toBe(0);
    expect(await count(t, "profiles")).toBe(0);
    expect(sentEmails).toHaveLength(0);
  });

  test("16-17 with guardian permission is accepted and stored as such", async () => {
    const t = newTest();
    await signUpStudent(t, { ageBand: "16-17", guardianConsent: true });
    const profile = await t.run(async (ctx) => (await ctx.db.query("profiles").first())!);
    expect(profile).toMatchObject({ ageBand: "16-17", guardianConsent: true });
  });

  test("signing up again for a registered email needs that account's password; a different password is refused", async () => {
    const t = newTest();
    await signUpStudent(t);
    await t.action(api.auth.signIn, {
      provider: "student",
      params: { flow: "email-verification", email: "ada@example.com", code: sentEmails[0].code },
    });
    // Someone else who doesn't know the password can't take over the account
    await expect(
      signUpStudent(t, { email: "ada@example.com", name: "Someone Else", password: "a-different-password-2" })
    ).rejects.toThrow(/already exists/);
    expect(await count(t, "users")).toBe(1);
    // (the library treats "sign up again with the SAME password" as a plain sign-in by the real owner)
    const owner: any = await signUpStudent(t, { email: "ada@example.com" });
    expect(owner.tokens?.token).toBeTruthy();
    expect(await count(t, "users")).toBe(1);
  });

  test("email squatting: if someone registers your address first, you can still take it back with a reset code", async () => {
    const t = newTest();
    // Attacker registers victim@example.com with their own password and never verifies it
    await signUpStudent(t, { email: "victim@example.com", name: "Attacker", password: "attackers-password-1" });
    // The attacker can't use the account: it is unverified, so password sign-in only sends a code to the victim's inbox
    const blocked: any = await t.action(api.auth.signIn, {
      provider: "student",
      params: { flow: "signIn", email: "victim@example.com", password: "attackers-password-1" },
    });
    expect(blocked.tokens ?? null).toBeNull();
    // The real owner can't sign up with a different password…
    await expect(
      signUpStudent(t, { email: "victim@example.com", name: "Victim", password: "victims-password-1" })
    ).rejects.toThrow(/already exists/);
    // …but they can reset: the code goes to THEIR inbox, and it replaces the attacker's password
    sentEmails.length = 0;
    await t.action(api.auth.signIn, { provider: "student", params: { flow: "reset", email: "victim@example.com" } });
    expect(sentEmails[0].to).toBe("victim@example.com");
    await t.action(api.auth.signIn, {
      provider: "student",
      params: { flow: "reset-verification", email: "victim@example.com", code: sentEmails[0].code, newPassword: "victims-password-1" },
    });
    const user = await t.run(async (ctx) => (await ctx.db.query("users").first())!);
    expect(user.emailVerificationTime).toBeTypeOf("number");
    await expect(
      t.action(api.auth.signIn, {
        provider: "student",
        params: { flow: "signIn", email: "victim@example.com", password: "attackers-password-1" },
      })
    ).rejects.toThrow();
    const ok: any = await t.action(api.auth.signIn, {
      provider: "student",
      params: { flow: "signIn", email: "victim@example.com", password: "victims-password-1" },
    });
    expect(ok.tokens?.token).toBeTruthy();
  });

  test("a password sign-up can't attach itself to a learner who already signed in another way (e.g. Google)", async () => {
    const t = newTest();
    await t.run(async (ctx) => {
      const id = await ctx.db.insert("users", { email: "ada@example.com", emailVerificationTime: Date.now() });
      await ctx.db.insert("profiles", { userId: id, createdAt: Date.now(), signupCompletedAt: Date.now() });
      await ctx.db.insert("authAccounts", { userId: id, provider: "google", providerAccountId: "g-123" });
    });
    await expect(signUpStudent(t)).rejects.toThrow(/already exists/);
    expect(await count(t, "users")).toBe(1);
  });
});

describe("password reset", () => {
  test("emails a code, accepts it with a new password, then the new password works and the old one doesn't", async () => {
    const t = newTest();
    await signUpStudent(t);
    await t.action(api.auth.signIn, {
      provider: "student",
      params: { flow: "email-verification", email: "ada@example.com", code: sentEmails[0].code },
    });
    sentEmails.length = 0;
    await t.action(api.auth.signIn, { provider: "student", params: { flow: "reset", email: "ada@example.com" } });
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].subject).toMatch(/password reset/i);
    const done: any = await t.action(api.auth.signIn, {
      provider: "student",
      params: { flow: "reset-verification", email: "ada@example.com", code: sentEmails[0].code, newPassword: "brand-new-pass-9" },
    });
    expect(done.tokens?.token).toBeTruthy();
    const ok: any = await t.action(api.auth.signIn, {
      provider: "student",
      params: { flow: "signIn", email: "ada@example.com", password: "brand-new-pass-9" },
    });
    expect(ok.tokens?.token).toBeTruthy();
    await expect(
      t.action(api.auth.signIn, {
        provider: "student",
        params: { flow: "signIn", email: "ada@example.com", password: goodSignup.password },
      })
    ).rejects.toThrow();
  });

  test("a reset for an email with no account sends nothing", async () => {
    const t = newTest();
    await expect(
      t.action(api.auth.signIn, { provider: "student", params: { flow: "reset", email: "ghost@example.com" } })
    ).rejects.toThrow();
    expect(sentEmails).toHaveLength(0);
  });
});

describe("email rate limiting", () => {
  test("a single address can only be sent a handful of codes per hour", async () => {
    const t = newTest();
    await signUpStudent(t);
    let refused = false;
    for (let i = 0; i < 8 && !refused; i++) {
      try {
        await t.action(api.auth.signIn, {
          provider: "student",
          params: { flow: "signIn", email: "ada@example.com", password: goodSignup.password },
        });
      } catch (e: any) {
        refused = /Too many emails/.test(String(e?.data ?? e?.message));
      }
    }
    expect(refused).toBe(true);
    expect(sentEmails.length).toBeLessThanOrEqual(5);
  });
});

describe("staff login stays separate from student login", () => {
  async function makeAdmin(t: T, email = "owner@codecave.test") {
    await t.action(internal.adminAuth.createAdmin, { email, password: "a-long-staff-passphrase", role: "owner" });
  }

  test("createAdmin makes a working staff login with an owner profile, and the admin form's sign-in still works", async () => {
    const t = newTest();
    await makeAdmin(t);
    const profile = await t.run(async (ctx) => (await ctx.db.query("adminProfiles").first())!);
    expect(profile.role).toBe("owner");
    // exactly what admin-app/src/pages/Login.tsx sends
    const result: any = await t.action(api.auth.signIn, {
      provider: "password",
      params: { email: "owner@codecave.test", password: "a-long-staff-passphrase", flow: "signIn" },
    });
    expect(result.tokens?.token).toBeTruthy();
    // staff don't get a learner profile or need email verification
    expect(await count(t, "profiles")).toBe(0);
    expect(sentEmails).toHaveLength(0);
  });

  test("public sign-up through the staff (password) provider is closed", async () => {
    const t = newTest();
    await expect(
      t.action(api.auth.signIn, {
        provider: "password",
        params: { email: "intruder@example.com", password: "a-good-password-1", flow: "signUp" },
      })
    ).rejects.toThrow();
    expect(await count(t, "users")).toBe(0);
  });

  test("createAdmin refuses weak passwords", async () => {
    const t = newTest();
    await expect(
      t.action(internal.adminAuth.createAdmin, { email: "a@b.co", password: "short" })
    ).rejects.toThrow(/at least 12/);
  });

  test("a student's credentials don't work on the staff login, nor staff credentials on the student login", async () => {
    const t = newTest();
    await makeAdmin(t);
    await signUpStudent(t);
    await t.action(api.auth.signIn, {
      provider: "student",
      params: { flow: "email-verification", email: "ada@example.com", code: sentEmails[0].code },
    });
    await expect(
      t.action(api.auth.signIn, {
        provider: "password",
        params: { email: "ada@example.com", password: goodSignup.password, flow: "signIn" },
      })
    ).rejects.toThrow();
    await expect(
      t.action(api.auth.signIn, {
        provider: "student",
        params: { flow: "signIn", email: "owner@codecave.test", password: "a-long-staff-passphrase" },
      })
    ).rejects.toThrow();
  });

  test("a student who registers with a staff member's email gets a separate account with no staff access", async () => {
    const t = newTest();
    await makeAdmin(t, "owner@codecave.test");
    await signUpStudent(t, { email: "owner@codecave.test", name: "Impostor" });
    await t.action(api.auth.signIn, {
      provider: "student",
      params: { flow: "email-verification", email: "owner@codecave.test", code: sentEmails.at(-1)!.code },
    });
    const users = await t.run(async (ctx) => ctx.db.query("users").collect());
    expect(users).toHaveLength(2);
    const staffRows = await t.run(async (ctx) => ctx.db.query("adminProfiles").collect());
    expect(staffRows).toHaveLength(1);
    const impostor = users.find((u) => u.name === "Impostor")!;
    expect(staffRows[0].userId).not.toBe(impostor._id);
    // …and the impostor is not admin
    const asImpostor = t.withIdentity({ subject: impostor._id });
    expect(await asImpostor.query(api.adminAuth.whoAmI, {})).toBeNull();
    await expect(asImpostor.query(api.adminSubmissions.listContactMessages, {})).rejects.toThrow(/admin access/);
  });
});

describe("staff accounts are never merge targets", () => {
  test("even if a staff member's email is marked verified, a student sign-up with it never attaches to the staff user", async () => {
    const t = newTest();
    await t.action(internal.adminAuth.createAdmin, { email: "owner@codecave.test", password: "a-long-staff-passphrase", role: "owner" });
    await t.run(async (ctx) => {
      const staff = (await ctx.db.query("users").first())!;
      await ctx.db.patch(staff._id, { emailVerificationTime: Date.now() });
    });
    // A learner signing in some other verified way (e.g. Google) with the same email
    const attempt = signUpStudent(t, { email: "owner@codecave.test", name: "Impostor" });
    // It must NOT be refused as "already exists" because of the staff user, and must NOT reuse the staff user id
    await attempt;
    const users = await t.run(async (ctx) => ctx.db.query("users").collect());
    const staffUser = users.find((u) => u.name === undefined)!;
    const learner = users.find((u) => u.name === "Impostor")!;
    expect(learner._id).not.toBe(staffUser._id);
    expect(await t.run(async (ctx) => ctx.db.query("profiles").collect())).toHaveLength(1);
    const staffProfiles = await t.run(async (ctx) => ctx.db.query("adminProfiles").collect());
    expect(staffProfiles).toHaveLength(1);
    expect(staffProfiles[0].userId).toBe(staffUser._id);
  });
});

describe("profiles.me / completeProfile", () => {
  test("a fresh Google-style user (no learner details yet) is told to complete their profile, then isn't", async () => {
    const t = newTest();
    const userId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("users", { email: "g@example.com", emailVerificationTime: Date.now() });
      await ctx.db.insert("profiles", { userId: id, createdAt: Date.now() });
      return id;
    });
    const me = t.withIdentity({ subject: userId });
    expect(await me.query(api.profiles.me, {})).toMatchObject({ needsProfileCompletion: true, staffRole: null });

    await expect(
      me.mutation(api.profiles.completeProfile, {
        name: "G", country: "Ghana", ageBand: "16-17", termsAccepted: true, conductAccepted: true,
      })
    ).rejects.toThrow(/parent or guardian/);

    await me.mutation(api.profiles.completeProfile, {
      name: "Grace", country: "Ghana", ageBand: "18+", termsAccepted: true, conductAccepted: true,
    });
    expect(await me.query(api.profiles.me, {})).toMatchObject({ needsProfileCompletion: false, name: "Grace" });
  });

  test("signed-out callers get null and can't complete a profile", async () => {
    const t = newTest();
    expect(await t.query(api.profiles.me, {})).toBeNull();
    await expect(
      t.mutation(api.profiles.completeProfile, {
        name: "x", country: "x", ageBand: "18+", termsAccepted: true, conductAccepted: true,
      })
    ).rejects.toThrow(/Not signed in/);
  });

  test("a staff-only account is not forced through learner onboarding", async () => {
    const t = newTest();
    const userId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("users", { email: "s@example.com" });
      await ctx.db.insert("adminProfiles", { userId: id, role: "instructor", addedAt: Date.now() });
      return id;
    });
    expect(await t.withIdentity({ subject: userId }).query(api.profiles.me, {})).toMatchObject({
      needsProfileCompletion: false,
      staffRole: "instructor",
    });
  });
});
