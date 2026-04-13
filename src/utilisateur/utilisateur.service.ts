import { Injectable } from "@nestjs/common";
import { Utilisateur } from "./utilisateur.model";
import * as bcrypt from 'bcrypt';
import { UtilisateurRepository } from "./utilisateur.repository";
import { UploadService } from "./upload.service";


@Injectable()
export class UtilisateurService {

  constructor(
    private readonly repo: UtilisateurRepository,
    private readonly uploadService: UploadService
  ) {}

  // CREATE USER
  async createUsers(user: Utilisateur) {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(user.password, salt);

    user.password = hashedPassword;

    return this.repo.save(user);
  }

  // LOGIN
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

  // FIND ALL
  async findAll() {
    return this.repo.find();
  }

  // FIND ONE
  async findOne(id: number) {
    const user = await this.repo.findOne({ where: { id } });

    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    return user;
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