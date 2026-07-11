import crypto from "node:crypto";
import { db, pool, usersTable, visitsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

const BASE = "http://localhost:80";
const SECRET = process.env.SESSION_SECRET;
const ADMIN_EMAIL = "johnmichaelkuczynski@gmail.com";
const SYNTH_EMAIL = "synthetic.student.qr@test.local";
const SYNTH_GOOGLE_ID = "synthetic-google-id-qr-test";

let passCount = 0;
let failCount = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    passCount++;
    console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    failCount++;
    failures.push(name);
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function signSessionId(sid: string, secret: string): string {
  const sig = crypto
    .createHmac("sha256", secret)
    .update(sid)
    .digest("base64")
    .replace(/=+$/, "");
  return `s:${sid}.${sig}`;
}

async function createSession(userId: number): Promise<string> {
  const sid = crypto.randomBytes(24).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const sess = {
    cookie: {
      originalMaxAge: 24 * 60 * 60 * 1000,
      expires: expires.toISOString(),
      httpOnly: true,
      path: "/",
    },
    passport: { user: userId },
    syntheticTestMarker: SYNTH_GOOGLE_ID,
  };
  await pool.query(
    `INSERT INTO user_sessions (sid, sess, expire) VALUES ($1, $2, $3)`,
    [sid, JSON.stringify(sess), expires],
  );
  return `connect.sid=${encodeURIComponent(signSessionId(sid, SECRET!))}`;
}

async function get(path: string, cookie?: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: cookie ? { cookie } : {},
    redirect: "manual",
  });
  return res;
}

async function post(path: string, cookie: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      cookie,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  return res;
}

async function cleanup() {
  const synthUsers = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.googleId, SYNTH_GOOGLE_ID));
  const ids = synthUsers.map((u) => u.id);
  await pool.query(`DELETE FROM user_sessions WHERE sess->>'syntheticTestMarker' = $1`, [
    SYNTH_GOOGLE_ID,
  ]);
  if (ids.length > 0) {
    await db.delete(visitsTable).where(inArray(visitsTable.userId, ids));
    await db.delete(usersTable).where(inArray(usersTable.id, ids));
  }
}

