const nodemailer = require('nodemailer');

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.qq.com',
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendReport(to, stock, attachmentPath) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('邮件服务未配置：请在 .env 中设置 SMTP_USER 和 SMTP_PASS');
  }

  const stockName = stock.trim();
  const subject = `【瓶颈点分析报告】${stockName}`;
  const body = `您好，

附件是基于 Serenity 瓶颈点投资分析框架对「${stockName}」的完整分析报告。

报告包含：
- 产业链瓶颈映射
- 六因子打分
- 红蓝对抗压力测试
- 仓位校准建议
- 独立终审结论

---
此报告由 AI 自动生成，不构成投资建议。请结合自身情况独立判断。
`;

  const info = await transport.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    bcc: process.env.SMTP_USER, // BCC yourself so you have a record
    subject,
    text: body,
    attachments: [{
      filename: `${stockName}_分析报告.pdf`,
      path: attachmentPath,
    }],
  });

  return info;
}

module.exports = { sendReport };
