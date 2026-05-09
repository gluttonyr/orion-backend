import { Body, Controller, Post, Get, Param, Put, Delete, UploadedFile, UseInterceptors, Headers } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { UtilisateurService } from "./utilisateur.service";

@Controller('utilisateur')
export class UtilisateurController {
  constructor(private readonly userService: UtilisateurService) {}

  // REGISTER
  @Post('register')
  async register(@Body() body: any) { return this.userService.createUsers(body);}

  // LOGIN
  @Post('login')
  async login(@Body() body: any) { return this.userService.login(body.email, body.password);}

  // GET ALL USERS
  @Get()
  async findAll() { return this.userService.findAll();}

  // GET ONE USER
  @Get(':id')
  async findOne(@Param('id') id: string) { return this.userService.findOne(Number(id));}

  @Get('auth/me')
  async findloggedUser(@Headers('authorization') authorization: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '');
    console.log("Token reçu dans le contrôleur:", token);
    return this.userService.findloggedUser(token);
  }

  // UPDATE USER + IMAGE UPLOAD
  @Put(':id')
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File
  ) { return this.userService.update(Number(id), body, file);}

  // DELETE USER
  @Delete(':id')
  async remove(@Param('id') id: string) { return this.userService.remove(Number(id));}
}