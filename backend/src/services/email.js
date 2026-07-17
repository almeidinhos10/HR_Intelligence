import nodemailer from "nodemailer";

export async function sendSetupEmail({ to, name, token }) {
  const setupUrl = `http://localhost:5173?token=${token}`;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: "Bem-vindo ao HR Intelligence — Defina a sua password",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="color: #0f62fe; margin-bottom: 8px;">HR Intelligence</h2>
        <p>Olá, <strong>${name}</strong>!</p>
        <p>A sua conta foi criada com sucesso. Clique no botão abaixo para definir a sua password e ativar o acesso à plataforma.</p>
        <a href="${setupUrl}" style="display:inline-block;margin:24px 0;padding:12px 24px;background:#0f62fe;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">
          Definir password
        </a>
        <p style="color:#666;font-size:13px;">Este link expira em 72 horas. Se não solicitou este acesso, pode ignorar este email.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
        <p style="color:#999;font-size:12px;">HR Intelligence · Plataforma de Gestão de Recursos Humanos</p>
      </div>
    `
  });
}
