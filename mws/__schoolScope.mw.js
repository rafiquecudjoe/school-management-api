module.exports = ({ managers }) => {
  return ({ req, res, results, next }) => {
    const auth = results.__authUser;
    if (!auth) {
      return managers.responseDispatcher.dispatch(res, {
        ok: false,
        code: 401,
        errors: "unauthorized",
      });
    }

    // SUPERADMIN can access any school scope.
    if (auth.role === "SUPERADMIN") return next({ allowed: true });

    const targetSchoolId = req.body.schoolId;
    if (!targetSchoolId) {
      return managers.responseDispatcher.dispatch(res, {
        ok: false,
        code: 400,
        message: "schoolId is required",
      });
    }

    if (String(auth.schoolId) !== String(targetSchoolId)) {
      return managers.responseDispatcher.dispatch(res, {
        ok: false,
        code: 403,
        errors: "forbidden",
        message: "outside assigned school scope",
      });
    }

    next({ allowed: true });
  };
};