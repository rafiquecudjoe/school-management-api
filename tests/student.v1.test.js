const test = require("node:test");
const assert = require("node:assert/strict");
const {
  postJson,
  registerSuperadminAndLogin,
  createSchoolAsSuperadmin,
  registerAndLoginSchoolAdmin,
} = require("./_helpers/apiTestUtils");

async function createClassroomAsSchoolAdmin({ token, schoolId, suffix }) {
  const res = await postJson(
    "/api/classroom/v1_createClassroom",
    {
      schoolId,
      name: `Class ${suffix}`,
      gradeLevel: "Grade 5",
      capacity: 30,
      resources: ["Projector"],
    },
    { token },
  );
  assert.equal(res.status, 200);
  assert.equal(res.json.ok, true);
  const classroomId = res.json?.data?.classroom?.id;
  assert.equal(typeof classroomId, "string");
  return classroomId;
}

test("student v1 CRUD and transfer work for SCHOOL_ADMIN", async () => {
  const superadmin = await registerSuperadminAndLogin({ tag: "student_crud" });
  const schoolId = await createSchoolAsSuperadmin({
    token: superadmin.token,
    codeSuffix: `ST${Date.now()}`,
  });
  const { token: schoolAdminToken } = await registerAndLoginSchoolAdmin({
    schoolId,
    tag: "student_crud",
  });

  const classroomA = await createClassroomAsSchoolAdmin({
    token: schoolAdminToken,
    schoolId,
    suffix: `A${Date.now()}`,
  });
  const classroomB = await createClassroomAsSchoolAdmin({
    token: schoolAdminToken,
    schoolId,
    suffix: `B${Date.now()}`,
  });

  const studentNumber = `STU${Date.now()}`;
  const create = await postJson(
    "/api/student/v1_createStudent",
    {
      schoolId,
      classroomId: classroomA,
      firstName: "John",
      lastName: "Doe",
      dob: "2010-04-15",
      studentNumber,
    },
    { token: schoolAdminToken },
  );
  assert.equal(create.status, 200);
  assert.equal(create.json.ok, true);
  const studentId = create.json?.data?.student?.id;
  assert.equal(typeof studentId, "string");

  const get = await postJson(
    "/api/student/v1_getStudent",
    { schoolId, studentId },
    { token: schoolAdminToken },
  );
  assert.equal(get.status, 200);
  assert.equal(get.json.ok, true);
  assert.equal(get.json?.data?.student?.id, studentId);

  const list = await postJson(
    "/api/student/v1_listStudents",
    { schoolId, limit: 10, skip: 0 },
    { token: schoolAdminToken },
  );
  assert.equal(list.status, 200);
  assert.equal(list.json.ok, true);
  assert.ok(Array.isArray(list.json?.data?.items));

  const update = await postJson(
    "/api/student/v1_updateStudent",
    {
      schoolId,
      studentId,
      firstName: "Jane",
      status: "INACTIVE",
    },
    { token: schoolAdminToken },
  );
  assert.equal(update.status, 200);
  assert.equal(update.json.ok, true);
  assert.equal(update.json?.data?.student?.firstName, "Jane");
  assert.equal(update.json?.data?.student?.status, "INACTIVE");

  const transfer = await postJson(
    "/api/student/v1_transferStudent",
    { schoolId, studentId, toClassroomId: classroomB },
    { token: schoolAdminToken },
  );
  assert.equal(transfer.status, 200);
  assert.equal(transfer.json.ok, true);
  assert.equal(transfer.json?.data?.transferred, true);
  assert.equal(transfer.json?.data?.student?.classroomId, classroomB);

  const del = await postJson(
    "/api/student/v1_deleteStudent",
    { schoolId, studentId },
    { token: schoolAdminToken },
  );
  assert.equal(del.status, 200);
  assert.equal(del.json.ok, true);
  assert.equal(del.json?.data?.deleted, true);
});

test("student create fails validation for missing required fields", async () => {
  const superadmin = await registerSuperadminAndLogin({ tag: "student_vl" });
  const schoolId = await createSchoolAsSuperadmin({
    token: superadmin.token,
    codeSuffix: `SVL${Date.now()}`,
  });
  const { token: schoolAdminToken } = await registerAndLoginSchoolAdmin({
    schoolId,
    tag: "student_vl",
  });

  const bad = await postJson(
    "/api/student/v1_createStudent",
    { schoolId, firstName: "Only" },
    { token: schoolAdminToken },
  );
  assert.equal(bad.status, 400);
  assert.equal(bad.json.ok, false);
  assert.ok(Array.isArray(bad.json.errors));
  assert.ok(bad.json.errors.length > 0);
});

