const nodemailer = require('nodemailer');
require('dotenv').config();

class MailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      // service: process.env.EMAIL_SERVICE, // e.g., 'gmail'
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  async sendMail(to, subject, text, html = null) {
    const mailOptions = {
      from: `"${process.env.APP_NAME || 'Gym Management System'}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    };

    if (html) {
      mailOptions.html = html;
    }

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Email sent to ${to} - Subject: ${subject}`);
      return { success: true, message: 'Email sent successfully' };
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }
  }

  // Enhanced method for HTML emails with better error handling
  async sendHtmlMail(options) {
    const { to, subject, text, html, attachments = [] } = options;
    
    const mailOptions = {
      from: `"${process.env.APP_NAME || 'Gym Management System'}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
      attachments
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`HTML Email sent to ${to} - Subject: ${subject} - MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId, message: 'Email sent successfully' };
    } catch (error) {
      console.error('Error sending HTML email:', error);
      return { success: false, error: error.message };
    }
  }

  // Payment confirmation email
  async sendPaymentConfirmation(paymentData) {
    try {
      const {
        userEmail,
        userName,
        paymentAmount,
        transactionId,
        paymentMethod,
        gymName,
        subscriptionTitle,
        validFrom,
        validTo,
        gateway
      } = paymentData;

      const subject = `Payment Confirmation - ₹${paymentAmount} - ${gymName}`;
      
      const html = this.generatePaymentConfirmationHTML({
        userName,
        paymentAmount,
        transactionId,
        paymentMethod,
        gymName,
        subscriptionTitle,
        validFrom,
        validTo,
        gateway
      });

      const text = `Dear ${userName},\n\nYour payment of ₹${paymentAmount} has been successfully processed.\n\nTransaction ID: ${transactionId}\nGym: ${gymName}\nSubscription: ${subscriptionTitle}\nValid From: ${validFrom}\nValid To: ${validTo}\n\nThank you for choosing our services!\n\nBest regards,\nGym Management Team`;

      return await this.sendHtmlMail({
        to: userEmail,
        subject,
        text,
        html
      });
    } catch (error) {
      console.error('Error sending payment confirmation email:', error);
      return { success: false, error: error.message };
    }
  }

  // Refund initiated email
  async sendRefundInitiated(refundData) {
    try {
      const {
        userEmail,
        userName,
        refundAmount,
        refundReason,
        gatewayRefundId,
        gymName,
        subscriptionTitle,
        gateway,
        estimatedDays = '3-7 business days'
      } = refundData;

      const subject = `Refund Initiated - ₹${refundAmount} - ${gymName}`;
      
      const html = this.generateRefundInitiatedHTML({
        userName,
        refundAmount,
        refundReason,
        gatewayRefundId,
        gymName,
        subscriptionTitle,
        gateway,
        estimatedDays
      });

      const text = `Dear ${userName},\n\nYour refund request for ₹${refundAmount} has been initiated and processed with the payment gateway.\n\nRefund Details:\n- Amount: ₹${refundAmount}\n- Reason: ${refundReason}\n- Gym: ${gymName}\n- Subscription: ${subscriptionTitle}\n- Gateway Reference: ${gatewayRefundId}\n\nThe refund will be credited to your original payment method within ${estimatedDays}.\n\nIf you have any questions, please contact our support team.\n\nBest regards,\nGym Management Team`;

      return await this.sendHtmlMail({
        to: userEmail,
        subject,
        text,
        html
      });
    } catch (error) {
      console.error('Error sending refund initiated email:', error);
      return { success: false, error: error.message };
    }
  }

  // Refund completed email
  async sendRefundCompleted(refundData) {
    try {
      const {
        userEmail,
        userName,
        refundAmount,
        gatewayRefundId,
        gymName,
        subscriptionTitle,
        gateway,
        completedAt
      } = refundData;

      const subject = `Refund Completed - ₹${refundAmount} - ${gymName}`;
      
      const html = this.generateRefundCompletedHTML({
        userName,
        refundAmount,
        gatewayRefundId,
        gymName,
        subscriptionTitle,
        gateway,
        completedAt
      });

      const text = `Dear ${userName},\n\nGreat news! Your refund of ₹${refundAmount} has been successfully completed.\n\nRefund Details:\n- Amount: ₹${refundAmount}\n- Gym: ${gymName}\n- Subscription: ${subscriptionTitle}\n- Gateway Reference: ${gatewayRefundId}\n- Completed At: ${completedAt}\n\nThe amount has been credited to your original payment method. It may take 1-2 business days to reflect in your account statement.\n\nThank you for using our services!\n\nBest regards,\nGym Management Team`;

      return await this.sendHtmlMail({
        to: userEmail,
        subject,
        text,
        html
      });
    } catch (error) {
      console.error('Error sending refund completed email:', error);
      return { success: false, error: error.message };
    }
  }

  // Generate HTML template for payment confirmation
  generatePaymentConfirmationHTML(data) {
    const {
      userName,
      paymentAmount,
      transactionId,
      paymentMethod,
      gymName,
      subscriptionTitle,
      validFrom,
      validTo,
      gateway
    } = data;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Confirmation</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { padding: 30px; }
            .success-icon { font-size: 48px; margin-bottom: 20px; }
            .amount { font-size: 28px; font-weight: bold; color: #28a745; margin: 20px 0; }
            .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .details-table th, .details-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            .details-table th { background-color: #f8f9fa; font-weight: bold; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; color: #666; }
            .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="success-icon">✅</div>
                <h1>Payment Confirmed!</h1>
                <p>Your subscription is now active</p>
            </div>
            
            <div class="content">
                <p>Dear <strong>${userName}</strong>,</p>
                
                <p>We're pleased to confirm that your payment has been successfully processed!</p>
                
                <div class="amount">₹${paymentAmount}</div>
                
                <table class="details-table">
                    <tr><th>Transaction ID</th><td>${transactionId}</td></tr>
                    <tr><th>Payment Method</th><td>${paymentMethod || 'Online'}</td></tr>
                    <tr><th>Payment Gateway</th><td>${gateway.charAt(0).toUpperCase() + gateway.slice(1)}</td></tr>
                    <tr><th>Gym</th><td>${gymName}</td></tr>
                    <tr><th>Subscription</th><td>${subscriptionTitle}</td></tr>
                    <tr><th>Valid From</th><td>${new Date(validFrom).toLocaleDateString()}</td></tr>
                    <tr><th>Valid To</th><td>${new Date(validTo).toLocaleDateString()}</td></tr>
                </table>
                
                <p><strong>What's next?</strong></p>
                <ul>
                    <li>Your gym membership is now active</li>
                    <li>You can start using the gym facilities immediately</li>
                    <li>Present this email or your membership ID at the gym</li>
                    <li>Contact the gym directly for any facility-related queries</li>
                </ul>
                
                <p>If you have any questions about your payment or subscription, please don't hesitate to contact our support team.</p>
                
                <p>Thank you for choosing our services!</p>
            </div>
            
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ${process.env.APP_NAME || 'Gym Management System'}. All rights reserved.</p>
                <p>This is an automated message. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  // Generate HTML template for refund initiated
  generateRefundInitiatedHTML(data) {
    const {
      userName,
      refundAmount,
      refundReason,
      gatewayRefundId,
      gymName,
      subscriptionTitle,
      gateway,
      estimatedDays
    } = data;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Refund Initiated</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%); color: #2d3436; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { padding: 30px; }
            .processing-icon { font-size: 48px; margin-bottom: 20px; }
            .amount { font-size: 28px; font-weight: bold; color: #e17055; margin: 20px 0; }
            .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .details-table th, .details-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            .details-table th { background-color: #f8f9fa; font-weight: bold; }
            .timeline { background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="processing-icon">🔄</div>
                <h1>Refund Initiated</h1>
                <p>Your refund is being processed</p>
            </div>
            
            <div class="content">
                <p>Dear <strong>${userName}</strong>,</p>
                
                <p>Your refund request has been successfully initiated and processed with the payment gateway.</p>
                
                <div class="amount">₹${refundAmount}</div>
                
                <table class="details-table">
                    <tr><th>Refund Amount</th><td>₹${refundAmount}</td></tr>
                    <tr><th>Reason</th><td>${refundReason}</td></tr>
                    <tr><th>Gateway Reference</th><td>${gatewayRefundId}</td></tr>
                    <tr><th>Payment Gateway</th><td>${gateway.charAt(0).toUpperCase() + gateway.slice(1)}</td></tr>
                    <tr><th>Gym</th><td>${gymName}</td></tr>
                    <tr><th>Subscription</th><td>${subscriptionTitle}</td></tr>
                </table>
                
                <div class="timeline">
                    <h3>What happens next?</h3>
                    <ul>
                        <li>✅ <strong>Refund initiated</strong> - Your refund has been processed with the payment gateway</li>
                        <li>🔄 <strong>Processing</strong> - The gateway is processing your refund request</li>
                        <li>💳 <strong>Credit to account</strong> - Amount will be credited within ${estimatedDays}</li>
                        <li>📧 <strong>Confirmation</strong> - You'll receive another email when the refund is completed</li>
                    </ul>
                </div>
                
                <p><strong>Important Notes:</strong></p>
                <ul>
                    <li>The refund will be credited to your original payment method</li>
                    <li>Processing time may vary depending on your bank/card issuer</li>
                    <li>You'll receive a confirmation email once the refund is completed</li>
                    <li>If you don't see the refund after ${estimatedDays}, please contact your bank</li>
                </ul>
                
                <p>If you have any questions about your refund, please contact our support team with the gateway reference number: <strong>${gatewayRefundId}</strong></p>
            </div>
            
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ${process.env.APP_NAME || 'Gym Management System'}. All rights reserved.</p>
                <p>This is an automated message. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  // Generate HTML template for refund completed
  generateRefundCompletedHTML(data) {
    const {
      userName,
      refundAmount,
      gatewayRefundId,
      gymName,
      subscriptionTitle,
      gateway,
      completedAt
    } = data;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Refund Completed</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #00b894 0%, #00cec9 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { padding: 30px; }
            .success-icon { font-size: 48px; margin-bottom: 20px; }
            .amount { font-size: 28px; font-weight: bold; color: #00b894; margin: 20px 0; }
            .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .details-table th, .details-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            .details-table th { background-color: #f8f9fa; font-weight: bold; }
            .success-box { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="success-icon">💰</div>
                <h1>Refund Completed!</h1>
                <p>Your refund has been successfully processed</p>
            </div>
            
            <div class="content">
                <p>Dear <strong>${userName}</strong>,</p>
                
                <div class="success-box">
                    <strong>Great news!</strong> Your refund has been successfully completed and processed.
                </div>
                
                <div class="amount">₹${refundAmount}</div>
                
                <table class="details-table">
                    <tr><th>Refund Amount</th><td>₹${refundAmount}</td></tr>
                    <tr><th>Gateway Reference</th><td>${gatewayRefundId}</td></tr>
                    <tr><th>Payment Gateway</th><td>${gateway.charAt(0).toUpperCase() + gateway.slice(1)}</td></tr>
                    <tr><th>Completed At</th><td>${new Date(completedAt).toLocaleString()}</td></tr>
                    <tr><th>Gym</th><td>${gymName}</td></tr>
                    <tr><th>Subscription</th><td>${subscriptionTitle}</td></tr>
                </table>
                
                <p><strong>What you need to know:</strong></p>
                <ul>
                    <li>✅ Your refund of ₹${refundAmount} has been successfully processed</li>
                    <li>💳 The amount has been credited to your original payment method</li>
                    <li>🏦 It may take 1-2 business days to reflect in your account statement</li>
                    <li>📱 Check your bank/card statement for the credit entry</li>
                </ul>
                
                <p>If you don't see the refund in your account after 2 business days, please contact your bank or card issuer with the gateway reference number: <strong>${gatewayRefundId}</strong></p>
                
                <p>Thank you for using our services. We appreciate your business!</p>
            </div>
            
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ${process.env.APP_NAME || 'Gym Management System'}. All rights reserved.</p>
                <p>This is an automated message. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }
}

module.exports = new MailService();
