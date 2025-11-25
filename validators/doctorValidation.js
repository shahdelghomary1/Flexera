import Joi from "joi";

export const doctorSchema = Joi.object({
  _id: Joi.string().trim().required().messages({
    "string.empty": "Doctor ID is required",
    "any.required": "Doctor ID is required"
  }),

  name: Joi.string().min(3).required().messages({
    "string.empty": "Name is required",
    "string.min": "Name must be at least 3 characters"
  }),

  email: Joi.string().email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Invalid email format"
  }),

  phone: Joi.string().pattern(/^01[0-2,5][0-9]{8}$/).required().messages({
    "string.empty": "Phone number is required",
    "string.pattern.base": "Phone must be an Egyptian number of 11 digits"
  }),

  price: Joi.number().min(0).required().messages({
    "number.base": "Price must be a number",
    "any.required": "Price is required"
  })
});
