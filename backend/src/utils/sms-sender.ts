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
export async function sendSms(msisdn: string, message: string): Promise<void> {
  const normalized = msisdn.startsWith('+') ? msisdn : `+${msisdn}`;
  if (!client) client = getAfricaTalking();
  if (!client) {
    console.info(`[SMS:FALLBACK] ${normalized}: ${message}`);
    return;
  }
  const from = process.env.AFRICAS_TALKING_SENDER_ID || undefined;
  await client.send({ to: [normalized], message, from });
}

export default { sendSms };

