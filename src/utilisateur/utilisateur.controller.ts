import { Body, Controller, Post, Get, Param, Put, Delete, UploadedFile, UseInterceptors, Headers, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { UtilisateurService } from "./utilisateur.service";
import { JwtService } from "@nestjs/jwt";
import { Public } from "../auth/public.decorator";
import { Roles } from "../auth/roles.decorator";

@Controller('utilisateur')
export class UtilisateurController {
  constructor(private readonly userService: UtilisateurService, private readonly jwt: JwtService) {}

  private async requireAdmin(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Authentification requise.');
    let claims: { role?: string };
    try { claims = await this.jwt.verifyAsync(token); } catch { throw new UnauthorizedException('Session invalide ou expirée.'); }
    if (claims.role !== 'ADMIN') throw new ForbiddenException('Accès réservé à l’administration.');
  }

  // REGISTER
  @Post('register')
  @Public()
  async register(@Body() body: any) { return this.userService.createUsers(body);}

  // LOGIN
  @Post('login')
  @Public()
  async login(@Body() body: any) { return this.userService.login(body.email, body.password);}

  // GET ALL USERS
  @Get()
  @Roles('ADMIN')
  async findAll(@Headers('authorization') authorization: string) { await this.requireAdmin(authorization); return this.userService.findAll();}

  // GET ONE USER
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const { password: _password, ...user } = await this.userService.findOne(Number(id));
    return user;
  }

  @Get('auth/me')
  async findloggedUser(@Headers('authorization') authorization: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '');
    return this.userService.findloggedUser(token);
  }

  // UPDATE USER + IMAGE UPLOAD
  @Put(':id')
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File,
    @Headers('authorization') authorization: string
  ) {
    const token = authorization?.replace(/^Bearer\s+/i, '');
    return this.userService.update(Number(id), body, file, token);
  }

  // DELETE USER
  @Delete(':id')
  @Roles('ADMIN')
  async remove(@Param('id') id: string) { return this.userService.remove(Number(id));}
}
