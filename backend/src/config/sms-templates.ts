/**
 * Centralized SMS message templates for the application
 * All message templates should be defined here for consistency and maintainability
 */

type TemplateFunction = (...args: any[]) => string;

// Customer care information to be included in all messages
const CUSTOMER_CARE_FOOTER = `

Should you require any clarification or assistance, please feel free to contact us on +260773483020 or +260773826745.

Thank you for choosing Platinum Courier Services. We look forward to serving you again.`;

export const SmsTemplates = {
  PARCEL: {
    CREATED: {
      SENDER: (firstName: string, lastName: string, sendingOffice: string, receivingOffice: string, trackingCode: string, senderName: string, parcelDescription: string): string =>
        `Hello ${firstName}${lastName ? ` ${lastName}` : ''}

Your package has been successfully registered for shipment from ${sendingOffice} to ${receivingOffice}.

Receiver: ${senderName}
Parcel Description: ${parcelDescription}
Tracking Code: ${trackingCode}
${CUSTOMER_CARE_FOOTER}`,
      RECEIVER: (firstName: string, lastName: string, sendingOffice: string, receivingOffice: string, trackingCode: string, senderName: string, parcelDescription: string): string =>
        `Hello ${firstName}${lastName ? ` ${lastName}` : ''}

You have an incoming package from ${sendingOffice} that is scheduled to arrive at ${receivingOffice}.

Sender: ${senderName}
Parcel Description: ${parcelDescription}
Tracking Code: ${trackingCode}

You will be notified upon arrival.${CUSTOMER_CARE_FOOTER}`,
    },
    COLLECTED: (firstName: string, lastName: string, trackingCode: string, destination: string, collectedBy: string, parcelDescription: string): string =>
      `Hello ${firstName}${lastName ? ` ${lastName}` : ''}

Your package "${parcelDescription}" (${trackingCode}) has been successfully collected at ${destination} by ${collectedBy}.${CUSTOMER_CARE_FOOTER}`,
    UNCOLLECTED_REMINDER: (firstName: string, lastName: string, trackingCode: string, destination: string, parcelDescription: string): string =>
      `Hello ${firstName}${lastName ? ` ${lastName}` : ''}

REMINDER - Your package "${parcelDescription}" (${trackingCode}) is awaiting collection at ${destination}. Please collect it as soon as possible to avoid storage fees.${CUSTOMER_CARE_FOOTER}`,
  },
  TRIP: {
    DEPARTED: (firstName: string, lastName: string, trackingCode: string, destination: string, parcelDescription: string): string =>
      `Hello ${firstName}${lastName ? ` ${lastName}` : ''}

Your package "${parcelDescription}" (${trackingCode}) has departed and is in transit to ${destination}.${CUSTOMER_CARE_FOOTER}`,
    IN_TRANSIT: (firstName: string, lastName: string, trackingCode: string, destination: string, parcelDescription: string): string =>
      `Hello ${firstName}${lastName ? ` ${lastName}` : ''}

Your package "${parcelDescription}" (${trackingCode}) for you is in transit to ${destination}.${CUSTOMER_CARE_FOOTER}`,
  },
  READY: {
    COLLECTION: (firstName: string, lastName: string, trackingCode: string, destination: string, parcelDescription: string): string =>
      `Hello ${firstName}${lastName ? ` ${lastName}` : ''}

Your package "${parcelDescription}" (${trackingCode}) is ready for collection at ${destination}.${CUSTOMER_CARE_FOOTER}`,
  },
  COMPLAINT: {
    RECEIVED: (firstName: string, lastName: string, trackingCode: string, type: string = '', parcelDescription: string): string =>
      `Hello ${firstName}${lastName ? ` ${lastName}` : ''}

Complaint received for your package.

Parcel Description: ${parcelDescription}
Tracking Code: ${trackingCode}
Complaint Type: ${type || 'General'}

We will investigate and update you within 14 days.${CUSTOMER_CARE_FOOTER}`,
    RESOLVED: (firstName: string, lastName: string, trackingCode: string, destination: string, parcelDescription: string): string =>
      `Hello ${firstName}${lastName ? ` ${lastName}` : ''}

Your complaint for package "${parcelDescription}" (${trackingCode}) has been resolved at ${destination}.${CUSTOMER_CARE_FOOTER}`,
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
