const mongoose = require("mongoose");
const { nanoid } = require("nanoid");

const ClassroomSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => nanoid(), unique: true, index: true },
    schoolId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    gradeLevel: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true, min: 1 },
    resources: { type: [String], default: [] },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: "classrooms" },
);

ClassroomSchema.index({ schoolId: 1, name: 1 }, { unique: true });

module.exports =
  mongoose.models.Classroom || mongoose.model("Classroom", ClassroomSchema);