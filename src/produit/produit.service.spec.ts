import { NotFoundException } from '@nestjs/common';
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
    );

    await expect(service.findAll()).resolves.toEqual([]);
    await expect(service.findPublishedOne(2)).rejects.toBeInstanceOf(NotFoundException);
    expect(storeRepository.find).toHaveBeenCalledWith({
      where: { proprietaireId: expect.anything(), active: false },
      select: { proprietaireId: true },
    });
  });
});