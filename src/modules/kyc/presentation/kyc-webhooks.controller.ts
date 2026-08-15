import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request } from 'express';
import { HandleKycWebhookUseCase } from '../application/use-cases/handle-kyc-webhook.use-case';
import { KycProvider } from '../domain/kyc-provider.enum';

const PROVIDERS: Record<string, KycProvider> = {
  stripe: KycProvider.Stripe,
};

/**
 * Public Stripe Identity webhook that completes asynchronous US verifications.
 * Unauthenticated by design; trust rests on the signature the use case verifies
 * against the raw body. Excluded from Swagger.
 */
@ApiExcludeController()
@Controller({ path: 'kyc/webhook', version: '1' })
export class KycWebhooksController {
  constructor(private readonly handleWebhook: HandleKycWebhookUseCase) {}

  @Post(':provider')
  @HttpCode(HttpStatus.OK)
  async receive(
    @Param('provider') providerParam: string,
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string,
  ): Promise<{ received: boolean }> {
    const provider = PROVIDERS[providerParam.toLowerCase()];
    if (provider === undefined) {
      throw new BadRequestException('Unknown KYC provider');
    }

    const rawBody = request.rawBody;
    if (rawBody === undefined) {
      throw new BadRequestException('Missing request body');
    }
    if (signature === undefined || signature.length === 0) {
      throw new BadRequestException('Missing webhook signature');
    }

    try {
      await this.handleWebhook.execute({ provider, rawBody: rawBody.toString('utf8'), signature });
    } catch {
      throw new BadRequestException('Webhook could not be verified');
    }
    return { received: true };
  }
}
