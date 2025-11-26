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
  name: Joi.string().optional(),
  email: Joi.string().email().messages({
    "string.email": "Email must be valid"
  }).optional(),
  phone: Joi.string().pattern(/^\d{11}$/).messages({
    "string.pattern.base": "Phone number must be 11 digits"
  }).optional(),
  price: Joi.number().optional(),
});


export const doctorSignupSchema = Joi.object({
  _id: Joi.string()
    .required()
    .messages({
      "any.required": "Doctor ID is required",
    }),

  name: Joi.string()
    .min(3)
    .required()
    .messages({
      "string.min": "Name must be at least 3 characters",
      "any.required": "Name is required",
    }),

  email: Joi.string()
    .email()
    .required()
    .messages({
      "string.email": "Invalid email format",
      "any.required": "Email is required",
    }),

  password: Joi.string()
    .min(6)
    .required()
    .messages({
      "string.min": "Password must be at least 6 characters",
      "any.required": "Password is required",
    }),

  confirmPassword: Joi.any()
    .valid(Joi.ref("password"))
    .required()
    .messages({
      "any.only": "Passwords do not match",
      "any.required": "Confirm password is required",
    }),
});

export const doctorResetPasswordSchema = Joi.object({
  newPassword: Joi.string()
    .min(6)
    .required()
    .messages({
      "string.min": "Password must be at least 6 characters",
      "any.required": "New password is required",
    }),

  confirmPassword: Joi.any()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({
      "any.only": "Passwords do not match",
      "any.required": "Confirm password is required",
    }),
});
