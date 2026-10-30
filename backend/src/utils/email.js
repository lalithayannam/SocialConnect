
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

// Gmail SMTP configuration
const port = Number(SMTP_PORT || 465);

const secure =
  SMTP_SECURE !== undefined
    ? SMTP_SECURE.toLowerCase() === "true"
    : port === 465;

const transporter = nodemailer.createTransport({
  host: SMTP_HOST || "smtp.gmail.com",
  port,
  secure,

  // Port 587 uses STARTTLS; port 465 uses implicit TLS.
  requireTLS: port === 587 && !secure,

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

// Verify SMTP connection
export async function verifyEmailConnection() {
  try {
    if (!SMTP_USER || !SMTP_PASS) {
      throw new Error(
        "SMTP_USER or SMTP_PASS is missing in environment variables."
      );
    }

    await transporter.verify();

    console.log(
      "Gmail SMTP connection verified successfully."
    );

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

// Escape HTML to prevent unsafe content in email
const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Send donation confirmation email
export async function sendDonationGreeting({
  donor,
  fundraiser,
  donation
}) {
  try {
    // Validate donor email
    if (!donor?.email) {
      console.error("Donor email is missing.");
      return false;
    }

    // Validate SMTP configuration
    if (!SMTP_USER || !SMTP_PASS) {
      console.error(
        "SMTP configuration incomplete. Check SMTP_USER and SMTP_PASS."
      );
      return false;
    }

    const donorName = donor.name || "there";

    const fundraiserTitle =
      fundraiser?.title || "a community cause";

    const amount = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR"
    }).format(Number(donation?.amount || 0));

    const safeDonorName = escapeHtml(donorName);
    const safeFundraiserTitle = escapeHtml(fundraiserTitle);

    const info = await transporter.sendMail({
      from:
        EMAIL_FROM ||
        `SocialConnect <${SMTP_USER}>`,

      to: donor.email,

      subject: "Thank you for supporting SocialConnect!",

      text: `
Hello ${donorName},

Thank you for your donation of ${amount} to ${fundraiserTitle}.

Your support helps communities move forward.

Donation Status: Successful

With gratitude,
The SocialConnect Team
      `,

      html: `
        <div style="
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: auto;
          padding: 20px;
          color: #24304a;
          line-height: 1.6;
        ">

          <div style="
            background: #eef5ff;
            padding: 24px;
            border-radius: 16px;
          ">

            <h1 style="color: #3168bd;">
              Thank you, ${safeDonorName}!
            </h1>

            <p>Your generosity means a lot.</p>

          </div>

          <p>
            Thank you for donating
            <strong>${amount}</strong>
            to
            <strong>${safeFundraiserTitle}</strong>
            through SocialConnect.
          </p>

          <div style="
            background: #f7f9fc;
            padding: 18px;
            border-radius: 10px;
          ">

            <h3>Donation Confirmation</h3>

            <p>
              <strong>Cause:</strong>
              ${safeFundraiserTitle}
            </p>

            <p>
              <strong>Amount:</strong>
              ${amount}
            </p>

            <p>
              <strong>Status:</strong>
              Successful
            </p>

          </div>

          <p>
            Your contribution helps make a difference.
          </p>

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
