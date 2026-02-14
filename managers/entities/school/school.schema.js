module.exports = {
  createSchool: [
    { key: "name", model: "schoolName", required: true },
    { key: "code", model: "schoolCode", required: true },
    { key: "address", model: "longText", required: false },
    { key: "phone", model: "text", required: false },
    { key: "email", model: "email", required: false },
  ],

  updateSchool: [
    { key: "schoolId", model: "schoolId", required: true },
    { key: "name", model: "schoolName", required: false },
    { key: "code", model: "schoolCode", required: false },
    { key: "address", model: "longText", required: false },
    { key: "phone", model: "text", required: false },
    { key: "email", model: "email", required: false },
    { key: "isActive", model: "bool", required: false },
  ],

  getSchool: [{ key: "schoolId", model: "schoolId", required: true }],

  deleteSchool: [{ key: "schoolId", model: "schoolId", required: true }],

  listSchools: [
    { key: "q", model: "text", required: false },
    { key: "limit", model: "number", required: false },
    { key: "skip", model: "number", required: false },
    { key: "isActive", model: "bool", required: false },
  ],
};