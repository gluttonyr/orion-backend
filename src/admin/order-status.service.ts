import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Vente } from '../vente/vente.model';
import { Produit } from '../produit/produit.model';
import { Transaction, TransactionStatus } from '../transaction/transaction.model';
import { VenteService } from '../vente/vente.service';

/** Statuts qu'un administrateur peut choisir. « remboursee » ne passe que par le flux de remboursement FedaPay. */
export const ADMIN_ORDER_STATUSES = ['en_attente', 'payee', 'terminee', 'echouee'] as const;
export type AdminOrderStatus = (typeof ADMIN_ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<string, string> = {
  en_attente: 'Paiement en attente',
  payee: 'Payée · à livrer',
  terminee: 'Terminée',
  echouee: 'Échouée',
  remboursee: 'Remboursée',
};

/**
 * Transitions autorisées depuis le tableau de bord admin.
 * - « terminee » et « remboursee » sont définitifs.
 * - Une commande « payee » a déjà crédité les commerçants (remises + commission) :
 *   elle ne peut que passer à « terminee » ; un retour en arrière passe par un remboursement.
 */
export const ORDER_TRANSITIONS: Record<string, AdminOrderStatus[]> = {
  en_attente: ['payee', 'terminee', 'echouee'],
  echouee: ['en_attente', 'payee', 'terminee'],
  payee: ['terminee'],
  terminee: [],
  remboursee: [],
};

/** Statuts pour lesquels les articles sont retirés du stock (réservés ou vendus). */
const HOLDS_STOCK = new Set(['en_attente', 'payee', 'terminee']);

@Injectable()
export class OrderStatusService {
  constructor(private readonly dataSource: DataSource, private readonly ventes: VenteService) {}

  allowedTransitions(status: string): AdminOrderStatus[] {
    return ORDER_TRANSITIONS[status] ?? [];
  }

  async changeStatus(id: number, requested: unknown) {
    if (!ADMIN_ORDER_STATUSES.includes(requested as AdminOrderStatus)) {
      throw new BadRequestException('Statut de commande invalide.');
    }
    const target = requested as AdminOrderStatus;

    const sale = await this.dataSource.transaction(async (manager) => {
      // Verrou de ligne : un webhook FedaPay ou un autre admin ne peut pas modifier la commande en même temps.
      const locked = await manager.createQueryBuilder(Vente, 'sale').setLock('pessimistic_write').where('sale.id = :id', { id }).getOne();
      if (!locked) throw new NotFoundException('Commande introuvable.');
      const current = locked.statut;
      if (current === target) throw new BadRequestException('La commande a déjà ce statut.');
      if (!this.allowedTransitions(current).includes(target)) {
        if (current === 'terminee') throw new BadRequestException('Cette commande est terminée et ne peut plus être modifiée.');
        if (current === 'remboursee') throw new BadRequestException('Cette commande a été remboursée et ne peut plus être modifiée.');
        if (current === 'payee') throw new BadRequestException('Une commande payée ne peut que passer à « Terminée ». Pour l’annuler, effectuez un remboursement.');
        throw new BadRequestException(`Impossible de passer de « ${ORDER_STATUS_LABELS[current] ?? current} » à « ${ORDER_STATUS_LABELS[target]} ».`);
      }

      const order = await manager.findOne(Vente, { where: { id }, relations: ['produits'] });
      if (!order) throw new NotFoundException('Commande introuvable.');
      const pending = await manager.find(Transaction, { where: { venteId: id, status: TransactionStatus.PENDING } });

      // 1. Stock : on libère quand la commande cesse de bloquer des articles, on réserve quand elle redevient active.
      if (HOLDS_STOCK.has(current) && !HOLDS_STOCK.has(target)) {
        await this.adjustStock(manager, order, +1);
      } else if (!HOLDS_STOCK.has(current) && HOLDS_STOCK.has(target)) {
        await this.adjustStock(manager, order, -1);
      }

      // 2. Paiements FedaPay encore ouverts : on les clôt pour qu'un webhook tardif ne réécrive pas la décision
      //    de l'admin ni ne touche une seconde fois au stock.
      if (pending.length && target !== 'en_attente') {
        await manager.update(
          Transaction,
          pending.map((transaction) => transaction.id),
          { status: target === 'echouee' ? TransactionStatus.FAILED : TransactionStatus.SUCCESS, stockReserved: false },
        );
      }

      await manager.update(Vente, id, { statut: target });
      return { ...order, statut: target };
    });

    // 3. Paiement confirmé à la main : crée les remises commerçants (montant bloqué jusqu'au QR de remise) et la commission.
    if (target === 'payee') {
      await this.ventes.createPaidRemises(sale.id, sale.produits ?? [], sale.quantites ?? [], sale.prix_unitaires ?? undefined);
    }

    return { id: sale.id, reference: sale.reference, statut: target, allowedTransitions: this.allowedTransitions(target) };
  }

  private async adjustStock(manager: EntityManager, order: Vente, direction: 1 | -1) {
    const products = order.produits ?? [];
    for (let index = 0; index < products.length; index++) {
      const product = products[index];
      const quantity = Math.max(0, Number(order.quantites?.[index] ?? 1));
      if (!quantity) continue;
      const query = manager.createQueryBuilder().update(Produit)
        .set({ stock: () => `stock ${direction > 0 ? '+' : '-'} ${quantity}` })
        .where('id = :id', { id: product.id });
      if (direction < 0) query.andWhere('stock >= :quantity', { quantity });
      const result = await query.execute();
      if (direction < 0 && !result.affected) {
        throw new BadRequestException(`Stock insuffisant pour « ${product.nom} » : impossible de réactiver cette commande.`);
      }
    }
  }
}
