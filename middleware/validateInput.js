// Sanitizes incoming string fields to strip potentially harmful HTML/script tags
const sanitizeFormInputs = (req, res, next) => {
  if (req.body) {
    for (let key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim().replace(/</g, "&lt;").replace(/>/g, "&gt;");
      }
    }
  }
  next();
};

module.exports = { sanitizeFormInputs };
