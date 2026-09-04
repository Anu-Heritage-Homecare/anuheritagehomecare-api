import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { BookingsModule } from '@modules/bookings/bookings.module';
import { CarePlansModule } from '@modules/care-plans/care-plans.module';
import { KycModule } from '@modules/kyc/kyc.module';
import { PAYABLE_SERVICE } from './application/ports/payable-service.port';
import { PAYMENT_GATEWAY } from './application/ports/payment-gateway.port';
import { AddPaymentMethodUseCase } from './application/use-cases/add-payment-method.use-case';
import { ChangeProviderSubscriptionPlanUseCase } from './application/use-cases/change-subscription-plan.use-case';
import { HandlePaymentWebhookUseCase } from './application/use-cases/handle-payment-webhook.use-case';
import { InitiatePaymentUseCase } from './application/use-cases/initiate-payment.use-case';
import { ListPaymentMethodsUseCase } from './application/use-cases/list-payment-methods.use-case';
import { RemovePaymentMethodUseCase } from './application/use-cases/remove-payment-method.use-case';
import { SetDefaultPaymentMethodUseCase } from './application/use-cases/set-default-payment-method.use-case';
import { StartCardSetupUseCase } from './application/use-cases/start-card-setup.use-case';
import { PAYMENT_METHOD_REPOSITORY } from './domain/payment-method.repository';
import { PAYMENT_REPOSITORY } from './domain/payment.repository';
import { CompositePaymentGateway } from './infrastructure/gateway/composite-payment-gateway';
import { PaystackPaymentGateway } from './infrastructure/gateway/paystack-payment-gateway';
import { StripePaymentGateway } from './infrastructure/gateway/stripe-payment-gateway';
import { BookingsPayableService } from './infrastructure/payable/bookings-payable-service';
import { PaymentMethodPrismaRepository } from './infrastructure/persistence/payment-method-prisma.repository';
import { PaymentPrismaRepository } from './infrastructure/persistence/payment-prisma.repository';
import { PaymentWebhooksController } from './presentation/payment-webhooks.controller';
import { PaymentsController } from './presentation/payments.controller';

/**
 * Payments composition root. The provider agnostic PaymentGateway port is bound
 * to a composite that dispatches to the Stripe and Paystack adapters, and the
 * PayableService port bridges to the bookings context to confirm what was paid
 * for. NOTE: the provider adapters are written but not yet verified against live
 * accounts; they require provider keys and a database to exercise.
 */
@Module({
  imports: [PassportModule, BookingsModule, CarePlansModule, KycModule],
  controllers: [PaymentsController, PaymentWebhooksController],
  providers: [
    InitiatePaymentUseCase,
    ListPaymentMethodsUseCase,
    StartCardSetupUseCase,
    AddPaymentMethodUseCase,
    SetDefaultPaymentMethodUseCase,
    RemovePaymentMethodUseCase,
    ChangeProviderSubscriptionPlanUseCase,
    HandlePaymentWebhookUseCase,
    StripePaymentGateway,
    PaystackPaymentGateway,
    { provide: PAYMENT_GATEWAY, useClass: CompositePaymentGateway },
    { provide: PAYABLE_SERVICE, useClass: BookingsPayableService },
    { provide: PAYMENT_REPOSITORY, useClass: PaymentPrismaRepository },
    { provide: PAYMENT_METHOD_REPOSITORY, useClass: PaymentMethodPrismaRepository },
  ],
  exports: [PAYMENT_REPOSITORY, InitiatePaymentUseCase, ChangeProviderSubscriptionPlanUseCase],
})
export class PaymentsModule {}
