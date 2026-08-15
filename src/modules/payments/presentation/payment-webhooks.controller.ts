import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { HandlePaymentWebhookUseCase } from '../application/use-cases/handle-payment-webhook.use-case';
import { PaymentProvider } from '../domain/payment-provider.enum';

const PROVIDERS: Record<string, PaymentProvider> = {
  stripe: PaymentProvider.Stripe,
  paystack: PaymentProvider.Paystack,
};

/**
 * Public provider webhooks. Unauthenticated by design (providers cannot present a
 * user token), so trust rests entirely on the signature the use case verifies
 * against the raw body. Excluded from Swagger; not for client use.
 */
@ApiExcludeController()
@Controller({ path: 'payments/webhook', version: '1' })
export class PaymentWebhooksController {
  constructor(private readonly handleWebhook: HandlePaymentWebhookUseCase) {}

  @Post(':provider')
  @HttpCode(HttpStatus.OK)
  async receive(
    @Param('provider') providerParam: string,
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') stripeSignature?: string,
    @Headers('x-paystack-signature') paystackSignature?: string,
  ): Promise<{ received: boolean }> {
    const provider = PROVIDERS[providerParam.toLowerCase()];
    if (provider === undefined) {
      throw new BadRequestException('Unknown payment provider');
    }

    const rawBody = request.rawBody;
    if (rawBody === undefined) {
      throw new BadRequestException('Missing request body');
    }

    const signature = provider === PaymentProvider.Stripe ? stripeSignature : paystackSignature;
    if (signature === undefined || signature.length === 0) {
      throw new BadRequestException('Missing webhook signature');
    }

    try {
      await this.handleWebhook.execute({ provider, rawBody: rawBody.toString('utf8'), signature });
    } catch {
      // A bad signature or malformed payload is a client error, not a server one.
      throw new BadRequestException('Webhook could not be verified');
    }
    return { received: true };
  }
}
