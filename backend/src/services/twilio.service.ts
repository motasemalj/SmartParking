import twilio from 'twilio';

// Initialize Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER!;

export class TwilioService {
  /**
   * Send OTP via SMS
   * @param phoneNumber - The recipient's phone number
   * @param otp - The OTP code to send
   * @returns Promise<boolean> - Success status
   */
  static async sendOTP(phoneNumber: string, otp: string): Promise<boolean> {
    try {
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
      const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID!).fetch();
      return {
        sid: account.sid,
        name: account.friendlyName,
        status: account.status,
        type: account.type
      };
    } catch (error) {
      console.error('Error fetching Twilio account info:', error);
      return null;
    }
  }
} 