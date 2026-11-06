import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

type MailMessage = { to: string; subject: string; text: string; html: string };

/**
 * Envoi d'e-mails transactionnels via SMTP (variables SMTP_* dans .env).
 * Sans configuration SMTP hors production, le message est écrit dans les logs pour pouvoir tester en local.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  private get isConfigured() {
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  }

  private getTransporter(): Transporter {
    if (!this.transporter) {
      const port = Number(process.env.SMTP_PORT || 587);
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
    }
    return this.transporter;
  }

  async send(message: MailMessage): Promise<void> {
    if (!this.isConfigured) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.error('SMTP non configuré : impossible d’envoyer un e-mail en production.');
        throw new ServiceUnavailableException('L’envoi d’e-mails est momentanément indisponible. Réessayez plus tard.');
      }
      this.logger.warn(`[DEV] SMTP non configuré — e-mail non envoyé à ${message.to} : « ${message.subject} »\n${message.text}`);
      return;
    }
    try {
      await this.getTransporter().sendMail({
        from: process.env.MAIL_FROM || `Orion <${process.env.SMTP_USER}>`,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
    } catch (error) {
      this.logger.error(`Échec d’envoi d’e-mail à ${message.to}: ${error instanceof Error ? error.message : String(error)}`);
      throw new ServiceUnavailableException('L’e-mail n’a pas pu être envoyé. Réessayez dans quelques instants.');
    }
  }
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

/** Gabarit HTML aux couleurs d'Orion (bordeaux #7f1033, fond crème). */
export function passwordResetEmail(firstName: string, code: string, minutes: number) {
  const name = escapeHtml(firstName || 'membre Orion');
  const logoUrl = process.env.APP_BASE_URL ? `${process.env.APP_BASE_URL.replace(/\/$/, '')}/orion.jpeg` : '';
  const digits = code.split('').map((digit) => `<td style="width:44px;height:54px;border:1px solid #e2d9d3;border-radius:10px;background:#fffdfa;font:700 26px Georgia,serif;color:#7f1033;text-align:center;">${digit}</td>`).join('<td style="width:8px"></td>');
  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#f7f5f1;font-family:Arial,Helvetica,sans-serif;color:#4b4140;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f1;padding:32px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #eee6df;">
<tr><td style="background:#7f1033;padding:26px 32px;">${logoUrl ? `<img src="${logoUrl}" width="44" height="44" alt="Orion" style="border-radius:10px;vertical-align:middle;">` : ''}<span style="vertical-align:middle;margin-left:12px;color:#fff5e8;font:600 20px Georgia,serif;letter-spacing:4px;">ORION</span></td></tr>
<tr><td style="padding:32px;">
<p style="margin:0 0 6px;color:#9d948d;font-size:11px;font-weight:700;letter-spacing:1.5px;">RÉINITIALISATION DU MOT DE PASSE</p>
<h1 style="margin:0 0 16px;color:#251f21;font:500 26px Georgia,serif;">Bonjour ${name},</h1>
<p style="margin:0 0 22px;font-size:14px;line-height:1.6;">Vous avez demandé à réinitialiser le mot de passe de votre compte Orion. Saisissez ce code dans la page ouverte sur votre écran :</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 22px;"><tr>${digits}</tr></table>
<p style="margin:0 0 8px;font-size:13px;line-height:1.6;">Ce code est valable <strong>${minutes} minutes</strong> et ne peut être utilisé qu’une seule fois.</p>
<p style="margin:0;font-size:13px;line-height:1.6;color:#9d948d;">Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail : votre mot de passe actuel reste inchangé. Ne communiquez jamais ce code, l’équipe Orion ne vous le demandera pas.</p>
</td></tr>
<tr><td style="padding:18px 32px;border-top:1px solid #eee6df;color:#b0a69f;font-size:11px;">© ${new Date().getFullYear()} Orion · Développez votre commerce. Saisissez les opportunités.</td></tr>
</table></td></tr></table></body></html>`;
  const text = `Bonjour ${firstName || 'membre Orion'},\n\nVotre code de réinitialisation Orion : ${code}\nIl est valable ${minutes} minutes et ne peut être utilisé qu'une seule fois.\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.`;
  return { subject: `${code} est votre code Orion`, html, text };
}

export function passwordChangedEmail(firstName: string) {
  const name = escapeHtml(firstName || 'membre Orion');
  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#f7f5f1;font-family:Arial,Helvetica,sans-serif;color:#4b4140;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:16px;border:1px solid #eee6df;">
<tr><td style="background:#7f1033;padding:22px 32px;color:#fff5e8;font:600 20px Georgia,serif;letter-spacing:4px;">ORION</td></tr>
<tr><td style="padding:32px;"><h1 style="margin:0 0 14px;color:#251f21;font:500 24px Georgia,serif;">Mot de passe modifié</h1>
<p style="margin:0 0 12px;font-size:14px;line-height:1.6;">Bonjour ${name}, le mot de passe de votre compte Orion vient d’être modifié.</p>
<p style="margin:0;font-size:13px;line-height:1.6;color:#9d948d;">Si vous n’êtes pas à l’origine de ce changement, contactez immédiatement le support : orionmarket9@gmail.com.</p></td></tr>
</table></td></tr></table></body></html>`;
  return { subject: 'Votre mot de passe Orion a été modifié', html, text: `Bonjour ${firstName || 'membre Orion'}, le mot de passe de votre compte Orion vient d'être modifié. Si ce n'est pas vous, contactez orionmarket9@gmail.com.` };
}
