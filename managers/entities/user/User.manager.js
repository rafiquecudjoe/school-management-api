const bcrypt = require("bcrypt");
const { nanoid } = require("nanoid");

module.exports = class User {
  constructor({ managers, validators, mongomodels } = {}) {
    this.validators = validators;
    this.mongomodels = mongomodels;
    this.tokenManager = managers.token;

    // ApiHandler scans this for /api/:module/:fnName
    this.httpExposed = ["v1_register", "v1_login"];
  }

  _userResponse(userDoc) {
    return {
      id: userDoc.id,
      email: userDoc.email,
      fullName: userDoc.fullName,
      role: userDoc.role,
      schoolId: userDoc.schoolId || null,
      isActive: userDoc.isActive,
      createdAt: userDoc.createdAt,
      updatedAt: userDoc.updatedAt,
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

  async v1_register({
    __headers,
    email,
    password,
    fullName,
    role = "SCHOOL_ADMIN",
    schoolId = null,
  }) {
    const normalizedRole = String(role).trim().toUpperCase();
    const payload = {
      email,
      password,
      fullName,
      role: normalizedRole,
      schoolId,
    };
    const allowedRoles = new Set(["SUPERADMIN", "SCHOOL_ADMIN"]);

    const validation = await this.validators.user.register(payload);
    const validationErrors = this._validationErrors(validation);
    if (validationErrors) return { errors: validationErrors };
    if (!allowedRoles.has(normalizedRole)) {
      return { error: "role must be SUPERADMIN or SCHOOL_ADMIN" };
    }

    const UserModel = this.mongomodels.User;
    if (!UserModel) return { error: "User mongo model not found" };

    const normalizedEmail = String(email).toLowerCase().trim();
    const exists = await UserModel.findOne({ email: normalizedEmail }).lean();
    if (exists) return { error: "email already exists" };

    if (normalizedRole === "SUPERADMIN") {
      const superadminExists = await UserModel.exists({ role: "SUPERADMIN" });
      if (superadminExists) {
        const actorToken =
          __headers && __headers.token ? __headers.token : null;
        if (!actorToken) {
          return {
            error:
              "superadmin token required to create additional SUPERADMIN accounts",
          };
        }

        const decodedActor = this.tokenManager.verifyLongToken({
          token: actorToken,
        });
        if (!decodedActor || !decodedActor.userId) {
          return { error: "invalid superadmin token" };
        }

        const actor = await UserModel.findOne({
          id: decodedActor.userId,
        }).lean();
        if (!actor || !actor.isActive || actor.role !== "SUPERADMIN") {
          return { error: "only SUPERADMIN can create SUPERADMIN accounts" };
        }
      }
    }

    if (normalizedRole === "SCHOOL_ADMIN" && !schoolId) {
      return { error: "schoolId is required for SCHOOL_ADMIN" };
    }
    if (normalizedRole === "SCHOOL_ADMIN") {
      const SchoolModel = this.mongomodels.School;
      if (!SchoolModel) return { error: "School mongo model not found" };

      const assignedSchool = await SchoolModel.findOne({
        id: schoolId,
        isActive: true,
      }).lean();
      if (!assignedSchool) {
        return { error: "schoolId must reference an active school" };
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const createdUser = await UserModel.create({
      id: nanoid(),
      email: normalizedEmail,
      passwordHash,
      fullName: String(fullName).trim(),
      role: normalizedRole,
      schoolId: normalizedRole === "SCHOOL_ADMIN" ? schoolId : null,
      isActive: true,
    });

    const longToken = this.tokenManager.genLongToken({
      userId: createdUser.id,
      userKey: createdUser.id,
    });

    return {
      user: this._userResponse(createdUser),
      longToken,
    };
  }

  async v1_login({ email, password }) {
    const payload = { email, password };

    const validation = await this.validators.user.login(payload);
    const validationErrors = this._validationErrors(validation);
    if (validationErrors) return { errors: validationErrors };

    const UserModel = this.mongomodels.User;
    if (!UserModel) return { error: "User mongo model not found" };

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await UserModel.findOne({ email: normalizedEmail });

    if (!user) return { error: "invalid credentials" };
    if (!user.isActive) return { error: "account is inactive" };

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return { error: "invalid credentials" };

    const longToken = this.tokenManager.genLongToken({
      userId: user.id,
      userKey: user.id,
    });

    return {
      user: this._userResponse(user),
      longToken,
    };
  }
};
