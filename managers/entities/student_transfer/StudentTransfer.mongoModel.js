const mongoose = require("mongoose");
const { nanoid } = require("nanoid");

const StudentTransferSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => nanoid(), unique: true, index: true },
    studentId: { type: String, required: true, index: true },
    fromSchoolId: { type: String, required: true, index: true },
    toSchoolId: { type: String, required: true, index: true },
    reason: { type: String, required: true, trim: true },
    transferredBy: { type: String, required: true, index: true },
    transferredAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true, collection: "student_transfers" },
);

module.exports =
  mongoose.models.StudentTransfer ||
  mongoose.model("StudentTransfer", StudentTransferSchema);
