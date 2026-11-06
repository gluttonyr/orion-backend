import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleInit, UnauthorizedException } from "@nestjs/common";
import { Utilisateur } from "./utilisateur.model";
import * as bcrypt from 'bcrypt';
import { UtilisateurRepository } from "./utilisateur.repository";
import { UploadService } from "./upload.service";
import { JwtService } from "@nestjs/jwt";
import { UserRole } from "./utilisateur.model";

const countryByDialCode: Record<string, string> = {
  '+20': 'Égypte', '+211': 'Soudan du Sud', '+212': 'Maroc', '+213': 'Algérie', '+216': 'Tunisie', '+218': 'Libye',
  '+220': 'Gambie', '+221': 'Sénégal', '+222': 'Mauritanie', '+223': 'Mali', '+224': 'Guinée', '+225': 'Côte d’Ivoire',
  '+226': 'Burkina Faso', '+227': 'Niger', '+228': 'Togo', '+229': 'Bénin', '+230': 'Maurice', '+231': 'Liberia',
  '+232': 'Sierra Leone', '+233': 'Ghana', '+234': 'Nigeria', '+235': 'Tchad', '+236': 'République centrafricaine', '+237': 'Cameroun',
  '+238': 'Cap-Vert', '+239': 'Sao Tomé-et-Principe', '+240': 'Guinée équatoriale', '+241': 'Gabon', '+242': 'République du Congo',
  '+243': 'République démocratique du Congo', '+244': 'Angola', '+245': 'Guinée-Bissau', '+246': 'Territoire britannique de l’océan Indien',
  '+248': 'Seychelles', '+249': 'Soudan', '+250': 'Rwanda', '+251': 'Éthiopie', '+252': 'Somalie', '+253': 'Djibouti',
  '+254': 'Kenya', '+255': 'Tanzanie', '+256': 'Ouganda', '+257': 'Burundi', '+258': 'Mozambique', '+260': 'Zambie',
  '+261': 'Madagascar', '+263': 'Zimbabwe', '+264': 'Namibie', '+265': 'Malawi', '+266': 'Lesotho', '+267': 'Botswana',
  '+268': 'Eswatini', '+269': 'Comores', '+27': 'Afrique du Sud', '+290': 'Sainte-Hélène', '+291': 'Érythrée',
};


@Injectable()
export class UtilisateurService implements OnModuleInit {
  private readonly logger = new Logger(UtilisateurService.name);

  constructor(
    private readonly repo: UtilisateurRepository,
    private readonly uploadService: UploadService,
    private readonly jwt: JwtService) {}

  async onModuleInit(): Promise<void> {
    const existingAdmin = await this.repo.findOne({ where: { role: UserRole.ADMIN } });
    if (existingAdmin) return;

    const email = (process.env.DEFAULT_ADMIN_EMAIL || 'admin@orion.com').trim().toLowerCase();
    const password = process.env.DEFAULT_ADMIN_PASSWORD
      || (process.env.NODE_ENV === 'production' ? '' : 'Admin@123456');
    if (!password || password.length < 12 && process.env.NODE_ENV === 'production') {
      throw new Error('DEFAULT_ADMIN_PASSWORD (12 caractères minimum) doit être défini pour créer l’administrateur initial en production.');
    }
    const passwordHash = await bcrypt.hash(password, await bcrypt.genSalt());

    try {
      await this.repo.save(this.repo.create({
        nom: 'Orion',
        prenom: 'Admin',
        email,
        password: passwordHash,
        role: UserRole.ADMIN,
      }));
      this.logger.warn(`Compte administrateur initial créé : ${email}`);
    } catch (error) {
      if ((error as { code?: string })?.code === '23505') {
        const adminCreatedByAnotherInstance = await this.repo.findOne({ where: { role: UserRole.ADMIN } });
        if (adminCreatedByAnotherInstance) return;
        throw new Error(`Impossible de créer l'administrateur initial : l'adresse ${email} est déjà utilisée.`);
      }
      throw error;
    }
  }

