import { AdminService } from './admin.service';

describe('AdminService order moderation', () => {
  it('returns client and seller details with admin orders', async () => {
    const order = {
      id: 21,
      reference: 'REF-21',
      utilisateurId: 5,
      utilisateur: { id: 5, nom: 'Client', prenom: 'Camille', email: 'client@example.com', password: 'must-not-leak' },
      produits: [{ id: 8, nom: 'Produit', proprietaireId: 9 }],
      clientPrenom: 'Camille',
      clientNom: 'Client',
      clientEmail: 'client@example.com',
      clientTelephone: '+22501020304',
      adresseLivraison: 'https://maps.google.com/?q=Abidjan',
    };
    const query = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([order]),
    };
    const usersRepo = {
      find: jest.fn().mockResolvedValue([{ id: 9, nom: 'Marchand', prenom: 'Mina', email: 'seller@example.com', contact: '+22505060708' }]),
    };
    const salesRepo = { createQueryBuilder: jest.fn().mockReturnValue(query) };
    const service = new AdminService({} as any, usersRepo as any, salesRepo as any, {} as any, {} as any, {} as any, {} as any);

    const [result] = await service.getOrders();

    expect(result.utilisateur).toEqual({ id: 5, nom: 'Client', prenom: 'Camille', email: 'client@example.com', contact: undefined });
    expect(result.vendeurs).toEqual([{ id: 9, nom: 'Marchand', prenom: 'Mina', email: 'seller@example.com', contact: '+22505060708' }]);
    expect(result.adresseLivraison).toBe('https://maps.google.com/?q=Abidjan');
    expect(result.utilisateur).not.toHaveProperty('password');
  });
});
