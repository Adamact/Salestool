export function validateId(...paramNames) {
  return (req, res, next) => {
    for (const name of paramNames) {
      const val = parseInt(req.params[name], 10);
      if (isNaN(val) || val <= 0) {
        return res.status(400).json({ error: `Invalid ${name} parameter` });
      }
      req.params[name] = String(val);
    }
    next();
  };
}