  // CREATE USER
  async createUsers(input: Utilisateur & { indicatifPays?: string }) {
    if (!input || typeof input.email !== 'string' || typeof input.password !== 'string') {
      throw new BadRequestException('L’adresse e-mail et le mot de passe sont obligatoires.');
    }
    if (input.password.length < 8) throw new BadRequestException('Le mot de passe doit contenir au moins 8 caractères.');
    // Liste blanche : on n'accepte jamais id, image ou autres champs internes depuis le client.
    const user = this.repo.create({
      nom: input.nom,
      prenom: input.prenom,
      email: input.email,
      password: input.password,
      date_naissance: input.date_naissance,
      adresse: input.adresse,
      contact: input.contact,
      role: input.role,
      specialite: input.specialite,
      localisation: input.localisation,
    } as Partial<Utilisateur>) as Utilisateur & { indicatifPays?: string };
    user.indicatifPays = input.indicatifPays;
    user.email = user.email.trim().toLowerCase();
    const dialCode = user.indicatifPays?.trim();
    const country = dialCode ? countryByDialCode[dialCode] : undefined;
    if (!dialCode || !country) throw new BadRequestException('Choisissez un indicatif de pays valide.');
    const phone = user.contact?.trim();
    if (!phone) throw new BadRequestException('Le numéro de téléphone est obligatoire.');
    if (phone.startsWith('+') && !phone.startsWith(dialCode)) {
      throw new BadRequestException('Le numéro de téléphone doit correspondre à l’indicatif du pays choisi.');
    }
    user.contact = phone.startsWith(dialCode) ? phone : `${dialCode} ${phone}`;
    user.pays = country;
    const existingUser = await this.repo
      .createQueryBuilder('user')
      .where('LOWER(TRIM(user.email)) = :email', { email: user.email })
      .getOne();
    if (existingUser) throw new ConflictException('Cette adresse e-mail est déjà utilisée.');

    const requestedRole = user.role ?? UserRole.UTILISATEUR;
    if (requestedRole !== UserRole.UTILISATEUR && requestedRole !== UserRole.COMMERCANT) {
      throw new BadRequestException('Le rôle doit être choisi parmi les profils proposés à la création du compte.');
    }
    user.role = requestedRole;
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(user.password, salt);

    user.password = hashedPassword;

    delete user.indicatifPays;
    let savedUser: Utilisateur;
    try {
      savedUser = await this.repo.save(user);
    } catch (error) {
      if ((error as { code?: string })?.code === '23505') {
        throw new ConflictException('Cette adresse e-mail est déjà utilisée.');
      }
      throw error;
    }
    const payload = { sub: savedUser.id, email: savedUser.email, role: savedUser.role };
    const token = await this.jwt.signAsync(payload);
    const { password: _password, ...userWithoutPassword } = savedUser;
    return { access_token: token, user: userWithoutPassword };
  }

  // LOGIN
  async login(email: string, password: string) {
    if (typeof email !== 'string' || typeof password !== 'string') throw new UnauthorizedException('E-mail ou mot de passe incorrect.');
    const user = await this.repo
      .createQueryBuilder('user')
      .where('LOWER(TRIM(user.email)) = :email', { email: email.trim().toLowerCase() })
      .getOne();

    // Vérification user
    if (!user) { throw new UnauthorizedException('E-mail ou mot de passe incorrect.');}

    // Vérification password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) { throw new UnauthorizedException('E-mail ou mot de passe incorrect.');}

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
  async findAll() {
    const users = await this.repo.find();
    return users.map(({ password: _password, ...user }) => user);
  }

  // FIND ONE
  async findOne(id: number) {
    const user = await this.repo.findOne({ where: { id } });

    if (!user) { throw new NotFoundException('Utilisateur non trouvé');}

    return user;
  }

  // find user login
  async findloggedUser(token: string) {
    let userId: number;
    try {
      const decoded = await this.jwt.verifyAsync(token);
      userId = Number(decoded.sub);
    } catch {
      throw new UnauthorizedException('Token invalide ou expiré');
    }
    const user = await this.findOne(userId);
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // UPDATE + IMAGE
  async update(id: number, data: any, file?: Express.Multer.File, token?: string) {
    if (!token) throw new UnauthorizedException('Authentification requise');
    let decoded: { sub: number };
    try {
      decoded = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Token invalide');
    }
    if (Number(decoded.sub) !== id) throw new ForbiddenException('Vous ne pouvez modifier que votre propre profil');

    const user = await this.findOne(id);
    const { role } = data ?? {};
    const editableFields = ['nom', 'prenom', 'email', 'password', 'date_naissance', 'adresse', 'contact', 'specialite', 'localisation', 'pays'] as const;
    const editableData: Record<string, unknown> = {};
    for (const field of editableFields) if (data?.[field] !== undefined) editableData[field] = data[field];
    if (typeof editableData.password === 'string' && editableData.password.length < 8) {
      throw new BadRequestException('Le mot de passe doit contenir au moins 8 caractères.');
    }
    if (typeof editableData.email === 'string') {
      editableData.email = editableData.email.trim().toLowerCase();
      const emailOwner = await this.repo
        .createQueryBuilder('user')
        .where('LOWER(TRIM(user.email)) = :email', { email: editableData.email })
        .andWhere('user.id <> :id', { id })
        .getOne();
      if (emailOwner) throw new ConflictException('Cette adresse e-mail est déjà utilisée.');
    }
    if (role !== undefined && role !== user.role) {
      throw new BadRequestException('Le rôle du compte ne peut pas être modifié après sa création.');
    }

    // Si image envoyée
    if (file) {
      const imagePath = this.uploadService.saveProfileImage(file);
      editableData.image = imagePath;
    }

    // Si mot de passe modifié → rehash
    if (typeof editableData.password === "string" && editableData.password) {
      const salt = await bcrypt.genSalt();
      editableData.password = await bcrypt.hash(editableData.password, salt);
    }

    Object.assign(user, editableData);

    let updatedUser: Utilisateur;
    try {
      updatedUser = await this.repo.save(user);
    } catch (error) {
      if ((error as { code?: string })?.code === '23505') {
        throw new ConflictException('Cette adresse e-mail est dÃ©jÃ  utilisÃ©e.');
      }
      throw error;
    }
    const { password: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  // DELETE
  async remove(id: number) {
    const user = await this.findOne(id);
    return this.repo.remove(user);
  }
}