test("student create rejects invalid dob format", async () => {
  const superadmin = await registerSuperadminAndLogin({ tag: "student_dob" });
  const schoolId = await createSchoolAsSuperadmin({
    token: superadmin.token,
    codeSuffix: `SDB${Date.now()}`,
  });
  const { token: schoolAdminToken } = await registerAndLoginSchoolAdmin({
    schoolId,
    tag: "student_dob",
  });

  const res = await postJson(
    "/api/student/v1_createStudent",
    {
      schoolId,
      firstName: "Invalid",
      lastName: "Dob",
      dob: "not-a-date",
      studentNumber: `STU${Date.now()}`,
    },
    { token: schoolAdminToken },
  );
  assert.equal(res.status, 400);
  assert.equal(res.json.ok, false);
  assert.equal(res.json.message, "dob must be a valid date string");
});

test("student create rejects duplicate studentNumber in same school", async () => {
  const superadmin = await registerSuperadminAndLogin({ tag: "student_dup" });
  const schoolId = await createSchoolAsSuperadmin({
    token: superadmin.token,
    codeSuffix: `SDP${Date.now()}`,
  });
  const { token: schoolAdminToken } = await registerAndLoginSchoolAdmin({
    schoolId,
    tag: "student_dup",
  });

  const studentNumber = `STU${Date.now()}`;
  const payload = {
    schoolId,
    firstName: "Al",
    lastName: "Bo",
    dob: "2011-01-01",
    studentNumber,
  };
  const first = await postJson("/api/student/v1_createStudent", payload, {
    token: schoolAdminToken,
  });
  assert.equal(first.status, 200);
  assert.equal(first.json.ok, true);

  const second = await postJson("/api/student/v1_createStudent", payload, {
    token: schoolAdminToken,
  });
  assert.equal(second.status, 409);
  assert.equal(second.json.ok, false);
  assert.equal(second.json.message, "studentNumber already exists in school");
});

test("student get/update/delete return not found for unknown id", async () => {
  const superadmin = await registerSuperadminAndLogin({ tag: "student_nf" });
  const schoolId = await createSchoolAsSuperadmin({
    token: superadmin.token,
    codeSuffix: `SNF${Date.now()}`,
  });
  const { token: schoolAdminToken } = await registerAndLoginSchoolAdmin({
    schoolId,
    tag: "student_nf",
  });
  const studentId = "non_existing_student_id";

  const get = await postJson(
    "/api/student/v1_getStudent",
    { schoolId, studentId },
    { token: schoolAdminToken },
  );
  assert.equal(get.status, 404);
  assert.equal(get.json.ok, false);
  assert.equal(get.json.message, "student not found");

  const update = await postJson(
    "/api/student/v1_updateStudent",
    { schoolId, studentId, firstName: "Nope" },
    { token: schoolAdminToken },
  );
  assert.equal(update.status, 404);
  assert.equal(update.json.ok, false);
  assert.equal(update.json.message, "student not found");

  const del = await postJson(
    "/api/student/v1_deleteStudent",
    { schoolId, studentId },
    { token: schoolAdminToken },
  );
  assert.equal(del.status, 404);
  assert.equal(del.json.ok, false);
  assert.equal(del.json.message, "student not found");
});

test("student CRUD works for SUPERADMIN (full system access)", async () => {
  const superadmin = await registerSuperadminAndLogin({ tag: "student_rbac" });
  const schoolId = await createSchoolAsSuperadmin({
    token: superadmin.token,
    codeSuffix: `SRB${Date.now()}`,
  });

  // SUPERADMIN can create a classroom directly (full system access)
  const classroomRes = await postJson(
    "/api/classroom/v1_createClassroom",
    {
      schoolId,
      name: `RBAC Student Class ${Date.now()}`,
      gradeLevel: "Grade 5",
      capacity: 30,
      resources: ["Board"],
    },
    { token: superadmin.token },
  );
  assert.equal(classroomRes.status, 200);
  const classroomId = classroomRes.json?.data?.classroom?.id;

  const res = await postJson(
    "/api/student/v1_createStudent",
    {
      schoolId,
      classroomId,
      firstName: "Super",
      lastName: "Access",
      dob: "2010-01-01",
      studentNumber: `STU${Date.now()}`,
    },
    { token: superadmin.token },
  );
  assert.equal(res.status, 200);
  assert.equal(res.json.ok, true);
  assert.equal(typeof res.json?.data?.student?.id, "string");
});

