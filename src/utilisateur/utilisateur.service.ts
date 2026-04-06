import { Injectable } from "@nestjs/common";
import { Utilisateur } from "./utilisateur.model";
import * as bcrypt from 'bcrypt';
import { UtilisateurRepository } from "./utilisateur.repository";


@Injectable()
export  class UtilisateurService {
    
constructor(private readonly repo:UtilisateurRepository){}
  async createUsers(user: Utilisateur){

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(user.password, salt);

    user.password = hashedPassword;

    return this.repo.save(user);

  }

  async login(email: string, password: string) {
  const user = await this.repo.findOne({ where: { email } });

  if (!user) {
    throw new Error('Utilisateur non trouvé');
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new Error('Mot de passe incorrect');
  }

  return user;
}
}