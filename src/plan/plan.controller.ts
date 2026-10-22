import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PlanService } from './plan.service';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';

type SessionClaims = { sub: number; role?: string };

@Controller('plan')
export class PlanController {
  constructor(private readonly planService: PlanService, private readonly jwt: JwtService) {}

  @Get()
  @Public()
  getCatalog() {
    return this.planService.getCatalog();
  }

  @Get('current')
  @Roles('COMMERCANT')
  async getCurrent(@Headers('authorization') authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Connecte-toi pour consulter ton abonnement.');
    let session: SessionClaims;
    try { session = await this.jwt.verifyAsync<SessionClaims>(token); }
    catch { throw new UnauthorizedException('Session invalide ou expirée.'); }
    if (session.role !== 'COMMERCANT' || !Number.isInteger(Number(session.sub))) {
      throw new UnauthorizedException('Un compte commerçant connecté est requis.');
    }
    return this.planService.getCurrentForMerchant(Number(session.sub));
  }
}
