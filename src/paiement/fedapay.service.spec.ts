import { UnauthorizedException } from '@nestjs/common';
import { Webhook } from 'fedapay';
import { FedaPayService } from './fedapay.service';

const secret = 'wh_test_secret';

function createWebhookService(): FedaPayService {
  return new FedaPayService(
    { get: jest.fn().mockReturnValue(secret) } as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );
}

function signedPayload(event: Record<string, unknown>) {
  const payload = Buffer.from(JSON.stringify(event));
  const signature = Webhook.generateTestHeaderString({ payload: payload.toString('utf8'), secret });
  return { payload, signature };
}

describe('FedaPayService.handleWebhook', () => {
  it('processes a signed transaction event using its provider ID', async () => {
    const service = createWebhookService();
    const confirm = jest.spyOn(service as any, 'confirmPaymentByProviderId').mockResolvedValue({ status: 'SUCCESS' });
    const signed = signedPayload({ name: 'transaction.approved', object: { id: 12345 } });

    await expect(service.handleWebhook(signed.payload, signed.signature)).resolves.toEqual({ received: true });
    expect(confirm).toHaveBeenCalledWith('12345');
  });

  it('ignores transaction.created until a payment result is available', async () => {
    const service = createWebhookService();
    const confirm = jest.spyOn(service as any, 'confirmPaymentByProviderId');
    const signed = signedPayload({ name: 'transaction.created', object: { id: 12345 } });

    await expect(service.handleWebhook(signed.payload, signed.signature)).resolves.toEqual({ received: true, processed: false });
    expect(confirm).not.toHaveBeenCalled();
  });

  it('rejects events with an invalid signature', async () => {
    const service = createWebhookService();
    const payload = Buffer.from(JSON.stringify({ name: 'transaction.approved', object: { id: 12345 } }));

    await expect(service.handleWebhook(payload, 't=1,v1=invalid')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('FedaPayService.check', () => {
  it.each([
    ['expanded currency relation', { iso: 'XOF' }],
    ['currency as ISO string', 'XOF'],
  ])('accepts XOF returned as %s', async (_label, currency) => {
    const transaction = {
      id: 7,
      reference: 'ORION-REF-7',
      methode: 'FedaPay',
      providerTransactionId: 'provider-123',
      amount: 4500,
      status: 'PENDING',
      stockReserved: true,
      venteId: 21,
      vente: { id: 21 },
    };
    const transactionService = { findByReference: jest.fn().mockResolvedValue(transaction) };
    const service = new FedaPayService(
      { get: jest.fn().mockReturnValue(secret) } as any,
      {} as any,
      {} as any,
      transactionService as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    const request = jest.spyOn(service as any, 'request').mockResolvedValue({
      id: 'provider-123',
      amount: 4500,
      currency,
      status: 'pending',
    });

    await expect(service.check('ORION-REF-7')).resolves.toBe(transaction);
    expect(request).toHaveBeenCalledWith('/transactions/provider-123?include=currency');
  });
});
