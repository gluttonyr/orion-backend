import { BadRequestException, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PasswordReset } from './password-reset.model';
import { UtilisateurRepository } from './utilisateur.repository';
import { MailService, passwordChangedEmail, passwordResetEmail } from '../mail/mail.service';

export const RESET_CODE_TTL_MINUTES = 15;
export const RESET_TOKEN_TTL_MINUTES = 15;
export const RESET_MAX_ATTEMPTS = 5;
export const RESET_RESEND_COOLDOWN_SECONDS = 60;
export const RESET_MAX_REQUESTS_PER_HOUR = 5;

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const sameHash = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const GENERIC_MESSAGE = 'Si un compte correspond à cette adresse, un code de vérification vient d’être envoyé.';
const INVALID_CODE = 'Code invalide ou expiré. Vérifiez le code reçu ou demandez-en un nouveau.';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    @InjectRepository(PasswordReset) private readonly resets: Repository<PasswordReset>,
    private readonly users: UtilisateurRepository,
    private readonly mail: MailService,
  ) {}

  private normalizeEmail(email: unknown): string {
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      throw new BadRequestException('Saisissez une adresse e-mail valide.');
    }
    return email.trim().toLowerCase();
  }

  private findUser(email: string) {
    return this.users.createQueryBuilder('user').where('LOWER(TRIM(user.email)) = :email', { email }).getOne();
  }

  private latestActive(utilisateurId: number) {
    return this.resets.findOne({
      where: { utilisateurId, usedAt: IsNull(), expiresAt: MoreThan(new Date()) },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Étape 1 : envoie un code à 6 chiffres. La réponse est identique que le compte existe ou non
   * (pas d'énumération des adresses), mais les limites d'envoi s'appliquent par compte.
   */
  async requestCode(rawEmail: unknown) {
    const email = this.normalizeEmail(rawEmail);
    const response = { message: GENERIC_MESSAGE, expiresInMinutes: RESET_CODE_TTL_MINUTES, resendInSeconds: RESET_RESEND_COOLDOWN_SECONDS };
    const user = await this.findUser(email);
    if (!user) return response;

    const latest = await this.resets.findOne({ where: { utilisateurId: user.id }, order: { createdAt: 'DESC' } });
    if (latest) {
      const elapsed = (Date.now() - new Date(latest.createdAt).getTime()) / 1000;
      if (elapsed < RESET_RESEND_COOLDOWN_SECONDS) {
        throw new HttpException(`Patientez ${Math.ceil(RESET_RESEND_COOLDOWN_SECONDS - elapsed)} secondes avant de demander un nouveau code.`, HttpStatus.TOO_MANY_REQUESTS);
      }
    }
    const lastHour = await this.resets.count({ where: { utilisateurId: user.id, createdAt: MoreThan(new Date(Date.now() - 3600_000)) } });
    if (lastHour >= RESET_MAX_REQUESTS_PER_HOUR) {
      throw new HttpException('Trop de demandes. Réessayez dans une heure ou contactez le support.', HttpStatus.TOO_MANY_REQUESTS);
    }

    // Un seul code actif à la fois : les précédents sont invalidés.
    await this.resets.update({ utilisateurId: user.id, usedAt: IsNull() }, { usedAt: new Date() });
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const reset = await this.resets.save(this.resets.create({
      utilisateurId: user.id,
      codeHash: sha256(`${user.id}:${code}`),
      expiresAt: new Date(Date.now() + RESET_CODE_TTL_MINUTES * 60_000),
      attempts: 0,
      resetTokenHash: null,
      resetTokenExpiresAt: null,
      usedAt: null,
    }));
    try {
      await this.mail.send({ to: user.email, ...passwordResetEmail(user.prenom, code, RESET_CODE_TTL_MINUTES) });
    } catch (error) {
      // Le code n'a pas été reçu : on le désactive pour ne pas bloquer un nouvel essai par le délai d'attente.
      await this.resets.delete(reset.id);
      throw error;
    }
    this.logger.log(`Code de réinitialisation envoyé pour l'utilisateur ${user.id}.`);
    return response;
  }

  /** Étape 2 : vérifie le code et remet un jeton à usage unique pour choisir le nouveau mot de passe. */
  async verifyCode(rawEmail: unknown, rawCode: unknown) {
    const email = this.normalizeEmail(rawEmail);
    const code = typeof rawCode === 'string' ? rawCode.replace(/\s/g, '') : '';
    if (!/^\d{6}$/.test(code)) throw new BadRequestException('Le code contient 6 chiffres.');

    const user = await this.findUser(email);
    const reset = user ? await this.latestActive(user.id) : null;
    if (!user || !reset) throw new BadRequestException(INVALID_CODE);
    if (reset.attempts >= RESET_MAX_ATTEMPTS) {
      throw new BadRequestException('Trop de tentatives. Demandez un nouveau code.');
    }

    if (!sameHash(reset.codeHash, sha256(`${user.id}:${code}`))) {
      reset.attempts += 1;
      await this.resets.save(reset);
      const remaining = RESET_MAX_ATTEMPTS - reset.attempts;
      throw new BadRequestException(remaining > 0
        ? `Code incorrect. Il vous reste ${remaining} tentative${remaining > 1 ? 's' : ''}.`
        : 'Trop de tentatives. Demandez un nouveau code.');
    }

    const resetToken = randomBytes(32).toString('hex');
    reset.resetTokenHash = sha256(resetToken);
    reset.resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000);
    await this.resets.save(reset);
    return { resetToken, expiresInMinutes: RESET_TOKEN_TTL_MINUTES };
  }

  /** Étape 3 : enregistre le nouveau mot de passe et clôt la demande. */
  async resetPassword(rawEmail: unknown, rawToken: unknown, rawPassword: unknown) {
    const email = this.normalizeEmail(rawEmail);
    const token = typeof rawToken === 'string' ? rawToken : '';
    const password = typeof rawPassword === 'string' ? rawPassword : '';
    if (password.length < 8) throw new BadRequestException('Le mot de passe doit contenir au moins 8 caractères.');
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      throw new BadRequestException('Le mot de passe doit contenir au moins une lettre et un chiffre.');
    }
    if (password.length > 128) throw new BadRequestException('Le mot de passe est trop long.');

    const user = await this.findUser(email);
    const reset = user ? await this.latestActive(user.id) : null;
    const expired = 'Votre session de réinitialisation a expiré. Recommencez la procédure.';
    if (!user || !reset || !reset.resetTokenHash || !reset.resetTokenExpiresAt || !token) throw new BadRequestException(expired);
    if (new Date(reset.resetTokenExpiresAt).getTime() < Date.now() || !sameHash(reset.resetTokenHash, sha256(token))) {
      throw new BadRequestException(expired);
    }
    if (await bcrypt.compare(password, user.password)) {
      throw new BadRequestException('Choisissez un mot de passe différent de l’ancien.');
    }

    user.password = await bcrypt.hash(password, await bcrypt.genSalt());
    await this.users.save(user);
    reset.usedAt = new Date();
    await this.resets.save(reset);
    // La confirmation est informative : son échec ne doit pas annuler le changement.
    this.mail.send({ to: user.email, ...passwordChangedEmail(user.prenom) }).catch(() => undefined);
    return { message: 'Votre mot de passe a été modifié. Vous pouvez vous connecter.' };
  }
}
