const fs = require('fs');
const path = require('path');
const { Invoice } = require('../models');

/**
 * Generate unique invoice number
 */
function generateInvoiceNumber() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `INV-${timestamp}-${random}`;
}

/**
 * Generate invoice PDF (placeholder - you can integrate with PDF libraries like PDFKit or Puppeteer)
 */
async function generateInvoicePDF(paymentData) {
  try {
    const invoiceNumber = generateInvoiceNumber();
    const fileName = `${invoiceNumber}.pdf`;
    const invoicesDir = path.join(__dirname, '../invoices');
    
    // Ensure invoices directory exists
    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir, { recursive: true });
    }
    
    const filePath = path.join(invoicesDir, fileName);
    
    // For now, create a simple text file as placeholder
    // In production, you would use a PDF generation library
    const invoiceContent = `
INVOICE: ${invoiceNumber}
Date: ${new Date().toISOString()}

Payment Details:
- Total Amount: ₹${paymentData.paymentAmount}
- Commission: ₹${paymentData.commission}
- GST on Commission (18%): ₹${paymentData.gstOnCommission}
- Total Deduction: ₹${paymentData.totalDeduction}
- Vendor Amount: ₹${paymentData.vendorAmount}

Payment ID: ${paymentData.id}
Razorpay Order ID: ${paymentData.razorpayOrderId}
    `;
    
    fs.writeFileSync(filePath, invoiceContent);
    
    // Save invoice record to database
    const invoice = await Invoice.create({
      invoiceNumber,
      paymentId: paymentData.id,
      path: filePath,
      fileName,
      fileSize: fs.statSync(filePath).size,
      mimeType: 'text/plain', // Would be 'application/pdf' for actual PDF
      totalAmount: paymentData.paymentAmount,
      commission: paymentData.commission,
      gstOnCommission: paymentData.gstOnCommission,
      vendorAmount: paymentData.vendorAmount,
      currency: 'INR',
      status: 'paid',
      invoiceDate: new Date(),
      createdBy: 'system'
    });
    
    return {
      success: true,
      invoiceNumber,
      filePath,
      invoiceId: invoice.id
    };
    
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    throw new Error(`Failed to generate invoice: ${error.message}`);
  }
}

/**
 * Get invoice by payment ID
 */
async function getInvoiceByPaymentId(paymentId) {
  try {
    const invoice = await Invoice.findOne({
      where: { paymentId, activeStatus: true }
    });
    return invoice;
  } catch (error) {
    throw new Error(`Failed to get invoice: ${error.message}`);
  }
}

/**
 * Download invoice file
 */
function downloadInvoice(invoicePath) {
  try {
    if (!fs.existsSync(invoicePath)) {
      throw new Error('Invoice file not found');
    }
    return fs.readFileSync(invoicePath);
  } catch (error) {
    throw new Error(`Failed to download invoice: ${error.message}`);
  }
}

module.exports = {
  generateInvoicePDF,
  getInvoiceByPaymentId,
  downloadInvoice,
  generateInvoiceNumber
};
