import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly isDev: boolean;

  constructor(private readonly config: ConfigService) {
    this.isDev = config.get<string>('NODE_ENV') === 'development';
    const host = config.get<string>('SMTP_HOST');

    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: config.get<number>('SMTP_PORT', 587),
        secure: config.get<boolean>('SMTP_SECURE', false),
        auth: {
          user: config.get<string>('SMTP_USER'),
          pass: config.get<string>('SMTP_PASS'),
        },
      });
    }
  }

  private buildHtml(resetUrl: string): string {
    return `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #1B3FA0; margin-bottom: 8px;">Recuperar contraseña</h2>
        <p style="color: #475467; margin-bottom: 24px;">
          Recibimos una solicitud para restablecer la contraseña de tu cuenta en Valleflor.
          Este enlace es válido por <strong>1 hora</strong>.
        </p>
        <a href="${resetUrl}"
           style="display: inline-block; background: #1B3FA0; color: #fff; padding: 12px 24px;
                  border-radius: 8px; text-decoration: none; font-weight: 600;">
          Restablecer contraseña
        </a>
        <p style="color: #98A2B3; font-size: 12px; margin-top: 24px;">
          Si no solicitaste este cambio, ignora este correo. Tu contraseña no cambiará.
        </p>
      </div>
    `;
  }

  async sendPasswordReset(to: string, token: string): Promise<void> {
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;
    const html = this.buildHtml(resetUrl);

    const mail = {
      from: `"Valleflor" <${this.config.get('SMTP_FROM', 'no-reply@valleflor.com')}>`,
      to,
      subject: 'Restablecer contraseña — Valleflor',
      html,
    };

    if (this.transporter) {
      await this.transporter.sendMail(mail);
      return;
    }

    if (this.isDev) {
      // Crea cuenta temporal en Ethereal y muestra URL de previsualización
      const testAccount = await nodemailer.createTestAccount();
      const testTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
      const info = await testTransporter.sendMail(mail);
      this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      this.logger.log(`📧  CORREO DE PRUEBA — ${to}`);
      this.logger.log(`🔗  ${nodemailer.getTestMessageUrl(info)}`);
      this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    }
  }
}
