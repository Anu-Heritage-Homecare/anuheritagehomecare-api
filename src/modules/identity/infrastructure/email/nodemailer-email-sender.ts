import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig, MailConfig } from '@config/configuration';
import * as nodemailer from 'nodemailer';
import { EmailMessage, EmailSender } from '../../application/ports/email-sender.port';

/**
 * SMTP implementation of the EmailSender port using nodemailer.
 *
 * In production a real SMTP transport is used. Outside production a JSON
 * transport is used instead, so the app needs no external mail server to run
 * locally; the message (including the one time passcode) is logged at debug
 * level purely as a development affordance. This dev only logging never runs in
 * production, where secrets must never be logged.
 */
@Injectable()
export class NodemailerEmailSender implements EmailSender {
  private readonly logger = new Logger(NodemailerEmailSender.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;
  private readonly isProduction: boolean;

  constructor(config: ConfigService) {
    const mail = config.getOrThrow<MailConfig>('mail');
    this.from = mail.from;
    this.isProduction = config.getOrThrow<AppConfig>('app').nodeEnv === 'production';

    this.transporter = this.isProduction
      ? nodemailer.createTransport({
          host: mail.host,
          port: mail.port,
          secure: mail.secure,
          auth: mail.user.length > 0 ? { user: mail.user, pass: mail.password } : undefined,
        })
      : nodemailer.createTransport({ jsonTransport: true });
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    if (!this.isProduction) {
      // Development only: surface the message so flows are testable without a
      // real mailbox. Never reached in production.
      this.logger.debug(`Email to ${message.to} [${message.subject}]:\n${message.text}`);
    }
  }
}
