const mongoose = require("mongoose");
const { nanoid } = require("nanoid");

const UserSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => nanoid(), unique: true, index: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    fullName: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ["SUPERADMIN", "SCHOOL_ADMIN"],
      required: true,
      index: true,
    },
    schoolId: { type: String, default: null, index: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "users" },
);

UserSchema.pre("validate", function () {
  if (this.role === "SCHOOL_ADMIN" && !this.schoolId) {
    throw new Error("schoolId is required for SCHOOL_ADMIN");
  }
});

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);
