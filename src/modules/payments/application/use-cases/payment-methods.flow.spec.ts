import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  FakePaymentGateway,
  InMemoryPaymentMethodRepository,
  fixedClock,
  sequentialIds,
} from '../../test-support/doubles';
import { PaymentProvider } from '../../domain/payment-provider.enum';
import { AddPaymentMethodUseCase } from './add-payment-method.use-case';
import { ListPaymentMethodsUseCase } from './list-payment-methods.use-case';
import { RemovePaymentMethodUseCase } from './remove-payment-method.use-case';
import { SetDefaultPaymentMethodUseCase } from './set-default-payment-method.use-case';
import { StartCardSetupUseCase } from './start-card-setup.use-case';

describe('payment method management', () => {
  let methods: InMemoryPaymentMethodRepository;
  let gateway: FakePaymentGateway;
  let start: StartCardSetupUseCase;
  let add: AddPaymentMethodUseCase;

  beforeEach(() => {
    methods = new InMemoryPaymentMethodRepository();
    gateway = new FakePaymentGateway();
    start = new StartCardSetupUseCase(methods, gateway, sequentialIds('ref'));
    add = new AddPaymentMethodUseCase(methods, gateway, fixedClock, sequentialIds('pm'));
  });

  async function addCardFor(ownerId: string): Promise<string> {
    const setup = await start.execute({ ownerId, ownerEmail: 'a@b.com', country: 'NG' });
    const saved = await add.execute({ ownerId, country: 'NG', reference: setup.reference });
    return saved.id;
  }

  it('starts a setup with the provider handle for the owner market', async () => {
    const setup = await start.execute({ ownerId: 'owner-1', ownerEmail: 'a@b.com', country: 'US' });

    expect(setup.provider).toBe(PaymentProvider.Stripe);
    expect(setup.clientSecret).not.toBeNull();
    expect(setup.reference).toBe('setup_ref-1');
  });

  it('saves the tokenised card with the holder name and makes the first one default', async () => {
    const setup = await start.execute({ ownerId: 'owner-1', ownerEmail: 'a@b.com', country: 'NG' });
    const saved = await add.execute({
      ownerId: 'owner-1',
      country: 'NG',
      reference: setup.reference,
      cardHolderName: '  Raener Yaeger  ',
    });

    expect(saved).toMatchObject({
      provider: PaymentProvider.Paystack,
      brand: 'Visa',
      last4: '4242',
      cardHolderName: 'Raener Yaeger',
      isDefault: true,
    });
  });

  it('stores a null holder name when none is given', async () => {
    const setup = await start.execute({ ownerId: 'owner-1', ownerEmail: 'a@b.com', country: 'NG' });
    const saved = await add.execute({
      ownerId: 'owner-1',
      country: 'NG',
      reference: setup.reference,
    });
    expect(saved.cardHolderName).toBeNull();
  });

  it('is idempotent when the same card setup is confirmed twice', async () => {
    const setup = await start.execute({ ownerId: 'owner-1', ownerEmail: 'a@b.com', country: 'NG' });
    const first = await add.execute({
      ownerId: 'owner-1',
      country: 'NG',
      reference: setup.reference,
    });
    const second = await add.execute({
      ownerId: 'owner-1',
      country: 'NG',
      reference: setup.reference,
    });

    expect(second.id).toBe(first.id);
    expect(methods.store.size).toBe(1);
  });

  it('refuses to confirm a setup that belongs to another owner', async () => {
    const setup = await start.execute({ ownerId: 'owner-2', ownerEmail: 'a@b.com', country: 'NG' });

    await expect(
      add.execute({ ownerId: 'owner-1', country: 'NG', reference: setup.reference }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });

  it('switches the default to another saved card', async () => {
    const firstId = await addCardFor('owner-1');
    const secondId = await addCardFor('owner-1');
    const setDefault = new SetDefaultPaymentMethodUseCase(methods);

    const result = await setDefault.execute({ ownerId: 'owner-1', methodId: secondId });

    expect(result.isDefault).toBe(true);
    const list = await new ListPaymentMethodsUseCase(methods).execute({ ownerId: 'owner-1' });
    expect(list.find((m) => m.id === firstId)?.isDefault).toBe(false);
    expect(list.find((m) => m.id === secondId)?.isDefault).toBe(true);
  });

  it('promotes a remaining card when the default is removed', async () => {
    const firstId = await addCardFor('owner-1'); // becomes default
    const secondId = await addCardFor('owner-1');
    const remove = new RemovePaymentMethodUseCase(methods);

    await remove.execute({ ownerId: 'owner-1', methodId: firstId });

    const list = await new ListPaymentMethodsUseCase(methods).execute({ ownerId: 'owner-1' });
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(secondId);
    expect(list[0].isDefault).toBe(true);
  });

  it('404s removing a card the owner does not own', async () => {
    const methodId = await addCardFor('owner-2');
    const remove = new RemovePaymentMethodUseCase(methods);

    await expect(remove.execute({ ownerId: 'owner-1', methodId })).rejects.toBeInstanceOf(
      NotFoundDomainException,
    );
    expect(methods.store.size).toBe(1);
  });
});
