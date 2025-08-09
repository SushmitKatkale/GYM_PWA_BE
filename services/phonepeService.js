const { StandardCheckoutClient, StandardCheckoutPayRequest, Env } = require('pg-sdk-node');
const crypto = require('crypto');

class PhonePeService {
  constructor() {
    this.merchantId = process.env.PHONEPE_MERCHANT_ID;
    this.saltKey = process.env.PHONEPE_SALT_KEY;
    this.saltIndex = process.env.PHONEPE_SALT_INDEX || '1';
    this.baseUrl = process.env.PHONEPE_BASE_URL || 'https://api-preprod.phonepe.com/apis/pg-sandbox';
    this.redirectUrl = process.env.PHONEPE_REDIRECT_URL || 'http://localhost:3000/payment/success';
    this.callbackUrl = process.env.PHONEPE_CALLBACK_URL || 'http://localhost:3002/api/payments/callback/phonepe';
    this.webhookUsername = process.env.PHONEPE_WEBHOOK_USERNAME || 'webhook_user';
    this.webhookPassword = process.env.PHONEPE_WEBHOOK_PASSWORD || 'webhook_pass';
    this.isLive = process.env.NODE_ENV === 'production';
    
    // Initialize the PhonePe StandardCheckout client
    this.client = StandardCheckoutClient.getInstance(
      this.merchantId,
      this.saltKey,
      1, // client version
      this.isLive ? Env.PRODUCTION : Env.SANDBOX,
      true // shouldPublishEvents
    );
  }

  /**
   * Generate X-VERIFY header for PhonePe API
   */
  generateXVerify(payload) {
    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const stringToHash = base64Payload + '/pg/v1/pay' + this.saltKey;
    const sha256Hash = crypto.createHash('sha256').update(stringToHash).digest('hex');
    return `${sha256Hash}###${this.saltIndex}`;
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, xVerifyHeader) {
    try {
      const [receivedHash, receivedSaltIndex] = xVerifyHeader.split('###');
      
      if (receivedSaltIndex !== this.saltIndex) {
        return false;
      }

      const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const stringToHash = base64Payload + '/pg/v1/status' + this.saltKey;
      const computedHash = crypto.createHash('sha256').update(stringToHash).digest('hex');
      
      return computedHash === receivedHash;
    } catch (error) {
      console.error('Error verifying PhonePe webhook signature:', error);
      return false;
    }
  }

  /**
   * Create PhonePe payment order using official PhonePe SDK
   */
  async createOrder(orderData) {
    try {
      const {
        merchantTransactionId,
        amount,
        userEmail,
        userPhone,
        paymentId // Database payment record ID
      } = orderData;

      console.log('PhonePe order request:', {
        merchantTransactionId,
        amount: `${amount} rupees`,
        userEmail,
        userPhone,
        paymentId,
        isLive: this.isLive
      });

      // Amount should be in paise (multiply by 100)
      const amountInPaise = Math.round(amount * 100);

      // Create dynamic redirect URL with payment ID
      const dynamicRedirectUrl = `${this.redirectUrl}/${paymentId}`;

      // Create payment request using official SDK builder pattern
      const payRequest = StandardCheckoutPayRequest.builder()
        .merchantOrderId(merchantTransactionId)
        .amount(amountInPaise)
        .redirectUrl(dynamicRedirectUrl)
        .build();

      // Initiate payment using the official PhonePe SDK
      const response = await this.client.pay(payRequest);

      console.log('PhonePe SDK response:', response);

      if (response && response.state == 'PENDING') {
        return {
          success: true,
          orderId: response.orderId,
          paymentUrl: response.redirectUrl ,
          data: response,
          redirectUrl: dynamicRedirectUrl
        };
      } else {
        throw new Error(response?.message || 'Failed to create PhonePe order');
      }

    } catch (error) {
      console.error('PhonePe order creation error:', error);
      throw new Error(`PhonePe order creation failed: ${error.message}`);
    }
  }

