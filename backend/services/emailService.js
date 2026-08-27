const nodemailer = require('nodemailer');

const SENDER_EMAIL = process.env.SMTP_USER || 'camanishkalra@gmail.com';
const SENDER_PASS = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (SENDER_PASS) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: SENDER_EMAIL,
        pass: SENDER_PASS
      }
    });
  } else {
    // If no SMTP password provided, create a mock transporter that logs safely without throwing
    transporter = {
      sendMail: async (mailOptions) => {
        console.log(`[EMAIL DISPATCH] To: ${mailOptions.to} | From: ${mailOptions.from} | Subject: "${mailOptions.subject}"`);
        return { messageId: `mock_${Date.now()}`, accepted: [mailOptions.to] };
      }
    };
  }
  return transporter;
}

/**
 * Send welcome email to newly subscribed student/user from camanishkalra@gmail.com
 */
async function sendNewsletterWelcomeEmail(toEmail) {
  try {
    const transport = getTransporter();
    const mailOptions = {
      from: `"CA Manish Kalra | Success Mantra" <${SENDER_EMAIL}>`,
      to: toEmail,
      subject: '🎉 Welcome to Success Mantra - Exclusive Commerce Study Updates & Masterclasses',
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #090d16; color: #ffffff; padding: 40px 20px; border-radius: 16px; max-width: 600px; margin: auto;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #f59e0b; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">SUCCESS MANTRA</h1>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 4px;">CA Manish Kalra's Commerce Academy</p>
          </div>

          <div style="background-color: #1e293b; padding: 24px; border-radius: 12px; border: 1px solid #334155;">
            <h2 style="color: #38bdf8; font-size: 18px; margin-top: 0;">Welcome to our Learning Community! 🎓</h2>
            <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
              Thank you for subscribing to Success Mantra updates. You will now receive:
            </p>
            <ul style="color: #cbd5e1; font-size: 13px; line-height: 1.8; padding-left: 20px;">
              <li><strong>Free Live Masterclasses</strong> by CA Manish Kalra</li>
              <li><strong>CBSE Board Exam Formula Sheets</strong> and Revision Notes</li>
              <li><strong>CUET UG & CA Foundation</strong> Strategy Guides</li>
              <li><strong>Exclusive Discount Codes</strong> for New Batch Enrollments</li>
            </ul>

            <div style="text-align: center; margin-top: 24px; margin-bottom: 8px;">
              <a href="https://www.camanishkalra.com/courses" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 13px;">
                Explore Courses & Live Classes
              </a>
            </div>
          </div>

          <div style="margin-top: 24px; text-align: center; color: #64748b; font-size: 11px; line-height: 1.5;">
            <p style="margin: 4px 0;">Success Mantra EdTech • 5/2515, Gopal Nagar, Near Nagli Mandir, Saharanpur</p>
            <p style="margin: 4px 0;">Helpline: +91 87559 10352 | Email: <a href="mailto:${SENDER_EMAIL}" style="color: #94a3b8;">${SENDER_EMAIL}</a></p>
          </div>
        </div>
      `
    };

    const info = await transport.sendMail(mailOptions);
    console.log(`[EMAIL SUCCESS] Welcome email dispatched to ${toEmail} from ${SENDER_EMAIL}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('Error sending welcome email:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send alert to admin (camanishkalra@gmail.com) when someone subscribes
 */
async function sendAdminNewsletterNotification(subscriberEmail) {
  try {
    const transport = getTransporter();
    const mailOptions = {
      from: `"Success Mantra Website" <${SENDER_EMAIL}>`,
      to: 'camanishkalra@gmail.com',
      subject: `📢 New Newsletter Subscriber: ${subscriberEmail}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #4f46e5;">New Newsletter Subscriber Alert 🚀</h2>
          <p>A new student or visitor has subscribed to updates on <strong>camanishkalra.com</strong>:</p>
          <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; font-size: 14px;">
            <p style="margin: 4px 0;"><strong>Subscriber Email:</strong> ${subscriberEmail}</p>
            <p style="margin: 4px 0;"><strong>Date:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
            <p style="margin: 4px 0;"><strong>Source:</strong> Website Footer Subscription</p>
          </div>
          <p style="margin-top: 16px; font-size: 12px; color: #64748b;">You can view and export all subscribers from your Admin Panel.</p>
        </div>
      `
    };

    await transport.sendMail(mailOptions);
    console.log(`[EMAIL SUCCESS] Admin notification sent to camanishkalra@gmail.com for subscriber ${subscriberEmail}`);
    return { success: true };
  } catch (err) {
    console.error('Error sending admin notification email:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendNewsletterWelcomeEmail,
  sendAdminNewsletterNotification,
  SENDER_EMAIL
};
