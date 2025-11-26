import Joi from "joi";


export const addDoctorSchema = Joi.object({
  _id: Joi.string()
    .length(5)
    .required()
    .messages({
      "string.length": "ID must be exactly 5 characters",
      "any.required": "ID is required"
    }),

  name: Joi.string()
    .min(3)
    .max(50)
    .pattern(/^[A-Za-zأ-ي ]+$/)
    .required()
    .messages({
      "string.min": "Name must be at least 3 characters",
      "string.max": "Name must be less than 50 characters",
      "string.pattern.base": "Name must contain only letters",
      "any.required": "Name is required"
    }),

  email: Joi.string()
  .email()
  .pattern(/@gmail\.com$/)
  .required()
  .messages({
    "string.email": "Email must be valid",
    "string.pattern.base": "Email must be a Gmail address (must end with @gmail.com)",
    "any.required": "Email is required"
  }),


  phone: Joi.string()
    .pattern(/^01[0-2,5]\d{8}$/) 
    .required()
    .messages({
      "string.pattern.base": "Phone number must be a valid Egyptian number (11 digits)",
      "any.required": "Phone number is required"
    }),

  price: Joi.number()
    .min(50)
    .max(2000)
    .required()
    .messages({
      "number.min": "Price must be at least 50",
      "number.max": "Price must not exceed 2000",
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
