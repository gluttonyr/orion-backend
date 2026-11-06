import { BadRequestException, HttpException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PasswordResetService } from './password-reset.service';

/** Dépôt en mémoire suffisant pour les requêtes du service. */
function memoryResets() {
  const rows: any[] = [];
  let nextId = 1;
  const matches = (row: any, where: any = {}) => Object.entries(where).every(([key, condition]: [string, any]) => {
    if (condition && typeof condition === 'object' && '_type' in condition) {
      if (condition._type === 'isNull') return row[key] == null;
      if (condition._type === 'moreThan') return new Date(row[key]).getTime() > new Date(condition._value).getTime();
    }
    return row[key] === condition;
  });
  return {
    rows,
    create: (value: any) => ({ ...value }),
    save: async (value: any) => {
      if (!value.id) { value.id = nextId++; value.createdAt = value.createdAt ?? new Date(); rows.push(value); }
      return value;
    },
    findOne: async ({ where }: any) => [...rows].reverse().find((row) => matches(row, where)) ?? null,
    count: async ({ where }: any) => rows.filter((row) => matches(row, where)).length,
    update: async (where: any, patch: any) => { rows.filter((row) => matches(row, where)).forEach((row) => Object.assign(row, patch)); },
    delete: async (id: number) => { const index = rows.findIndex((row) => row.id === id); if (index >= 0) rows.splice(index, 1); },
  };
}

async function setup() {
  const user = { id: 7, email: 'ama@orion.tg', prenom: 'Ama', password: await bcrypt.hash('ancien123', 4) };
  const qb = { where: jest.fn().mockReturnThis(), getOne: jest.fn() };
  const users = {
    createQueryBuilder: jest.fn(() => qb),
    save: jest.fn(async (value) => value),
  };
  qb.getOne.mockImplementation(async () => (qb.where.mock.calls.at(-1)?.[1]?.email === user.email ? user : null));
  const sent: any[] = [];
  const mail = { send: jest.fn(async (message) => { sent.push(message); }) };
  const resets = memoryResets();
  const service = new PasswordResetService(resets as any, users as any, mail as any);
  const lastCode = () => /(\d{6})/.exec(sent.find((message) => message.subject.includes('code'))?.text ?? '')?.[1] ?? '';
  return { service, user, users, mail, resets, sent, lastCode };
}

describe('PasswordResetService', () => {
  it('does not reveal whether an account exists', async () => {
    const { service, mail } = await setup();
    const response = await service.requestCode('inconnu@orion.tg');
    expect(response.message).toContain('Si un compte correspond');
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('runs the full flow: code → token → new password', async () => {
    const { service, user, users, lastCode, resets } = await setup();
    await service.requestCode('AMA@orion.tg ');
    expect(resets.rows[0].codeHash).not.toContain(lastCode());

    const { resetToken } = await service.verifyCode('ama@orion.tg', lastCode());
    expect(resetToken).toHaveLength(64);

    await service.resetPassword('ama@orion.tg', resetToken, 'nouveau456');
    expect(users.save).toHaveBeenCalled();
    expect(await bcrypt.compare('nouveau456', user.password)).toBe(true);
    // Le jeton ne peut pas être réutilisé.
    await expect(service.resetPassword('ama@orion.tg', resetToken, 'autre7890')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('locks the code after 5 wrong attempts', async () => {
    const { service, lastCode } = await setup();
    await service.requestCode('ama@orion.tg');
    const wrong = lastCode() === '000000' ? '111111' : '000000';
    for (let index = 0; index < 5; index++) {
      await expect(service.verifyCode('ama@orion.tg', wrong)).rejects.toBeInstanceOf(BadRequestException);
    }
    await expect(service.verifyCode('ama@orion.tg', lastCode())).rejects.toThrow('Trop de tentatives');
  });

  it('enforces the resend cooldown', async () => {
    const { service } = await setup();
    await service.requestCode('ama@orion.tg');
    await expect(service.requestCode('ama@orion.tg')).rejects.toBeInstanceOf(HttpException);
  });

  it('rejects weak passwords and an invalid token', async () => {
    const { service } = await setup();
    await expect(service.resetPassword('ama@orion.tg', 'x', 'court')).rejects.toThrow('8 caractères');
    await expect(service.resetPassword('ama@orion.tg', 'x', 'seulementdeslettres')).rejects.toThrow('une lettre et un chiffre');
    await expect(service.resetPassword('ama@orion.tg', 'jeton-faux', 'valide1234')).rejects.toThrow('expiré');
  });
});
