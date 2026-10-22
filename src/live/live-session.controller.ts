import { Body, Controller, Get, Headers, Param, ParseIntPipe, Post } from '@nestjs/common';
import { LiveSessionService, type StartLiveSessionDto } from './live-session.service';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';

@Controller('live/sessions')
export class LiveSessionController {
  constructor(private readonly liveService: LiveSessionService) {}

  @Post('start')
  @Roles('COMMERCANT')
  start(
    @Headers('authorization') authorization: string,
    @Body() body: StartLiveSessionDto,
  ) {
    return this.liveService.start(authorization, body);
  }

  @Post(':id/finish')
  finish(
    @Headers('authorization') authorization: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.liveService.finish(authorization, id);
  }

  @Get('current')
  @Public()
  current(@Headers('authorization') authorization: string) {
    return this.liveService.current(authorization);
  }

  @Get('public/creator/:ownerId')
  @Public()
  publicCurrent(@Param('ownerId', ParseIntPipe) ownerId: number) {
    return this.liveService.publicCurrent(ownerId);
  }

  @Get('history')
  @Roles('COMMERCANT')
  history(@Headers('authorization') authorization: string) {
    return this.liveService.history(authorization);
  }

  @Get(':id/results')
  @Roles('COMMERCANT')
  results(
    @Headers('authorization') authorization: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.liveService.results(authorization, id);
  }

  @Post(':id/products/:productId/visit')
  @Public()
  visit(
    @Param('id', ParseIntPipe) id: number,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.liveService.recordVisit(id, productId);
  }
}
