import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Boutique } from '../boutique/boutique.model';
import { Produit } from '../produit/produit.model';
import { Utilisateur, UserRole } from '../utilisateur/utilisateur.model';
import { Plan, TypePlan } from './plan.model';
import { PlanRepository } from './plan.repository';

export const STANDARD_PLAN_CATALOG = {
  id: 0,
  titre: 'Standard',
  type: TypePlan.STANDARD,
  prix: 0,
  avantages: 'Toutes les fonctions essentielles pour lancer votre boutique.',
  description: 'Offre de lancement gratuite.',
  nombreBoutiques: 1,
  nombreProduits: 40,
  dureeEnMois: 0,
  active: true,
  renouvelement: false,
};

@Injectable()
export class PlanService {
  constructor(
    private readonly repo: PlanRepository,
    @InjectRepository(Utilisateur) private readonly users: Repository<Utilisateur>,
    @InjectRepository(Boutique) private readonly boutiques: Repository<Boutique>,
    @InjectRepository(Produit) private readonly products: Repository<Produit>,
  ) {}

  getCatalog() {
    return [STANDARD_PLAN_CATALOG];
  }

  async getCurrentForMerchant(merchantId: number) {
    const merchant = await this.users.findOne({ where: { id: merchantId } });
    if (!merchant) throw new NotFoundException('Compte commerçant introuvable.');
    if (merchant.role !== UserRole.COMMERCANT) throw new ForbiddenException('Un compte commerçant est requis.');

    let subscription = await this.repo.findOne({ where: { commercant: { id: merchantId } } });
    if (!subscription) {
      subscription = this.repo.create({
        ...STANDARD_PLAN_CATALOG,
        id: undefined,
        commercant: merchant,
        dateCreation: new Date(),
        dateActivation: new Date(),
        dateExpiration: null,
      });
      try {
        subscription = await this.repo.save(subscription);
      } catch (error) {
        // Concurrent first requests can race on the unique merchant relation.
        const concurrentSubscription = await this.repo.findOne({ where: { commercant: { id: merchantId } } });
        if (!concurrentSubscription) throw error;
        subscription = concurrentSubscription;
      }
    }

    // The launch catalog contains only Standard. Normalize legacy mock plans to the current free offer.
    Object.assign(subscription, {
      titre: STANDARD_PLAN_CATALOG.titre,
      type: TypePlan.STANDARD,
      prix: STANDARD_PLAN_CATALOG.prix,
      avantages: STANDARD_PLAN_CATALOG.avantages,
      description: STANDARD_PLAN_CATALOG.description,
      nombreBoutiques: STANDARD_PLAN_CATALOG.nombreBoutiques,
      nombreProduits: STANDARD_PLAN_CATALOG.nombreProduits,
      dureeEnMois: STANDARD_PLAN_CATALOG.dureeEnMois,
      active: true,
      renouvelement: false,
      dateActivation: subscription.dateActivation ?? new Date(),
      dateExpiration: null,
    });
    subscription = await this.repo.save(subscription);

    const [boutiques, produits] = await Promise.all([
      this.boutiques.count({ where: { proprietaireId: merchantId } }),
      this.products.count({ where: { proprietaireId: merchantId } }),
    ]);
    const { commercant: _merchant, ...publicSubscription } = subscription;
    return { subscription: publicSubscription, usage: { boutiques, produits } };
  }

  async assertCanCreateStore(merchantId: number) {
    const current = await this.getCurrentForMerchant(merchantId);
    if (current.usage.boutiques >= current.subscription.nombreBoutiques) {
      throw new BadRequestException(`L’abonnement ${current.subscription.titre} autorise ${current.subscription.nombreBoutiques} boutique.`);
    }
    return current.subscription;
  }

  async assertCanCreateProduct(merchantId: number) {
    const current = await this.getCurrentForMerchant(merchantId);
    if (current.usage.produits >= current.subscription.nombreProduits) {
      throw new BadRequestException(`La limite de ${current.subscription.nombreProduits} produits de l’abonnement ${current.subscription.titre} est atteinte.`);
    }
    return current.subscription;
  }
}
