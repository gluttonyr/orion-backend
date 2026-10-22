import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './notification.model';
import type { Vente } from '../vente/vente.model';

@Injectable()
export class NotificationService {
  constructor(@InjectRepository(Notification) private readonly notifications: Repository<Notification>) {}

  async listForUser(userId: number) {
    const items = await this.notifications.find({ where: { userId }, order: { createdAt: 'DESC' }, take: 40 });
    return { items, unreadCount: items.reduce((count, item) => count + (item.readAt ? 0 : 1), 0) };
  }

  async markRead(userId: number, id: number) {
    await this.notifications.update({ id, userId }, { readAt: new Date() });
    return this.listForUser(userId);
  }

  async markAllRead(userId: number) {
    await this.notifications.createQueryBuilder()
      .update(Notification)
      .set({ readAt: new Date() })
      .where('userId = :userId AND readAt IS NULL', { userId })
      .execute();
    return this.listForUser(userId);
  }

  async notifyOrderPaid(sale: Vente) {
    if (sale.utilisateurId) await this.insertOnce({
      userId: sale.utilisateurId,
      eventKey: `sale-${sale.id}-paid`,
      type: 'order_paid',
      title: 'Commande confirmée',
      message: `Votre commande ${sale.reference || `#${sale.id}`} est payée.`,
      referenceId: sale.id,
    });
    const sellers = new Map<number, string[]>();
    for (const product of sale.produits ?? []) {
      if (!product.proprietaireId) continue;
      const names = sellers.get(product.proprietaireId) ?? [];
      names.push(product.nom);
      sellers.set(product.proprietaireId, names);
    }
    for (const [userId, names] of sellers) await this.insertOnce({
      userId,
      eventKey: `sale-${sale.id}-paid`,
      type: 'order_paid',
      title: 'Nouvelle commande payée',
      message: `Commande ${sale.reference || `#${sale.id}`} : ${names.join(', ')}.`,
      referenceId: sale.id,
    });
  }

  async notifyRefund(sale: Vente) {
    const recipients = new Set<number>();
    if (sale.utilisateurId) recipients.add(sale.utilisateurId);
    for (const product of sale.produits ?? []) if (product.proprietaireId) recipients.add(product.proprietaireId);
    for (const userId of recipients) await this.insertOnce({
      userId,
      eventKey: `sale-${sale.id}-refunded`,
      type: 'order_refunded',
      title: 'Commande remboursée',
      message: `La commande ${sale.reference || `#${sale.id}`} a été remboursée.`,
      referenceId: sale.id,
    });
  }

  async notifyHandoverConfirmed(saleId: number, customerId: number, merchantId: number, amount: number) {
    const message = `La remise de la commande #${saleId} est confirmée (${Number(amount).toLocaleString('fr-FR')} XOF).`;
    for (const userId of new Set([customerId, merchantId])) await this.insertOnce({
      userId,
      eventKey: `sale-${saleId}-handover-${merchantId}`,
      type: 'handover_confirmed',
      title: 'Remise de commande confirmée',
      message,
      referenceId: saleId,
    });
  }

  async notifyMissionApplication(merchantId: number, missionId: number, candidateId: number, missionTitle: string) {
    await this.insertOnce({
      userId: merchantId,
      eventKey: `mission-${missionId}-candidate-${candidateId}-applied`,
      type: 'mission_application',
      title: 'Nouvelle candidature',
      message: `Une nouvelle candidature a été reçue pour « ${missionTitle} ».`,
      referenceId: missionId,
    });
  }

  async notifyMissionApplicationStatus(candidateId: number, missionId: number, missionTitle: string, accepted: boolean) {
    await this.insertOnce({
      userId: candidateId,
      eventKey: `mission-${missionId}-application-${accepted ? 'accepted' : 'refused'}-${Date.now()}`,
      type: accepted ? 'mission_application_accepted' : 'mission_application_refused',
      title: accepted ? 'Candidature acceptée' : 'Candidature refusée',
      message: accepted
        ? `Votre candidature pour « ${missionTitle} » a été acceptée. Vous pouvez échanger avec le commerçant dans vos discussions.`
        : `Votre candidature pour « ${missionTitle} » a été refusée.`,
      referenceId: missionId,
    });
  }

  private async insertOnce(data: Pick<Notification, 'userId' | 'eventKey' | 'type' | 'title' | 'message' | 'referenceId'>) {
    await this.notifications.createQueryBuilder()
      .insert()
      .into(Notification)
      .values({ ...data, readAt: null })
      .orIgnore()
      .execute();
  }
}
