import { ForbiddenException } from '@nestjs/common';
import { MessageService } from './message.service';

function setup(participant: unknown) {
  const repo = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: 1, createdAt: new Date(), ...value })),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue({ id: 5, discussionId: 3, senderId: 2, contenu: 'x' }),
  };
  const participants = {
    findOne: jest.fn().mockResolvedValue(participant),
    find: jest.fn().mockResolvedValue([]),
  };
  const discussions = { update: jest.fn() };
  return { repo, participants, service: new MessageService(repo as any, participants as any, discussions as any) };
}

describe('MessageService security', () => {
  it('refuses to post in a discussion the user does not belong to', async () => {
    const { service } = setup(null);
    await expect(service.create({ discussionId: 3, contenu: 'hello' }, 9)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('forces the sender to the authenticated user', async () => {
    const { service, repo } = setup({ id: 1 });
    await service.create({ discussionId: 3, contenu: 'hello', senderId: 42 }, 9);
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ senderId: 9, discussionId: 3 }));
  });

  it('only lists messages of the user discussions', async () => {
    const { service, repo } = setup(null);
    await expect(service.findAllForUser(9)).resolves.toEqual([]);
    expect(repo.find).not.toHaveBeenCalled();
  });

  it('refuses to edit or delete someone else message', async () => {
    const { service } = setup({ id: 1 });
    await expect(service.update(5, { contenu: 'hack' }, 9)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.remove(5, 9)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
