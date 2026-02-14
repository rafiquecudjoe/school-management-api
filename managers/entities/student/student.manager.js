function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = class Student {
  constructor({ validators, mongomodels }) {
    this.validators = validators;
    this.mongomodels = mongomodels;

    this.httpExposed = [
      "v1_createStudent",
      "v1_getStudent",
      "v1_listStudents",
      "v1_updateStudent",
      "v1_deleteStudent",
      "v1_transferStudent",
    ];
  }

  _studentResponse(doc) {
    return {
      id: doc.id,
      schoolId: doc.schoolId,
      classroomId: doc.classroomId || null,
      firstName: doc.firstName,
      lastName: doc.lastName,
      dob: doc.dob,
      studentNumber: doc.studentNumber,
      status: doc.status,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  _validationErrors(validation) {
    if (!validation) return null;
    if (Array.isArray(validation)) return validation;
    if (Array.isArray(validation.errors) && validation.errors.length > 0) return validation.errors;
    if (Array.isArray(validation.data) && validation.data.length > 0) return validation.data;
    return [validation];
  }

  _parseDobOrError(dob) {
    const date = new Date(dob);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  }

  async v1_createStudent({
    __authUser,
    __schoolAdmin,
    __schoolScope,
    schoolId,
    classroomId = null,
    firstName,
    lastName,
    dob,
    studentNumber,
  }) {
    const payload = { schoolId, classroomId, firstName, lastName, dob, studentNumber };
    const validation = await this.validators.student.createStudent(payload);
    const validationErrors = this._validationErrors(validation);
    if (validationErrors) return { errors: validationErrors };

    const StudentModel = this.mongomodels.Student;
    if (!StudentModel) return { error: "Student mongo model not found" };

    const parsedDob = this._parseDobOrError(dob);
    if (!parsedDob) return { error: "dob must be a valid date string" };

    const normalizedStudentNumber = String(studentNumber).trim().toUpperCase();

    const exists = await StudentModel.findOne({
      schoolId,
      studentNumber: normalizedStudentNumber,
    }).lean();
    if (exists) return { error: "studentNumber already exists in school" };

    // Enforce classroom capacity if assigning to a classroom
    if (classroomId) {
      const ClassroomModel = this.mongomodels.Classroom;
      if (ClassroomModel) {
        const classroom = await ClassroomModel.findOne({ id: classroomId, schoolId }).lean();
        if (!classroom) return { error: "classroom not found" };
        if (!classroom.isActive) return { error: "classroom is not active" };
        const enrolled = await StudentModel.countDocuments({
          classroomId,
          schoolId,
          status: "ACTIVE",
          deletedAt: null,
        });
        if (enrolled >= classroom.capacity)
          return { error: "classroom at capacity" };
      }
    }

    const created = await StudentModel.create({
      schoolId,
      classroomId: classroomId || null,
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      dob: parsedDob,
      studentNumber: normalizedStudentNumber,
      status: "ACTIVE",
    });

    return { student: this._studentResponse(created) };
  }

  async v1_getStudent({ __authUser, __schoolAdmin, __schoolScope, schoolId, studentId }) {
    const validation = await this.validators.student.getStudent({ schoolId, studentId });
    const validationErrors = this._validationErrors(validation);
    if (validationErrors) return { errors: validationErrors };

    const StudentModel = this.mongomodels.Student;
    if (!StudentModel) return { error: "Student mongo model not found" };

    const student = await StudentModel.findOne({ id: studentId, schoolId, deletedAt: null }).lean();
    if (!student) return { error: "student not found" };

    return { student: this._studentResponse(student) };
  }

  async v1_listStudents({
    __authUser,
    __schoolAdmin,
    __schoolScope,
    schoolId,
    q,
    limit = 20,
    skip = 0,
    status,
    classroomId,
  }) {
    const payload = { schoolId, q, limit, skip, status, classroomId };
    const validation = await this.validators.student.listStudents(payload);
    const validationErrors = this._validationErrors(validation);
    if (validationErrors) return { errors: validationErrors };

    const StudentModel = this.mongomodels.Student;
    if (!StudentModel) return { error: "Student mongo model not found" };

    const filter = { deletedAt: null };
    if (schoolId) filter.schoolId = schoolId;
    if (classroomId) filter.classroomId = classroomId;
    if (status) filter.status = String(status).toUpperCase();
    if (q) {
      filter.$or = [
        { firstName: { $regex: escapeRegex(q), $options: "i" } },
        { lastName: { $regex: escapeRegex(q), $options: "i" } },
        { studentNumber: { $regex: escapeRegex(q), $options: "i" } },
      ];
    }

    const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));
    const safeSkip = Math.max(0, Number(skip) || 0);

    const [items, total] = await Promise.all([
      StudentModel.find(filter).sort({ createdAt: -1 }).skip(safeSkip).limit(safeLimit).lean(),
      StudentModel.countDocuments(filter),
    ]);

    return {
      items: items.map((i) => this._studentResponse(i)),
      page: { total, limit: safeLimit, skip: safeSkip },
    };
  }

  async v1_updateStudent({
    __authUser,
    __schoolAdmin,
    __schoolScope,
    schoolId,
    studentId,
    classroomId,
    firstName,
    lastName,
    dob,
    studentNumber,
    status,
  }) {
    const payload = {
      schoolId,
      studentId,
      classroomId,
      firstName,
      lastName,
      dob,
      studentNumber,
      status,
    };
    const validation = await this.validators.student.updateStudent(payload);
    const validationErrors = this._validationErrors(validation);
    if (validationErrors) return { errors: validationErrors };

    const StudentModel = this.mongomodels.Student;
    if (!StudentModel) return { error: "Student mongo model not found" };

    const student = await StudentModel.findOne({ id: studentId, schoolId, deletedAt: null });
    if (!student) return { error: "student not found" };

    if (typeof firstName === "string") student.firstName = firstName.trim();
    if (typeof lastName === "string") student.lastName = lastName.trim();
    if (typeof classroomId === "string") student.classroomId = classroomId;
    if (dob !== undefined) {
      const parsedDob = this._parseDobOrError(dob);
      if (!parsedDob) return { error: "dob must be a valid date string" };
      student.dob = parsedDob;
    }

    if (studentNumber !== undefined) {
      const normalizedStudentNumber = String(studentNumber).trim().toUpperCase();
      if (normalizedStudentNumber !== student.studentNumber) {
        const duplicate = await StudentModel.findOne({
          schoolId,
          studentNumber: normalizedStudentNumber,
        }).lean();
        if (duplicate) return { error: "studentNumber already exists in school" };
      }
      student.studentNumber = normalizedStudentNumber;
    }

    if (status !== undefined) {
      const normalizedStatus = String(status).toUpperCase();
      if (!["ACTIVE", "INACTIVE"].includes(normalizedStatus)) {
        return { error: "status must be ACTIVE or INACTIVE" };
      }
      student.status = normalizedStatus;
    }

    await student.save();
    return { student: this._studentResponse(student) };
  }

  async v1_deleteStudent({ __authUser, __schoolAdmin, __schoolScope, schoolId, studentId }) {
    const validation = await this.validators.student.deleteStudent({ schoolId, studentId });
    const validationErrors = this._validationErrors(validation);
    if (validationErrors) return { errors: validationErrors };

    const StudentModel = this.mongomodels.Student;
    if (!StudentModel) return { error: "Student mongo model not found" };

    const student = await StudentModel.findOne({ id: studentId, schoolId, deletedAt: null });
    if (!student) return { error: "student not found" };
    student.status = "INACTIVE";
    student.deletedAt = new Date();
    await student.save();
    return { deleted: true, studentId };
  }

  async v1_transferStudent({
    __authUser,
    __schoolAdmin,
    __schoolScope,
    schoolId,
    studentId,
    toClassroomId,
  }) {
    const validation = await this.validators.student.transferStudent({
      schoolId,
      studentId,
      toClassroomId,
    });
    const validationErrors = this._validationErrors(validation);
    if (validationErrors) return { errors: validationErrors };

    const StudentModel = this.mongomodels.Student;
    if (!StudentModel) return { error: "Student mongo model not found" };

    const ClassroomModel = this.mongomodels.Classroom;
    if (!ClassroomModel) return { error: "Classroom mongo model not found" };

    const student = await StudentModel.findOne({ id: studentId, schoolId, deletedAt: null });
    if (!student) return { error: "student not found" };

    const targetClassroom = await ClassroomModel.findOne({
      id: toClassroomId,
      schoolId,
    }).lean();
    if (!targetClassroom) return { error: "target classroom not found in school" };
    if (!targetClassroom.isActive) return { error: "target classroom is not active" };

    // Enforce capacity on the target classroom
    const enrolled = await StudentModel.countDocuments({
      classroomId: toClassroomId,
      schoolId,
      status: "ACTIVE",
      deletedAt: null,
    });
    if (enrolled >= targetClassroom.capacity)
      return { error: "target classroom at capacity" };

    const fromClassroomId = student.classroomId;

    student.classroomId = toClassroomId;
    await student.save();

    const StudentTransferModel = this.mongomodels.StudentTransfer;
    if (StudentTransferModel) {
      await StudentTransferModel.create({
        studentId,
        fromSchoolId: schoolId,
        toSchoolId: schoolId,
        reason: "classroom transfer",
        transferredBy: __authUser.id,
      });
    }

    return {
      transferred: true,
      student: this._studentResponse(student),
    };
  }
};