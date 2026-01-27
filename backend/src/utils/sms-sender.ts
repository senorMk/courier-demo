import { SmsTemplate } from '../config/sms-templates';
import axios from 'axios';
import * as https from 'https';

type TemplateFunction = (...args: any[]) => string;

let client: any = null;

type SmsProvider = 'africas_talking' | 'inq';

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

function getSmsProvider(): SmsProvider {
  const provider = process.env.SMS_PROVIDER?.toLowerCase();
  if (provider === 'inq') return 'inq';
  return 'africas_talking';
}

function buildInqRequest(
  msisdn: string,
  message: string,
): { url: URL; payload: Record<string, unknown> } | null {
  const username = process.env.INQ_USERNAME;
  const password = process.env.INQ_PASSWORD;
  const senderId = process.env.INQ_SENDER_ID;
  if (!username || !password || !senderId) {
    console.warn('INQ SMS provider missing credentials. SMS will be logged.');
    return null;
  }

  const baseUrl = process.env.INQ_BASE_URL || 'https://messaging.inqzm.co.zm/smsservice/jsonapi';
  const url = new URL(baseUrl);
  const phone = msisdn.replace(/^\+/, '');
  const payload: Record<string, unknown> = {
    auth: {
      username,
      password,
      sender_id: senderId,
    },
    messages: [
      {
        phone,
        message,
      },
    ],
  };
  return { url, payload };
}

async function sendInqSms(msisdn: string, message: string): Promise<void> {
  const requestPayload = buildInqRequest(msisdn, message);
  if (!requestPayload) {
    console.info(`[SMS:FALLBACK] ${msisdn}: ${message}`);
    return;
  }

  const { url, payload } = requestPayload;
  const allowInsecure = process.env.INQ_ALLOW_INSECURE_SSL === 'true';
  const httpsAgent = new https.Agent({ rejectUnauthorized: !allowInsecure });
  try {
    await axios.post(url.toString(), payload, {
      headers: { 'Content-Type': 'application/json' },
      httpsAgent,
    });
  } catch (error: any) {
    if (error?.response) {
      const status = error.response.status;
      const responseBody = error.response.data;
      throw new Error(`INQ SMS failed: ${status} ${JSON.stringify(responseBody ?? '')}`);
    }
    throw new Error(`INQ SMS failed: ${error.message}`);
  }
}

/**
 * Send an SMS; falls back to console.log if SDK missing.
 * @param msisdn E.g. 2609XXXXXXX (without +)
 * @param message Text content to send
 */
async function sendSms(msisdn: string, message: string): Promise<void> {
  const normalized = msisdn.startsWith('+') ? msisdn : `+${msisdn}`;
  const provider = getSmsProvider();
  if (provider === 'inq') {
    return sendInqSms(normalized, message);
  }
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