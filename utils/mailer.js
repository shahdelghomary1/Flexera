
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
transporter.verify((err, success) => {
  if (err) console.log("Error:", err);
  else console.log("Server is ready to take messages", success);
});
export const sendOTPEmail = async (toEmail, otp) => {
  const mailOptions = {
    from: `"Your App" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Password Reset Code",
    html: `
      <div style="font-family: sans-serif; line-height: 1.6;">
        <h3>Password Reset</h3>
        <p>Your OTP code is: <strong style="font-size: 18px;">${otp}</strong></p>
        <p>This code will expire in 10 minutes.</p>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};
