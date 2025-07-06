import chromium from "@sparticuz/chromium";
import playwright from "playwright-core";
import fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import os from 'os';
import path from 'path';
import { EventEmitter } from 'events';

EventEmitter.defaultMaxListeners = 30;

const tempDirectories = [];
const useWs = process.env.USE_WS ?? FALSE;
const wp = process.env.BROWSER_EXECUTABLE_PATH;
const xp = await chromium.executablePath();

async function cleanupResources() {
  console.log('Cleaning up resources...');
  for (const dir of tempDirectories) {
    try {
      await fs.rm(dir, { recursive: true, force: true });
      console.log(`Removed temporary directory: ${dir}`);
    } catch (error) {
      console.error(`Failed to remove directory ${dir}:`, error);
    }
  }
}

process.on('exit', () => {
  console.log('Process exit detected, cleaning up...');
  for (const dir of tempDirectories) {
    try {
      fsSync.rmSync(dir, { recursive: true, force: true });
    } catch (error) {
      console.error(`Failed to remove directory ${dir} during exit:`, error);
    }
  }
});

['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach(signal => {
  process.on(signal, async () => {
    console.log(`Received ${signal}, cleaning up before exit...`);
    await cleanupResources();
    process.exit(0);
  });
});

process.on('uncaughtException', async (error) => {
  console.error('Uncaught exception:', error);
  await cleanupResources();
  process.exit(1);
});

async function openBrowser(options = {}) {
  const platform = process.platform;
  let browser;
  let launchOptions = {
    headless: options.headless ?? true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ],
    ignoreDefaultArgs: false
  };

  const isLinux = platform === 'linux';
  const isUbuntu = isLinux && (process.env.XDG_CURRENT_DESKTOP?.toLowerCase().includes('ubuntu') || process.env.DESKTOP_SESSION?.toLowerCase().includes('ubuntu'));
  const isMac = platform === 'darwin';
  const isWin = platform === 'win32';

  if (isWin) {
    launchOptions = {
      ...launchOptions,
      channel: 'chrome',
      args: [
        ...launchOptions.args,
        '--disable-accelerated-2d-canvas',
        '--disable-dev-shm-usage',
        '--disable-features=site-per-process',
        '--window-size=1280,720'
      ]
    };
  } else if (isMac) {
    launchOptions = {
      ...launchOptions,
      channel: 'chrome',
      args: [
        ...launchOptions.args,
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--disable-ipc-flooding-protection',
        '--disable-hang-monitor',
        '--window-size=1280,720'
      ]
    };
  } else if (isUbuntu) {
    launchOptions = {
      ...launchOptions,
      args: [
        ...launchOptions.args,
        '--disable-accelerated-2d-canvas',
        '--disable-dev-shm-usage',
        '--disable-features=site-per-process',
        '--window-size=1280,720'
      ]
    };
  } else if (isLinux) {
    launchOptions = {
      ...launchOptions,
      args: [
        ...launchOptions.args,
        '--disable-accelerated-2d-canvas',
        '--disable-dev-shm-usage',
        '--disable-features=site-per-process',
        '--window-size=1280,720'
      ]
    };
  }

  // console.log('config:', JSON.stringify(launchOptions, null, 2));
  try {
    if (!useWs) {
      launchOptions.executablePath = xp;
      browser = await playwright.chromium.launch(launchOptions);
    } else {
      launchOptions.wsEndpoint = wp;
      browser = await playwright.chromium.connectOverCDP(launchOptions);
    }
    console.log('Browser launched successfully');
  } catch (err) {
    console.error('Browser launch failed:', err.message);
    throw err;
  }
  browser.on('disconnected',()=>console.warn('Disconnect'));
  browser.on('error',(err)=>console.error(err));
  return browser;
}

async function closeBrowser(browser) {
  try {
    if (!browser) {
      console.warn('Browser instance is null or undefined. Nothing to close.');
      return;
    }
    await browser.close();
    console.log('Browser closed.');
    await cleanupResources();
  } catch (error) {
    console.error('Error closing browser:', error);
    try {
      await cleanupResources();
    } catch (cleanupError) {
      console.error('Error during resource cleanup:', cleanupError);
    }
    throw error;
  }
}

async function scroll(page, selector) {
  try {
    await page.waitForSelector(selector, { timeout: 1500, state: 'attached' });
    await page.evaluate(async(selector) => {
      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const element = document.querySelector(selector);
      if (element) {
        for (let i = 0; i < element.scrollHeight; i += 100) {
          element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' }, i);
          await delay(100 * (i/element.scrollHeight));
        }
      } else {
        console.warn('Element not found:', selector);
      }
    }, selector);
  } catch (error) {
    throw error;
  }
}

