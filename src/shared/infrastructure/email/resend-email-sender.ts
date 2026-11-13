import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig, MailConfig } from '@config/configuration';
import { EmailMessage, EmailSender } from '@shared/application/ports/email-sender.port';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

/**
 * Resend implementation of the EmailSender port, written against the Resend REST
 * API with fetch (no SDK dependency), consistent with the payment providers.
 *
 * Fails closed: in production a missing API key is an error. Outside production,
 * with no key, the message (including the one time passcode) is logged at debug
 * level so flows stay testable without a real Resend account. That dev only
 * logging never runs in production, where secrets must never be logged.
 */
@Injectable()
export class ResendEmailSender implements EmailSender {
  private readonly logger = new Logger(ResendEmailSender.name);
  private readonly apiKey: string;
  private readonly from: string;
  private readonly isProduction: boolean;

  constructor(config: ConfigService) {
    const mail = config.getOrThrow<MailConfig>('mail');
    this.apiKey = mail.resendApiKey;
    this.from = mail.from;
    this.isProduction = config.getOrThrow<AppConfig>('app').nodeEnv === 'production';
  }

  async send(message: EmailMessage): Promise<void> {
    if (this.apiKey.length === 0) {
      if (this.isProduction) {
        throw new Error('RESEND_API_KEY is not configured; cannot send email');
      }
      // Development only: surface the message so flows are testable without a
      // real Resend account. Never reached in production.
      this.logger.debug(`Email to ${message.to} [${message.subject}]:\n${message.text}`);
      return;
    }

    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        ...(message.html !== undefined ? { html: message.html } : {}),
      }),
    });

    if (!response.ok) {
      // The provider error body names the failure (for example an unverified
      // sender domain); it carries no recipient or message content.
      const detail = await response.text().catch(() => '');
      throw new Error(`Resend rejected the email (${response.status}): ${detail}`);
    }

    // Record the provider message id so an accepted send is traceable from our
    // logs to the Resend dashboard (delivered, bounced, etc.) without a
    // reproduction. The id and subject carry no recipient or message content.
    const id = await response
      .json()
      .then((body: { id?: string }) => body.id)
      .catch(() => undefined);
    this.logger.log(`Email accepted by Resend (id ${id ?? 'unknown'}) [${message.subject}]`);
  }
}
