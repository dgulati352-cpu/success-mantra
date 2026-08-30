const nodemailer = require('nodemailer');
const { getDoc, setDoc } = require('../database/firestore');

let cachedTransporter = null;
let lastPass = null;

async function getTransporter() {
  let senderEmail = process.env.SMTP_USER || 'camanishkalra@gmail.com';
  let senderPass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');

  if (!senderPass) {
    try {
      const dbSmtp = await getDoc('settings', 'smtp');
      if (dbSmtp && dbSmtp.gmail_app_password) {
        senderPass = String(dbSmtp.gmail_app_password).replace(/\s+/g, '');
        if (dbSmtp.sender_email) senderEmail = dbSmtp.sender_email.trim();
      }
    } catch (e) {}
  }

  if (senderPass && senderPass !== lastPass) {
    cachedTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: senderEmail,
        pass: senderPass
      }
    });
    lastPass = senderPass;
  } else if (!cachedTransporter && !senderPass) {
    cachedTransporter = {
      isMock: true,
      sendMail: async (mailOptions) => {
        console.log(`[EMAIL MOCK DISPATCH - NO GMAIL APP PASSWORD SET] To: ${mailOptions.to || mailOptions.bcc} | From: ${mailOptions.from} | Subject: "${mailOptions.subject}"`);
        return { messageId: `mock_${Date.now()}`, accepted: Array.isArray(mailOptions.to) ? mailOptions.to : [mailOptions.to || mailOptions.bcc] };
      }
    };
  }

  return { transport: cachedTransporter, senderEmail, senderPass, isMock: !senderPass };
}

/**
 * Send welcome email to newly subscribed student/user from camanishkalra@gmail.com
 */
