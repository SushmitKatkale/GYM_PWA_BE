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

  async sendMail(to, subject, text) {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Email sent to ${to}`);
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }
}

module.exports = new MailService();
