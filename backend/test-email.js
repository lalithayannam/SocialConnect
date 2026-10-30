
import "dotenv";

import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS?.replace(/\s+/g, ""),
  },
  tls: {
    minVersion: "TLSv1.2",
    rejectUnauthorized: true,
  },
  connectionTimeout: 20000,
  greetingTimeout: 20000,
  socketTimeout: 20000,
});

async function testEmail() {
  try {
    await transporter.verify();
    console.log("SMTP verification successful!");
    console.log("Gmail SMTP connection is ready.");
  } catch (error) {
  console.error("Email test failed:", {
    code: error.code,
    command: error.command,
    timeoutType: error.timeoutType,
    message: error.message,
    stack: error.stack,
  });
} finally {
  transporter.close();
}
}

testEmail();
