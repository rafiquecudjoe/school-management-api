function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = class Classroom {
  constructor({ validators, mongomodels }) {
    this.validators = validators;
    this.mongomodels = mongomodels;

    this.httpExposed = [
      "v1_createClassroom",
      "v1_getClassroom",
      "v1_listClassrooms",
      "v1_updateClassroom",
      "v1_deleteClassroom",
    ];
  }

  _classroomResponse(doc) {
    return {
      id: doc.id,
      schoolId: doc.schoolId,
      name: doc.name,
      gradeLevel: doc.gradeLevel,
      capacity: doc.capacity,
      resources: doc.resources || [],
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

  async v1_createClassroom({
    __authUser,
    __schoolAdmin,
    __schoolScope,
    schoolId,
    name,
    gradeLevel,
    capacity,
    resources = [],
  }) {
    const payload = { schoolId, name, gradeLevel, capacity, resources };
    const validation = await this.validators.classroom.createClassroom(payload);
    const validationErrors = this._validationErrors(validation);
    if (validationErrors) return { errors: validationErrors };

    const ClassroomModel = this.mongomodels.Classroom;
    if (!ClassroomModel) return { error: "Classroom mongo model not found" };

    const exists = await ClassroomModel.findOne({
      schoolId,
      name: String(name).trim(),
    }).lean();
    if (exists) return { error: "classroom already exists in school" };

    const created = await ClassroomModel.create({
      schoolId,
      name: String(name).trim(),
      gradeLevel: String(gradeLevel).trim(),
      capacity: Number(capacity),
      resources: Array.isArray(resources) ? resources : [],
      isActive: true,
    });

    return { classroom: this._classroomResponse(created) };
  }

  async v1_getClassroom({
    __authUser,
    __schoolAdmin,
    __schoolScope,
    classroomId,
    schoolId,
  }) {
    const validation = await this.validators.classroom.getClassroom({
      classroomId,
    });
    const validationErrors = this._validationErrors(validation);
    if (validationErrors) return { errors: validationErrors };

    const ClassroomModel = this.mongomodels.Classroom;
    if (!ClassroomModel) return { error: "Classroom mongo model not found" };

    const classroom = await ClassroomModel.findOne({
      id: classroomId,
      schoolId,
    }).lean();
    if (!classroom) return { error: "classroom not found" };

    return { classroom: this._classroomResponse(classroom) };
  }

  async v1_listClassrooms({
    __authUser,
    __schoolAdmin,
    __schoolScope,
    schoolId,
    q,
    limit = 20,
    skip = 0,
    isActive,
  }) {
    const payload = { schoolId, q, limit, skip, isActive };
    const validation = await this.validators.classroom.listClassrooms(payload);
    const validationErrors = this._validationErrors(validation);
    if (validationErrors) return { errors: validationErrors };

    const ClassroomModel = this.mongomodels.Classroom;
    if (!ClassroomModel) return { error: "Classroom mongo model not found" };

    const filter = {};
    if (schoolId) filter.schoolId = schoolId;
    if (typeof isActive === "boolean") filter.isActive = isActive;
    if (q) {
      filter.$or = [
        { name: { $regex: escapeRegex(q), $options: "i" } },
        { gradeLevel: { $regex: escapeRegex(q), $options: "i" } },
      ];
    }

    const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));
    const safeSkip = Math.max(0, Number(skip) || 0);

    const [items, total] = await Promise.all([
      ClassroomModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(safeSkip)
        .limit(safeLimit)
        .lean(),
      ClassroomModel.countDocuments(filter),
    ]);

    return {
      items: items.map((i) => this._classroomResponse(i)),
      page: { total, limit: safeLimit, skip: safeSkip },
    };
  }

  async v1_updateClassroom({
    __authUser,
    __schoolAdmin,
    __schoolScope,
    classroomId,
    schoolId,
    name,
    gradeLevel,
    capacity,
    resources,
    isActive,
  }) {
    const payload = {
      classroomId,
      schoolId,
      name,
      gradeLevel,
      capacity,
      resources,
      isActive,
    };
    const validation = await this.validators.classroom.updateClassroom(payload);
    const validationErrors = this._validationErrors(validation);
    if (validationErrors) return { errors: validationErrors };

    const ClassroomModel = this.mongomodels.Classroom;
    if (!ClassroomModel) return { error: "Classroom mongo model not found" };

    const classroom = await ClassroomModel.findOne({ id: classroomId, schoolId });
    if (!classroom) return { error: "classroom not found" };

    if (
      typeof name === "string" &&
      name.trim() !== classroom.name
    ) {
      const duplicate = await ClassroomModel.findOne({
        schoolId,
        name: name.trim(),
      }).lean();
      if (duplicate) return { error: "classroom already exists in school" };
      classroom.name = name.trim();
    }

    if (typeof gradeLevel === "string") classroom.gradeLevel = gradeLevel.trim();
    if (capacity !== undefined) classroom.capacity = Number(capacity);
    if (Array.isArray(resources)) classroom.resources = resources;
    if (typeof isActive === "boolean") classroom.isActive = isActive;

    await classroom.save();
    return { classroom: this._classroomResponse(classroom) };
  }

  async v1_deleteClassroom({
    __authUser,
    __schoolAdmin,
    __schoolScope,
    classroomId,
    schoolId,
  }) {
    const validation = await this.validators.classroom.deleteClassroom({
      classroomId,
      schoolId,
    });
    const validationErrors = this._validationErrors(validation);
    if (validationErrors) return { errors: validationErrors };

    const ClassroomModel = this.mongomodels.Classroom;
    if (!ClassroomModel) return { error: "Classroom mongo model not found" };

    const StudentModel = this.mongomodels.Student;
    if (StudentModel) {
      const enrolledCount = await StudentModel.countDocuments({
        classroomId,
        schoolId,
      });
      if (enrolledCount > 0) {
        return { error: "cannot delete classroom with enrolled students" };
      }
    }

    const deleted = await ClassroomModel.findOneAndDelete({
      id: classroomId,
      schoolId,
    }).lean();
    if (!deleted) return { error: "classroom not found" };

    return { deleted: true, classroomId };
  }
};