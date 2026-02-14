const test = require("node:test");
const assert = require("node:assert/strict");
const {
  postJson,
  registerSuperadminAndLogin,
  createSchoolAsSuperadmin,
  registerAndLoginSchoolAdmin,
} = require("./_helpers/apiTestUtils");

test("school v1 CRUD endpoints work for SUPERADMIN", async () => {
  const superadmin = await registerSuperadminAndLogin({ tag: "school_crud" });
  const schoolCode = `SCH${Date.now()}`;

  const create = await postJson(
    "/api/school/v1_createSchool",
    {
      name: "Test School",
      code: schoolCode,
      address: "Main Street",
      phone: "1234567890",
      email: "school@example.com",
    },
    { token: superadmin.token },
  );
  assert.equal(create.status, 200);
  assert.equal(create.json.ok, true);
  const schoolId = create.json?.data?.school?.id;
  assert.equal(typeof schoolId, "string");
  assert.ok(schoolId.length > 5);

  const get = await postJson(
    "/api/school/v1_getSchool",
    { schoolId },
    { token: superadmin.token },
  );
  assert.equal(get.status, 200);
  assert.equal(get.json.ok, true);
  assert.equal(get.json?.data?.school?.id, schoolId);

  const list = await postJson(
    "/api/school/v1_listSchools",
    { q: "Test", limit: 10, skip: 0 },
    { token: superadmin.token },
  );
  assert.equal(list.status, 200);
  assert.equal(list.json.ok, true);
  assert.ok(Array.isArray(list.json?.data?.items));

  const update = await postJson(
    "/api/school/v1_updateSchool",
    { schoolId, name: "Test School Updated", address: "Updated Street" },
    { token: superadmin.token },
  );
  assert.equal(update.status, 200);
  assert.equal(update.json.ok, true);
  assert.equal(update.json?.data?.school?.name, "Test School Updated");

  const del = await postJson(
    "/api/school/v1_deleteSchool",
    { schoolId },
    { token: superadmin.token },
  );
  assert.equal(del.status, 200);
  assert.equal(del.json.ok, true);
  assert.equal(del.json?.data?.deleted, true);
});

test("school create returns validation errors for bad payload", async () => {
  const superadmin = await registerSuperadminAndLogin({ tag: "school_bad" });
  const bad = await postJson(
    "/api/school/v1_createSchool",
    {
      code: `BAD${Date.now()}`,
      address: "Only address",
    },
    { token: superadmin.token },
  );

  assert.equal(bad.status, 400);
  assert.equal(bad.json.ok, false);
  assert.ok(Array.isArray(bad.json.errors));
  assert.ok(bad.json.errors.length > 0);
});

test("school RBAC denies SCHOOL_ADMIN for school endpoints", async () => {
  const superadmin = await registerSuperadminAndLogin({
    tag: "school_rbac_setup",
  });
  const schoolId = await createSchoolAsSuperadmin({
    token: superadmin.token,
    codeSuffix: `SRS${Date.now()}`,
  });
  const { token: schoolAdminToken } = await registerAndLoginSchoolAdmin({
    schoolId,
    tag: "school_rbac",
  });

  const res = await postJson(
    "/api/school/v1_createSchool",
    {
      name: "Blocked School",
      code: `BLK${Date.now()}`,
    },
    { token: schoolAdminToken },
  );
  assert.equal(res.status, 403);
  assert.equal(res.json.ok, false);
  assert.equal(res.json.message, "SUPERADMIN role required");
});

test("school get/update/delete return not found for unknown id", async () => {
  const superadmin = await registerSuperadminAndLogin({
    tag: "school_not_found",
  });
  const schoolId = "unknown_school_id";

  const get = await postJson(
    "/api/school/v1_getSchool",
    { schoolId },
    { token: superadmin.token },
  );
  assert.equal(get.status, 404);
  assert.equal(get.json.ok, false);
  assert.equal(get.json.message, "school not found");

  const update = await postJson(
    "/api/school/v1_updateSchool",
    { schoolId, name: "No School" },
    { token: superadmin.token },
  );
  assert.equal(update.status, 404);
  assert.equal(update.json.ok, false);
  assert.equal(update.json.message, "school not found");

  const del = await postJson(
    "/api/school/v1_deleteSchool",
    { schoolId },
    { token: superadmin.token },
  );
  assert.equal(del.status, 404);
  assert.equal(del.json.ok, false);
  assert.equal(del.json.message, "school not found");
});

test("school delete is blocked when linked entities exist", async () => {
  const superadmin = await registerSuperadminAndLogin({
    tag: "school_delete_guard",
  });
  const schoolId = await createSchoolAsSuperadmin({
    token: superadmin.token,
    codeSuffix: `SDG${Date.now()}`,
  });

  await registerAndLoginSchoolAdmin({
    schoolId,
    tag: "school_delete_guard",
  });

  const del = await postJson(
    "/api/school/v1_deleteSchool",
    { schoolId },
    { token: superadmin.token },
  );

  assert.equal(del.status, 409);
  assert.equal(del.json.ok, false);
  assert.equal(
    del.json.message,
    "cannot delete school with linked school admins, classrooms, or students",
  );
});
