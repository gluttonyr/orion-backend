import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { AppRole } from './roles.decorator';

export type CurrentUserClaims = { id: number; email?: string; role?: AppRole };

/**
 * Injecte l'utilisateur authentifié (posé par JwtAuthGuard dans request.user).
 * Lève 401 si la route n'a pas de session valide.
 */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): CurrentUserClaims => {
  const request = context.switchToHttp().getRequest<{ user?: { sub?: string | number; email?: string; role?: AppRole } }>();
  const id = Number(request.user?.sub);
  if (!Number.isSafeInteger(id) || id <= 0) throw new UnauthorizedException('Session invalide.');
  return { id, email: request.user?.email, role: request.user?.role };
});
