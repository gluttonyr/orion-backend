import { createHash } from 'crypto';
import { VenteService } from './vente.service';

describe('VenteService.generateHandoverQr', () => {
  it('includes the order reference in the signed QR payload', async () => {
    const remises = {
      findOne: jest.fn().mockResolvedValue({
        id: 12,
        commercantId: 3,
        venteId: 77,
        montant: 9000,
        statut: 'bloquee',
        qrTokenHash: null,
      }),
      save: jest.fn().mockResolvedValue(true),
    };

    const repo = {
      findOne: jest.fn().mockResolvedValue({ id: 77, reference: 'REF-123456' }),
    };

    const service = new VenteService(
      repo as any,
      remises as any,
      {} as any,
      {} as any,
      {} as any,
    );

    const result = await service.generateHandoverQr(3, 12);

    expect(result.content).toContain('ORION-HANDOVER:');
    expect(result.content).toContain('REF-123456');
  });
});

describe('VenteService.confirmHandover', () => {
  it('releases the seller amount once for the matching client and order', async () => {
    const reference = 'REF-123456';
    const token = 'a'.repeat(43);
    const signature = createHash('sha256').update(`${reference}:${token}`).digest('hex');
    const remise = { id: 12, venteId: 77, commercantId: 3, montant: 9000 };
    const manager = {
      findOne: jest.fn().mockResolvedValue({ id: 77, reference, utilisateurId: 5, statut: 'payee' }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const remises = { findOne: jest.fn().mockResolvedValue(remise) };
    const dataSource = { transaction: jest.fn((callback) => callback(manager)) };
    const notifications = { notifyHandoverConfirmed: jest.fn().mockResolvedValue(undefined) };
    const service = new VenteService(
      {} as any,
      remises as any,
      dataSource as any,
      notifications as any,
      {} as any,
    );

    const result = await service.confirmHandover(5, `ORION-HANDOVER:${reference}:${token}:${signature}`, 77);

    expect(result).toEqual({ ok: true, remiseId: 12, venteId: 77, montant: 9000, statut: 'liberee' });
    expect(manager.update).toHaveBeenCalledWith(
      expect.anything(),
      { id: 12, statut: 'bloquee', qrTokenHash: signature },
      { statut: 'liberee', qrTokenHash: null, dateRemise: expect.any(Date) },
    );
    expect(notifications.notifyHandoverConfirmed).toHaveBeenCalledWith(77, 5, 3, 9000);
  });
});
