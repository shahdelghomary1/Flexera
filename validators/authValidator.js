import Joi from "joi";
export const registerSchema = Joi.object({
  name: Joi.string().min(3).required().messages({
    "string.empty": "Name is required",
    "string.min": "Name must be at least 3 characters",
  }),
  email: Joi.string().email().required().messages({
    "string.email": "Valid email is required",
    "string.empty": "Email is required",
  }),
  password: Joi.string().min(6).required().messages({
    "string.empty": "Password is required",
    "string.min": "Password must be at least 6 characters",
  }),
  role: Joi.string().valid("user","staff").optional()
});
export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Valid email is required",
  }),
  password: Joi.string().required().messages({
    "string.empty": "Password is required",
  }),
  role: Joi.string().valid("user","staff").optional()
  
});
export const googleSchema = Joi.object({
  credential: Joi.string().required(),
});

export const forgotSchema = Joi.object({
  email: Joi.string().email().required()
});

export const verifyOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(4).required()
});

export const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(4).required(),
  newPassword: Joi.string().min(8).required(),
  confirmPassword: Joi.ref("newPassword")
}).with("newPassword", "confirmPassword");
