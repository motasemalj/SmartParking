# Twilio OTP Integration Setup

## Overview
This document explains how to set up Twilio SMS OTP functionality for the Smart Parking Platform.

## Twilio Credentials
The following credentials should be configured in your environment variables:

- **Account SID**: `your_account_sid`
- **Auth Token**: `your_auth_token`
- **Phone Number**: `your_twilio_phone_number`

## Environment Variables

Add the following variables to your `.env` file in the backend directory:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

## Implementation Details

### 1. Twilio Service (`backend/src/services/twilio.service.ts`)
- Handles SMS sending via Twilio API
- Includes phone number validation
- Provides account information retrieval
- Error handling and logging

### 2. Updated Auth Controller (`backend/src/controllers/auth.controller.ts`)
- Modified `sendOTP` function to use Twilio SMS
- Added phone number formatting
- Fallback to console logging in development
- Consistent phone number handling in `verifyOTP`

### 3. Test Endpoint
A test endpoint has been added to verify Twilio integration:
```
POST /api/auth/test-twilio
Body: { "phoneNumber": "+1234567890" }
```

## Testing the Integration

### 1. Test Twilio Connection
```bash
curl -X POST http://localhost:5002/api/auth/test-twilio \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+971527550502"}'
```

### 2. Test OTP Flow
```bash
# Send OTP
curl -X POST http://localhost:5002/api/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+971527550502"}'

# Verify OTP (use the OTP received via SMS)
curl -X POST http://localhost:5002/api/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+971527550502", "otp": "123456"}'
```

## Features

### SMS OTP Delivery
- 6-digit OTP codes
- 5-minute expiration
- Professional SMS message format
- Error handling for failed SMS delivery

### Phone Number Validation
- Automatic formatting (adds + if missing)
- Optional Twilio Lookup validation
- Consistent handling across endpoints

### Development vs Production
- Development: Falls back to console logging if SMS fails
- Production: Returns error if SMS fails
- Configurable behavior via NODE_ENV

## Security Considerations

1. **Environment Variables**: Never commit Twilio credentials to version control
2. **Rate Limiting**: Consider implementing rate limiting for OTP requests
3. **Phone Number Validation**: Enable Twilio Lookup validation in production
4. **Error Handling**: Proper error messages without exposing sensitive information

## Troubleshooting

### Common Issues

1. **SMS Not Sending**
   - Check Twilio account balance
   - Verify phone number format
   - Check Twilio console for error logs

2. **Invalid Phone Number**
   - Ensure phone number includes country code
   - Test with Twilio Lookup API

3. **Authentication Errors**
   - Verify Account SID and Auth Token
   - Check if Twilio account is active

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` in your environment variables.

## Next Steps

1. Test the integration with real phone numbers
2. Monitor Twilio usage and costs
3. Implement rate limiting for OTP requests
4. Add phone number validation in production
5. Set up monitoring for SMS delivery success rates 