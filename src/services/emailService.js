import nodemailer from "nodemailer";

/**
 * Get or initialize Nodemailer transporter.
 */
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  // Fallback dev transporter (prints email to console)
  return {
    sendMail: async (mailOptions) => {
      console.log("----------------------------------------------------");
      console.log(
        `[Nodemailer Console Mode] Sending Email to: ${mailOptions.to}`,
      );
      console.log(`Subject: ${mailOptions.subject}`);
      console.log(`Body:\n${mailOptions.text || mailOptions.html}`);
      console.log("----------------------------------------------------");
      return { messageId: "console-dev-id" };
    },
  };
}

/**
 * Send OTP Verification email via Nodemailer
 *
 * @param {string} recipient - Target email address or identifier
 * @param {string} otp - 6-digit OTP code
 */
export async function sendOtpEmail(recipient, otp) {
  const transporter = getTransporter();
  const fromEmail =
    process.env.EMAIL_FROM || '"CivicAI" <no-reply@civicai.org>';

  const subject = `Your CivicAI Verification Code: ${otp}`;
  const textBody = `Hello,\n\nYour CivicAI verification code is: ${otp}\n\nThis code will expire in 5 minutes.\n\nRegards,\nCivicAI Support Team`;
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #2563eb;">CivicAI Verification</h2>
      <p>Your 6-digit verification code is:</p>
      <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #1e293b; background: #f1f5f9; padding: 12px 24px; display: inline-block; border-radius: 6px; margin: 10px 0;">
        ${otp}
      </div>
      <p style="color: #64748b; font-size: 14px;">This code will expire in 5 minutes. If you did not request this code, please ignore this email.</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: fromEmail,
      to: recipient,
      subject: subject,
      text: textBody,
      html: htmlBody,
    });
    console.log(`[Nodemailer] OTP successfully dispatched to ${recipient}`);
  } catch (error) {
    console.error(
      `[Nodemailer] Failed to send OTP email to ${recipient}:`,
      error.message,
    );
  }
}

/**
 * Send Civic Complaint notification email via Nodemailer
 */
export async function sendEmailNotification({
  incident_id,
  category,
  severity,
  department,
  description,
}) {
  const transporter = getTransporter();
  const opsEmail = process.env.OPS_EMAIL || "ops@civicai.org";
  const fromEmail =
    process.env.EMAIL_FROM || '"CivicAI System" <no-reply@civicai.org>';

  const subject = `New Civic Complaint - #${incident_id}`;
  const textBody = `
A new civic complaint has been registered.

======================================
  Complaint ID : ${incident_id}
  Category     : ${category}
  Severity     : ${severity}
  Department   : ${department}
======================================

Description:
${description}

Please take appropriate action.
— CivicAI Automated System
`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #059669;">New Civic Complaint Filed</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
        <tr><td style="padding: 8px; font-weight: bold; width: 120px;">Complaint ID:</td><td style="padding: 8px;">${incident_id}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Category:</td><td style="padding: 8px;">${category}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Severity:</td><td style="padding: 8px;"><span style="color: ${severity === "High" ? "#dc2626" : "#d97706"}; font-weight: bold;">${severity}</span></td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Department:</td><td style="padding: 8px;">${department}</td></tr>
      </table>
      <h4>Description:</h4>
      <p style="background: #f8fafc; padding: 12px; border-left: 4px solid #059669; border-radius: 4px;">${description}</p>
      <p style="color: #64748b; font-size: 13px; margin-top: 20px;">CivicAI Automated System</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: fromEmail,
      to: opsEmail,
      subject: subject,
      text: textBody,
      html: htmlBody,
    });
    console.log(
      `[Nodemailer] Complaint notification email sent for #${incident_id}`,
    );
  } catch (error) {
    console.error(
      `[Nodemailer] Failed to send complaint notification email for #${incident_id}:`,
      error.message,
    );
  }
}

/**
 * Notify the reporting citizen when their complaint is successfully registered.
 */
