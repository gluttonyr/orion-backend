import { UnauthorizedException } from '@nestjs/common';
import { UtilisateurService } from './utilisateur.service';

describe('UtilisateurService.createUsers', () => {
  const qb = { where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), getOne: jest.fn().mockResolvedValue(null) };
  const repo = {
    createQueryBuilder: jest.fn(() => qb),
    create: jest.fn((value) => ({ ...value })),
    save: jest.fn(async (value) => ({ ...value, id: 77 })),
  };
  const jwt = { signAsync: jest.fn().mockResolvedValue('token') };
  const service = new UtilisateurService(repo as any, {} as any, jwt as any);

  it('ignores a client supplied id (no overwrite of an existing account)', async () => {
    await service.createUsers({
      id: 1, nom: 'A', prenom: 'B', email: 'x@y.tg', password: 'secret123', contact: '90000000', indicatifPays: '+228', image: 'evil.png',
    } as any);
    const saved = repo.save.mock.calls[0][0];
    expect(saved.id).toBeUndefined();
    expect(saved.image).toBeUndefined();
    expect(saved.indicatifPays).toBeUndefined();
    expect(saved.role).toBe('UTILISATEUR');
  });

  it('returns the same error for unknown e-mail and bad password', async () => {
    await expect(service.login('nobody@y.tg', 'whatever')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
