const test = require("node:test");
const assert = require("node:assert/strict");
const {
    postJson,
    registerSuperadminAndLogin,
    createSchoolAsSuperadmin,
    registerAndLoginSchoolAdmin,
    createClassroom,
    createStudent,
} = require("./_helpers/apiTestUtils");

// Use short numeric suffixes to stay within the 20-char code limit
let _c = 0;
const suffix = () => `${Date.now().toString().slice(-6)}${++_c}`;

test("auth - wrong password returns error", async () => {
    const superadmin = await registerSuperadminAndLogin();
    const wrongLogin = await postJson("/api/user/v1_login", {
        email: superadmin.email,
        password: "WrongPassword123!",
    });
    assert.equal(wrongLogin.json.ok, false);
});

test("auth - missing token returns 401", async () => {
    const result = await postJson("/api/school/v1_listSchools", {});
    assert.equal(result.status, 401);
    assert.equal(result.json.ok, false);
});

test("auth - invalid token format returns 401", async () => {
    const result = await postJson(
        "/api/school/v1_listSchools",
        {},
        { token: "invalid.token.format" },
    );
    assert.equal(result.status, 401);
    assert.equal(result.json.ok, false);
});

test("RBAC - SCHOOL_ADMIN cannot create school", async () => {
    const sa = await registerSuperadminAndLogin();
    const schoolId = await createSchoolAsSuperadmin({
        token: sa.token,
        codeSuffix: suffix(),
    });
    const admin = await registerAndLoginSchoolAdmin({
        schoolId,
        tag: `r1_${suffix()}`,
    });

    const attempt = await postJson(
        "/api/school/v1_createSchool",
        { name: "Unauthorized", code: `U${suffix()}` },
        { token: admin.token },
    );

    assert.equal(attempt.status, 403);
    assert.equal(attempt.json.ok, false);
});

test("RBAC - SCHOOL_ADMIN cannot delete school", async () => {
    const sa = await registerSuperadminAndLogin();
    const schoolId = await createSchoolAsSuperadmin({
        token: sa.token,
        codeSuffix: suffix(),
    });
    const admin = await registerAndLoginSchoolAdmin({
        schoolId,
        tag: `r2_${suffix()}`,
    });

    const attempt = await postJson(
        "/api/school/v1_deleteSchool",
        { schoolId },
        { token: admin.token },
    );

    assert.equal(attempt.status, 403);
    assert.equal(attempt.json.ok, false);
});

test("RBAC - SCHOOL_ADMIN cannot access other school data", async () => {
    const sa = await registerSuperadminAndLogin();
    const schoolId1 = await createSchoolAsSuperadmin({
        token: sa.token,
        codeSuffix: suffix(),
    });
    const schoolId2 = await createSchoolAsSuperadmin({
        token: sa.token,
        codeSuffix: suffix(),
    });
    const admin1 = await registerAndLoginSchoolAdmin({
        schoolId: schoolId1,
        tag: `sc_${suffix()}`,
    });

    const attempt = await postJson(
        "/api/classroom/v1_listClassrooms",
        { schoolId: schoolId2 },
        { token: admin1.token },
    );

    assert.equal(attempt.status, 403);
    assert.equal(attempt.json.ok, false);
});

test("validation - empty school name rejected", async () => {
    const sa = await registerSuperadminAndLogin();
    const result = await postJson(
        "/api/school/v1_createSchool",
        { name: "", code: `T${suffix()}` },
        { token: sa.token },
    );
    assert.equal(result.status, 400);
    assert.equal(result.json.ok, false);
});

test("validation - missing required field rejected", async () => {
    const sa = await registerSuperadminAndLogin();
    const result = await postJson(
        "/api/school/v1_createSchool",
        { name: "Test School" },
        { token: sa.token },
    );
    assert.equal(result.status, 400);
    assert.equal(result.json.ok, false);
});

test("validation - invalid email format rejected", async () => {
    const sa = await registerSuperadminAndLogin();
    const result = await postJson(
        "/api/school/v1_createSchool",
        { name: "Test", code: `E${suffix()}`, email: "not-an-email" },
        { token: sa.token },
    );
    assert.equal(result.status, 400);
    assert.equal(result.json.ok, false);
});