export async function sendCitizenComplaintConfirmationEmail({
  recipient,
  complaintId,
  category,
  priority,
  department,
  description,
  address,
  status,
}) {
  if (!recipient) return;

  const transporter = getTransporter();
  const fromEmail =
    process.env.EMAIL_FROM || '"CivicFlow AI" <no-reply@civicflow.ai>';
  const subject = `Complaint Registered: #${complaintId} - CivicFlow AI`;
  const textBody = `Hello,\n\nYour civic complaint has been successfully registered!\n\n======================================\nComplaint ID: ${complaintId}\nCategory: ${category || "General"}\nPriority: ${priority || "Medium"}\nDepartment: ${department || "General Services"}\nStatus: ${status || "Submitted"}\nLocation: ${address || "Reported Location"}\n======================================\n\nSummary / Reason:\n${description || "Civic issue report"}\n\nYou can track the real-time progress of your complaint anytime using your Complaint ID (#${complaintId}) at:\nhttp://localhost:5173/track\n\nThank you for helping improve our community!\n\n— CivicFlow AI Team`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #1f2937; max-width: 600px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">
      <div style="border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 16px;">
        <h2 style="color: #059669; margin: 0; font-size: 22px;">CivicFlow AI</h2>
        <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 13px;">Complaint Registration Confirmation</p>
      </div>
      <p style="font-size: 15px; color: #374151;">Hello,</p>
      <p style="font-size: 15px; color: #374151;">Your civic complaint has been successfully registered and queued for action.</p>
      
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #047857; font-weight: bold;">Complaint ID</p>
        <p style="margin: 0; font-size: 24px; font-weight: bold; color: #065f46; font-family: monospace;">#${complaintId}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 14px;">
        <tr style="border-bottom: 1px solid #f3f4f6;">
          <td style="padding: 8px 0; font-weight: 600; color: #4b5563; width: 140px;">Category:</td>
          <td style="padding: 8px 0; color: #111827;">${category || "General"}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f3f4f6;">
          <td style="padding: 8px 0; font-weight: 600; color: #4b5563;">Priority:</td>
          <td style="padding: 8px 0; color: #111827;"><span style="font-weight: 600; color: ${String(priority).toLowerCase() === "critical" || String(priority).toLowerCase() === "high" ? "#dc2626" : "#d97706"};">${priority || "Medium"}</span></td>
        </tr>
        <tr style="border-bottom: 1px solid #f3f4f6;">
          <td style="padding: 8px 0; font-weight: 600; color: #4b5563;">Assigned To:</td>
          <td style="padding: 8px 0; color: #111827;">${department || "Pending assignment"}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f3f4f6;">
          <td style="padding: 8px 0; font-weight: 600; color: #4b5563;">Status:</td>
          <td style="padding: 8px 0; color: #059669; font-weight: 600;">${status || "Submitted"}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #4b5563;">Location:</td>
          <td style="padding: 8px 0; color: #111827;">${address || "Reported Location"}</td>
        </tr>
      </table>

      <div style="margin-top: 16px; padding: 12px; background-color: #f8fafc; border-left: 4px solid #059669; border-radius: 4px;">
        <p style="margin: 0; font-size: 13px; font-weight: bold; color: #475569;">Description / AI Summary:</p>
        <p style="margin: 4px 0 0 0; font-size: 14px; color: #334155;">${description || "Civic issue report"}</p>
      </div>

      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="font-size: 14px; color: #4b5563; margin-bottom: 12px;">You can track real-time resolution progress anytime using your Complaint ID.</p>
        <a href="http://localhost:5173/track" style="display: inline-block; background-color: #047857; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 4px; font-weight: bold; font-size: 14px;">Track Complaint Status</a>
      </div>

      <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; text-align: center;">— CivicFlow Automated Notifications</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: fromEmail,
      to: recipient,
      subject,
      text: textBody,
      html: htmlBody,
    });
    console.log(
      `[Nodemailer] Citizen complaint registration email sent to ${recipient} for #${complaintId}`,
    );
  } catch (error) {
    console.error(
      `[Nodemailer] Failed citizen complaint registration email for #${complaintId}:`,
      error.message,
    );
  }
}

/**
 * Notify the reporting citizen after an admin changes a complaint's status.
 */
export async function sendStatusUpdateEmail({
  recipient,
  complaintId,
  status,
  department,
  message,
}) {
  if (!recipient) return;

  const transporter = getTransporter();
  const fromEmail =
    process.env.EMAIL_FROM || '"CivicFlow AI" <no-reply@civicflow.ai>';
  const subject = `Update for complaint #${complaintId}: ${status}`;
  const textBody = `Your CivicFlow complaint has been updated.\n\nComplaint ID: ${complaintId}\nNew status: ${status}\nDepartment: ${department}\nUpdate: ${message}\n\nYou can track your complaint using your Complaint ID #${complaintId} on CivicFlow.`;
  const htmlBody = `<div style="font-family:Arial,sans-serif;max-width:600px;padding:24px;color:#1f2937"><h2 style="color:#047857">Your complaint has been updated</h2><p><strong>Complaint ID:</strong> #${complaintId}</p><p><strong>New status:</strong> ${status}</p><p><strong>Department:</strong> ${department}</p><p style="padding:12px;background:#f0fdf4;border-left:4px solid #059669">${message}</p><p style="color:#64748b">Use your Complaint ID #${complaintId} in CivicFlow to track future updates.</p></div>`;

  try {
    await transporter.sendMail({
      from: fromEmail,
      to: recipient,
      subject,
      text: textBody,
      html: htmlBody,
    });
    console.log(
      `[Nodemailer] Status update sent to ${recipient} for #${complaintId}`,
    );
  } catch (error) {
    console.error(
      `[Nodemailer] Failed status update for #${complaintId}:`,
      error.message,
    );
  }
}
