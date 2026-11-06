import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProduitService } from './produit.service';

describe('ProduitService inactive store visibility', () => {
  it('excludes products from inactive stores from the public catalogue', async () => {
    const products = [{ id: 2, proprietaireId: 8, statut: 'Disponible' }];
    const productRepository = {
      find: jest.fn().mockResolvedValue(products),
      findOne: jest.fn().mockResolvedValue(products[0]),
    };
    const storeRepository = {
      find: jest.fn().mockResolvedValue([{ proprietaireId: 8 }]),
      findOne: jest.fn().mockResolvedValue({ id: 4, nom: 'Boutique', proprietaireId: 8, active: false }),
    };
    const service = new ProduitService(
      productRepository as any,
      {} as any,
      {} as any,
      {} as any,
      storeRepository as any,
      {} as any,
      {} as any,
    );

    await expect(service.findAll()).resolves.toEqual([]);
    await expect(service.findPublishedOne(2)).rejects.toBeInstanceOf(NotFoundException);
    expect(storeRepository.find).toHaveBeenCalledWith({
      where: { proprietaireId: expect.anything(), active: false },
      select: { proprietaireId: true },
    });
  });
});

describe('ProduitService.reportProduct', () => {
  it('stores the product and its boutique while allowing an empty reason', async () => {
    const productRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 2, proprietaireId: 8, statut: 'Disponible' }),
    };
    const storeRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 4, nom: 'Boutique', proprietaireId: 8, active: true }),
    };
    const signalements = {
      create: jest.fn((report) => report),
      save: jest.fn().mockImplementation(async (report) => ({ id: 31, ...report })),
    };
    const service = new ProduitService(
      productRepository as any,
      {} as any,
      {} as any,
      {} as any,
      storeRepository as any,
      signalements as any,
      {} as any,
    );

    const result = await service.reportProduct(2, 9, '');

    expect(result).toMatchObject({ ok: true, boutiqueId: 4, produitId: 2, motif: 'Aucun détail fourni', reportId: 31 });
    expect(signalements.create).toHaveBeenCalledWith({
      boutiqueId: 4,
      produitId: 2,
      utilisateurId: 9,
      motif: 'Aucun détail fourni',
      resolu: false,
    });
  });
});

describe('ProduitService.saveProductReview', () => {
  it('upserts one review per user and returns the refreshed product rating', async () => {
    const productRepository = { findOne: jest.fn().mockResolvedValue({ id: 2, proprietaireId: 8, statut: 'Disponible' }) };
    const storeRepository = { findOne: jest.fn().mockResolvedValue({ id: 4, nom: 'Boutique', proprietaireId: 8, active: true }) };
    const users = { find: jest.fn().mockResolvedValue([{ id: 9, prenom: 'Ada', nom: 'Mensah' }]) };
    const avis = {
      upsert: jest.fn().mockResolvedValue(undefined),
      find: jest.fn().mockResolvedValue([{ id: 18, produitId: 2, utilisateurId: 9, note: 5, commentaire: null, dateCreation: new Date('2026-10-31T12:00:00Z') }]),
    };
    const service = new ProduitService(
      productRepository as any,
      {} as any,
      {} as any,
      users as any,
      storeRepository as any,
      {} as any,
      avis as any,
    );

    const result = await service.saveProductReview(2, 9, 5, '');

    expect(avis.upsert).toHaveBeenCalledWith({ produitId: 2, utilisateurId: 9, note: 5, commentaire: null }, ['produitId', 'utilisateurId']);
    expect(result).toMatchObject({ moyenne: 5, nombre: 1, avis: [{ id: 18, auteur: 'Ada Mensah', commentaire: null }] });
  });

  it('rejects ratings outside the one-to-five range', async () => {
    const productRepository = { findOne: jest.fn().mockResolvedValue({ id: 2, proprietaireId: 8, statut: 'Disponible' }) };
    const storeRepository = { findOne: jest.fn().mockResolvedValue({ id: 4, nom: 'Boutique', proprietaireId: 8, active: true }) };
    const avis = { upsert: jest.fn() };
    const service = new ProduitService(
      productRepository as any,
      {} as any,
      {} as any,
      {} as any,
      storeRepository as any,
      {} as any,
      avis as any,
    );

    await expect(service.saveProductReview(2, 9, 6)).rejects.toBeInstanceOf(BadRequestException);
    expect(avis.upsert).not.toHaveBeenCalled();
  });
});