const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { Invoice, Payment, UserSubscription, Subscription, Gym, User } = require('../models');
const { authenticate } = require('../middleware/auth');
const { generateInvoicePDF, getInvoiceByPaymentId, downloadInvoice } = require('../utils/invoiceUtils');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Invoice:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         invoiceNumber:
 *           type: string
 *         userId:
 *           type: string
 *         userEmail:
 *           type: string
 *         subscriptionId:
 *           type: number
 *         paymentId:
 *           type: number
 *         amount:
 *           type: number
 *         tax:
 *           type: number
 *         totalAmount:
 *           type: number
 *         currency:
 *           type: string
 *         status:
 *           type: string
 *           enum: [generated, sent, downloaded, paid]
 *         generatedAt:
 *           type: string
 *           format: date-time
 *         userDetails:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             email:
 *               type: string
 *             phone:
 *               type: string
 *             address:
 *               type: string
 *         gymDetails:
 *           type: object
 *           properties:
 *             id:
 *               type: number
 *             name:
 *               type: string
 *             address:
 *               type: string
 *             phone:
 *               type: string
 *             email:
 *               type: string
 *             gst:
 *               type: string
 *         subscriptionDetails:
 *           type: object
 *           properties:
 *             title:
 *               type: string
 *             validityDays:
 *               type: number
 *             validFrom:
 *               type: string
 *             validTo:
 *               type: string
 *             price:
 *               type: number
 *         paymentDetails:
 *           type: object
 *           properties:
 *             transactionId:
 *               type: string
 *             gateway:
 *               type: string
 *             paidVia:
 *               type: string
 *             completedAt:
 *               type: string
 */

/**
 * @swagger
 * /api/invoices/generate:
 *   post:
 *     tags: [Invoices]
 *     summary: Generate invoice for a payment
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentId
 *               - userEmail
 *               - subscriptionTitle
 *               - gymName
 *               - amount
 *               - validityDays
 *               - validFrom
 *               - validTo
 *               - paymentMethod
 *               - transactionId
 *             properties:
 *               paymentId:
 *                 type: number
 *               userEmail:
 *                 type: string
 *               subscriptionTitle:
 *                 type: string
 *               gymName:
 *                 type: string
 *               amount:
 *                 type: number
 *               validityDays:
 *                 type: number
 *               validFrom:
 *                 type: string
 *               validTo:
 *                 type: string
 *               paymentMethod:
 *                 type: string
 *               transactionId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Invoice generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Invoice'
 */
