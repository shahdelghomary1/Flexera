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
  .pattern(/^[A-Za-z0-9\s\/\.]+$/)
  .required()
  .messages({
    "string.pattern.base": "Name can only contain letters, numbers, spaces, / and .",
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
  name: Joi.string()
    .pattern(/^[A-Za-z0-9\s\/\.]+$/)
    .optional()
    .messages({
      "string.pattern.base": "Name can only contain letters, numbers, spaces, / and ."
    }),
  
  email: Joi.string()
    .email()
    .pattern(/@gmail\.com$/)
    .optional()
    .messages({
      "string.email": "Email must be valid",
      "string.pattern.base": "Email must be a Gmail address (must end with @gmail.com)"
    }),
  
  phone: Joi.string()
    .pattern(/^01[0-2,5]\d{8}$/)
    .optional()
    .messages({
      "string.pattern.base": "Phone number must be a valid Egyptian number (11 digits)"
    }),
  
  price: Joi.number()
    .min(50)
    .max(2000)
    .optional()
    .messages({
      "number.min": "Price must be at least 50",
      "number.max": "Price must not exceed 2000"
    }),

  dateOfBirth: Joi.date()
    .optional()
    .messages({
      "date.base": "Date of birth must be a valid date"
    }),
  
  gender: Joi.string()
    .valid("Female", "Male")
    .optional()
    .messages({
      "any.only": "Gender must be either male or female"
    }),

  image: Joi.string()
    .uri()
    .optional()
    .messages({
      "string.uri": "Image must be a valid URL"
    }),
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
    .max(30)
    .pattern(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]+$/)
    .required()
    .messages({
      "string.min": "Password must be at least 6 characters",
      "string.max": "Password must be at most 30 characters",
      "string.pattern.base": "Password must contain at least one letter and one number",
      "any.required": "New password is required"
    }),

  confirmPassword: Joi.any()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({
      "any.only": "Passwords do not match",
      "any.required": "Confirm password is required"
    }),
});

