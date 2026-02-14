const mongoose = require("mongoose");
const { nanoid } = require("nanoid");

const SchoolSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => nanoid(), unique: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    address: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    email: { type: String, default: "", lowercase: true, trim: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: "schools" },
);

module.exports =
  mongoose.models.School || mongoose.model("School", SchoolSchema);