router.post('/generate', [
  authenticate,
  body('paymentId').isInt().withMessage('Payment ID must be an integer'),
  body('userEmail').isEmail().withMessage('Valid email is required'),
  body('subscriptionTitle').notEmpty().withMessage('Subscription title is required'),
  body('gymName').notEmpty().withMessage('Gym name is required'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('validityDays').isInt().withMessage('Validity days must be an integer'),
  body('validFrom').isISO8601().withMessage('Valid from date is required'),
  body('validTo').isISO8601().withMessage('Valid to date is required'),
  body('paymentMethod').notEmpty().withMessage('Payment method is required'),
  body('transactionId').notEmpty().withMessage('Transaction ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
        timestamp: new Date().toISOString()
      });
    }

    const {
      paymentId,
      userEmail,
      subscriptionTitle,
      gymName,
      amount,
      validityDays,
      validFrom,
      validTo,
      paymentMethod,
      transactionId
    } = req.body;

    // Check if invoice already exists for this payment
    const existingInvoice = await Invoice.findOne({
      where: { paymentId, activeStatus: true }
    });

    if (existingInvoice) {
      return res.status(200).json({
        success: true,
        data: await formatInvoiceResponse(existingInvoice, userEmail, subscriptionTitle, gymName, validityDays, validFrom, validTo, paymentMethod, transactionId),
        message: 'Invoice already exists',
        timestamp: new Date().toISOString()
      });
    }

    // Generate invoice number
    const invoiceNumber = `GYM-${new Date().getFullYear()}-${Date.now()}`;
    const tax = Math.round(amount * 0.18); // 18% GST
    const totalAmount = amount + tax;

    // Create invoice record
    const invoice = await Invoice.create({
      invoiceNumber,
      paymentId,
      path: `invoices/${invoiceNumber}.pdf`,
      fileName: `${invoiceNumber}.pdf`,
      fileSize: 0, // Will be updated after PDF generation
      mimeType: 'application/pdf',
      invoiceDate: new Date(),
      totalAmount: amount,
      currency: 'INR',
      commission: 0,
      gstOnCommission: tax,
      vendorAmount: amount,
      gymName,
      subscriptionTitle,
      status: 'paid',
      activeStatus: true,
      createdBy: req.user?.email || 'system'
    });

    const invoiceResponse = await formatInvoiceResponse(invoice, userEmail, subscriptionTitle, gymName, validityDays, validFrom, validTo, paymentMethod, transactionId);

    res.status(201).json({
      success: true,
      data: invoiceResponse,
      message: 'Invoice generated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate invoice',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/invoices/user/{userEmail}:
 *   get:
 *     tags: [Invoices]
 *     summary: Get invoices for a user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userEmail
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: User invoices retrieved successfully
 */
router.get('/user/:userEmail', [
  authenticate,
  param('userEmail').isEmail().withMessage('Valid email is required'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
        timestamp: new Date().toISOString()
      });
    }

    const { userEmail } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Get user's payment IDs
    const userSubscriptions = await UserSubscription.findAll({
      where: { userEmail },
      include: [{
        model: Payment,
        as: 'payment',
        where: { status: 'completed' }
      }]
    });

    const paymentIds = userSubscriptions.map(sub => sub.payment.id);

    if (paymentIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          invoices: [],
          pagination: {
            currentPage: page,
            totalPages: 0,
            total: 0,
            limit
          }
        },
        timestamp: new Date().toISOString()
      });
    }

    // Get invoices for these payments
    const { count, rows: invoices } = await Invoice.findAndCountAll({
      where: {
        paymentId: paymentIds,
        activeStatus: true
      },
      limit,
      offset,
      order: [['createTimestamp', 'DESC']]
    });

    // Format invoice responses
    const formattedInvoices = await Promise.all(invoices.map(async (invoice) => {
      const userSub = userSubscriptions.find(sub => sub.payment.id === invoice.paymentId);
      return formatInvoiceResponse(
        invoice,
        userEmail,
        userSub?.subscription?.title || invoice.subscriptionTitle,
        userSub?.subscription?.gym?.name || invoice.gymName,
        userSub?.subscription?.validityDays || 30,
        userSub?.validFrom || new Date().toISOString(),
        userSub?.validTo || new Date().toISOString(),
        userSub?.payment?.gateway || 'razorpay',
        userSub?.payment?.transactionId || 'N/A'
      );
    }));

    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      success: true,
      data: {
        invoices: formattedInvoices,
        pagination: {
          currentPage: page,
          totalPages,
          total: count,
          limit
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching user invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoices',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/invoices/{invoiceId}/download:
 *   get:
 *     tags: [Invoices]
 *     summary: Download invoice PDF
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invoice PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/:invoiceId/download', [
  authenticate,
  param('invoiceId').notEmpty().withMessage('Invoice ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
        timestamp: new Date().toISOString()
      });
    }

    const { invoiceId } = req.params;

    // Find invoice by ID or invoice number
    const invoice = await Invoice.findOne({
      where: {
        [require('sequelize').Op.or]: [
          { id: invoiceId },
          { invoiceNumber: invoiceId }
        ],
        activeStatus: true
      }
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
        timestamp: new Date().toISOString()
      });
    }

    // Generate PDF if it doesn't exist
    const pdfBuffer = await generateInvoicePDFBuffer(invoice);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.fileName}"`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error downloading invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download invoice',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/invoices/{invoiceId}/downloaded:
 *   patch:
 *     tags: [Invoices]
 *     summary: Mark invoice as downloaded
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invoice marked as downloaded
 */
