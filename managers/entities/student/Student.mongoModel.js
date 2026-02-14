const mongoose = require("mongoose");
const { nanoid } = require("nanoid");

const StudentSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => nanoid(), unique: true, index: true },
    schoolId: { type: String, required: true, index: true },
    classroomId: { type: String, default: null, index: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    dob: { type: Date, required: true },
    studentNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
      index: true,
    },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, collection: "students" },
);

StudentSchema.index({ schoolId: 1, studentNumber: 1 }, { unique: true });

module.exports =
  mongoose.models.Student || mongoose.model("Student", StudentSchema);
