const emojis = require("../../public/emojis.data.json");

module.exports = {
  id: {
    path: "id",
    type: "string",
    length: { min: 1, max: 50 },
  },
  username: {
    path: "username",
    type: "string",
    length: { min: 3, max: 20 },
    custom: "username",
  },
  password: {
    path: "password",
    type: "string",
    length: { min: 8, max: 100 },
  },
  email: {
    path: "email",
    type: "String",
    length: { min: 3, max: 100 },
    regex:
      /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
  },
  title: {
    path: "title",
    type: "string",
    length: { min: 3, max: 300 },
  },
  fullName: {
    path: "fullName",
    type: "string",
    length: { min: 3, max: 300 },
  },
  schoolName: {
    path: "name",
    type: "string",
    length: { min: 3, max: 300 },
  },
    studentId: {
    path: "studentId",
    type: "string",
    length: { min: 1, max: 50 },
  },
  firstName: {
    path: "firstName",
    type: "string",
    length: { min: 2, max: 80 },
  },
  lastName: {
    path: "lastName",
    type: "string",
    length: { min: 2, max: 80 },
  },
  studentNumber: {
    path: "studentNumber",
    type: "string",
    length: { min: 3, max: 40 },
  },
  dob: {
    path: "dob",
    type: "string",
    length: { min: 8, max: 30 },
  },
  label: {
    path: "label",
    type: "string",
    length: { min: 3, max: 100 },
  },
  shortDesc: {
    path: "desc",
    type: "string",
    length: { min: 3, max: 300 },
  },
  longDesc: {
    path: "desc",
    type: "string",
    length: { min: 3, max: 2000 },
  },
  url: {
    path: "url",
    type: "string",
    length: { min: 9, max: 300 },
  },
  emoji: {
    path: "emoji",
    type: "Array",
    items: {
      type: "string",
      length: { min: 1, max: 10 },
      oneOf: emojis.value,
    },
    },
    schoolCode: {
    path: "code",
    type: "string",
    length: { min: 2, max: 20 },
  },
  schoolId: {
    path: "schoolId",
    type: "string",
    length: { min: 1, max: 50 },
  },
  classroomId: {
    path: "classroomId",
    type: "string",
    length: { min: 1, max: 50 },
  },
  toClassroomId: {
    path: "toClassroomId",
    type: "string",
    length: { min: 1, max: 50 },
  },
  price: {
    path: "price",
    type: "number",
  },
  avatar: {
    path: "avatar",
    type: "string",
    length: { min: 8, max: 100 },
  },
  text: {
    type: "String",
    length: { min: 3, max: 100 },
  },
  longText: {
    type: "String",
    length: { min: 3, max: 250 },
  },
  paragraph: {
    type: "String",
    length: { min: 3, max: 10000 },
  },
  phone: {
    type: "String",
    length: 13,
  },
  number: {
    type: "Number",
    length: { min: 1, max: 6 },
  },
  arrayOfStrings: {
    type: "Array",
    items: {
      type: "String",
      length: { min: 3, max: 100 },
    },
  },
  obj: {
    type: "Object",
  },
  bool: {
    type: "Boolean",
  },
};
