
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
  if (err) console.error("Mailer Error:", err);
  else console.log("Mailer ready to send messages:", success);
});

export const sendOTPEmail = async (toEmail, otp) => {
  const mailOptions = {
    from: `"Flexera App" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Password Reset OTP",
    html: `
      <div style="font-family: sans-serif; line-height: 1.6;">
        <h3>Password Reset</h3>
        <p>Your OTP code is: <strong style="font-size: 20px;">${otp}</strong></p>
        <p>This code will expire in 10 minutes.</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("OTP sent:", info.response);
    return info;
  } catch (error) {
    console.error("Error sending OTP:", error);
    throw new Error("Failed to send OTP email");
  }
};
