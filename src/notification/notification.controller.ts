import { Controller, Get, Headers, Param, ParseIntPipe, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notifications: NotificationService, private readonly jwt: JwtService) {}

  @Get()
  async list(@Headers('authorization') authorization?: string) {
    return this.notifications.listForUser(await this.userId(authorization));
  }

  @Patch(':id/read')
  async markRead(@Param('id', ParseIntPipe) id: number, @Headers('authorization') authorization?: string) {
    return this.notifications.markRead(await this.userId(authorization), id);
  }

  @Post('read-all')
  async markAllRead(@Headers('authorization') authorization?: string) {
    return this.notifications.markAllRead(await this.userId(authorization));
  }

  private async userId(authorization?: string): Promise<number> {
    const token = authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Authentification requise.');
    try {
      const payload = await this.jwt.verifyAsync<{ sub?: number }>(token);
      const userId = Number(payload.sub);
      if (!Number.isSafeInteger(userId) || userId <= 0) throw new Error('Invalid user');
      return userId;
    } catch {
      throw new UnauthorizedException('Session invalide ou expirée.');
    }
  }
}
