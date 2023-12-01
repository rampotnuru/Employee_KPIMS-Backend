const joi = require("joi");
const KPISchema = joi.object({
  adminID: joi
  .number()
  .integer()
  .min(100)  
  .max(99999999) 
  .required()
  .messages({
    "number.base": "adminID must be a number",
    "number.integer": "adminID must be an integer",
    "number.min": "Please Enter at least 3 digits adminID",
    "number.max": "Please Enter at most 8 digits adminID",
    "any.required": "adminID cannot be empty",
  }),
  adminEmail: joi
    .string()
    .email({
      minDomainSegments: 2,
      tlds: {
        allow: ["com", "yahoo"],
      },
    })
    .required()
    .messages({
      "string.email": "User adminEmail invalid",
      "any.required": "adminEmail cannot be empty",
    }),
    adminName: joi
    .string()
    .min(3)
    .max(20)
    .required()
    .messages({
      "string.min": "The adminName should have Minimum 3 characters",
      "string.max": "The adminName should have Maximum 20 characters",
      "any.required": "adminName cannot be empty",
    }),

    adminPassword: joi
    .string()
    // .pattern(new RegExp("^[a-zA-Z0-9!@#$&()-.+,]{6,15}$"))
    .required()
    .messages({
      "string.pattern.base": "adminPassword should have at least 6 characters.",
      "any.required": "adminPassword cannot be empty",
    })
});

module.exports = KPISchema;
