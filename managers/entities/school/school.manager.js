function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = class School {
  constructor({ validators, mongomodels }) {
    this.validators = validators;
    this.mongomodels = mongomodels;

    // /api/school/:fnName
    this.httpExposed = [
      "v1_createSchool",
      "v1_getSchool",
      "v1_listSchools",
      "v1_updateSchool",
      "v1_deleteSchool",
    ];
  }



  _schoolResponse(doc) {
    return {
      id: doc.id,
      name: doc.name,
      code: doc.code,
      address: doc.address || "",
      phone: doc.phone || "",
      email: doc.email || "",
      isActive: doc.isActive,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  _validationErrors(validation) {
    if (!validation) return null;
    if (Array.isArray(validation)) return validation;
    if (Array.isArray(validation.errors) && validation.errors.length > 0) {
      return validation.errors;
    }
    if (Array.isArray(validation.data) && validation.data.length > 0) {
      return validation.data;
    }
    return [validation];
  }

  async v1_createSchool({
    __authUser,
    __superAdmin,
    name,
    code,
    address = "",
    phone = "",
    email = "",
  }) {
    const payload = { name, code, address, phone, email };
    const validation = await this.validators.school.createSchool(payload);
    const validationErrors = this._validationErrors(validation);
    if (validationErrors) return { errors: validationErrors };

    const SchoolModel = this.mongomodels.School;
    if (!SchoolModel) return { error: "School mongo model not found" };

    const normalizedCode = String(code).trim().toUpperCase();
    const exists = await SchoolModel.findOne({ code: normalizedCode }).lean();
    if (exists) return { error: "school code already exists" };

    const created = await SchoolModel.create({
      name: String(name).trim(),
      code: normalizedCode,
      address: String(address || "").trim(),
      phone: String(phone || "").trim(),
      email: String(email || "")
        .toLowerCase()
        .trim(),
      isActive: true,
    });

    return { school: this._schoolResponse(created) };
  }

  async v1_getSchool({ __authUser, __superAdmin, schoolId }) {
    const validation = await this.validators.school.getSchool({ schoolId });
    const validationErrors = this._validationErrors(validation);
    if (validationErrors) return { errors: validationErrors };

    const SchoolModel = this.mongomodels.School;
    if (!SchoolModel) return { error: "School mongo model not found" };

    const school = await SchoolModel.findOne({ id: schoolId }).lean();
    if (!school) return { error: "school not found" };

    return { school: this._schoolResponse(school) };
  }

  async v1_listSchools({
    __authUser,
    __superAdmin,
    q,
    limit = 20,
    skip = 0,
    isActive,
  }) {
    const payload = { q, limit, skip, isActive };
    const validation = await this.validators.school.listSchools(payload);
    const validationErrors = this._validationErrors(validation);
    if (validationErrors) return { errors: validationErrors };

    const SchoolModel = this.mongomodels.School;
    if (!SchoolModel) return { error: "School mongo model not found" };

    const filter = {};
    if (typeof isActive === "boolean") filter.isActive = isActive;
    if (q) {
      filter.$or = [
        { name: { $regex: escapeRegex(q), $options: "i" } },
        { code: { $regex: escapeRegex(q), $options: "i" } },
      ];
    }

    const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));
    const safeSkip = Math.max(0, Number(skip) || 0);

    const [items, total] = await Promise.all([
      SchoolModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(safeSkip)
        .limit(safeLimit)
        .lean(),
      SchoolModel.countDocuments(filter),
    ]);

    return {
      items: items.map((i) => this._schoolResponse(i)),
      page: { total, limit: safeLimit, skip: safeSkip },
    };
  }

  async v1_updateSchool({
    __authUser,
    __superAdmin,
    schoolId,
    name,
    code,
    address,
    phone,
    email,
    isActive,
  }) {
    const payload = { schoolId, name, code, address, phone, email, isActive };
    const validation = await this.validators.school.updateSchool(payload);
    const validationErrors = this._validationErrors(validation);
    if (validationErrors) return { errors: validationErrors };

    const SchoolModel = this.mongomodels.School;
    if (!SchoolModel) return { error: "School mongo model not found" };

    const school = await SchoolModel.findOne({ id: schoolId });
    if (!school) return { error: "school not found" };

    if (code && String(code).trim().toUpperCase() !== school.code) {
      const codeExists = await SchoolModel.findOne({
        code: String(code).trim().toUpperCase(),
      }).lean();
      if (codeExists) return { error: "school code already exists" };
      school.code = String(code).trim().toUpperCase();
    }

    if (typeof name === "string") school.name = name.trim();
    if (typeof address === "string") school.address = address.trim();
    if (typeof phone === "string") school.phone = phone.trim();
    if (typeof email === "string") school.email = email.toLowerCase().trim();
    if (typeof isActive === "boolean") school.isActive = isActive;

    await school.save();
    return { school: this._schoolResponse(school) };
  }

  async v1_deleteSchool({ __authUser, __superAdmin, schoolId }) {
    const validation = await this.validators.school.deleteSchool({ schoolId });
    const validationErrors = this._validationErrors(validation);
    if (validationErrors) return { errors: validationErrors };

    const SchoolModel = this.mongomodels.School;
    if (!SchoolModel) return { error: "School mongo model not found" };
    const UserModel = this.mongomodels.User;
    const ClassroomModel = this.mongomodels.Classroom;
    const StudentModel = this.mongomodels.Student;
    if (!UserModel) return { error: "User mongo model not found" };
    if (!ClassroomModel) return { error: "Classroom mongo model not found" };
    if (!StudentModel) return { error: "Student mongo model not found" };

    const school = await SchoolModel.findOne({ id: schoolId }).lean();
    if (!school) return { error: "school not found" };

    const [schoolAdminsCount, classroomsCount, studentsCount] =
      await Promise.all([
        UserModel.countDocuments({ schoolId, role: "SCHOOL_ADMIN" }),
        ClassroomModel.countDocuments({ schoolId }),
        StudentModel.countDocuments({ schoolId }),
      ]);

    if (schoolAdminsCount > 0 || classroomsCount > 0 || studentsCount > 0) {
      return {
        error:
          "cannot delete school with linked school admins, classrooms, or students",
      };
    }

    const deleted = await SchoolModel.findOneAndDelete({ id: schoolId }).lean();

    return { deleted: true, schoolId };
  }
};