async function waitForScrollFeed(page, maxScroll = 10) {
  let previousHeight;
  let currentHeight = 0;
  const maxScrollAttempts = maxScroll;
  let attemptCount = 0;

  while (previousHeight !== currentHeight && attemptCount < maxScrollAttempts) {
    previousHeight = currentHeight;

    await scroll(page, "[role='feed']");

    await page.waitForTimeout(2500 * (attemptCount + 1 / 2));

    currentHeight = await page.evaluate(() => {
      const feed = document.querySelector("[role='feed']");
      return feed ? feed.scrollHeight : 0;
    });

    console.log(`Scroll attempt ${attemptCount + 1}: Previous height = ${previousHeight}, Current height = ${currentHeight}`);
    attemptCount++;
  }
}

async function qs(page, selector) {
  try {
    const element = await page.$(selector);
    if (element) return element;
    else {
      console.warn(`Element not found: ${selector}`);
      return null;
    }
  } catch (error) {
    throw error;
  }
}

async function qsAll(page, selector) {
  try {
    const elements = await page.$$(selector);
    return elements;
  } catch (error) {
    throw error;
  }
}

async function getClassName(page, className) {
  try {
    const elements = await page.$$(`.${className}`);
    if (elements.length > 0) return elements;
    else {
      console.warn(`Element not found: .${className}`);
      return null;
    }
  } catch (error) {
    throw error;
  }
}


async function click(page, selector) {
  try {
    const element = await page.$(selector);
    if (element) {
      await element.click();
    } else {
      console.warn(`Element not found: ${selector}`);
    }
  } catch (error) {
    throw error;
  }
}

async function getText(page, selector) {
  try {
    const element = await page.$(selector);
    if (element) {
      const text = await element.textContent() ?? element.innerText();
      return text.trim();
    } else {
      console.warn(`Element not found: ${selector}`);
      return null;
    }
  } catch (error) {
    throw error;
  }
}

async function getHtml(page, selector) {
    try {
      const element = await page.$(selector);
      if (element) {
          const htmlContent = await element.innerHTML();
          return htmlContent;
      } else {
          console.warn(`Element not found: ${selector}`);
          return null;
      }
    } catch (error) {
      console.error('Error getting content:', error);
      throw error;
    }
}

async function waitSelector(page, selector, options = {}) {
  try {
    const defaultOptions = { timeout: 5000, state: 'attached' };
    const mergedOptions = { ...defaultOptions, ...options };
    await page.waitForSelector(selector, mergedOptions);
    return true;
  } catch (error) {
    if (error.message.includes('timeout')) {
      return false;
    }
    throw error;
  }
}


async function loadState(page, state = 'load', options = {}) {
  try {
    const defaultOptions = { timeout: 30000 };
    const mergedOptions = {...defaultOptions, ...options};
    await page.waitForLoadState(state, mergedOptions);
    return true;
  } catch (error) {
    if (error.message.includes('timeout')) {
      console.warn(`Timeout waiting for page state: ${state}. Continuing anyway.`);
      return false;
    }
    throw error;
  }
}
async function waitNetwork(page, options = {}) {
  try {
    const defaultOptions = { timeout: 5000, idleTime: 500 };
    const mergedOptions = { ...defaultOptions, ...options };
    await page.waitForNetworkIdle(mergedOptions);
    return true;
  } catch (error) {
    if (error.message.includes('timeout')) {
      return false;
    }
    throw error;
  }
}

async function rest(min = 5000, max = 10000){
  const rand = Math.random() * (max - min) + min;
  return new Promise((r) => setTimeout(r, rand))
}

async function run() {
  const browser = await openBrowser();
  const page = await browser.newPage();
  await page.goto('https://www.example.com');

  const titleElement = await qs(page, 'title');
  console.log('Title:', titleElement ? await titleElement.textContent() : "Title not found");

  const links = await qsAll(page, 'a');
  console.log('Number of links:', links.length);

  const paragraphElements = await getClassName(page, 'paragraph');
  console.log("Number of paragraph elements:", paragraphElements ? paragraphElements.length : "Paragraph elements not found");

  await click(page, '#myButton');

  const innerText = await getText(page, '.my-class');
  console.log('Inner text:', innerText);

  const content = await getHtml(page, '#myDiv');
  console.log('Content:', content);

  await waitSelector(page, '#myElement', {timeout: 10000});
  const elementText = await getText(page, '#myElement');
  console.log("Text from #myElement:", elementText);

  await loadState(page, 'networkidle');
  await waitNetwork(page, { idleTime: 1000 });
  await closeBrowser(browser);
}


export { openBrowser, closeBrowser, waitForScrollFeed, scroll, qs, qsAll, getClassName, getText, getHtml, waitSelector, waitNetwork, loadState, rest }