async function main() {
  if (!SECRET) {
    console.error("SESSION_SECRET not set — cannot forge synthetic session");
    process.exit(1);
  }

  console.log("=== PHASE 1: Anonymous visitor (must be locked out) ===");
  {
    const home = await get("/");
    check("Homepage HTML served (sign-in wall renders client-side)", home.status === 200, `status ${home.status}`);

    const overview = await get("/api/course/overview");
    check("Anonymous /api/course/overview blocked", overview.status === 401, `status ${overview.status}`);

    const me = await get("/api/auth/user");
    const meBody = (await me.json()) as { authenticated: boolean };
    check("Anonymous /api/auth/user reports unauthenticated", me.status === 200 && meBody.authenticated === false);

    const admin = await get("/api/admin/analytics");
    check("Anonymous /api/admin/analytics blocked", admin.status === 401 || admin.status === 403, `status ${admin.status}`);

    const oauth = await get("/api/auth/google");
    const loc = oauth.headers.get("location") ?? "";
    check(
      "Google OAuth redirect (credentials configured, strategy live)",
      oauth.status === 302 && loc.startsWith("https://accounts.google.com/"),
      `status ${oauth.status} -> ${loc.slice(0, 60)}`,
    );

    const diag = await get("/api/diagnostics/system");
    check("Anonymous diagnostics blocked", diag.status === 401, `status ${diag.status}`);
  }

  console.log("\n=== PHASE 2: Synthetic student — simulated Google login (post-OAuth session) ===");
  await cleanup();
  const [student] = await db
    .insert(usersTable)
    .values({
      username: "Synthetic Student",
      googleId: SYNTH_GOOGLE_ID,
      email: SYNTH_EMAIL,
      displayName: "Synthetic Student",
    })
    .returning({ id: usersTable.id });
  await db.insert(visitsTable).values({ userId: student.id, email: SYNTH_EMAIL });
  const studentCookie = await createSession(student.id);
  {
    const me = await get("/api/auth/user", studentCookie);
    const meBody = (await me.json()) as { authenticated: boolean; user: { email?: string } | null };
    check(
      "Logged-in session recognized",
      me.status === 200 && meBody.authenticated === true && meBody.user?.email === SYNTH_EMAIL,
      JSON.stringify(meBody.user ?? null),
    );

    const overview = await get("/api/course/overview", studentCookie);
    check("Course overview accessible when logged in", overview.status === 200, `status ${overview.status}`);

    const analytics = await get("/api/analytics/summary", studentCookie);
    check("Student analytics accessible when logged in", analytics.status === 200, `status ${analytics.status}`);

    const admin = await get("/api/admin/analytics", studentCookie);
    check("Non-admin BLOCKED from Administrative data", admin.status === 403, `status ${admin.status}`);

    const adminCheck = await get("/api/admin/check", studentCookie);
    check("Non-admin /api/admin/check rejected", adminCheck.status === 403, `status ${adminCheck.status}`);
  }

  console.log("\n=== PHASE 3: Admin session — Administrative page data ===");
  const existingAdmin = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, ADMIN_EMAIL));
  let adminId: number;
  let adminCreated = false;
  if (existingAdmin.length > 0) {
    adminId = existingAdmin[0].id;
  } else {
    const [row] = await db
      .insert(usersTable)
      .values({
        username: "Admin (synthetic session)",
        googleId: null,
        email: ADMIN_EMAIL,
        displayName: "Admin",
      })
      .returning({ id: usersTable.id });
    adminId = row.id;
    adminCreated = true;
  }
  const adminCookie = await createSession(adminId);
  {
    const adminCheck = await get("/api/admin/check", adminCookie);
    const adminBody = (await adminCheck.json()) as { ok?: boolean };
    check("Admin /api/admin/check grants access", adminCheck.status === 200 && adminBody.ok === true, `status ${adminCheck.status}`);

    const analytics = await get("/api/admin/analytics", adminCookie);
    check("Admin analytics endpoint returns 200", analytics.status === 200, `status ${analytics.status}`);
    if (analytics.status === 200) {
      const data = (await analytics.json()) as {
        visits?: { email: string | null }[];
        counts?: Record<string, number>;
        logins?: unknown;
      };
      const body = JSON.stringify(data);
      check(
        "Admin analytics includes synthetic student's login record",
        body.includes(SYNTH_EMAIL),
        "visit row visible in Administrative data",
      );
    }
  }

  console.log("\n=== PHASE 4: Full-stack functionality as logged-in synthetic user ===");
  {
    const sys = await get("/api/diagnostics/system", studentCookie);
    check("System diagnostic reachable when logged in", sys.status === 200, `status ${sys.status}`);
    if (sys.status === 200) {
      const data = (await sys.json()) as { steps?: { name: string; ok: boolean; error?: string | null }[]; ok?: boolean };
      const steps = data.steps ?? [];
      for (const s of steps) {
        check(`  diagnostic step: ${s.name}`, s.ok === true, s.ok ? undefined : String(s.error ?? "failed"));
      }
    }

    const run = await post("/api/diagnostics/synthetic-run", studentCookie);
    check("Synthetic-student end-to-end run executes", run.status === 200, `status ${run.status}`);
    if (run.status === 200) {
      const data = (await run.json()) as { steps?: { name: string; ok: boolean; error?: string | null }[]; ok?: boolean };
      const steps = data.steps ?? [];
      for (const s of steps) {
        check(`  synthetic-run step: ${s.name}`, s.ok === true, s.ok ? undefined : String(s.error ?? "failed"));
      }
    }
  }

  console.log("\n=== PHASE 5: Logout ===");
  {
    const logout = await post("/api/auth/logout", studentCookie);
    check("Logout succeeds", logout.status === 200 || logout.status === 204 || logout.status === 302, `status ${logout.status}`);
    const me = await get("/api/auth/user", studentCookie);
    const meBody = (await me.json()) as { authenticated: boolean };
    check("Session dead after logout — locked out again", meBody.authenticated === false);
  }

  console.log("\n=== CLEANUP ===");
  await cleanup();
  if (adminCreated) {
    await db.delete(visitsTable).where(eq(visitsTable.userId, adminId));
    await db.delete(usersTable).where(eq(usersTable.id, adminId));
  }
  console.log("Synthetic users, sessions, and visit rows removed.");

  console.log(`\n=== RESULT: ${passCount} passed, ${failCount} failed ===`);
  if (failures.length > 0) {
    console.log("Failed checks:");
    for (const f of failures) console.log(`  - ${f}`);
  }
  await pool.end();
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error("Test runner crashed:", err);
  try {
    await cleanup();
  } catch {}
  await pool.end();
  process.exit(1);
});
