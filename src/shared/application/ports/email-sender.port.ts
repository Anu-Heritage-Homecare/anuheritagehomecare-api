export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Port over outbound transactional email. The concrete adapter (SMTP via
 * nodemailer) lives in infrastructure. Use cases describe the message; they do
 * not know how it is delivered.
 */
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

export const EMAIL_SENDER = Symbol('EMAIL_SENDER');