router.patch('/:invoiceId/downloaded', [
  authenticate,
  param('invoiceId').notEmpty().withMessage('Invoice ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
        timestamp: new Date().toISOString()
      });
    }

    const { invoiceId } = req.params;

    const invoice = await Invoice.findOne({
      where: {
        [require('sequelize').Op.or]: [
          { id: invoiceId },
          { invoiceNumber: invoiceId }
        ],
        activeStatus: true
      }
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
        timestamp: new Date().toISOString()
      });
    }

    await invoice.update({
      status: 'downloaded',
      updatedBy: req.user?.email || 'system'
    });

    res.status(200).json({
      success: true,
      data: invoice,
      message: 'Invoice marked as downloaded',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error marking invoice as downloaded:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update invoice',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Helper function to format invoice response
async function formatInvoiceResponse(invoice, userEmail, subscriptionTitle, gymName, validityDays, validFrom, validTo, paymentMethod, transactionId) {
  const userName = userEmail.split('@')[0];
  
  return {
    id: invoice.invoiceNumber,
    invoiceNumber: invoice.invoiceNumber,
    userId: 'mock-user-id',
    userEmail: userEmail,
    subscriptionId: 0,
    paymentId: invoice.paymentId,
    amount: parseFloat(invoice.totalAmount),
    tax: Math.round(parseFloat(invoice.totalAmount) * 0.18),
    totalAmount: parseFloat(invoice.totalAmount) + Math.round(parseFloat(invoice.totalAmount) * 0.18),
    currency: invoice.currency,
    status: invoice.status,
    generatedAt: invoice.invoiceDate.toISOString(),
    userDetails: {
      name: userName,
      email: userEmail,
      phone: '+91 9876543210',
      address: '123 User Street, City, 123456'
    },
    gymDetails: {
      id: 1,
      name: gymName,
      address: '123 Gym Street, Fitness City, 123456',
      phone: '+91 9876543210',
      email: `contact@${gymName.toLowerCase().replace(/\\s+/g, '')}.com`,
      gst: '27AAAAA0000A1Z5'
    },
    subscriptionDetails: {
      title: subscriptionTitle,
      validityDays: validityDays,
      validFrom: validFrom,
      validTo: validTo,
      price: parseFloat(invoice.totalAmount)
    },
    paymentDetails: {
      transactionId: transactionId,
      gateway: paymentMethod,
      paidVia: 'Card',
      completedAt: invoice.invoiceDate.toISOString()
    }
  };
}

// Helper function to generate PDF buffer
async function generateInvoicePDFBuffer(invoice) {
  return new Promise(async (resolve, reject) => {
    try {
      // Register custom fonts
      const doc = new PDFDocument({ 
        margin: 50,
        font: 'Helvetica' // Default fallback font
      });
      
      // Try to register Roboto fonts if available
      try {
        doc.registerFont('Roboto', path.join(__dirname, '../node_modules/@fontsource/roboto/files/roboto-latin-400-normal.woff'));
        doc.registerFont('RobotoMono', path.join(__dirname, '../node_modules/@fontsource/roboto-mono/files/roboto-mono-latin-400-normal.woff'));
      } catch (fontError) {
        console.log('Custom fonts not available, using system fonts');
      }
      
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      // Get gym, owner, and payment details from database
      const { gymDetails, paymentDetails, subscriptionDetails } = await getInvoiceDetailsFromDB(invoice.paymentId);
      
      // Header with logo area and company info
      generateHeader(doc, gymDetails);
      
      // Invoice details
      generateInvoiceInfo(doc, invoice, gymDetails, paymentDetails);
      
      // Customer information
      generateCustomerInformation(doc, invoice, gymDetails, paymentDetails);
      
      // Invoice items table with specific dates
      generateInvoiceTable(doc, invoice, subscriptionDetails, paymentDetails);
      
      // Total and payment info
      generateInvoiceTotal(doc, invoice, paymentDetails);
      
      // Footer
      generateFooter(doc, gymDetails);

      doc.end();
    } catch (error) {
      console.error('Error generating PDF:', error);
      reject(error);
    }
  });
}

// Comprehensive function to get all invoice details from database
async function getInvoiceDetailsFromDB(paymentId) {
  try {
    const { UserSubscription, Subscription, Gym, User, Payment } = require('../models');
    
    // Get user subscription with all related data
    const userSub = await UserSubscription.findOne({
      where: { paymentId },
      include: [
        {
          model: Subscription,
          as: 'subscription',
          include: [{
            model: Gym,
            as: 'gym',
            include: [{
              model: User,
              as: 'owner'
            }]
          }]
        },
        {
          model: Payment,
          as: 'payment'
        }
      ]
    });
    
    let gymDetails, paymentDetails, subscriptionDetails;
    
    if (userSub && userSub.subscription && userSub.subscription.gym) {
      const gym = userSub.subscription.gym;
      const owner = gym.owner;
      const payment = userSub.payment;
      const subscription = userSub.subscription;
      
      gymDetails = {
        gymName: gym.name || 'FIT ESPERO',
        gymAddress: gym.address || '123 Fitness Street',
        gymCity: gym.city || 'Mumbai',
        gymState: gym.state || 'Maharashtra',
        gymZipCode: gym.zipCode || '400001',
        gymPhone: gym.phoneNumber || '+91 9876543210',
        gymEmail: gym.email || `contact@${gym.name?.toLowerCase().replace(/\\s+/g, '') || 'fitespero'}.com`,
        gymGST: gym.gstNumber || '27AAAAA0000A1Z5',
        ownerName: owner ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || 'Gym Owner' : 'Gym Owner',
        ownerEmail: owner?.email || 'owner@fitespero.com',
        ownerPhone: owner?.phoneNumber || '+91 9876543210'
      };
      
      paymentDetails = {
        transactionId: payment?.transactionId || payment?.razorpayPaymentId || 'N/A',
        gateway: payment?.gateway || 'razorpay',
        method: payment?.method || 'Online',
        status: payment?.status || 'completed',
        amount: payment?.amount || 0,
        paidAt: payment?.paidAt || payment?.createdAt || new Date(),
        currency: payment?.currency || 'INR'
      };
      
      subscriptionDetails = {
        title: subscription?.title || 'Gym Membership',
        validityDays: subscription?.validityDays || 30,
        validFrom: userSub.validFrom ? new Date(userSub.validFrom) : new Date(),
        validTo: userSub.validTo ? new Date(userSub.validTo) : new Date(Date.now() + 30*24*60*60*1000),
        price: subscription?.price || 0
      };
    } else {
      // Fallback data if database query fails
      gymDetails = {
        gymName: 'FIT ESPERO',
        gymAddress: '123 Fitness Street',
        gymCity: 'Mumbai',
        gymState: 'Maharashtra', 
        gymZipCode: '400001',
        gymPhone: '+91 9876543210',
        gymEmail: 'contact@fitespero.com',
        gymGST: '27AAAAA0000A1Z5',
        ownerName: 'Gym Owner',
        ownerEmail: 'owner@fitespero.com',
        ownerPhone: '+91 9876543210'
      };
      
      paymentDetails = {
        transactionId: 'N/A',
        gateway: 'razorpay',
        method: 'Online',
        status: 'completed',
        amount: 0,
        paidAt: new Date(),
        currency: 'INR'
      };
      
      subscriptionDetails = {
        title: 'Gym Membership',
        validityDays: 30,
        validFrom: new Date(),
        validTo: new Date(Date.now() + 30*24*60*60*1000),
        price: 0
      };
    }
    
    return { gymDetails, paymentDetails, subscriptionDetails };
    
  } catch (error) {
    console.error('Error fetching invoice details:', error);
    
    // Return fallback data
    return {
      gymDetails: {
        gymName: 'FIT ESPERO',
        gymAddress: '123 Fitness Street',
        gymCity: 'Mumbai',
        gymState: 'Maharashtra',
        gymZipCode: '400001',
        gymPhone: '+91 9876543210',
        gymEmail: 'contact@fitespero.com',
        gymGST: '27AAAAA0000A1Z5',
        ownerName: 'Gym Owner',
        ownerEmail: 'owner@fitespero.com',
        ownerPhone: '+91 9876543210'
      },
      paymentDetails: {
        transactionId: 'N/A',
        gateway: 'razorpay',
        method: 'Online',
        status: 'completed',
        amount: 0,
        paidAt: new Date(),
        currency: 'INR'
      },
      subscriptionDetails: {
        title: 'Gym Membership',
        validityDays: 30,
        validFrom: new Date(),
        validTo: new Date(Date.now() + 30*24*60*60*1000),
        price: 0
      }
    };
  }
}

// Generate header with Fit Espero logo and company info
function generateHeader(doc, gymDetails) {
  // Use better font for headers
  try {
    doc.font('Helvetica-Bold');
  } catch (e) {
    doc.font('Helvetica');
  }
  
  // Draw the actual Fit Espero logo using vector graphics
  drawFitEsperoLogo(doc, 50, 40, 100, 75);
  
  // Company information with better typography
  doc.fontSize(24)
     .fillColor('#B91C1C')
     .font('Helvetica-Bold')
     .text('FIT ESPERO', 170, 40);
  
  doc.fontSize(11)
     .fillColor('#6B7280')
     .font('Helvetica')
     .text('THE NEW ERA OF FITNESS', 170, 65);
  
  doc.fontSize(10)
     .fillColor('#374151')
     .font('Helvetica')
     .text(gymDetails.gymAddress, 170, 85)
     .text(`${gymDetails.gymCity}, ${gymDetails.gymState} ${gymDetails.gymZipCode}`, 170, 100)
     .text(`Phone: ${gymDetails.gymPhone}`, 170, 115)
     .text(`Email: ${gymDetails.gymEmail}`, 170, 130)
     .text(`GST: ${gymDetails.gymGST}`, 170, 145);
  
  // Invoice title with better typography
  doc.fontSize(32)
     .fillColor('#B91C1C')
     .font('Helvetica-Bold')
     .text('INVOICE', 400, 40, { align: 'right' });
  
  // Line separator with brand color
  doc.moveTo(50, 175)
     .lineTo(550, 175)
     .strokeColor('#B91C1C')
     .lineWidth(2)
     .stroke();
}

// Function to draw the actual Fit Espero logo from image file
function drawFitEsperoLogo(doc, x, y, width, height) {
  try {
    // Path to the actual Fit Espero logo
    const logoPath = path.join(__dirname, '../assets/images/fitesperro.jpg');
    
    // Check if logo file exists
    if (fs.existsSync(logoPath)) {
      // Load and display the actual logo image
      doc.image(logoPath, x, y, {
        fit: [width, height],
        align: 'center',
        valign: 'center'
      });
      
      console.log('✅ Fit Espero logo loaded successfully from image file');
    } else {
      console.log('⚠️ Logo file not found, using fallback design');
      drawFallbackLogo(doc, x, y, width, height);
    }
  } catch (error) {
    console.error('❌ Error loading logo image:', error.message);
    console.log('🔄 Using fallback logo design');
    drawFallbackLogo(doc, x, y, width, height);
  }
}

// Fallback function to draw logo if image fails to load
function drawFallbackLogo(doc, x, y, width, height) {
  // Create the gradient red background matching your logo
  const gradient = doc.linearGradient(x, y, x + width, y + height);
  gradient.stop(0, '#DC2626')
         .stop(0.5, '#B91C1C')
         .stop(1, '#991B1B');
  
  doc.rect(x, y, width, height)
     .fill(gradient);
  
  // Calculate center and scaling for the logo elements
  const centerX = x + width/2;
  const centerY = y + height/2 - 5;
  const scale = Math.min(width, height) / 120;
  
  // Set white color for all logo elements
  doc.fillColor('#FFFFFF');
  doc.strokeColor('#FFFFFF');
  doc.lineWidth(2 * scale);
  
  // Draw the stylized "FE" logo elements
  
  // "F" element - modern geometric style
  const fX = centerX - 25 * scale;
  const fY = centerY - 20 * scale;
  const fW = 3 * scale;
  const fH = 40 * scale;
  
  // F - main vertical bar
  doc.rect(fX, fY, fW, fH).fill();
  
  // F - top horizontal bar
  doc.rect(fX, fY, 18 * scale, fW).fill();
  
  // F - middle horizontal bar (shorter)
  doc.rect(fX, fY + 15 * scale, 12 * scale, fW).fill();
  
  // "E" element - curved modern style
  const eX = centerX - 5 * scale;
  const eY = centerY - 20 * scale;
  
  // E - main vertical bar
  doc.rect(eX, eY, fW, fH).fill();
  
  // E - top horizontal bar
  doc.rect(eX, eY, 18 * scale, fW).fill();
  
  // E - middle horizontal bar
  doc.rect(eX, eY + 15 * scale, 15 * scale, fW).fill();
  
  // E - bottom horizontal bar
  doc.rect(eX, eY + 37 * scale, 18 * scale, fW).fill();
  
  // Add stylistic curved elements to match your logo design
  // Right side curved element
  const curveX = centerX + 15 * scale;
  const curveY = centerY - 10 * scale;
  
  // Draw curved path elements
  doc.moveTo(curveX, curveY)
     .quadraticCurveTo(curveX + 10 * scale, curveY + 5 * scale, curveX + 8 * scale, curveY + 15 * scale)
     .quadraticCurveTo(curveX + 12 * scale, curveY + 25 * scale, curveX, curveY + 30 * scale)
     .stroke();
  
  // Add accent dot
  doc.circle(centerX + 20 * scale, centerY - 15 * scale, 2 * scale)
     .fill();
  
  // Add the company name at the bottom of logo area
  doc.fontSize(8)
     .fillColor('#FFFFFF')
     .font('Helvetica-Bold')
     .text('FIT ESPERO', x, y + height - 20, {
       align: 'center',
       width: width,
       characterSpacing: 0.5
     });
     
  doc.fontSize(6)
     .text('THE NEW ERA OF FITNESS', x, y + height - 10, {
       align: 'center',
       width: width,
       characterSpacing: 0.3
     });
}

// Generate invoice information with payment details
function generateInvoiceInfo(doc, invoice, gymDetails, paymentDetails) {
  const startY = 195;
  
  // Invoice details (left side) with better fonts
  doc.fontSize(12)
     .fillColor('#B91C1C')
     .font('Helvetica-Bold')
     .text('Invoice Details:', 50, startY, { underline: true });
  
  doc.fontSize(10)
     .fillColor('#374151')
     .font('Helvetica')
     .text(`Invoice No: ${invoice.invoiceNumber}`, 50, startY + 20)
     .text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}`, 50, startY + 35)
     .text(`Payment Status: ${paymentDetails?.status?.toUpperCase() || invoice.status.toUpperCase()}`, 50, startY + 50);
  
  // Payment details (right side)
  doc.fontSize(12)
     .fillColor('#B91C1C')
     .font('Helvetica-Bold')
     .text('Payment Information:', 350, startY, { underline: true });
  
  doc.fontSize(10)
     .fillColor('#374151')
     .font('Helvetica')
     .text(`Transaction ID: ${paymentDetails?.transactionId || 'N/A'}`, 350, startY + 20)
     .text(`Gateway: ${paymentDetails?.gateway?.toUpperCase() || 'RAZORPAY'}`, 350, startY + 35)
     .text(`Paid on: ${new Date(paymentDetails?.paidAt || invoice.invoiceDate).toLocaleDateString('en-IN')}`, 350, startY + 50);
}

// Generate customer information
function generateCustomerInformation(doc, invoice, gymDetails) {
  const startY = 300;
  
  // Bill To section
  doc.fontSize(12)
     .fillColor('#B91C1C')
     .text('Bill To:', 50, startY, { underline: true });
  
  const userName = invoice.gymName ? 'Valued Customer' : 'Customer';
  
  doc.fontSize(10)
     .fillColor('#374151')
     .text(userName, 50, startY + 20)
     .text('Fitness Enthusiast', 50, startY + 35)
     .text('Mumbai, Maharashtra', 50, startY + 50)
     .text('India', 50, startY + 65);
}

// Generate invoice table with specific validity dates and proper GST breakdown
function generateInvoiceTable(doc, invoice, subscriptionDetails, paymentDetails) {
  const tableTop = 380;
  const itemHeight = 35;
  
  // Table header with better styling
  doc.rect(50, tableTop, 500, itemHeight)
     .fillColor('#B91C1C')
     .fill()
     .strokeColor('#991B1B')
     .stroke();
  
  doc.fillColor('#FFFFFF')
     .fontSize(10)
     .font('Helvetica-Bold')
     .text('Description', 60, tableTop + 12)
     .text('Validity Period', 200, tableTop + 12)
     .text('Amount (₹)', 350, tableTop + 12)
     .text('Tax (₹)', 430, tableTop + 12)
     .text('Total (₹)', 480, tableTop + 12);
  
  // Table row with more height for dates
  const rowY = tableTop + itemHeight;
  doc.rect(50, rowY, 500, itemHeight + 10)
     .fillColor('#FFFFFF')
     .fill()
     .strokeColor('#d1d5db')
     .stroke();
  
  const subscriptionTitle = subscriptionDetails?.title || invoice.subscriptionTitle || 'Gym Membership';
  
  // Get GST breakdown from payment details if available
  let baseAmount, gstAmount, totalAmount;
  
  if (paymentDetails?.cutCalculationDetails?.baseAmount) {
    // Use actual breakdown from payment
    baseAmount = parseFloat(paymentDetails.cutCalculationDetails.baseAmount);
    gstAmount = parseFloat(paymentDetails.cutCalculationDetails.gstAmount);
    totalAmount = parseFloat(paymentDetails.cutCalculationDetails.totalAmount);
  } else {
    // Fallback calculation (backward compatibility)
    totalAmount = parseFloat(invoice.totalAmount);
    baseAmount = Math.round((totalAmount / 1.18) * 100) / 100; // Reverse calculate base amount
    gstAmount = totalAmount - baseAmount;
  }
  
  // Format dates for display
  const validFromDate = subscriptionDetails?.validFrom ? new Date(subscriptionDetails.validFrom) : new Date();
  const validToDate = subscriptionDetails?.validTo ? new Date(subscriptionDetails.validTo) : new Date(Date.now() + 30*24*60*60*1000);
  
  const validFromStr = validFromDate.toLocaleDateString('en-IN');
  const validToStr = validToDate.toLocaleDateString('en-IN');
  
  doc.fillColor('#374151')
     .font('Helvetica')
     .fontSize(10)
     .text(subscriptionTitle, 60, rowY + 12)
     .fontSize(9)
     .text(`From: ${validFromStr}`, 200, rowY + 8)
     .text(`To: ${validToStr}`, 200, rowY + 22)
     .fontSize(10)
     .text(baseAmount.toFixed(2), 350, rowY + 15)
     .text(gstAmount.toFixed(2), 430, rowY + 15)
     .font('Helvetica-Bold')
     .text(totalAmount.toFixed(2), 480, rowY + 15);
}

// Generate invoice total with proper GST breakdown
function generateInvoiceTotal(doc, invoice, paymentDetails) {
  const startY = 470;
  
  // Get GST breakdown from payment details if available
  let baseAmount, gstAmount, totalAmount;
  
  if (paymentDetails?.cutCalculationDetails?.baseAmount) {
    // Use actual breakdown from payment
    baseAmount = parseFloat(paymentDetails.cutCalculationDetails.baseAmount);
    gstAmount = parseFloat(paymentDetails.cutCalculationDetails.gstAmount);
    totalAmount = parseFloat(paymentDetails.cutCalculationDetails.totalAmount);
  } else {
    // Fallback calculation (backward compatibility)
    totalAmount = parseFloat(invoice.totalAmount);
    baseAmount = Math.round((totalAmount / 1.18) * 100) / 100; // Reverse calculate base amount
    gstAmount = totalAmount - baseAmount;
  }
  
  // Total section with proper breakdown
  doc.fontSize(10)
     .fillColor('#374151')
     .text('Subtotal:', 400, startY)
     .text(`₹${baseAmount.toFixed(2)}`, 480, startY)
     .text('GST (18%):', 400, startY + 20)
     .text(`₹${gstAmount.toFixed(2)}`, 480, startY + 20);
  
  // Final total with background
  doc.rect(350, startY + 40, 200, 25)
     .fillColor('#2563eb')
     .fill();
  
  doc.fontSize(12)
     .fillColor('#ffffff')
     .text('Total Amount:', 360, startY + 50)
     .text(`₹${totalAmount.toFixed(2)}`, 480, startY + 50);
  
  // Payment information
  doc.fontSize(10)
     .fillColor('#374151')
     .text('Payment Method: Online', 50, startY + 80)
     .text('Payment Status: Completed', 50, startY + 95)
     .text('Transaction ID: ' + (paymentDetails?.transactionId || invoice.transactionId || 'N/A'), 50, startY + 110);
}

// Generate footer
function generateFooter(doc, gymDetails) {
  const footerY = 600;
  
  // Terms and conditions
  doc.fontSize(9)
     .fillColor('#B91C1C')
     .text('Terms & Conditions:', 50, footerY, { underline: true });
  
  doc.fontSize(8)
     .fillColor('#6b7280')
     .text('• Membership is non-transferable and non-refundable.', 50, footerY + 20)
     .text('• Please carry a valid ID and this invoice for gym access.', 50, footerY + 33)
     .text('• Membership validity is as mentioned above.', 50, footerY + 46)
     .text('• For any queries, please contact the gym directly.', 50, footerY + 59);
  
  // Footer line with Fit Espero brand color
  doc.moveTo(50, footerY + 85)
     .lineTo(550, footerY + 85)
     .strokeColor('#B91C1C')
     .lineWidth(1)
     .stroke();
  
  // Thank you message with Fit Espero branding
  doc.fontSize(11)
     .fillColor('#B91C1C')
     .text('Thank you for choosing FIT ESPERO - THE NEW ERA OF FITNESS!', 50, footerY + 100, { align: 'center', width: 500 });
  
  doc.fontSize(8)
     .fillColor('#6b7280')
     .text('This is a computer generated invoice and does not require signature.', 50, footerY + 120, { align: 'center', width: 500 });
}

module.exports = router;
