// Email service using Resend API
import { Resend } from 'resend';

const FROM_EMAIL = 'info@eggnetwork.io';

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is not set');
  }
  return {
    client: new Resend(apiKey),
    fromEmail: FROM_EMAIL
  };
}

export async function sendVerificationEmail(to: string, verificationCode: string, verificationUrl: string) {
  try {
    const { client, fromEmail } = getResendClient();
    console.log(`Attempting to send verification email to: ${to}`);
    
    const result = await client.emails.send({
      from: `AI Storiz <${fromEmail}>`,
      to: [to],
      subject: 'Verify your email - AI Storiz',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #FAF6F1; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #00D66A; margin: 0; font-size: 28px;">AI Storiz</h1>
              <p style="color: #666; margin-top: 8px;">Verify your email address</p>
            </div>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Welcome to AI Storiz! Please use the verification code below to confirm your email address:
            </p>
            
            <div style="background: #E6FFF2; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
              <span style="font-size: 32px; font-weight: bold; color: #00D66A; letter-spacing: 8px;">${verificationCode}</span>
            </div>
            
            <p style="color: #666; font-size: 14px; text-align: center;">
              This code expires in 24 hours.
            </p>
            
            <p style="color: #999; font-size: 12px; margin-top: 32px; text-align: center;">
              If you didn't create an AI Storiz account, you can safely ignore this email.
            </p>
          </div>
        </body>
        </html>
      `
    });
    
    console.log('Verification email sent:', result);
    return { success: true, messageId: result.data?.id };
  } catch (error: any) {
    console.error('Failed to send verification email:', error);
    return { success: false, error: error.message };
  }
}

export async function sendPasswordResetEmail(to: string, resetCode: string, resetUrl: string) {
  try {
    const { client, fromEmail } = getResendClient();
    
    const result = await client.emails.send({
      from: `AI Storiz <${fromEmail}>`,
      to: [to],
      subject: 'Reset your password - AI Storiz',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #FAF6F1; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #00D66A; margin: 0; font-size: 28px;">AI Storiz</h1>
              <p style="color: #666; margin-top: 8px;">Password Reset Request</p>
            </div>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              We received a request to reset your password. Use the code below to set a new password:
            </p>
            
            <div style="background: #FFF9E6; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
              <span style="font-size: 32px; font-weight: bold; color: #E5A800; letter-spacing: 8px;">${resetCode}</span>
            </div>
            
            <p style="color: #666; font-size: 14px; text-align: center;">
              This code expires in 1 hour.
            </p>
            
            <p style="color: #999; font-size: 12px; margin-top: 32px; text-align: center;">
              If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
            </p>
          </div>
        </body>
        </html>
      `
    });
    
    console.log('Password reset email sent:', result);
    return { success: true, messageId: result.data?.id };
  } catch (error: any) {
    console.error('Failed to send password reset email:', error);
    return { success: false, error: error.message };
  }
}

export async function sendWelcomeEmail(to: string) {
  try {
    const { client, fromEmail } = getResendClient();
    
    const result = await client.emails.send({
      from: `AI Storiz <${fromEmail}>`,
      to: [to],
      subject: 'Welcome to AI Storiz!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #FAF6F1; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #00D66A; margin: 0; font-size: 28px;">Welcome to AI Storiz!</h1>
            </div>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Your email has been verified. You're all set to create amazing AI-powered comics!
            </p>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              You've received <strong>50 free credits</strong> to get started. Here's what you can do:
            </p>
            
            <ul style="color: #333; font-size: 16px; line-height: 1.8;">
              <li>Create multi-page comic stories</li>
              <li>Choose from Comic, Manga, or Manhwa styles</li>
              <li>Add your own characters</li>
              <li>Export as PDF, JPG, or ZIP</li>
            </ul>
            
            <p style="color: #666; font-size: 14px; margin-top: 32px; text-align: center;">
              Happy creating!<br>The AI Storiz Team
            </p>
          </div>
        </body>
        </html>
      `
    });
    
    console.log('Welcome email sent:', result);
    return { success: true, messageId: result.data?.id };
  } catch (error: any) {
    console.error('Failed to send welcome email:', error);
    return { success: false, error: error.message };
  }
}
