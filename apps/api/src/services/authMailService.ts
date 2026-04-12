import nodemailer from 'nodemailer';
import { MAIL_MODE, SMTP_FROM, SMTP_HOST, SMTP_PASS, SMTP_PORT, SMTP_SECURE, SMTP_USER } from '../env.js';

type MailPreviewResult = {
  mode: 'preview';
  previewUrl: string;
  subject: string;
};

type MailSentResult = {
  mode: 'smtp';
  subject: string;
  accepted: string[];
  rejected: string[];
};

export type MailDeliveryResult = MailPreviewResult | MailSentResult;

const buildPreviewUrl = (path: string) => path.replace(/\\/g, '/');

const mailTransport =
  MAIL_MODE === 'smtp' && SMTP_HOST && SMTP_FROM
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
      })
    : null;

const buildHtml = (params: {
  title: string;
  greeting: string;
  intro: string;
  actionText: string;
  actionUrl: string;
  footer: string;
}) => `
  <div style="font-family:Arial,'PingFang SC','Microsoft YaHei',sans-serif;line-height:1.6;color:#0f172a;">
    <h2 style="margin-bottom:16px;">${params.title}</h2>
    <p>${params.greeting}</p>
    <p>${params.intro}</p>
    <p style="margin:24px 0;">
      <a href="${params.actionUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;">
        ${params.actionText}
      </a>
    </p>
    <p>如果按钮无法点击，请复制这个链接到浏览器打开：</p>
    <p style="word-break:break-all;">${params.actionUrl}</p>
    <p style="margin-top:24px;color:#475569;">${params.footer}</p>
  </div>
`;

const buildText = (params: {
  title: string;
  intro: string;
  actionText: string;
  actionUrl: string;
  footer: string;
}) => `${params.title}

${params.intro}

${params.actionText}: ${params.actionUrl}

${params.footer}`;

const sendMail = async (params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  previewUrl: string;
}): Promise<MailDeliveryResult> => {
  if (!mailTransport || MAIL_MODE !== 'smtp') {
    console.log(`[mail-preview] ${params.to}: ${params.previewUrl}`);
    return {
      mode: 'preview',
      previewUrl: buildPreviewUrl(params.previewUrl),
      subject: params.subject
    };
  }

  const info = await mailTransport.sendMail({
    from: SMTP_FROM,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text
  });

  return {
    mode: 'smtp',
    subject: params.subject,
    accepted: info.accepted.map(String),
    rejected: info.rejected.map(String)
  };
};

export const sendVerificationEmail = async (params: {
  email: string;
  username: string;
  verificationUrl: string;
}): Promise<MailDeliveryResult> => {
  const subject = '验证你的学生账号';

  return sendMail({
    to: params.email,
    subject,
    previewUrl: params.verificationUrl,
    html: buildHtml({
      title: '学生账号邮箱验证',
      greeting: `你好，${params.username}：`,
      intro: '请点击下面的按钮完成学生账号邮箱验证。验证完成后，才可以登录并继续使用系统。',
      actionText: '立即验证邮箱',
      actionUrl: params.verificationUrl,
      footer: '如果这不是你本人发起的注册，请忽略这封邮件。'
    }),
    text: buildText({
      title: '学生账号邮箱验证',
      intro: '请点击下面的链接完成邮箱验证。验证完成后，才可以登录系统。',
      actionText: '验证链接',
      actionUrl: params.verificationUrl,
      footer: '如果这不是你本人发起的注册，请忽略这封邮件。'
    })
  });
};

export const sendPasswordResetEmail = async (params: {
  email: string;
  username: string;
  resetUrl: string;
}): Promise<MailDeliveryResult> => {
  const subject = '重置学生账号密码';

  return sendMail({
    to: params.email,
    subject,
    previewUrl: params.resetUrl,
    html: buildHtml({
      title: '学生账号密码重置',
      greeting: `你好，${params.username}：`,
      intro: `系统收到了一次密码重置请求。你的用户名是 ${params.username}，请点击下面的按钮设置新密码。`,
      actionText: '重置密码',
      actionUrl: params.resetUrl,
      footer: '如果这不是你本人操作，请忽略这封邮件，原密码会继续有效。'
    }),
    text: buildText({
      title: '学生账号密码重置',
      intro: `你的用户名是 ${params.username}。请点击下面的链接设置新密码。`,
      actionText: '重置链接',
      actionUrl: params.resetUrl,
      footer: '如果这不是你本人操作，请忽略这封邮件。'
    })
  });
};
