import { Body, Controller, Post } from "@nestjs/common";
import { UtilisateurService } from "./utilisateur.service";

@Controller('utilisateur')
export class UtilisateurController {
  constructor(private readonly userService: UtilisateurService) {}

//  REGISTER
  @Post('register')
  async register(@Body() body: any) {
    return this.userService.createUsers(body);
  }

  //  LOGIN
  @Post('login')
  async login(@Body() body: any) {
    return this.userService.login(body.email, body.password);
  }
}


