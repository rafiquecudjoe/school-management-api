module.exports = {
  createClassroom: [
    { key: "schoolId", model: "schoolId", required: true },
    { key: "name", model: "schoolName", required: true },
    { key: "gradeLevel", model: "text", required: true },
    { key: "capacity", model: "number", required: true },
    { key: "resources", model: "arrayOfStrings", required: false },
  ],

  getClassroom: [{ key: "classroomId", model: "classroomId", required: true }],

  listClassrooms: [
    { key: "schoolId", model: "schoolId", required: false },
    { key: "q", model: "text", required: false },
    { key: "limit", model: "number", required: false },
    { key: "skip", model: "number", required: false },
    { key: "isActive", model: "bool", required: false },
  ],

  updateClassroom: [
    { key: "classroomId", model: "classroomId", required: true },
    { key: "schoolId", model: "schoolId", required: true },
    { key: "name", model: "schoolName", required: false },
    { key: "gradeLevel", model: "text", required: false },
    { key: "capacity", model: "number", required: false },
    { key: "resources", model: "arrayOfStrings", required: false },
    { key: "isActive", model: "bool", required: false },
  ],

  deleteClassroom: [
    { key: "classroomId", model: "classroomId", required: true },
    { key: "schoolId", model: "schoolId", required: true },
  ],
};