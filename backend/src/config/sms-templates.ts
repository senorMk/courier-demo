/**
 * Centralized SMS message templates for the application
 * All message templates should be defined here for consistency and maintainability
 */

type TemplateFunction = (...args: any[]) => string;

// Customer care information to be included in all messages
const CUSTOMER_CARE_FOOTER = `

For any more inquiries, kindly call us on 0974486944 or 09767763646.

Thank you for using Platinum Courier Services`;

export const SmsTemplates = {
  PARCEL: {
    CREATED: {
      SENDER: (code: string): string =>
        `Parcel Created: ${code}.${CUSTOMER_CARE_FOOTER}`,
      RECEIVER: (code: string): string =>
        `Incoming Parcel: ${code}. You will be notified upon arrival.${CUSTOMER_CARE_FOOTER}`,
    },
    COLLECTED: (code: string, destination: string): string =>
      `PCS: Parcel ${code} has been collected at ${destination}.${CUSTOMER_CARE_FOOTER}`,
    UNCOLLECTED_REMINDER: (code: string, destination: string): string =>
      `PCS: REMINDER - Your parcel ${code} is awaiting collection at ${destination}. Please collect it as soon as possible to avoid storage fees.${CUSTOMER_CARE_FOOTER}`,
  },
  TRIP: {
    DEPARTED: (code: string, destination: string): string =>
      `PCS: Your parcel ${code} has departed and is in transit to ${destination}.${CUSTOMER_CARE_FOOTER}`,
    IN_TRANSIT: (code: string, destination: string): string =>
      `PCS: Parcel ${code} for you is in transit to ${destination}.${CUSTOMER_CARE_FOOTER}`,
  },
  READY: {
    COLLECTION: (code: string, destination: string): string =>
      `PCS: Parcel ${code} is ready for collection at ${destination}.${CUSTOMER_CARE_FOOTER}`,
  },
  COMPLAINT: {
    RECEIVED: (code: string, type: string = ''): string =>
      `PCS: Complaint received for parcel ${code}${type ? ` (${type})` : ''}. We will investigate and update you within 14 days.${CUSTOMER_CARE_FOOTER}`,
    RESOLVED: (code: string, destination: string): string =>
      `PCS: Complaint for parcel ${code} has been resolved at ${destination}.${CUSTOMER_CARE_FOOTER}`,
  },
} as const;

export type SmsTemplate = {
  [K in keyof typeof SmsTemplates]: {
    [P in keyof typeof SmsTemplates[K]]: 
      typeof SmsTemplates[K][P] extends object 
        ? { [Q in keyof typeof SmsTemplates[K][P]]: TemplateFunction }
        : TemplateFunction
  };
};
