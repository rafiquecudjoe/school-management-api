module.exports = {
  createStudent: [
    { key: "schoolId", model: "schoolId", required: true },
    { key: "classroomId", model: "classroomId", required: false },
    { key: "firstName", model: "firstName", required: true },
    { key: "lastName", model: "lastName", required: true },
    { key: "dob", model: "dob", required: true },
    { key: "studentNumber", model: "studentNumber", required: true },
  ],

  getStudent: [
    { key: "schoolId", model: "schoolId", required: true },
    { key: "studentId", model: "studentId", required: true },
  ],

  listStudents: [
    { key: "schoolId", model: "schoolId", required: false },
    { key: "q", model: "text", required: false },
    { key: "limit", model: "number", required: false },
    { key: "skip", model: "number", required: false },
    { key: "status", model: "text", required: false },
    { key: "classroomId", model: "classroomId", required: false },
  ],

  updateStudent: [
    { key: "schoolId", model: "schoolId", required: true },
    { key: "studentId", model: "studentId", required: true },
    { key: "classroomId", model: "classroomId", required: false },
    { key: "firstName", model: "firstName", required: false },
    { key: "lastName", model: "lastName", required: false },
    { key: "dob", model: "dob", required: false },
    { key: "studentNumber", model: "studentNumber", required: false },
    { key: "status", model: "text", required: false },
  ],

  deleteStudent: [
    { key: "schoolId", model: "schoolId", required: true },
    { key: "studentId", model: "studentId", required: true },
  ],

  transferStudent: [
    { key: "schoolId", model: "schoolId", required: true },
    { key: "studentId", model: "studentId", required: true },
    { key: "toClassroomId", model: "toClassroomId", required: true },
  ],
};