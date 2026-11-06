import { BadRequestException } from '@nestjs/common';
import { OrderStatusService } from './order-status.service';
import { TransactionStatus } from '../transaction/transaction.model';

function setup(statut: string, options: { pending?: number[]; stockOk?: boolean } = {}) {
  const order = { id: 21, reference: 'REF-21', statut, produits: [{ id: 8, nom: 'Fraise', proprietaireId: 9 }], quantites: [2], prix_unitaires: [200] };
  const stockUpdates: string[] = [];
  const updates: Array<{ entity: string; criteria: unknown; values: any }> = [];
  const lockQuery = { setLock: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), getOne: jest.fn().mockResolvedValue(order) };
  const manager = {
    createQueryBuilder: jest.fn((entity?: unknown) => {
      if (entity) return lockQuery;
      const builder: any = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn((value: { stock: () => string }) => { stockUpdates.push(value.stock()); return builder; }),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: options.stockOk === false ? 0 : 1 }),
      };
      return builder;
    }),
    findOne: jest.fn().mockResolvedValue(order),
    find: jest.fn().mockResolvedValue((options.pending ?? []).map((id) => ({ id, status: TransactionStatus.PENDING }))),
    update: jest.fn(async (entity: { name: string }, criteria: unknown, values: unknown) => { updates.push({ entity: entity.name, criteria, values }); }),
  };
  const dataSource = { transaction: jest.fn((work: (m: typeof manager) => unknown) => work(manager)) };
  const ventes = { createPaidRemises: jest.fn() };
  const service = new OrderStatusService(dataSource as any, ventes as any);
  return { service, stockUpdates, updates, ventes };
}

describe('OrderStatusService', () => {
  it('confirms a pending payment by hand: closes the FedaPay transaction and creates merchant remises', async () => {
    const { service, updates, ventes, stockUpdates } = setup('en_attente', { pending: [5] });
    const result = await service.changeStatus(21, 'payee');
    expect(result).toMatchObject({ statut: 'payee', allowedTransitions: ['terminee'] });
    expect(updates).toContainEqual({ entity: 'Transaction', criteria: [5], values: { status: TransactionStatus.SUCCESS, stockReserved: false } });
    expect(updates).toContainEqual({ entity: 'Vente', criteria: 21, values: { statut: 'payee' } });
    expect(ventes.createPaidRemises).toHaveBeenCalledWith(21, expect.any(Array), [2], [200]);
    expect(stockUpdates).toEqual([]); // le stock était déjà réservé
  });

  it('releases the stock when a pending order fails', async () => {
    const { service, stockUpdates, updates } = setup('en_attente', { pending: [5] });
    await service.changeStatus(21, 'echouee');
    expect(stockUpdates).toEqual(['stock + 2']);
    expect(updates).toContainEqual({ entity: 'Transaction', criteria: [5], values: { status: TransactionStatus.FAILED, stockReserved: false } });
  });

  it('reserves the stock again when a failed order is reactivated', async () => {
    const { service, stockUpdates } = setup('echouee');
    await service.changeStatus(21, 'en_attente');
    expect(stockUpdates).toEqual(['stock - 2']);
  });

  it('refuses to reactivate a failed order when stock is insufficient', async () => {
    const { service } = setup('echouee', { stockOk: false });
    await expect(service.changeStatus(21, 'terminee')).rejects.toThrow('Stock insuffisant');
  });

  it('keeps completed and refunded orders final, and paid orders only move to completed', async () => {
    await expect(setup('terminee').service.changeStatus(21, 'en_attente')).rejects.toThrow('terminée');
    await expect(setup('remboursee').service.changeStatus(21, 'payee')).rejects.toThrow('remboursée');
    await expect(setup('payee').service.changeStatus(21, 'echouee')).rejects.toThrow('remboursement');
    await expect(setup('payee').service.changeStatus(21, 'terminee')).resolves.toMatchObject({ statut: 'terminee', allowedTransitions: [] });
  });

  it('rejects unknown statuses', async () => {
    await expect(setup('en_attente').service.changeStatus(21, 'remboursee')).rejects.toBeInstanceOf(BadRequestException);
    await expect(setup('en_attente').service.changeStatus(21, 'nimporte')).rejects.toBeInstanceOf(BadRequestException);
  });
});
