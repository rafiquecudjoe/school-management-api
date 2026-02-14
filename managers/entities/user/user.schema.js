module.exports = {
  register: [
    { key: "email", model: "email", required: true },
    { key: "password", model: "password", required: true },
    { key: "fullName", model: "fullName", required: true },
    { key: "role", model: "text", required: false }, // SUPERADMIN | SCHOOL_ADMIN
    { key: "schoolId", model: "id", required: false },
  ],

  login: [
    { key: "email", model: "email", required: true },
    { key: "password", model: "password", required: true },
  ],
};
