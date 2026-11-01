import { BoutiqueService } from './boutique.service';

describe('BoutiqueService.remove', () => {
  it('désactive la boutique du commerçant sans la supprimer', async () => {
    const boutiqueRepository = {
      findBoutiqueById: jest.fn().mockResolvedValue({ id: 12, proprietaireId: 7, active: true }),
      updateBoutique: jest.fn().mockResolvedValue({ id: 12, proprietaireId: 7, active: false }),
      deleteBoutique: jest.fn(),
    };
    const jwt = { verifyAsync: jest.fn().mockResolvedValue({ sub: 7, role: 'COMMERCANT' }) };
    const service = new BoutiqueService(
      boutiqueRepository as any,
      jwt as any,
      {} as any,
      {} as any,
      {} as any,
    );

    const result = await service.remove(12, 'valid-token');

    expect(result).toEqual({ id: 12, proprietaireId: 7, active: false });
    expect(boutiqueRepository.updateBoutique).toHaveBeenCalledWith(12, { active: false });
    expect(boutiqueRepository.deleteBoutique).not.toHaveBeenCalled();
  });
});