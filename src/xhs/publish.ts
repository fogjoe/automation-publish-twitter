import { chromium, BrowserContext, Page } from "playwright";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";

/**
 * 小红书自动发布脚本
 *
 * 功能：
 * 1. 加载已保存的登录凭证，实现免登录
 * 2. 上传图片（支持本地路径或在线URL）、填写标题和正文
 * 3. 自动点击发布按钮
 */

// 认证文件路径
const AUTH_FILE = path.join(process.cwd(), "xhs-auth.json");

// 小红书创作平台发布页面
const PUBLISH_URL = "https://creator.xiaohongshu.com/publish/publish";

// 登录页面特征（用于检测登录失效）
const LOGIN_URL_PATTERN = /login|passport/i;

// 临时文件目录
const TEMP_DIR = path.join(process.cwd(), "build");

/**
 * 下载在线图片到本地临时文件
 */
async function downloadImage(url: string): Promise<string> {
  // 确保临时目录存在
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  // 从 URL 提取文件扩展名，默认 .jpg
  const urlPath = new URL(url).pathname;
  const ext = path.extname(urlPath) || ".jpg";
  const tempFile = path.join(TEMP_DIR, `temp-image-${Date.now()}${ext}`);

  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;

    const request = protocol.get(url, (response) => {
      // 处理重定向
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadImage(redirectUrl).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`下载失败，状态码: ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(tempFile);
      response.pipe(fileStream);

      fileStream.on("finish", () => {
        fileStream.close();
        resolve(tempFile);
      });

      fileStream.on("error", (err) => {
        fs.unlink(tempFile, () => {}); // 删除失败的文件
        reject(err);
      });
    });

    request.on("error", reject);
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error("下载超时"));
    });
  });
}

/**
 * 判断是否为 URL
 */
function isUrl(str: string): boolean {
  return str.startsWith("http://") || str.startsWith("https://");
}

/**
 * 加载认证信息并创建浏览器上下文
 */
async function createAuthenticatedContext(): Promise<BrowserContext> {
  // 检查认证文件是否存在
  if (!fs.existsSync(AUTH_FILE)) {
    throw new Error(`认证文件不存在: ${AUTH_FILE}，请先运行 pnpm xhs:login`);
  }

  // 读取认证信息
  const authData = JSON.parse(fs.readFileSync(AUTH_FILE, "utf-8"));
  console.log(`加载认证信息，保存时间: ${authData.savedAt}`);

  // 启动浏览器（有头模式，方便观察）
  const browser = await chromium.launch({
    headless: false, // 设为 true 可隐藏浏览器窗口
    slowMo: 100, // 每个操作间隔 100ms，模拟人类行为
  });

  // 创建浏览器上下文
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  // 注入 Cookies
  if (authData.cookies && authData.cookies.length > 0) {
    await context.addCookies(authData.cookies);
    console.log(`已注入 ${authData.cookies.length} 个 Cookies`);
  }

  return context;
}

/**
 * 注入 LocalStorage（需要在页面加载后执行）
 */
async function injectLocalStorage(page: Page): Promise<void> {
  const authData = JSON.parse(fs.readFileSync(AUTH_FILE, "utf-8"));

  if (authData.localStorage && Object.keys(authData.localStorage).length > 0) {
    await page.evaluate((storage: Record<string, string>) => {
      for (const [key, value] of Object.entries(storage)) {
        window.localStorage.setItem(key, value);
      }
    }, authData.localStorage);
    console.log(
      `已注入 ${Object.keys(authData.localStorage).length} 个 LocalStorage 项`
    );
  }
}

/**
 * 检查是否登录失效
 */
async function checkLoginStatus(page: Page): Promise<boolean> {
  const currentUrl = page.url();

  // 检查 URL 是否包含登录相关路径
  if (LOGIN_URL_PATTERN.test(currentUrl)) {
    console.error("❌ 登录已失效，当前页面被重定向到登录页");
    console.error(`当前 URL: ${currentUrl}`);
    console.error("请重新运行 pnpm xhs:login 获取新的登录凭证");
    return false;
  }

  return true;
}

/**
 * 关闭所有弹窗
 */
async function closeAllPopups(page: Page): Promise<void> {
  console.log("正在关闭弹窗...");

  // 等待页面完全加载
  await page.waitForTimeout(3000);

  // 1. 关闭"草稿箱功能上线了"弹窗 - 点击"我知道了"
  try {
    const knownButton = page.getByText("我知道了");
    if (await knownButton.isVisible({ timeout: 2000 })) {
      await knownButton.click();
      console.log("  ✓ 关闭「草稿箱」弹窗");
      await page.waitForTimeout(500);
    }
  } catch {
    // 弹窗不存在
  }

  // 2. 关闭"试试文字配图吧"弹窗 - 点击页面空白处
  try {
    const tipPopup = page.getByText("试试文字配图吧");
    if (await tipPopup.isVisible({ timeout: 1000 })) {
      // 点击页面左上角空白区域关闭弹窗
      await page.mouse.click(50, 50);
      console.log("  ✓ 关闭「文字配图」弹窗");
      await page.waitForTimeout(500);
    }
  } catch {
    // 弹窗不存在
  }

  // 3. 多次按 ESC 确保所有弹窗关闭
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }

  console.log("✓ 弹窗处理完成\n");
}

/**
 * 切换到图文 tab
 */
async function switchToImageTextTab(page: Page): Promise<void> {
  console.log("正在切换到图文模式...");

  // 等待 tab 出现并点击
  // 小红书的 tab 通常在页面顶部，文字为"图文"
  const selectors = [
    'text="图文"',
    '[class*="tab"]:has-text("图文")',
    'div:has-text("图文"):not(:has(div:has-text("图文")))',
  ];

  let clicked = false;

  for (const selector of selectors) {
    try {
      const tab = page.locator(selector).first();
      if (await tab.isVisible({ timeout: 2000 })) {
        await tab.click();
        clicked = true;
        console.log("✓ 已切换到图文模式\n");
        break;
      }
    } catch {
      // 继续尝试下一个选择器
    }
  }

  if (!clicked) {
    // 保存截图用于调试
    await page.screenshot({ path: "build/debug-tab.png" });
    console.log("⚠ 未找到图文 tab，截图已保存到 build/debug-tab.png");
    console.log("继续尝试...\n");
  }

  await page.waitForTimeout(1000);
}

/**
 * 发布笔记到小红书
 *
 * @param imageSource - 图片来源（本地路径或在线 URL）
 * @param title - 笔记标题
 * @param content - 笔记正文
 */
export async function publishToXhs(
  imageSource: string,
  title: string,
  content: string
): Promise<void> {
  console.log("=== 小红书发布脚本启动 ===\n");

  let absoluteImagePath: string;
  let tempFile: string | null = null;

  // 处理图片来源：支持本地路径或在线 URL
  if (isUrl(imageSource)) {
    console.log(`检测到在线图片: ${imageSource}`);
    console.log("正在下载图片...");
    tempFile = await downloadImage(imageSource);
    absoluteImagePath = tempFile;
    console.log(`✓ 图片已下载到: ${tempFile}\n`);
  } else {
    absoluteImagePath = path.resolve(imageSource);
    if (!fs.existsSync(absoluteImagePath)) {
      throw new Error(`图片文件不存在: ${absoluteImagePath}`);
    }
    console.log(`待上传图片: ${absoluteImagePath}\n`);
  }

  // 创建已认证的浏览器上下文
  const context = await createAuthenticatedContext();
  const page = await context.newPage();

  try {
    // 访问发布页面
    console.log("\n正在访问小红书创作平台...");
    await page.goto(PUBLISH_URL, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // 注入 LocalStorage
    await injectLocalStorage(page);

    // 检查登录状态
    const isLoggedIn = await checkLoginStatus(page);
    if (!isLoggedIn) {
      throw new Error("登录已失效");
    }
    console.log("✓ 登录状态有效\n");

    // ===== 1. 关闭所有弹窗 =====
    await closeAllPopups(page);

    // ===== 2. 切换到图文 tab（必须在上传之前） =====
    await switchToImageTextTab(page);

    // ===== 3. 上传图片 =====
    console.log("正在上传图片...");

    // 定位文件上传 input（通常是隐藏的）
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(absoluteImagePath);

    // 等待图片上传完成
    // 方法：检测上传进度消失 或 图片预览出现
    console.log("  等待图片上传完成...");

    // 等待上传进度条/loading 消失（如果有的话）
    try {
      const uploadingIndicators = [
        '[class*="uploading"]',
        '[class*="loading"]',
        '[class*="progress"]',
        'text="上传中"',
      ];

      for (const indicator of uploadingIndicators) {
        const loading = page.locator(indicator).first();
        if (await loading.isVisible({ timeout: 1000 })) {
          await loading.waitFor({ state: "hidden", timeout: 120000 }); // 最多等 2 分钟
          break;
        }
      }
    } catch {
      // 没有找到上传指示器，继续
    }

    // 等待图片预览出现（更可靠的方式）
    try {
      const imagePreviewSelectors = [
        'img[src*="xhscdn"]', // 小红书 CDN 图片
        '[class*="preview"] img',
        '[class*="image"] img',
        '[class*="cover"] img',
      ];

      let imageFound = false;
      for (const selector of imagePreviewSelectors) {
        try {
          const preview = page.locator(selector).first();
          await preview.waitFor({ state: "visible", timeout: 60000 });
          imageFound = true;
          break;
        } catch {
          // 继续尝试
        }
      }

      if (!imageFound) {
        // 如果没有找到预览图，等待固定时间作为后备
        await page.waitForTimeout(10000);
      }
    } catch {
      // 后备：等待固定时间
      await page.waitForTimeout(10000);
    }

    console.log("✓ 图片上传完成\n");

    // ===== 4. 填写标题 =====
    console.log("正在填写标题...");

    // 使用 placeholder 定位标题输入框
    const titleInput = page.getByPlaceholder("填写标题");
    await titleInput.waitFor({ state: "visible", timeout: 15000 });
    await titleInput.click();
    await titleInput.fill(title);
    console.log(`✓ 标题已填写: ${title}\n`);

    // ===== 5. 填写正文 =====
    console.log("正在填写正文...");

    // 小红书使用 ProseMirror 富文本编辑器，placeholder 在 data-placeholder 属性中
    // 尝试多种方式定位正文输入区域
    const contentSelectors = [
      '[data-placeholder*="正文"]',
      '[data-placeholder*="描述"]',
      '[class*="editor"] p[data-placeholder]',
      '.ProseMirror p[data-placeholder]',
    ];

    let contentFilled = false;
    for (const selector of contentSelectors) {
      try {
        const contentArea = page.locator(selector).first();
        if (await contentArea.isVisible({ timeout: 3000 })) {
          await contentArea.click();
          await page.keyboard.type(content, { delay: 20 });
          contentFilled = true;
          console.log(`✓ 正文已填写: ${content.substring(0, 50)}...\n`);
          break;
        }
      } catch {
        // 继续尝试下一个选择器
      }
    }

    if (!contentFilled) {
      console.log("⚠ 未找到正文输入框，跳过正文填写\n");
    }

    // ===== 6. 点击发布按钮 =====
    console.log("正在点击发布按钮...");

    // 使用文本定位发布按钮
    const publishButton = page.getByRole("button", { name: "发布" });
    await publishButton.waitFor({ state: "visible", timeout: 10000 });
    await publishButton.click();
    console.log("  已点击发布按钮，等待响应...");

    // 等待发布结果
    await page.waitForTimeout(3000);

    // 检查是否有错误提示
    const errorMessages = ["请上传图片", "请填写标题", "请填写正文", "上传失败"];
    for (const msg of errorMessages) {
      try {
        const error = page.getByText(msg);
        if (await error.isVisible({ timeout: 1000 })) {
          console.error(`❌ 发布失败: ${msg}`);
          await page.screenshot({ path: "build/debug-publish-error.png" });
          throw new Error(`发布失败: ${msg}`);
        }
      } catch (e) {
        if ((e as Error).message.includes("发布失败")) throw e;
      }
    }

    // 检查是否有发布成功提示或页面跳转
    let publishSuccess = false;

    // 检查成功提示
    const successMessages = ["发布成功", "发布中", "审核中", "已发布"];
    for (const msg of successMessages) {
      try {
        const success = page.getByText(msg);
        if (await success.isVisible({ timeout: 2000 })) {
          console.log(`✓ 发布成功: ${msg}\n`);
          publishSuccess = true;
          break;
        }
      } catch {
        // 继续检查
      }
    }

    // 检查 URL 是否变化
    if (!publishSuccess) {
      const currentUrl = page.url();
      if (!currentUrl.includes("/publish/publish")) {
        console.log("✓ 页面已跳转，发布可能成功\n");
        publishSuccess = true;
      }
    }

    if (!publishSuccess) {
      await page.screenshot({ path: "build/debug-after-publish.png" });
      console.log("⚠ 未检测到明确的发布成功提示");
      console.log("  截图已保存到 build/debug-after-publish.png");
      console.log("  请手动检查发布状态\n");
    }

    console.log("=== 小红书发布脚本执行完成 ===");
  } catch (error) {
    // 出错时保存截图
    await page.screenshot({ path: "build/debug-error.png" });
    console.error("发布过程出错:", (error as Error).message);
    console.error("错误截图已保存到 build/debug-error.png");
    throw error;
  } finally {
    // 等待一会儿再关闭，方便观察结果
    await page.waitForTimeout(5000);
    await context.browser()?.close();

    // 清理临时文件
    if (tempFile && fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
      console.log("临时图片文件已清理");
    }
  }
}

// 如果直接运行此脚本，则执行测试发布
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  // 测试参数 - 支持本地路径或在线 URL
  const testImageSource =
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800";
  const testTitle = "测试标题 - 自动发布测试";
  const testContent =
    "这是一条测试笔记的正文内容，用于验证自动发布功能是否正常工作。";

  publishToXhs(testImageSource, testTitle, testContent).catch((err) => {
    console.error("执行失败:", err.message);
    process.exit(1);
  });
}
