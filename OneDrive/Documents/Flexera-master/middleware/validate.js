import Joi from "joi";


export const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map((err) => err.message);
    return res.status(400).json({ errors: messages });
  }
  next();
};
export const forgotPasswordSchema = Joi.object({
  _id: Joi.string().required(),  
  email: Joi.string().email().required()
});


export const verifyOTPSchema = Joi.object({
  _id: Joi.string().required(), 
  otp: Joi.string().length(6).required()
});


export const resetPasswordSchema = Joi.object({
  resetToken: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
  confirmPassword: Joi.string().valid(Joi.ref("newPassword")).required()
});