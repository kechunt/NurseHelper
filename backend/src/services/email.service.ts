/**
 * Servicio de email
 * Envía emails para notificaciones y eventos importantes
 */

import { logger } from '../utils/logger';
import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface NotificationEmailData {
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  actionUrl?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  /**
   * Inicializa el transporter de nodemailer
   */
  /** true si hay credenciales SMTP y se pueden enviar correos reales */
  isSmtpConfigured(): boolean {
    return this.transporter !== null;
  }

  private initializeTransporter(): void {
    // Configuración desde variables de entorno
    const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
    const emailPort = parseInt(process.env.EMAIL_PORT || '587', 10);
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;
    const emailFrom = process.env.EMAIL_FROM || emailUser || 'noreply@nursehelper.com';

    // Si no hay configuración de email, usar modo desarrollo (solo loggear)
    if (!emailUser || !emailPassword) {
      logger.warn('⚠️ Email no configurado. Los emails se loggearán pero no se enviarán.');
      logger.warn('💡 Configura EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD en .env');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: emailHost,
        port: emailPort,
        secure: emailPort === 465, // true para 465, false para otros puertos
        auth: {
          user: emailUser,
          pass: emailPassword,
        },
      });

      logger.info('✅ Servicio de email configurado', {
        host: emailHost,
        port: emailPort,
        from: emailFrom,
      });
    } catch (error) {
      logger.error('❌ Error configurando servicio de email:', error);
    }
  }

  /**
   * Enviar email genérico
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    const emailFrom = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@nursehelper.com';

    // Si no hay transporter configurado, solo loggear (modo desarrollo)
    if (!this.transporter) {
      logger.warn(
        '📧 Correo NO enviado: falta configuración SMTP (EMAIL_USER y EMAIL_PASSWORD en .env). Destinatario:',
        options.to,
        '| Asunto:',
        options.subject
      );
      logger.info('📧 Vista previa (no enviada):', {
        text: options.text || '(HTML)',
        htmlPreview:
          options.html.length > 220 ? `${options.html.substring(0, 220)}…` : options.html,
      });
      return;
    }

    try {
      const mailOptions = {
        from: emailFrom,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''),
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info('✅ Email enviado exitosamente', {
        to: options.to,
        subject: options.subject,
        messageId: info.messageId,
      });
    } catch (error) {
      logger.error('❌ Error enviando email:', error);
      throw error;
    }
  }

  /**
   * Enviar email de notificación
   */
  async sendNotificationEmail(to: string, data: NotificationEmailData): Promise<void> {
    const priorityColors = {
      low: '#6b7280',
      normal: '#3b82f6',
      high: '#f59e0b',
      urgent: '#ef4444',
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${priorityColors[data.priority]}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background: ${priorityColors[data.priority]}; color: white; text-decoration: none; border-radius: 4px; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>${data.title}</h2>
          </div>
          <div class="content">
            <p>${data.message}</p>
            ${data.actionUrl ? `<a href="${data.actionUrl}" class="button">Ver detalles</a>` : ''}
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to,
      subject: `[${data.priority.toUpperCase()}] ${data.title}`,
      html,
      text: `${data.title}\n\n${data.message}${data.actionUrl ? `\n\nVer detalles: ${data.actionUrl}` : ''}`,
    });
  }

  /**
   * Enviar email de reporte
   */
  async sendReportEmail(to: string, subject: string, reportHtml: string, attachments?: Array<{ filename: string; content: Buffer }>): Promise<void> {
    await this.sendEmail({
      to,
      subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 800px; margin: 0 auto; padding: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            ${reportHtml}
          </div>
        </body>
        </html>
      `,
    });
  }

  /**
   * Enviar código de verificación por email
   */
  async sendVerificationCode(to: string, code: string, firstName: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .card { background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #2563eb; margin: 0; }
          .code-container { background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }
          .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1f2937; font-family: 'Courier New', monospace; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <h1>🏥 NurseHelper</h1>
              <h2>Verificación de Correo Electrónico</h2>
            </div>
            <p>Hola <strong>${firstName}</strong>,</p>
            <p>Gracias por registrarte en NurseHelper. Para completar tu registro, por favor verifica tu correo electrónico usando el siguiente código:</p>
            
            <div class="code-container">
              <div class="code">${code}</div>
            </div>

            <div class="warning">
              <strong>⚠️ Importante:</strong> Este código expirará en 15 minutos. Si no solicitaste este código, puedes ignorar este email.
            </div>

            <p>Si no solicitaste este código, puedes ignorar este mensaje de forma segura.</p>

            <div class="footer">
              <p>Este es un email automático, por favor no respondas.</p>
              <p>&copy; ${new Date().getFullYear()} NurseHelper. Todos los derechos reservados.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to,
      subject: 'Verifica tu correo electrónico - NurseHelper',
      html,
      text: `Hola ${firstName},\n\nTu código de verificación es: ${code}\n\nEste código expirará en 15 minutos.\n\nSi no solicitaste este código, puedes ignorar este mensaje.`,
    });
  }
}

export const emailService = new EmailService();
