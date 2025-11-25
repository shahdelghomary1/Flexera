import Joi from "joi";

export const registerSchema = Joi.object({
  name: Joi.string().min(3).required().messages({
    "string.empty": "Name is required",
    "string.min": "Name must be at least 3 characters",
  }),
   email: Joi.string()
    .email({ tlds: { allow: false } }) // تعطيل التحقق من TLD القياسي
    .pattern(/@gmail\.com$/)           // يسمح فقط بإيميلات Gmail
    .required()
    .messages({
      "string.empty": "Email is required",
      "string.email": "Valid email is required",
      "string.pattern.base": "Email must be a Gmail address"
    }),
  password: Joi.string()
    .min(8)
    .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&]).*$"))
    .required()
    .messages({
      "string.empty": "Password is required",
      "string.min": "Password must be at least 8 characters",
      "string.pattern.base": "Password must contain at least one uppercase, one lowercase, one number, and one special character",
    }),
    confirmPassword: Joi.any()
    .valid(Joi.ref("password"))
    .required()
    .messages({
      "any.only": "Confirm password must match password",
      "any.required": "Confirm password is required",
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
  newPassword: Joi.string()
    .min(8)
    .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z]).*$"))
    .required()
    .messages({
      "string.min": "Password must be at least 8 characters",
      "string.pattern.base": "Password must contain at least one uppercase and one lowercase letter",
    }),
  confirmPassword: Joi.ref("newPassword")
}).with("newPassword", "confirmPassword");
