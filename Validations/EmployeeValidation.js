const joi = require("joi");
const KPISchema = joi.object({
  Empid: joi
  .number()
  .integer()
  .min(100)  
  .max(99999999) 
  .required()
  .messages({
    "number.base": "Empid must be a number",
    "number.integer": "Empid must be an integer",
    "number.min": "Please Enter at least 3 digits Empid",
    "number.max": "Please Enter at most 8 digits Empid",
    "any.required": "Empid cannot be empty",
  }),
  Empmail: joi
    .string()
    // .email({
    //   minDomainSegments: 2,
    //   tlds: {
    //     allow: ["com", "yahoo"],
    //   },
    // })
    .required()
    .messages({
      "string.email": "User Empmail invalid",
      "any.required": "Empmail cannot be empty",
    }),
  Firstname: joi
    .string()
    .min(3)
    .max(20)
    .required()
    .messages({
      "string.min": "The Firstname should have Minimum 3 characters",
      "string.max": "The Firstname should have Maximum 20 characters",
      "any.required": "Firstname cannot be empty",
    }),
  Lastname: joi
    .string()
    .max(20)
    .required()
    .messages({
      "string.max": "The Lastname should have Maximum 20 characters",
      "any.required": "Lastname cannot be empty",
    }),
  Role: joi
    .string()
    .min(2)
    .max(15)
    .required()
    .messages({
      "string.min": "The Role should have Minimum 2 characters",
      "string.max": "The Role should have Maximum 15 characters",
      "any.required": "Role cannot be empty",
    }),
  Practies: joi
    .string()
    .min(2)
    .max(20)
    .required()
    .messages({
      "string.min": "The Practies should have Minimum 2 characters",
      "string.max": "The Practies should have Maximum 20 characters",
      "any.required": "Practies cannot be empty",
    }),
  Reportingmanager: joi
    .string()
    .min(2)
    .max(50)
    .required()
    .messages({
      "string.min": "The Reportingmanager should have Minimum 2 characters",
      "string.max": "The Reportingmanager should have Maximum 50 characters",
      "any.required": "Reportingmanager cannot be empty",
    }),
  Password: joi
    .string()
    // .pattern(new RegExp("^[a-zA-Z0-9!@#$&()-.+,]{6,150}$"))
    .required()
    .messages({
      "string.pattern.base": "Password should have at least 6 characters.",
      "any.required": "Password cannot be empty",
    }),
    Reportinghr: joi
    .string()
    .min(2)
    .max(25)
    .required()
    .messages({
      "string.min": "The Reportinghr should have Minimum 2 characters",
      "string.max": "The Reportinghr should have Maximum 25 characters",
      "any.required": "Reportinghr cannot be empty",
    }),
    Location: joi
    .string()
    .min(2)
    .max(25)
    .required()
    .messages({
      "string.min": "The Location should have Minimum 2 characters",
      "string.max": "The Location should have Maximum 15 characters",
      "any.required": "Location cannot be empty",
    })


});

module.exports = KPISchema;
