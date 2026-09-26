import nodemailer from "nodemailer";

export function mailConfig() {
  const host = process.env.SMTP_HOST;
  const from = process.env.MAIL_FROM;
  const origin = process.env.APP_ORIGIN;
  if (!host || !from || !origin) throw new Error("MAIL_NOT_CONFIGURED");
  const url = new URL(origin);
  const local =
    ["127.0.0.1", "localhost"].includes(url.hostname) && ["127.0.0.1", "localhost"].includes(host);
  if (url.protocol !== "https:" && !local) throw new Error("MAIL_REQUIRES_HTTPS");
  const port = Number(process.env.SMTP_PORT ?? 587);
  return {
    from,
    origin: url.origin,
    transport: nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: !local && port !== 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
      disableFileAccess: true,
      disableUrlAccess: true,
    }),
  };
}

export async function sendVerification(email: string, token: string, invite: boolean): Promise<void> {
  const { from, origin, transport } = mailConfig();
  const link = `${origin}/verify/?token=${token}`;
  const result = await transport.sendMail({
    from,
    to: email,
    subject: invite ? "Set up your course reviewer account" : "Verify your enrolment prototype account",
    text: `${invite ? "You have been invited to review course permission requests." : "Confirm your email address to finish creating your account."}\n\n${link}\n\nThis link expires in 30 minutes and works once. This is an independent student prototype, not ANU's enrolment service. If you did not request this, ignore this email.`,
  });
  if (!result.accepted?.length) throw new Error("MAIL_NOT_ACCEPTED");
}

export async function sendVerificationTest(email: string, token: string): Promise<void> {
  const { from, origin, transport } = mailConfig();
  const result = await transport.sendMail({
    from, to: email,
    subject: "Test your enrolment prototype verification email",
    text: `You requested a verification email test from your signed-in prototype account. Open the link and confirm receipt:\n\n${origin}/email-test/?token=${token}\n\nThis link expires in 30 minutes and works once. It only records that you received this test; your account, password, sessions and academic data stay unchanged. This is an independent student prototype, not ANU's enrolment service. If you did not request this test, ignore it.`,
  });
  if (!result.accepted?.length) throw new Error("MAIL_NOT_ACCEPTED");
}
