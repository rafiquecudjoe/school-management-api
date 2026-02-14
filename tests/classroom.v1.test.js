const test = require("node:test");
const assert = require("node:assert/strict");
const {
  postJson,
  registerSuperadminAndLogin,
  createSchoolAsSuperadmin,
  registerAndLoginSchoolAdmin,
} = require("./_helpers/apiTestUtils");

test("classroom v1 CRUD works for SCHOOL_ADMIN", async () => {
  const superadmin = await registerSuperadminAndLogin({ tag: "classroom_crud" });
  const schoolId = await createSchoolAsSuperadmin({
    token: superadmin.token,
    codeSuffix: `CR${Date.now()}`,
  });
  const { token: schoolAdminToken } = await registerAndLoginSchoolAdmin({
    schoolId,
    tag: "crud",
  });

  const create = await postJson(
    "/api/classroom/v1_createClassroom",
    {
      schoolId,
      name: "Class A",
      gradeLevel: "Grade 5",
      capacity: 30,
      resources: ["Projector", "Whiteboard"],
    },
    { token: schoolAdminToken },
  );
  assert.equal(create.status, 200);
  assert.equal(create.json.ok, true);
  const classroomId = create.json?.data?.classroom?.id;
  assert.equal(typeof classroomId, "string");

  const get = await postJson(
    "/api/classroom/v1_getClassroom",
    { schoolId, classroomId },
    { token: schoolAdminToken },
  );
  assert.equal(get.status, 200);
  assert.equal(get.json.ok, true);
  assert.equal(get.json?.data?.classroom?.id, classroomId);

  const list = await postJson(
    "/api/classroom/v1_listClassrooms",
    { schoolId, limit: 10, skip: 0 },
    { token: schoolAdminToken },
  );
  assert.equal(list.status, 200);
  assert.equal(list.json.ok, true);
  assert.ok(Array.isArray(list.json?.data?.items));

  const update = await postJson(
    "/api/classroom/v1_updateClassroom",
    { schoolId, classroomId, name: "Class A Updated", capacity: 35 },
    { token: schoolAdminToken },
  );
  assert.equal(update.status, 200);
  assert.equal(update.json.ok, true);
  assert.equal(update.json?.data?.classroom?.name, "Class A Updated");

  const del = await postJson(
    "/api/classroom/v1_deleteClassroom",
    { schoolId, classroomId },
    { token: schoolAdminToken },
  );
  assert.equal(del.status, 200);
  assert.equal(del.json.ok, true);
  assert.equal(del.json?.data?.deleted, true);
});

test("classroom create fails validation for missing required fields", async () => {
  const superadmin = await registerSuperadminAndLogin({ tag: "classroom_vl" });
  const schoolId = await createSchoolAsSuperadmin({
    token: superadmin.token,
    codeSuffix: `VL${Date.now()}`,
  });
  const { token: schoolAdminToken } = await registerAndLoginSchoolAdmin({
    schoolId,
    tag: "validation",
  });

  const bad = await postJson(
    "/api/classroom/v1_createClassroom",
    { schoolId, name: "Only Name" },
    { token: schoolAdminToken },
  );

  assert.equal(bad.status, 400);
  assert.equal(bad.json.ok, false);
  assert.ok(Array.isArray(bad.json.errors));
  assert.ok(bad.json.errors.length > 0);
});

test("classroom create rejects duplicate name within same school", async () => {
  const superadmin = await registerSuperadminAndLogin({ tag: "classroom_dp" });
  const schoolId = await createSchoolAsSuperadmin({
    token: superadmin.token,
    codeSuffix: `DP${Date.now()}`,
  });
  const { token: schoolAdminToken } = await registerAndLoginSchoolAdmin({
    schoolId,
    tag: "duplicate",
  });

  const payload = {
    schoolId,
    name: "Duplicate Class",
    gradeLevel: "Grade 6",
    capacity: 25,
    resources: ["Board"],
  };

  const first = await postJson(
    "/api/classroom/v1_createClassroom",
    payload,
    { token: schoolAdminToken },
  );
  assert.equal(first.status, 200);
  assert.equal(first.json.ok, true);

  const second = await postJson(
    "/api/classroom/v1_createClassroom",
    payload,
    { token: schoolAdminToken },
  );
  assert.equal(second.status, 409);
  assert.equal(second.json.ok, false);
  assert.equal(second.json.message, "classroom already exists in school");
});

test("classroom get/update/delete return not found for unknown id", async () => {
  const superadmin = await registerSuperadminAndLogin({ tag: "classroom_nf" });
  const schoolId = await createSchoolAsSuperadmin({
    token: superadmin.token,
    codeSuffix: `NF${Date.now()}`,
  });
  const { token: schoolAdminToken } = await registerAndLoginSchoolAdmin({
    schoolId,
    tag: "notfound",
  });

  const classroomId = "non_existing_classroom_id";

  const get = await postJson(
    "/api/classroom/v1_getClassroom",
    { schoolId, classroomId },
    { token: schoolAdminToken },
  );
  assert.equal(get.status, 404);
  assert.equal(get.json.ok, false);
  assert.equal(get.json.message, "classroom not found");

  const update = await postJson(
    "/api/classroom/v1_updateClassroom",
    { schoolId, classroomId, name: "Class Not Found" },
    { token: schoolAdminToken },
  );
  assert.equal(update.status, 404);
  assert.equal(update.json.ok, false);
  assert.equal(update.json.message, "classroom not found");

  const del = await postJson(
    "/api/classroom/v1_deleteClassroom",
    { schoolId, classroomId },
    { token: schoolAdminToken },
  );
  assert.equal(del.status, 404);
  assert.equal(del.json.ok, false);
  assert.equal(del.json.message, "classroom not found");
});

test("classroom CRUD works for SUPERADMIN (full system access)", async () => {
  const superadmin = await registerSuperadminAndLogin({ tag: "classroom_rbac" });
  const schoolId = await createSchoolAsSuperadmin({
    token: superadmin.token,
    codeSuffix: `RB${Date.now()}`,
  });

  const res = await postJson(
    "/api/classroom/v1_createClassroom",
    {
      schoolId,
      name: "RBAC Class",
      gradeLevel: "Grade 7",
      capacity: 20,
      resources: ["Board"],
    },
    { token: superadmin.token },
  );

  assert.equal(res.status, 200);
  assert.equal(res.json.ok, true);
  assert.equal(typeof res.json?.data?.classroom?.id, "string");
});

test("classroom school scope denies SCHOOL_ADMIN for other school", async () => {
  const superadmin = await registerSuperadminAndLogin({ tag: "classroom_scope" });
  const schoolIdA = await createSchoolAsSuperadmin({
    token: superadmin.token,
    codeSuffix: `SC1${Date.now()}`,
  });
  const schoolIdB = await createSchoolAsSuperadmin({
    token: superadmin.token,
    codeSuffix: `SC2${Date.now()}`,
  });
  const { token: schoolAdminToken } = await registerAndLoginSchoolAdmin({
    schoolId: schoolIdA,
    tag: "scope",
  });

  const res = await postJson(
    "/api/classroom/v1_createClassroom",
    {
      schoolId: schoolIdB,
      name: "Scope Class",
      gradeLevel: "Grade 8",
      capacity: 28,
    },
    { token: schoolAdminToken },
  );

  assert.equal(res.status, 403);
  assert.equal(res.json.ok, false);
  assert.equal(res.json.message, "outside assigned school scope");
});
