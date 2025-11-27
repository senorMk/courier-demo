import { SmsTemplate } from '../config/sms-templates';

type TemplateFunction = (...args: any[]) => string;

let client: any = null;

function getAfricaTalking() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const africastalking = require('africastalking')({
      apiKey: process.env.AFRICAS_TALKING_API_KEY,
      username: process.env.AFRICAS_TALKING_USERNAME,
    });
    return africastalking.SMS;
  } catch (e) {
    console.warn('africastalking not installed or not configured. SMS will be logged.');
    return null;
  }
}

/**
 * Send an SMS; falls back to console.log if SDK missing.
 * @param msisdn E.g. 2609XXXXXXX (without +)
 * @param message Text content to send
 */
async function sendSms(msisdn: string, message: string): Promise<void> {
  const normalized = msisdn.startsWith('+') ? msisdn : `+${msisdn}`;
  if (!client) client = getAfricaTalking();
  if (!client) {
    console.info(`[SMS:FALLBACK] ${normalized}: ${message}`);
    return;
  }
  const from = process.env.AFRICAS_TALKING_SENDER_ID || undefined;
  await client.send({ to: [normalized], message, from });
}

/**
 * Send an SMS using a template function
 * @param msisdn E.g. 2609XXXXXXX (without +)
 * @param template Template function that returns the message string
 * @param args Arguments to pass to the template function
 */
async function sendTemplateSms(
  msisdn: string,
  template: TemplateFunction,
  ...args: any[]
): Promise<void> {
  const message = template(...args);
  return sendSms(msisdn, message);
}

// Export all functionality
export { sendSms, sendTemplateSms };
const smsExports = { sendSms, sendTemplateSms };
export default smsExports;
