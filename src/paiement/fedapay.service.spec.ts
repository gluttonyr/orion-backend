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
