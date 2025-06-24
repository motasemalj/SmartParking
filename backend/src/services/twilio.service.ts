import twilio from 'twilio';

// Check if Twilio environment variables are available
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Initialize Twilio client only if credentials are available
let client: twilio.Twilio | null = null;

if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  try {
    client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    console.log('Twilio client initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Twilio client:', error);
    client = null;
  }
} else {
  console.warn('Twilio credentials not found in environment variables. SMS functionality will be disabled.');
}

export class TwilioService {
  /**
   * Send OTP via SMS
   * @param phoneNumber - The recipient's phone number
   * @param otp - The OTP code to send
   * @returns Promise<boolean> - Success status
   */
  static async sendOTP(phoneNumber: string, otp: string): Promise<boolean> {
    try {
      if (!client) {
        console.warn('Twilio client not available. Logging OTP instead.');
        console.log(`OTP for ${phoneNumber}: ${otp} (Twilio not configured)`);
        return false;
      }

      if (!TWILIO_PHONE_NUMBER) {
        console.error('TWILIO_PHONE_NUMBER not configured');
        return false;
      }

      // Format phone number to ensure it starts with +
      const formattedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
      
      const message = await client.messages.create({
        body: `Your Smart Parking verification code is: ${otp}. This code will expire in 5 minutes.`,
        to: formattedPhoneNumber,
        from: TWILIO_PHONE_NUMBER
      });

      console.log(`SMS sent successfully to ${formattedPhoneNumber}. SID: ${message.sid}`);
      return true;
    } catch (error) {
      console.error('Error sending SMS via Twilio:', error);
      // Fallback to logging OTP for development
      console.log(`OTP for ${phoneNumber}: ${otp} (SMS failed, logged for development)`);
      return false;
    }
  }

  /**
   * Verify if a phone number is valid
   * @param phoneNumber - The phone number to validate
   * @returns Promise<boolean> - Validity status
   */
  static async validatePhoneNumber(phoneNumber: string): Promise<boolean> {
    try {
      if (!client) {
        console.warn('Twilio client not available. Skipping phone validation.');
        return true; // Assume valid if Twilio is not configured
      }

      const formattedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
      
      // Use Twilio's Lookup API to validate the phone number
      const lookup = await client.lookups.v2.phoneNumbers(formattedPhoneNumber).fetch();
      
      return lookup.valid === true;
    } catch (error) {
      console.error('Error validating phone number:', error);
      return false;
    }
  }

  /**
   * Get Twilio account information
   * @returns Promise<object> - Account details
   */
  static async getAccountInfo() {
    try {
      if (!client || !TWILIO_ACCOUNT_SID) {
        return {
          error: 'Twilio not configured',
          configured: false
        };
      }

      const account = await client.api.accounts(TWILIO_ACCOUNT_SID).fetch();
      return {
        sid: account.sid,
        name: account.friendlyName,
        status: account.status,
        type: account.type,
        configured: true
      };
    } catch (error) {
      console.error('Error fetching Twilio account info:', error);
      return {
        error: 'Failed to fetch account info',
        configured: false
      };
    }
  }

  /**
   * Check if Twilio is properly configured
   * @returns boolean - Configuration status
   */
  static isConfigured(): boolean {
    return !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER && client);
  }
} 