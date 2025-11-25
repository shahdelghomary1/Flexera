import Joi from "joi";


export const addDoctorSchema = Joi.object({
  _id: Joi.string()
    .length(6) 
    .required()
    .messages({
      "string.base": "ID must be a string",
      "string.length": "ID must be exactly 6 characters",
      "any.required": "ID is required"
    }),
  name: Joi.string().required().messages({
    "any.required": "Name is required"
  }),
  email: Joi.string().email().required().messages({
    "string.email": "Email must be valid",
    "any.required": "Email is required"
  }),
  phone: Joi.string()
    .pattern(/^\d{11}$/)
    .required()
    .messages({
      "string.pattern.base": "Phone number must be 11 digits",
      "any.required": "Phone number is required"
    }),
  price: Joi.number().required().messages({
    "any.required": "Price is required"
  })
});


export const updateDoctorSchema = Joi.object({
  name: Joi.string(),
  email: Joi.string().email().messages({
    "string.email": "Email must be valid"
  }),
  phone: Joi.string().pattern(/^\d{11}$/).messages({
    "string.pattern.base": "Phone number must be 11 digits"
  }),
  price: Joi.number(),
});
