module.exports = ({ managers, mongomodels }) => {
  return async ({ req, res, next }) => {
    const token = req.headers.token;
    if (!token) {
      return managers.responseDispatcher.dispatch(res, {
        ok: false,
        code: 401,
        errors: "unauthorized",
      });
    }

    const decoded = managers.token.verifyLongToken({ token });
    if (!decoded || !decoded.userId) {
      return managers.responseDispatcher.dispatch(res, {
        ok: false,
        code: 401,
        errors: "unauthorized",
      });
    }

    const UserModel = mongomodels.User;
    if (!UserModel) {
      return managers.responseDispatcher.dispatch(res, {
        ok: false,
        code: 500,
        message: "User model not found",
      });
    }

    const user = await UserModel.findOne({ id: decoded.userId }).lean();
    if (!user || !user.isActive) {
      return managers.responseDispatcher.dispatch(res, {
        ok: false,
        code: 401,
        errors: "unauthorized",
      });
    }

    next({
      id: user.id,
      role: user.role,
      schoolId: user.schoolId || null,
      email: user.email,
    });
  };
};