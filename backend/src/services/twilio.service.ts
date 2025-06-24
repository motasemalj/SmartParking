import { Twilio } from 'twilio';

class TwilioService {
  private client: Twilio | null = null;

  private getClient(): Twilio {
    if (!this.client) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;

      if (!accountSid || !authToken) {
        throw new Error('Twilio credentials are not configured properly');
      }

      this.client = new Twilio(accountSid, authToken);
    }
    return this.client;
  }

  async sendOTP(phoneNumber: string): Promise<boolean> {
    try {
      const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
      
      if (!verifyServiceSid) {
        throw new Error('Twilio Verify Service SID is not configured');
      }

      const client = this.getClient();
      const verification = await client.verify.v2
        .services(verifyServiceSid)
        .verifications
        .create({
          to: phoneNumber,
          channel: 'sms'
        });

      console.log(`OTP verification started for ${phoneNumber}. Status: ${verification.status}`);
      return verification.status === 'pending';
    } catch (error) {
      console.error('Error sending OTP via Twilio Verify:', error);
      return false;
    }
  }

  async verifyOTP(phoneNumber: string, code: string): Promise<{ success: boolean; status?: string }> {
    try {
      const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
      
      if (!verifyServiceSid) {
        throw new Error('Twilio Verify Service SID is not configured');
      }

      const client = this.getClient();
      const verificationCheck = await client.verify.v2
        .services(verifyServiceSid)
        .verificationChecks
        .create({
          to: phoneNumber,
          code: code
        });

      console.log(`OTP verification for ${phoneNumber}: ${verificationCheck.status}`);
      return {
        success: verificationCheck.status === 'approved',
        status: verificationCheck.status
      };
    } catch (error) {
      console.error('Error verifying OTP via Twilio Verify:', error);
      return { success: false };
    }
  }

  async sendMessage(phoneNumber: string, message: string): Promise<boolean> {
    try {
      const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
      
      if (!twilioPhoneNumber) {
        throw new Error('Twilio phone number is not configured');
      }

      const client = this.getClient();
      const smsMessage = await client.messages.create({
        body: message,
        from: twilioPhoneNumber,
        to: phoneNumber
      });

      console.log(`Message sent successfully to ${phoneNumber}. Message SID: ${smsMessage.sid}`);
      return true;
    } catch (error) {
      console.error('Error sending message via Twilio:', error);
      return false;
    }
  }
}

export const twilioService = new TwilioService(); 