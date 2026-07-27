import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

import { getAppBaseUrl, getSmtpConfig } from "@/lib/env";

declare global {
  var __airislensMailerTransporter: Transporter | undefined;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getMailerTransporter() {
  if (!global.__airislensMailerTransporter) {
    const smtp = getSmtpConfig();

    global.__airislensMailerTransporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
    });
  }

  return global.__airislensMailerTransporter;
}

function getVerificationUrl(token: string) {
  const url = new URL("/verify-email", getAppBaseUrl());
  url.searchParams.set("token", token);

  return url.toString();
}

export async function sendVerificationEmail(input: {
  email: string;
  name: string;
  token: string;
}) {
  const smtp = getSmtpConfig();
  const verificationUrl = getVerificationUrl(input.token);
  const safeName = escapeHtml(input.name);
  const safeVerificationUrl = escapeHtml(verificationUrl);

  await getMailerTransporter().sendMail({
    from: smtp.from,
    to: input.email,
    subject: "Verifikasi Email AIRISLENS",
    text: [
      `Halo ${input.name},`,
      "",
      "Terima kasih telah mendaftar di AIRISLENS.",
      "Silakan verifikasi email Anda melalui link berikut:",
      verificationUrl,
      "",
      "Link ini berlaku selama 1 jam.",
      "Jika Anda tidak merasa membuat akun, abaikan email ini.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;color:#111111;line-height:1.6">
        <p>Halo ${safeName},</p>
        <p>Terima kasih telah mendaftar di AIRISLENS.</p>
        <p>Silakan verifikasi email Anda melalui tombol berikut:</p>
        <p>
          <a
            href="${safeVerificationUrl}"
            style="display:inline-block;border-radius:9999px;background:#111111;color:#ffffff;padding:12px 20px;text-decoration:none"
          >
            Verifikasi Email
          </a>
        </p>
        <p>Atau buka link ini secara manual:</p>
        <p><a href="${safeVerificationUrl}">${safeVerificationUrl}</a></p>
        <p>Link ini berlaku selama 1 jam.</p>
        <p>Jika Anda tidak merasa membuat akun, abaikan email ini.</p>
      </div>
    `,
  });
}
