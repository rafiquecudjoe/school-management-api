module.exports = ({ managers }) => {
  return ({ res, results, next }) => {
    const auth = results.__authUser;
    if (!auth || auth.role !== "SUPERADMIN") {
      return managers.responseDispatcher.dispatch(res, {
        ok: false,
        code: 403,
        errors: "forbidden",
        message: "SUPERADMIN role required",
      });
    }
    next(auth);
  };
};