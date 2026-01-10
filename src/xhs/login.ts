import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

/**
 * 小红书创作平台登录脚本
 *
 * 功能：
 * 1. 启动有头浏览器，访问小红书创作服务平台
 * 2. 等待用户手动扫码登录
 * 3. 登录成功后，自动保存 Cookies 和 LocalStorage 到 xhs-auth.json
 */

// 认证文件保存路径
const AUTH_FILE = path.join(process.cwd(), "xhs-auth.json");

// 小红书创作平台发布页面
const CREATOR_URL = "https://creator.xiaohongshu.com/publish/publish";

async function main() {
  console.log("=== 小红书登录脚本启动 ===\n");

  // 启动浏览器（有头模式，方便扫码）
  const browser = await chromium.launch({
    headless: false,
    args: ["--start-maximized"], // 最大化窗口
  });

  // 创建浏览器上下文
  const context = await browser.newContext({
    viewport: null, // 使用最大化窗口尺寸
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  // 创建新页面
  const page = await context.newPage();

  console.log("正在打开小红书创作平台...");
  await page.goto(CREATOR_URL);

  console.log("\n========================================");
  console.log("请在浏览器中扫码登录小红书");
  console.log("登录成功后，脚本会自动保存认证信息");
  console.log("========================================\n");

  // 等待登录成功
  // 方法：检测页面是否出现发布页面的特定元素（如上传按钮）
  // 或者检测 URL 不再包含 login 相关路径
  try {
    await page.waitForSelector('input[type="file"]', {
      timeout: 300000, // 5 分钟超时
    });
    console.log("检测到登录成功！\n");
  } catch (error) {
    console.log("等待超时，尝试保存当前状态...\n");
  }

  // 等待额外 2 秒，确保页面完全加载
  await page.waitForTimeout(2000);

  // 获取 Cookies
  const cookies = await context.cookies();
  console.log(`获取到 ${cookies.length} 个 Cookies`);

  // 获取 LocalStorage
  const localStorage = await page.evaluate(() => {
    const data: Record<string, string> = {};
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key) {
        data[key] = window.localStorage.getItem(key) || "";
      }
    }
    return data;
  });
  console.log(`获取到 ${Object.keys(localStorage).length} 个 LocalStorage 项`);

  // 保存认证信息到文件
  const authData = {
    cookies,
    localStorage,
    savedAt: new Date().toISOString(),
  };

  fs.writeFileSync(AUTH_FILE, JSON.stringify(authData, null, 2), "utf-8");
  console.log(`\n认证信息已保存到: ${AUTH_FILE}`);

  // 关闭浏览器
  await browser.close();

  console.log("\n=== 登录脚本执行完成 ===");
}

// 执行主函数
main().catch((err) => {
  console.error("脚本执行出错:", err.message);
  process.exit(1);
});
