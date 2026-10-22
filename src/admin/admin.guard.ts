import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string } }>();
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Authentification requise.');
    let claims: { role?: string };
    try { claims = await this.jwt.verifyAsync(token); }
    catch { throw new UnauthorizedException('Session invalide ou expirée.'); }
    if (claims.role !== 'ADMIN') throw new ForbiddenException('Accès réservé à l’administration.');
    return true;
  }
}