test("business rule - duplicate school code rejected", async () => {
    const sa = await registerSuperadminAndLogin();
    const code = `D${suffix()}`;

    await postJson(
        "/api/school/v1_createSchool",
        { name: "School 1", code },
        { token: sa.token },
    );

    const dup = await postJson(
        "/api/school/v1_createSchool",
        { name: "School 2", code },
        { token: sa.token },
    );

    assert.ok(dup.status >= 400);
    assert.equal(dup.json.ok, false);
});

test("business rule - cannot delete school with classrooms", async () => {
    const sa = await registerSuperadminAndLogin();
    const schoolId = await createSchoolAsSuperadmin({
        token: sa.token,
        codeSuffix: suffix(),
    });
    const admin = await registerAndLoginSchoolAdmin({
        schoolId,
        tag: `dl_${suffix()}`,
    });

    await createClassroom({ schoolId, token: admin.token, tag: `dl_${suffix()}` });

    const attempt = await postJson(
        "/api/school/v1_deleteSchool",
        { schoolId },
        { token: sa.token },
    );

    assert.equal(attempt.status, 409);
    assert.equal(attempt.json.ok, false);
    assert.ok(attempt.json.message.includes("cannot delete"));
});

test("business rule - classroom at capacity rejects enrollment", async () => {
    const sa = await registerSuperadminAndLogin();
    const schoolId = await createSchoolAsSuperadmin({
        token: sa.token,
        codeSuffix: suffix(),
    });
    const admin = await registerAndLoginSchoolAdmin({
        schoolId,
        tag: `cp_${suffix()}`,
    });

    const classroom = await createClassroom({
        schoolId,
        token: admin.token,
        tag: `cp_${suffix()}`,
        capacity: 1,
    });

    await createStudent({
        schoolId,
        classroomId: classroom.id,
        token: admin.token,
        tag: `s1_${suffix()}`,
    });

    const overflow = await postJson(
        "/api/student/v1_createStudent",
        {
            schoolId,
            classroomId: classroom.id,
            firstName: "Overflow",
            lastName: "Student",
            dob: "2010-05-05",
            studentNumber: `OV${suffix()}`,
        },
        { token: admin.token },
    );

    assert.equal(overflow.status, 409);
    assert.equal(overflow.json.ok, false);
    assert.ok(overflow.json.message.includes("at capacity"));
});

test("business rule - get non-existent student returns 404", async () => {
    const sa = await registerSuperadminAndLogin();
    const schoolId = await createSchoolAsSuperadmin({
        token: sa.token,
        codeSuffix: suffix(),
    });
    const admin = await registerAndLoginSchoolAdmin({
        schoolId,
        tag: `nf_${suffix()}`,
    });

    const result = await postJson(
        "/api/student/v1_getStudent",
        { schoolId, studentId: "nonexistent123" },
        { token: admin.token },
    );

    assert.equal(result.status, 404);
    assert.equal(result.json.ok, false);
    assert.ok(result.json.message.includes("not found"));
});

test("edge case - list with skip beyond total returns empty", async () => {
    const sa = await registerSuperadminAndLogin();
    const schoolId = await createSchoolAsSuperadmin({
        token: sa.token,
        codeSuffix: suffix(),
    });
    const admin = await registerAndLoginSchoolAdmin({
        schoolId,
        tag: `sk_${suffix()}`,
    });

    const result = await postJson(
        "/api/student/v1_listStudents",
        { schoolId, skip: 9999, limit: 10 },
        { token: admin.token },
    );

    assert.equal(result.status, 200);
    assert.equal(result.json.ok, true);
    assert.equal(result.json.data.items.length, 0);
});

test("edge case - list limit capped at 100", async () => {
    const sa = await registerSuperadminAndLogin();
    const schoolId = await createSchoolAsSuperadmin({
        token: sa.token,
        codeSuffix: suffix(),
    });
    const admin = await registerAndLoginSchoolAdmin({
        schoolId,
        tag: `lm_${suffix()}`,
    });

    const result = await postJson(
        "/api/student/v1_listStudents",
        { schoolId, limit: 999 },
        { token: admin.token },
    );

    assert.equal(result.status, 200);
    assert.equal(result.json.ok, true);
    assert.equal(result.json.data.page.limit, 100);
});
