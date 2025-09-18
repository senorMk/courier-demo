/**
 * Normalize phone numbers to E.164 for Zambia (+260...)
 * Accepts inputs like 097XXXXXXX, 00260XXXXXXX, +260XXXXXXX, 260XXXXXXX
 */
export function normalizeZMBPhone(msisdn?: string | null): string | null {
  if (!msisdn) return null;
  const digits = String(msisdn).replace(/\D/g, '');
  if (!digits) return null;

  const stripped = digits.replace(/^0+/, '');
  if (!stripped) return null;

  if (stripped.startsWith('260')) {
    return `+${stripped}`;
  }

  if (stripped.length === 9 || stripped.length === 8) {
    return `+260${stripped}`;
  }

  return `+${stripped}`;
}

export default normalizeZMBPhone;
