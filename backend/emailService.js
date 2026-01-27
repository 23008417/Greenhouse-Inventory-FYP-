const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  return transporter;
}

async function sendWelcomeEmail({ to, firstName }) {
  if (!to) {
    console.error('sendWelcomeEmail called without recipient');
    return;
  }

  const name = firstName && firstName.trim()
    ? firstName.trim()
    : (to.split('@')[0] || 'there');

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>Welcome to Cropflow, ${name}!</h2>
      <p>Thanks for creating an account with Cropflow.</p>
      <p>You can now browse plants, place orders, and manage your greenhouse inventory.</p>
      <p>
        <a href="${frontendUrl}" style="
          display:inline-block;
          padding:10px 18px;
          background:#16a34a;
          color:#ffffff;
          text-decoration:none;
          border-radius:4px;
        ">Open Cropflow</a>
      </p>
      <p>If you didnt sign up, you can ignore this email.</p>
      <p>Best regards,<br/>The Cropflow Team</p>
    </div>
  `;

  const text = `
Welcome to Cropflow, ${name}!

Thanks for creating an account with Cropflow.
You can now browse plants, place orders, and manage your greenhouse inventory.

Open Cropflow: ${frontendUrl}

Best regards,
The Cropflow Team
  `.trim();

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject: `Welcome to Cropflow, ${name}!`,
    text,
    html
  };

  const t = getTransporter();
  await t.sendMail(mailOptions);
}

module.exports = {
  sendWelcomeEmail
};