test("student school scope denies SCHOOL_ADMIN for other school", async () => {
  const superadmin = await registerSuperadminAndLogin({ tag: "student_scope" });
  const schoolIdA = await createSchoolAsSuperadmin({
    token: superadmin.token,
    codeSuffix: `SSA${Date.now()}`,
  });
  const schoolIdB = await createSchoolAsSuperadmin({
    token: superadmin.token,
    codeSuffix: `SSB${Date.now()}`,
  });

  const { token: schoolAdminToken } = await registerAndLoginSchoolAdmin({
    schoolId: schoolIdA,
    tag: "student_scope",
  });

  const res = await postJson(
    "/api/student/v1_createStudent",
    {
      schoolId: schoolIdB,
      firstName: "Wrong",
      lastName: "Scope",
      dob: "2010-01-01",
      studentNumber: `STU${Date.now()}`,
    },
    { token: schoolAdminToken },
  );
  assert.equal(res.status, 403);
  assert.equal(res.json.ok, false);
  assert.equal(res.json.message, "outside assigned school scope");
});

test("student transfer fails when student is not found", async () => {
  const superadmin = await registerSuperadminAndLogin({ tag: "transfer_missing_student" });
  const schoolId = await createSchoolAsSuperadmin({
    token: superadmin.token,
    codeSuffix: `TMS${Date.now()}`,
  });
  const { token: schoolAdminToken } = await registerAndLoginSchoolAdmin({
    schoolId,
    tag: "transfer_missing_student",
  });
  const classroomId = await createClassroomAsSchoolAdmin({
    token: schoolAdminToken,
    schoolId,
    suffix: `TMSC${Date.now()}`,
  });

  const res = await postJson(
    "/api/student/v1_transferStudent",
    {
      schoolId,
      studentId: "missing_student_id",
      toClassroomId: classroomId,
    },
    { token: schoolAdminToken },
  );
  assert.equal(res.status, 404);
  assert.equal(res.json.ok, false);
  assert.equal(res.json.message, "student not found");
});

test("student transfer fails when target classroom is outside school", async () => {
  const superadmin = await registerSuperadminAndLogin({ tag: "transfer_other_school_classroom" });
  const schoolIdA = await createSchoolAsSuperadmin({
    token: superadmin.token,
    codeSuffix: `TSA${Date.now()}`,
  });
  const schoolIdB = await createSchoolAsSuperadmin({
    token: superadmin.token,
    codeSuffix: `TSB${Date.now()}`,
  });

  const { token: schoolAdminToken } = await registerAndLoginSchoolAdmin({
    schoolId: schoolIdA,
    tag: "transfer_other_school_classroom",
  });

  const classroomA = await createClassroomAsSchoolAdmin({
    token: schoolAdminToken,
    schoolId: schoolIdA,
    suffix: `TSCA${Date.now()}`,
  });

  const studentCreate = await postJson(
    "/api/student/v1_createStudent",
    {
      schoolId: schoolIdA,
      classroomId: classroomA,
      firstName: "Tran",
      lastName: "Sfer",
      dob: "2010-01-01",
      studentNumber: `STU${Date.now()}`,
    },
    { token: schoolAdminToken },
  );
  assert.equal(studentCreate.status, 200);
  const studentId = studentCreate.json?.data?.student?.id;
  assert.equal(typeof studentId, "string");

  const { token: schoolAdminTokenB } = await registerAndLoginSchoolAdmin({
    schoolId: schoolIdB,
    tag: "transfer_other_school_classroom_b",
  });
  const classroomB = await createClassroomAsSchoolAdmin({
    token: schoolAdminTokenB,
    schoolId: schoolIdB,
    suffix: `TSCB${Date.now()}`,
  });

  const transfer = await postJson(
    "/api/student/v1_transferStudent",
    {
      schoolId: schoolIdA,
      studentId,
      toClassroomId: classroomB,
    },
    { token: schoolAdminToken },
  );
  assert.equal(transfer.status, 404);
  assert.equal(transfer.json.ok, false);
  assert.equal(transfer.json.message, "target classroom not found in school");
});
