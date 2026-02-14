const assert = require("node:assert/strict");

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:5112";
const TEST_SUPERADMIN_EMAIL =
  process.env.TEST_SUPERADMIN_EMAIL || "superadmin_root@example.com";
const TEST_SUPERADMIN_PASSWORD =
  process.env.TEST_SUPERADMIN_PASSWORD || "Pass@1234";
const TEST_SUPERADMIN_FULL_NAME =
  process.env.TEST_SUPERADMIN_FULL_NAME || "Superadmin User";

async function postJson(path, body, extraHeaders = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...extraHeaders },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const json = await response.json();
    return { status: response.status, json };
  } finally {
    clearTimeout(timeout);
  }
}

async function registerSuperadminAndLogin({ tag = "sa" } = {}) {
  const email = TEST_SUPERADMIN_EMAIL;
  const password = TEST_SUPERADMIN_PASSWORD;
  const fullName = TEST_SUPERADMIN_FULL_NAME;

  const firstLogin = await postJson("/api/user/v1_login", { email, password });
  if (firstLogin.status === 200 && firstLogin.json.ok === true) {
    const token = firstLogin.json?.data?.longToken;
    assert.equal(typeof token, "string");
    assert.ok(token.length > 20);
    return { email, password, token };
  }

  const registerHeaders = {};
  if (process.env.TEST_SUPERADMIN_BOOTSTRAP_TOKEN) {
    registerHeaders.token = process.env.TEST_SUPERADMIN_BOOTSTRAP_TOKEN;
  }

  const register = await postJson(
    "/api/user/v1_register",
    {
      email,
      password,
      fullName,
      role: "SUPERADMIN",
    },
    registerHeaders,
  );
  assert.equal(
    register.status === 200 ||
    (register.status === 400 &&
      register.json &&
      register.json.message === "email already exists"),
    true,
  );

  const login = await postJson("/api/user/v1_login", { email, password });
  assert.equal(login.status, 200);
  assert.equal(login.json.ok, true);
  const token = login.json?.data?.longToken;
  assert.equal(typeof token, "string");
  assert.ok(token.length > 20);

  return { email, password, token };
}

async function createSchoolAsSuperadmin({ token, codeSuffix }) {
  const res = await postJson(
    "/api/school/v1_createSchool",
    {
      name: `School ${codeSuffix}`,
      code: `SCH${codeSuffix}`,
      address: "Main Street",
      phone: "1234567890",
      email: `school_${codeSuffix}@example.com`,
    },
    { token },
  );
  assert.equal(res.status, 200);
  assert.equal(res.json.ok, true);
  const schoolId = res.json?.data?.school?.id;
  assert.equal(typeof schoolId, "string");
  return schoolId;
}

async function registerAndLoginSchoolAdmin({ schoolId, tag = "admin" }) {
  const email = `schooladmin_${tag}_${Date.now()}@example.com`;
  const password = "Pass@1234";

  const register = await postJson("/api/user/v1_register", {
    email,
    password,
    fullName: "School Admin User",
    role: "SCHOOL_ADMIN",
    schoolId,
  });
  assert.equal(register.status, 200);
  assert.equal(register.json.ok, true);

  const login = await postJson("/api/user/v1_login", { email, password });
  assert.equal(login.status, 200);
  assert.equal(login.json.ok, true);
  const token = login.json?.data?.longToken;
  assert.equal(typeof token, "string");
  assert.ok(token.length > 20);

  return { email, password, token };
}

async function createClassroom({
  schoolId,
  token,
  tag = "class",
  capacity = 30,
}) {
  const res = await postJson(
    "/api/classroom/v1_createClassroom",
    {
      schoolId,
      name: `Classroom ${tag}`,
      gradeLevel: "Grade 1",
      capacity,
      resources: ["books", "desks"],
    },
    { token },
  );
  if (res.status !== 200 || !res.json.ok) {
    console.error("createClassroom FAILED:", res.status, JSON.stringify(res.json));
  }
  assert.equal(res.status, 200);
  assert.equal(res.json.ok, true);
  const classroomId = res.json?.data?.classroom?.id;
  assert.equal(typeof classroomId, "string");
  return { id: classroomId, ...res.json.data.classroom };
}

async function createStudent({
  schoolId,
  classroomId = null,
  token,
  tag = "stu",
}) {
  const res = await postJson(
    "/api/student/v1_createStudent",
    {
      schoolId,
      classroomId,
      firstName: `First${tag}`,
      lastName: `Last${tag}`,
      dob: "2010-01-01",
      studentNumber: `STU${tag}${Date.now()}`,
    },
    { token },
  );
  assert.equal(res.status, 200);
  assert.equal(res.json.ok, true);
  const studentId = res.json?.data?.student?.id;
  assert.equal(typeof studentId, "string");
  return { id: studentId, ...res.json.data.student };
}

const mongoose = require("mongoose");
const { exec } = require("child_process");

async function resetDb() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/axion";
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();

    // Flush Redis with timeout
    await new Promise((resolve) => {
      const proc = exec("redis-cli flushall", (err) => {
        if (err) console.error("Redis flush failed:", err.message);
        resolve();
      });
      setTimeout(() => {
        // If redis hangs, just resolve
        resolve();
      }, 1000);
    });
  } catch (err) {
    console.error("Reset DB failed:", err);
  }
}

module.exports = {
  postJson,
  registerSuperadminAndLogin,
  createSchoolAsSuperadmin,
  registerAndLoginSchoolAdmin,
  createClassroom,
  createStudent,
  resetDb,
};