  /**
   * Check payment status using official PhonePe SDK
   */
  async checkPaymentStatus(merchantTransactionId) {
    try {
      console.log(`Checking payment status for transaction: ${merchantTransactionId}`);

      // Use official PhonePe SDK to get order status
      const response = await this.client.getOrderStatus(merchantTransactionId, true);

      console.log('PhonePe status check response:', response);

      return {
        success: true,
        data: response
      };

    } catch (error) {
      console.error('PhonePe status check error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process webhook response using official PhonePe SDK
   */
  async processWebhook(webhookData, authorizationHeader, username = null, password = null) {
    try {
      // Use provided credentials or default webhook credentials
      const webUsername = username || this.webhookUsername;
      const webPassword = password || this.webhookPassword;

      // Use official SDK to validate callback
      const callbackResponse = this.client.validateCallback(
        webUsername,
        webPassword,
        authorizationHeader,
        JSON.stringify(webhookData)
      );

      console.log('PhonePe webhook validated successfully:', callbackResponse);

      return {
        success: true,
        data: callbackResponse
      };

    } catch (error) {
      console.error('PhonePe webhook processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate unique merchant transaction ID
   */
  generateMerchantTransactionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `GYM_${timestamp}_${random}`.toUpperCase();
  }

  /**
   * Convert PhonePe status to standard payment status
   */
  convertPaymentStatus(phonepeStatus) {
    switch (phonepeStatus) {
      case 'PAYMENT_SUCCESS':
      case 'COMPLETED':
        return 'completed';
      case 'PAYMENT_ERROR':
      case 'PAYMENT_DECLINED':
      case 'FAILED':
        return 'failed';
      case 'PAYMENT_PENDING':
      case 'PAYMENT_INITIATED':
      case 'PENDING':
        return 'pending';
      case 'CANCELLED':
      case 'PAYMENT_CANCELLED':
        return 'cancelled';
      default:
        return 'pending';
    }
  }

  /**
   * Extract detailed payment information from PhonePe response
   */
  extractPaymentDetails(phonepeResponse) {
    try {
      const extractedData = {
        transactionId: null,
        paymentMethod: null,
        bankId: null,
        bankTransactionId: null,
        authorizationCode: null,
        arn: null,
        brn: null,
        amount: null,
        timestamp: null
      };

      // Extract from the detailed response structure
      if (phonepeResponse.data && phonepeResponse.data.paymentDetails && phonepeResponse.data.paymentDetails.length > 0) {
        const paymentDetail = phonepeResponse.data.paymentDetails[0];
        
        extractedData.transactionId = paymentDetail.transactionId;
        extractedData.paymentMethod = paymentDetail.paymentMode; // CARD, UPI, etc.
        extractedData.amount = paymentDetail.amount;
        extractedData.timestamp = paymentDetail.timestamp;

        // Extract from split instruments if available
        if (paymentDetail.splitInstruments && paymentDetail.splitInstruments.length > 0) {
          const instrument = paymentDetail.splitInstruments[0];
          
          // Extract from rail (payment gateway info)
          if (instrument.rail) {
            extractedData.authorizationCode = instrument.rail.authorizationCode;
            extractedData.serviceTransactionId = instrument.rail.serviceTransactionId;
          }

          // Extract from instrument (bank/card info)
          if (instrument.instrument) {
            extractedData.bankId = instrument.instrument.bankId;
            extractedData.bankTransactionId = instrument.instrument.bankTransactionId;
            extractedData.arn = instrument.instrument.arn;
            extractedData.brn = instrument.instrument.brn;
            
            // Refine payment method based on instrument type
            if (instrument.instrument.type) {
              extractedData.paymentMethod = instrument.instrument.type; // CREDIT_CARD, DEBIT_CARD, etc.
            }
          }
        }
      }

      return extractedData;
    } catch (error) {
      console.error('Error extracting PhonePe payment details:', error);
      return {};
    }
  }

  /**
   * Convert PhonePe payment method to standard format
   */
  convertPaymentMethod(phonepeMethod) {
    if (!phonepeMethod) return null;
    
    const method = phonepeMethod.toUpperCase();
    switch (method) {
      case 'CREDIT_CARD':
        return 'credit_card';
      case 'DEBIT_CARD':
      case 'CARD':
        return 'debit_card';
      case 'UPI':
        return 'upi';
      case 'NET_BANKING':
      case 'NETBANKING':
        return 'net_banking';
      case 'WALLET':
        return 'wallet';
      default:
        return phonepeMethod.toLowerCase();
    }
  }
}

module.exports = new PhonePeService();
