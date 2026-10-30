
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  EMAIL_FROM
} = process.env;

const port = Number(SMTP_PORT || 465);

const transporter = nodemailer.createTransport({
  host: SMTP_HOST || "smtp.gmail.com",
  port,
  secure: SMTP_SECURE === "true",
  requireTLS: port === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS?.replace(/\s+/g, "")
  },
  connectionTimeout: 60000,
  greetingTimeout: 60000,
  socketTimeout: 60000,
  tls: {
    minVersion: "TLSv1.2",
    rejectUnauthorized: true
  },
  logger: false,
  debug: false
});

export async function verifyEmailConnection() {
  try {
    if (!SMTP_USER || !SMTP_PASS) {
      throw new Error("SMTP_USER or SMTP_PASS is missing.");
    }

    await transporter.verify();

    console.log("Gmail SMTP connection verified successfully.");

    return true;
  } catch (error) {
    console.error("SMTP verification failed:", {
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
      message: error.message
    });

    return false;
  }
}

export async function sendDonationGreeting({
  donor,
  fundraiser,
  donation
}) {
  try {
    if (!donor?.email) {
      console.error("Donor email is missing.");
      return false;
    }

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.error("SMTP configuration is incomplete.");
      return false;
    }

    const escapeHtml = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const donorName = donor.name || "there";
    const fundraiserTitle =
      fundraiser?.title || "a community cause";

    const amount = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR"
    }).format(Number(donation?.amount || 0));

    const info = await transporter.sendMail({
      from: EMAIL_FROM || `SocialConnect <${SMTP_USER}>`,
      to: donor.email,
      subject: "Thank you for supporting SocialConnect",

      text: `
Hello ${donorName},

Thank you for your donation of ${amount} to ${fundraiserTitle}.

Your support helps communities move forward.

With gratitude,
The SocialConnect Team
      `,

      html: `
        <div style="font-family:Arial,sans-serif;
                    max-width:600px;margin:auto;
                    color:#24304a;line-height:1.6">

          <div style="background:#eef5ff;
                      padding:24px;border-radius:16px">
            <h1 style="color:#3168bd">
              Thank you, ${escapeHtml(donorName)}!
            </h1>
            <p>Your generosity means a lot.</p>
          </div>

          <p>
            Thank you for donating
            <strong>${amount}</strong> to
            <strong>${escapeHtml(fundraiserTitle)}</strong>
            through SocialConnect.
          </p>

          <div style="background:#f7f9fc;
                      padding:14px;border-radius:10px">
            <strong>Donation confirmation</strong><br>
            Cause: ${escapeHtml(fundraiserTitle)}<br>
            Amount: ${amount}<br>
            Status: Successful
          </div>

          <p>
            With gratitude,<br>
            <strong>The SocialConnect Team</strong>
          </p>
        </div>
      `
    });

    console.log("Donation email result:", {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected
    });

    return info.accepted?.length > 0;
  } catch (error) {
    console.error("Donation email failed:", {
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
      message: error.message
    });

    return false;
  }
}
