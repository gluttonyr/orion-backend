import { Body, Controller, Get, Headers, Param, ParseIntPipe, Post } from '@nestjs/common';
import { LiveSessionService, type StartLiveSessionDto } from './live-session.service';

@Controller('live/sessions')
export class LiveSessionController {
  constructor(private readonly liveService: LiveSessionService) {}

  @Post('start')
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
  current(@Headers('authorization') authorization: string) {
    return this.liveService.current(authorization);
  }

  @Get('public/creator/:ownerId')
  publicCurrent(@Param('ownerId', ParseIntPipe) ownerId: number) {
    return this.liveService.publicCurrent(ownerId);
  }

  @Get('history')
  history(@Headers('authorization') authorization: string) {
    return this.liveService.history(authorization);
  }

  @Get(':id/results')
  results(
    @Headers('authorization') authorization: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.liveService.results(authorization, id);
  }

  @Post(':id/products/:productId/visit')
  visit(
    @Param('id', ParseIntPipe) id: number,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.liveService.recordVisit(id, productId);
  }
}
