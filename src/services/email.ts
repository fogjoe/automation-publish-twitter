import nodemailer from "nodemailer";
import "dotenv/config";

const transporter = nodemailer.createTransport({
  service: "qq",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendReminderEmail(): Promise<void> {
  const today = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_TO,
    subject: "⚠️ 今天还没写日记！",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #e74c3c;">📝 嘿，今天的日记还没写哦！</h2>
        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          今天是 <strong>${today}</strong>，我注意到你还没有在 Notion 里写日记。
        </p>
        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          记录每一天的想法和经历是一个很棒的习惯！哪怕只是几句话，也是对这一天的珍贵记录。
        </p>
        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          ✨ 现在就去 Notion 写下今天的故事吧！
        </p>
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          —— 你的自动化助手
        </p>
      </div>
    `,
  });

  console.log("Reminder email sent successfully");
}
