module.exports = ({ managers }) => {
  return ({ res, results, next }) => {
    const auth = results.__authUser;
    const allowed = new Set(["SCHOOL_ADMIN", "SUPERADMIN"]);
    if (!auth || !allowed.has(auth.role)) {
      return managers.responseDispatcher.dispatch(res, {
        ok: false,
        code: 403,
        errors: "forbidden",
        message: "SCHOOL_ADMIN or SUPERADMIN role required",
      });
    }
    next(auth);
  };
};
