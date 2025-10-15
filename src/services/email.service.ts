import nodemailer from 'nodemailer';
import { logger } from '@/utils/logger';

export interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

// Email templates
const emailTemplates: Record<string, EmailTemplate> = {
  'email-verification': {
    subject: 'Verify your email address',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify your email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>CBT System</h1>
          </div>
          <div class="content">
            <h2>Hello {{firstName}}!</h2>
            <p>Thank you for registering with CBT System. To complete your registration, please verify your email address by clicking the button below:</p>
            <a href="{{verificationLink}}" class="button">Verify Email Address</a>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p>{{verificationLink}}</p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create an account with CBT System, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2025 CBT System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Hello {{firstName}}!
      
      Thank you for registering with CBT System. To complete your registration, please verify your email address by visiting this link:
      
      {{verificationLink}}
      
      This link will expire in 24 hours.
      
      If you didn't create an account with CBT System, please ignore this email.
      
      © 2025 CBT System. All rights reserved.
    `,
  },
  'password-reset': {
    subject: 'Reset your password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reset your password</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ef4444; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #ef4444; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>CBT System</h1>
          </div>
          <div class="content">
            <h2>Hello {{firstName}}!</h2>
            <p>You requested to reset your password for your CBT System account. Click the button below to reset your password:</p>
            <a href="{{resetLink}}" class="button">Reset Password</a>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p>{{resetLink}}</p>
            <p>This link will expire in 10 minutes.</p>
            <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
          </div>
          <div class="footer">
            <p>&copy; 2025 CBT System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Hello {{firstName}}!
      
      You requested to reset your password for your CBT System account. Visit this link to reset your password:
      
      {{resetLink}}
      
      This link will expire in 10 minutes.
      
      If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
      
      © 2025 CBT System. All rights reserved.
    `,
  },
  'exam-scheduled': {
    subject: 'Exam Scheduled: {{examTitle}}',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Exam Scheduled</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .exam-info { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>CBT System</h1>
          </div>
          <div class="content">
            <h2>Hello {{firstName}}!</h2>
            <p>You have been scheduled for an exam. Here are the details:</p>
            <div class="exam-info">
              <h3>{{examTitle}}</h3>
              <p><strong>Date:</strong> {{examDate}}</p>
              <p><strong>Time:</strong> {{examTime}}</p>
              <p><strong>Duration:</strong> {{examDuration}} minutes</p>
              <p><strong>Instructions:</strong> {{examInstructions}}</p>
            </div>
            <p>Please make sure you are ready for the exam at the scheduled time.</p>
          </div>
          <div class="footer">
            <p>&copy; 2025 CBT System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Hello {{firstName}}!
      
      You have been scheduled for an exam. Here are the details:
      
      Exam: {{examTitle}}
      Date: {{examDate}}
      Time: {{examTime}}
      Duration: {{examDuration}} minutes
      Instructions: {{examInstructions}}
      
      Please make sure you are ready for the exam at the scheduled time.
      
      © 2025 CBT System. All rights reserved.
    `,
  },
  'exam-reminder': {
    subject: 'Exam Reminder: {{examTitle}}',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Exam Reminder</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .exam-info { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>CBT System</h1>
          </div>
          <div class="content">
            <h2>Hello {{firstName}}!</h2>
            <p>This is a reminder that you have an exam scheduled:</p>
            <div class="exam-info">
              <h3>{{examTitle}}</h3>
              <p><strong>Date:</strong> {{examDate}}</p>
              <p><strong>Time:</strong> {{examTime}}</p>
              <p><strong>Duration:</strong> {{examDuration}} minutes</p>
            </div>
            <p>Please make sure you are ready for the exam.</p>
          </div>
          <div class="footer">
            <p>&copy; 2025 CBT System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Hello {{firstName}}!
      
      This is a reminder that you have an exam scheduled:
      
      Exam: {{examTitle}}
      Date: {{examDate}}
      Time: {{examTime}}
      Duration: {{examDuration}} minutes
      
      Please make sure you are ready for the exam.
      
      © 2025 CBT System. All rights reserved.
    `,
  },
  'exam-results': {
    subject: 'Exam Results: {{examTitle}}',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Exam Results</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #8b5cf6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .results { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>CBT System</h1>
          </div>
          <div class="content">
            <h2>Hello {{firstName}}!</h2>
            <p>Your exam results are now available:</p>
            <div class="results">
              <h3>{{examTitle}}</h3>
              <p><strong>Score:</strong> {{score}}/{{totalMarks}} ({{percentage}}%)</p>
              <p><strong>Grade:</strong> {{grade}}</p>
              <p><strong>Status:</strong> {{status}}</p>
              <p><strong>Time Taken:</strong> {{timeTaken}}</p>
            </div>
            <p>You can view detailed results in your dashboard.</p>
          </div>
          <div class="footer">
            <p>&copy; 2025 CBT System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Hello {{firstName}}!
      
      Your exam results are now available:
      
      Exam: {{examTitle}}
      Score: {{score}}/{{totalMarks}} ({{percentage}}%)
      Grade: {{grade}}
      Status: {{status}}
      Time Taken: {{timeTaken}}
      
      You can view detailed results in your dashboard.
      
      © 2025 CBT System. All rights reserved.
    `,
  },
};

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

// Replace template variables
const replaceTemplateVariables = (template: string, data: Record<string, any>): string => {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(value));
  }
  return result;
};

// Send email
export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    const transporter = createTransporter();
    
    const template = emailTemplates[options.template];
    if (!template) {
      throw new Error(`Email template '${options.template}' not found`);
    }

    const html = replaceTemplateVariables(template.html, options.data);
    const text = replaceTemplateVariables(template.text, options.data);
    const subject = replaceTemplateVariables(template.subject, options.data);

    const mailOptions = {
      from: `${process.env.EMAIL_NAME || 'CBT System'} <${process.env.EMAIL_FROM}>`,
      to: options.to,
      subject,
      html,
      text,
      attachments: options.attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    
    logger.info('Email sent successfully', {
      messageId: info.messageId,
      to: options.to,
      subject,
      template: options.template,
    });

  } catch (error) {
    logger.error('Failed to send email', {
      error: error instanceof Error ? error.message : error,
      to: options.to,
      template: options.template,
    });
    throw error;
  }
};

// Send bulk emails
export const sendBulkEmails = async (emails: EmailOptions[]): Promise<void> => {
  const transporter = createTransporter();
  
  for (const emailOptions of emails) {
    try {
      const template = emailTemplates[emailOptions.template];
      if (!template) {
        logger.error(`Email template '${emailOptions.template}' not found`);
        continue;
      }

      const html = replaceTemplateVariables(template.html, emailOptions.data);
      const text = replaceTemplateVariables(template.text, emailOptions.data);
      const subject = replaceTemplateVariables(template.subject, emailOptions.data);

      const mailOptions = {
        from: `${process.env.EMAIL_NAME || 'CBT System'} <${process.env.EMAIL_FROM}>`,
        to: emailOptions.to,
        subject,
        html,
        text,
        attachments: emailOptions.attachments,
      };

      await transporter.sendMail(mailOptions);
      
      logger.info('Bulk email sent successfully', {
        to: emailOptions.to,
        subject,
        template: emailOptions.template,
      });

      // Add delay between emails to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      logger.error('Failed to send bulk email', {
        error: error instanceof Error ? error.message : error,
        to: emailOptions.to,
        template: emailOptions.template,
      });
      // Continue with other emails even if one fails
    }
  }
};

// Verify email configuration
export const verifyEmailConfig = async (): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    logger.info('Email configuration verified successfully');
    return true;
  } catch (error) {
    logger.error('Email configuration verification failed', {
      error: error instanceof Error ? error.message : error,
    });
    return false;
  }
};
