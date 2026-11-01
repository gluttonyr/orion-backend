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

describe('BoutiqueService.reportStore', () => {
  it('accepts a report without a reason', async () => {
    const boutiqueRepository = { findBoutiqueById: jest.fn().mockResolvedValue({ id: 12, active: true }) };
    const signalements = {
      create: jest.fn((report) => report),
      save: jest.fn().mockImplementation(async (report) => ({ id: 24, ...report })),
    };
    const service = new BoutiqueService(
      boutiqueRepository as any,
      { verifyAsync: jest.fn().mockResolvedValue({ sub: 7 }) } as any,
      {} as any,
      {} as any,
      signalements as any,
    );

    const result = await service.reportStore(12, '', 'valid-token');

    expect(result).toMatchObject({ ok: true, boutiqueId: 12, motif: 'Aucun détail fourni', reported: true });
    expect(signalements.create).toHaveBeenCalledWith(expect.objectContaining({
      boutiqueId: 12,
      produitId: null,
      utilisateurId: 7,
      motif: 'Aucun détail fourni',
    }));
  });
});