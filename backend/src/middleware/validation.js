'use strict';
const { body, param, query, validationResult } = require('express-validator');

const validate = (validations) => async (req, res, next) => {
  await Promise.all(validations.map((validation) => validation.run(req)));

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  next();
};

module.exports = {
  validate,
  body,
  param,
  query,
};
