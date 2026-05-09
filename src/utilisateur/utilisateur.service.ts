import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Utilisateur } from "./utilisateur.model";
import * as bcrypt from 'bcrypt';
import { UtilisateurRepository } from "./utilisateur.repository";
import { UploadService } from "./upload.service";
import { JwtService } from "@nestjs/jwt";


@Injectable()
export class UtilisateurService {

  constructor(
    private readonly repo: UtilisateurRepository,
    private readonly uploadService: UploadService,
    private readonly jwt: JwtService) {}

  // CREATE USER
  async createUsers(user: Utilisateur) {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(user.password, salt);

    user.password = hashedPassword;

    return this.repo.save(user);
  }

  // LOGIN
  async login(email: string, password: string) {
    const user = await this.repo.findOne({ where: { email },});

    // Vérification user
    if (!user) { throw new NotFoundException("Utilisateur non trouvé");}

    // Vérification password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) { throw new UnauthorizedException("Mot de passe incorrect");}

    // Payload JWT
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,};

    // Génération token
    const token = await this.jwt.signAsync(payload);

    // Retirer password
    const { password: _, ...userWithoutPassword } = user;

    return {
      access_token: token, 
      user: userWithoutPassword,};
  }

  // FIND ALL
  async findAll() { return this.repo.find();}

  // FIND ONE
  async findOne(id: number) {
    const user = await this.repo.findOne({ where: { id } });

    if (!user) { throw new Error('Utilisateur non trouvé');}

    return user;
  }

  // find user login
  async findloggedUser(token: string) {
    try {
      const decoded = await this.jwt.verifyAsync(token);
      const userId = decoded.sub;
      return this.findOne(userId);
    } catch (error) { throw new UnauthorizedException('Token invalide');}
  }

  // UPDATE + IMAGE
  async update(id: number, data: any, file?: Express.Multer.File) {
    const user = await this.findOne(id);

    // Si image envoyée
    if (file) {
      const imagePath = this.uploadService.saveProfileImage(file);
      data.image = imagePath;
    }

    // Si mot de passe modifié → rehash
    if (data.password) {
      const salt = await bcrypt.genSalt();
      data.password = await bcrypt.hash(data.password, salt);
    }

    Object.assign(user, data);

    return this.repo.save(user);
  }

  // DELETE
  async remove(id: number) {
    const user = await this.findOne(id);
    return this.repo.remove(user);
  }
}