async function sendNewsletterWelcomeEmail(toEmail) {
  try {
    const { transport, senderEmail, isMock } = await getTransporter();
    const mailOptions = {
      from: `"CA Manish Kalra | Success Mantra" <${senderEmail}>`,
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
            <p style="margin: 4px 0;">Helpline: +91 87559 10352 | Email: <a href="mailto:${senderEmail}" style="color: #94a3b8;">${senderEmail}</a></p>
          </div>
        </div>
      `
    };

    const info = await transport.sendMail(mailOptions);
    console.log(`[EMAIL SUCCESS] Welcome email dispatched to ${toEmail} from ${senderEmail} (isMock: ${isMock})`);
    return { success: true, messageId: info.messageId, isMock };
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
    const { transport, senderEmail, isMock } = await getTransporter();
    const mailOptions = {
      from: `"Success Mantra Website" <${senderEmail}>`,
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
          <p style="margin-top: 16px; font-size: 12px; color: #64748b;">You can send direct broadcasts or special offers to this subscriber from your Admin Panel.</p>
        </div>
      `
    };

    await transport.sendMail(mailOptions);
    console.log(`[EMAIL SUCCESS] Admin notification sent for subscriber ${subscriberEmail} (isMock: ${isMock})`);
    return { success: true, isMock };
  } catch (err) {
    console.error('Error sending admin notification email:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send rich broadcast emails from Admin (New Offers, Exclusive Live Classes, Dropout Re-engagement, Announcements)
 */
async function sendBroadcastEmail({
  recipients,
  subject,
  message,
  campaignType = 'offer', // 'offer' | 'live_class' | 'drop_out' | 'announcement'
  couponCode = '',
  discountText = '',
  validTill = '',
  liveClassTitle = '',
  liveClassDate = '',
  liveClassTime = '',
  liveClassLink = '',
  buttonText = '',
  buttonLink = ''
}) {
  try {
    const { transport, senderEmail, isMock } = await getTransporter();
    
    let toList = [];
    if (Array.isArray(recipients)) {
      toList = recipients.filter(Boolean);
    } else if (typeof recipients === 'string') {
      toList = recipients.split(',').map(e => e.trim()).filter(Boolean);
    }

    if (toList.length === 0) {
      return { success: false, error: 'No recipient email addresses provided.' };
    }

    let dynamicBody = '';

    if (campaignType === 'offer') {
      dynamicBody = `
        <div style="background: linear-gradient(135deg, #1e1b4b 0%, #311042 100%); border: 1px solid #6366f1; border-radius: 14px; padding: 24px; text-align: center; margin-bottom: 20px;">
          <span style="display: inline-block; background-color: #f59e0b; color: #090d16; font-weight: 900; font-size: 11px; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
            ${discountText || '35% OFF SPECIAL PROMO'}
          </span>
          <h2 style="color: #ffffff; font-size: 20px; font-weight: 800; margin: 0 0 10px 0;">
            ${subject}
          </h2>
          <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
            ${message.replace(/\n/g, '<br/>')}
          </p>
          ${couponCode ? `
            <div style="background-color: #0f172a; border: 2px dashed #f59e0b; border-radius: 8px; padding: 10px 16px; display: inline-block; margin-bottom: 16px;">
              <span style="color: #94a3b8; font-size: 11px; display: block;">Use Coupon Code:</span>
              <strong style="color: #f59e0b; font-size: 18px; letter-spacing: 2px; font-family: monospace;">${couponCode}</strong>
            </div>
          ` : ''}
          ${validTill ? `<p style="color: #f87171; font-size: 11px; margin: 0 0 16px 0;">⏳ Valid Till: <strong>${validTill}</strong></p>` : ''}
          <div>
            <a href="${buttonLink || 'https://www.camanishkalra.com/courses'}" style="display: inline-block; background-color: #f59e0b; color: #090d16; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 900; font-size: 14px; letter-spacing: 0.5px;">
              ${buttonText || 'Enroll Now & Claim Discount →'}
            </a>
          </div>
        </div>
      `;
    } else if (campaignType === 'live_class') {
      dynamicBody = `
        <div style="background-color: #18181b; border: 1px solid #ef4444; border-radius: 14px; padding: 24px; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; margin-bottom: 12px;">
            <span style="display: inline-block; width: 10px; height: 10px; background-color: #ef4444; border-radius: 50%; margin-right: 8px;"></span>
            <span style="color: #f87171; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Live Interactive Masterclass</span>
          </div>
          <h2 style="color: #ffffff; font-size: 19px; font-weight: 800; margin: 0 0 10px 0;">
            ${liveClassTitle || subject}
          </h2>
          <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
            ${message.replace(/\n/g, '<br/>')}
          </p>
          <div style="background-color: #09090b; border-left: 3px solid #ef4444; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px; font-size: 13px; color: #cbd5e1;">
            <p style="margin: 3px 0;">👨‍🏫 <strong>Faculty:</strong> CA Manish Kalra (Senior Chartered Accountant)</p>
            ${liveClassDate ? `<p style="margin: 3px 0;">📅 <strong>Date:</strong> ${liveClassDate}</p>` : ''}
            ${liveClassTime ? `<p style="margin: 3px 0;">⏰ <strong>Time:</strong> ${liveClassTime}</p>` : ''}
            <p style="margin: 3px 0;">💻 <strong>Platform:</strong> Success Mantra Live Stream Room</p>
          </div>
          <div style="text-align: center;">
            <a href="${liveClassLink || 'https://www.camanishkalra.com/live-classes'}" style="display: inline-block; background-color: #ef4444; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 800; font-size: 14px;">
              ${buttonText || 'Join Live Classroom Stream →'}
            </a>
          </div>
        </div>
      `;
    } else if (campaignType === 'drop_out') {
      dynamicBody = `
        <div style="background-color: #1e293b; border: 1px solid #3b82f6; border-radius: 14px; padding: 24px; margin-bottom: 20px;">
          <h2 style="color: #60a5fa; font-size: 19px; font-weight: 800; margin: 0 0 12px 0;">
            We Miss You at Success Mantra! 📚
          </h2>
          <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0 0 16px 0;">
            ${message.replace(/\n/g, '<br/>')}
          </p>
          <div style="background-color: #0f172a; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <h4 style="color: #38bdf8; font-size: 13px; margin: 0 0 8px 0;">Need Academic Assistance or Facing Doubts?</h4>
            <ul style="color: #94a3b8; font-size: 12px; line-height: 1.8; margin: 0; padding-left: 18px;">
              <li>Personalized 1-on-1 Guidance & Time Table Consultation</li>
              <li>Complete Doubt Resolution in Accounts, BST, Economics & Law</li>
              <li>Direct Helpline Call with Faculty: <strong>+91 87559 10352</strong></li>
            </ul>
          </div>

          <div style="text-align: center; margin-top: 20px;">
            <a href="${buttonLink || 'https://www.camanishkalra.com/student/dashboard'}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 13px;">
              ${buttonText || 'Resume My Learning & Access Portal →'}
            </a>
          </div>
        </div>
      `;
    } else {
      dynamicBody = `
        <div style="background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
          <h2 style="color: #ffffff; font-size: 18px; font-weight: bold; margin: 0 0 14px 0;">
            ${subject}
          </h2>
          <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
            ${message.replace(/\n/g, '<br/>')}
          </div>
          ${buttonText ? `
            <div style="text-align: center; margin-top: 24px;">
              <a href="${buttonLink}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 13px;">
                ${buttonText}
              </a>
            </div>
          ` : ''}
        </div>
      `;
    }

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090d16; color: #ffffff; padding: 40px 20px; min-height: 100%;">
        <div style="max-width: 600px; margin: auto; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          
          <div style="background-color: #090d16; padding: 24px; text-align: center; border-bottom: 1px solid #1e293b;">
            <h1 style="color: #f59e0b; margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.5px;">SUCCESS MANTRA</h1>
            <p style="color: #94a3b8; font-size: 11px; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">CA Manish Kalra's Commerce Academy</p>
          </div>

          <div style="padding: 24px;">
            ${dynamicBody}
          </div>

          <div style="background-color: #090d16; padding: 20px 24px; text-align: center; color: #64748b; font-size: 11px; line-height: 1.6; border-top: 1px solid #1e293b;">
            <p style="margin: 0 0 4px 0; font-weight: bold; color: #94a3b8;">Success Mantra EdTech Pvt. Ltd.</p>
            <p style="margin: 0 0 4px 0;">5/2515, Gopal Nagar, Near Nagli Mandir, Saharanpur</p>
            <p style="margin: 0 0 8px 0;">Helpline: +91 87559 10352 | Email: <a href="mailto:${senderEmail}" style="color: #38bdf8; text-decoration: none;">${senderEmail}</a></p>
            <p style="margin: 12px 0 0 0; color: #475569; font-size: 10px;">
              You received this email because you are a registered student or subscriber at <a href="https://www.camanishkalra.com" style="color: #64748b;">camanishkalra.com</a>.
            </p>
          </div>

        </div>
      </div>
    `;

    const BATCH_SIZE = 25;
    let sentCount = 0;

    for (let i = 0; i < toList.length; i += BATCH_SIZE) {
      const batch = toList.slice(i, i + BATCH_SIZE);
      const mailOptions = {
        from: `"CA Manish Kalra | Success Mantra" <${senderEmail}>`,
        to: batch.length === 1 ? batch[0] : senderEmail,
        bcc: batch.length > 1 ? batch : undefined,
        subject: subject || 'Special Announcement from CA Manish Kalra',
        html: htmlContent
      };

      await transport.sendMail(mailOptions);
      sentCount += batch.length;
    }

    console.log(`[BROADCAST SUCCESS] Dispatched email broadcast (${campaignType}) to ${sentCount} recipient(s) (isMock: ${isMock}).`);
    return { success: true, sentCount, totalRecipients: toList.length, isMock, senderEmail };
  } catch (err) {
    console.error('Error sending broadcast email:', err.message);
    let friendlyError = err.message;
    if (err.message.includes('535') || err.message.includes('Username and Password not accepted') || err.message.includes('BadCredentials')) {
      friendlyError = 'Invalid Gmail App Password. Google requires a dedicated 16-character App Password (not your normal Gmail password). Please generate one at https://myaccount.google.com/apppasswords and update it in the "Gmail SMTP Key" tab.';
    }
    return { success: false, error: friendlyError };
  }
}

/**
 * Handle student course leave / drop out inquiry sent to Admin (camanishkalra@gmail.com)
 */
async function sendStudentDropOutOrHelpEmail({
  studentName = 'Student',
  studentEmail = '',
  studentPhone = '',
  studentId = '',
  courseTitle = 'Commerce Course',
  type = 'leave_request', // 'leave_request' | 'course_feedback' | 'urgent_help'
  reason = 'General Inquiry',
  message = ''
}) {
  try {
    const { transport, senderEmail, isMock } = await getTransporter();

    const typeLabel = type === 'leave_request' ? 'Course Leave / Drop Notice' : type === 'urgent_help' ? 'Urgent Academic Help Request' : 'Course Feedback';
    const adminMailOptions = {
      from: `"Success Mantra Student Portal" <${senderEmail}>`,
      to: 'camanishkalra@gmail.com',
      replyTo: studentEmail || senderEmail,
      subject: `🚨 [Student Alert] ${typeLabel} - ${studentName} (${courseTitle})`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
          <h2 style="color: #dc2626; margin-top: 0;">Student ${typeLabel} Alert ⚠️</h2>
          <p>A student has submitted a notice regarding their course:</p>
          
          <div style="background-color: #ffffff; padding: 18px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13px; line-height: 1.6;">
            <p style="margin: 4px 0;"><strong>Student Name:</strong> ${studentName}</p>
            <p style="margin: 4px 0;"><strong>Student Email:</strong> <a href="mailto:${studentEmail}">${studentEmail}</a></p>
            <p style="margin: 4px 0;"><strong>Student Phone / WhatsApp:</strong> <a href="tel:${studentPhone}">${studentPhone || 'Not provided'}</a></p>
            <p style="margin: 4px 0;"><strong>Student ID:</strong> ${studentId || 'N/A'}</p>
            <p style="margin: 4px 0;"><strong>Course:</strong> ${courseTitle}</p>
            <p style="margin: 4px 0;"><strong>Reason / Category:</strong> ${reason}</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 12px 0;" />
            <p style="margin: 4px 0;"><strong>Student's Message:</strong></p>
            <p style="background-color: #f1f5f9; padding: 12px; border-radius: 6px; color: #334155; font-style: italic;">
              ${message || 'No additional comments provided.'}
            </p>
          </div>

          <div style="margin-top: 18px;">
            <a href="mailto:${studentEmail}?subject=Regarding your Success Mantra Course (${courseTitle})" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; font-size: 12px;">
              Reply Directly to Student →
            </a>
          </div>
        </div>
      `
    };

    await transport.sendMail(adminMailOptions);

    if (studentEmail) {
      const studentConfirmOptions = {
        from: `"CA Manish Kalra | Success Mantra" <${senderEmail}>`,
        to: studentEmail,
        subject: `We received your request regarding ${courseTitle} - CA Manish Kalra`,
        html: `
              Success Mantra EdTech • Saharanpur
            </p>
          </div>
        `
      };
      await transport.sendMail(studentMailOptions);
    }

    return { success: true };
  } catch (err) {
    console.error('Error handling student leave/help email:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send test email to verify Gmail SMTP setup
 */
async function sendTestEmail(testRecipient) {
  try {
    const { transport, senderEmail, senderPass, isMock } = await getTransporter();
    
    if (isMock || !senderPass) {
      return {
        success: false,
        error: 'No Gmail App Password configured yet. Please enter your 16-character Google App Password in SMTP Settings.'
      };
    }

    const mailOptions = {
      from: `"CA Manish Kalra | Success Mantra" <${senderEmail}>`,
      to: testRecipient || senderEmail,
      subject: '✅ Success Mantra SMTP Test Email - Real Delivery Verified',
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #090d16; color: #ffffff; padding: 30px; border-radius: 12px; max-width: 500px; margin: auto;">
          <h2 style="color: #10b981; margin: 0 0 10px 0;">🎉 SMTP Delivery Verified!</h2>
          <p style="color: #cbd5e1; font-size: 13px; line-height: 1.6;">
            Your Gmail App Password connection for <strong>${senderEmail}</strong> is working properly. Real broadcast emails and student drop-out alerts will now be delivered directly to inboxes.
          </p>
          <div style="background-color: #1e293b; padding: 12px; border-radius: 6px; font-size: 11px; color: #94a3b8; margin-top: 15px;">
            Timestamp: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
          </div>
        </div>
      `
    };

    const info = await transport.sendMail(mailOptions);
    return {
      success: true,
      messageId: info.messageId,
      senderEmail,
      recipient: testRecipient || senderEmail
    };
  } catch (err) {
    console.error('SMTP test error:', err.message);
    return {
      success: false,
      error: err.message.includes('Username and Password not accepted')
        ? 'Google rejected the password. Make sure you are using a 16-character Google App Password (not your regular Gmail login password). Generate one at myaccount.google.com/apppasswords'
        : err.message
    };
  }
}

module.exports = {
  sendNewsletterWelcomeEmail,
  sendAdminNewsletterNotification,
  sendBroadcastEmail,
  sendStudentDropOutOrHelpEmail,
  sendTestEmail,
  getTransporter
};

