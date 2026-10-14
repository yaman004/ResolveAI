// Parses and replaces req.body / req.query / req.params with zod output.
// Unknown keys are stripped (zod default), which prevents mass assignment.
export const validate = (schemas) => (req, _res, next) => {
  try {
    for (const part of ['params', 'query', 'body']) {
      if (schemas[part]) {
        const result = schemas[part].parse(req[part] ?? {});
        if (part === 'query') req.validQuery = result;
        else req[part] = result;
      }
    }
    next();
  } catch (err) {
    next(err);
  }
};
