const test = require("node:test");
const assert = require("node:assert/strict");
const {
  postJson,
  registerSuperadminAndLogin,
  createSchoolAsSuperadmin,
} = require("./_helpers/apiTestUtils");

let superadmin;

test("v1_register creates a SUPERADMIN user", async () => {
  superadmin = await registerSuperadminAndLogin({ tag: "auth" });
  assert.equal(typeof superadmin.token, "string");
});

test("v1_login returns longToken for registered user", async () => {
  if (!superadmin) {
    superadmin = await registerSuperadminAndLogin({ tag: "auth_login" });
  }
  const res = await postJson("/api/user/v1_login", {
    email: superadmin.email,
    password: superadmin.password,
  });
  assert.equal(res.status, 200);
  assert.equal(res.json.ok, true);
  assert.equal(res.json?.data?.user?.email, superadmin.email);
  assert.equal(typeof res.json?.data?.longToken, "string");
});

test("v1_createShortToken returns shortToken from a valid longToken", async () => {
  if (!superadmin) {
    superadmin = await registerSuperadminAndLogin({ tag: "auth_short" });
  }
  const shortTokenResponse = await postJson(
    "/api/token/v1_createShortToken",
    {},
    { token: superadmin.token },
  );

  assert.equal(shortTokenResponse.status, 200);
  assert.equal(shortTokenResponse.json.ok, true);
  assert.equal(typeof shortTokenResponse.json?.data?.shortToken, "string");
  assert.ok(shortTokenResponse.json.data.shortToken.length > 20);
});

test("v1_register returns clear validation error for invalid role", async () => {
  const invalid = await postJson("/api/user/v1_register", {
    email: `badrole_${Date.now()}@example.com`,
    password: "Pass@1234",
    fullName: "Bad Role User",
    role: "SUPERAD",
  });

  assert.equal(invalid.status, 400);
  assert.equal(invalid.json.ok, false);
  assert.equal(invalid.json.message, "role must be SUPERADMIN or SCHOOL_ADMIN");
});

test("v1_login returns invalid credentials for wrong password", async () => {
  if (!superadmin) {
    superadmin = await registerSuperadminAndLogin({ tag: "auth_wrong_pass" });
  }
  const res = await postJson("/api/user/v1_login", {
    email: superadmin.email,
    password: "WrongPass@1234",
  });
  assert.equal(res.status, 400);
  assert.equal(res.json.ok, false);
  assert.equal(res.json.message, "invalid credentials");
});

test("protected endpoint returns 401 without token", async () => {
  const res = await postJson("/api/school/v1_listSchools", {
    limit: 1,
    skip: 0,
  });
  assert.equal(res.status, 401);
  assert.equal(res.json.ok, false);
  assert.equal(res.json.errors, "unauthorized");
});

test("protected endpoint returns 401 with invalid token", async () => {
  const res = await postJson(
    "/api/school/v1_listSchools",
    { limit: 1, skip: 0 },
    { token: "bad_token_value" },
  );
  assert.equal(res.status, 401);
  assert.equal(res.json.ok, false);
  assert.equal(res.json.errors, "unauthorized");
});

test("v1_register blocks additional SUPERADMIN creation without token", async () => {
  await registerSuperadminAndLogin({ tag: "auth_superadmin_guard" });

  const res = await postJson("/api/user/v1_register", {
    email: `blocked_superadmin_${Date.now()}@example.com`,
    password: "Pass@1234",
    fullName: "Blocked Superadmin",
    role: "SUPERADMIN",
  });

  assert.equal(res.status, 400);
  assert.equal(res.json.ok, false);
  assert.equal(
    res.json.message,
    "superadmin token required to create additional SUPERADMIN accounts",
  );
});

test("v1_register allows additional SUPERADMIN creation with SUPERADMIN token", async () => {
  const superadmin = await registerSuperadminAndLogin({
    tag: "auth_superadmin_create",
  });

  const res = await postJson(
    "/api/user/v1_register",
    {
      email: `allowed_superadmin_${Date.now()}@example.com`,
      password: "Pass@1234",
      fullName: "Allowed Superadmin",
      role: "SUPERADMIN",
    },
    { token: superadmin.token },
  );

  assert.equal(res.status, 200);
  assert.equal(res.json.ok, true);
  assert.equal(res.json?.data?.user?.role, "SUPERADMIN");
});

test("v1_register rejects SCHOOL_ADMIN with unknown schoolId", async () => {
  await registerSuperadminAndLogin({ tag: "auth_schooladmin_schoolid" });

  const res = await postJson("/api/user/v1_register", {
    email: `bad_school_admin_${Date.now()}@example.com`,
    password: "Pass@1234",
    fullName: "Bad School Admin",
    role: "SCHOOL_ADMIN",
    schoolId: "missing_school_id",
  });

  assert.equal(res.status, 400);
  assert.equal(res.json.ok, false);
  assert.equal(res.json.message, "schoolId must reference an active school");
});

test("v1_register allows SCHOOL_ADMIN with valid schoolId", async () => {
  const superadmin = await registerSuperadminAndLogin({
    tag: "auth_schooladmin_valid",
  });
  const schoolId = await createSchoolAsSuperadmin({
    token: superadmin.token,
    codeSuffix: `ASV${Date.now()}`,
  });

  const res = await postJson("/api/user/v1_register", {
    email: `good_school_admin_${Date.now()}@example.com`,
    password: "Pass@1234",
    fullName: "Good School Admin",
    role: "SCHOOL_ADMIN",
    schoolId,
  });

  assert.equal(res.status, 200);
  assert.equal(res.json.ok, true);
  assert.equal(res.json?.data?.user?.role, "SCHOOL_ADMIN");
  assert.equal(res.json?.data?.user?.schoolId, schoolId);
});
