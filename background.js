// 后台服务 worker：监听快捷键，获取选区，调用翻译接口，回传结果
importScripts('browser-polyfill.min.js'); // 统一 browser.* API，跨 Chrome / Firefox / Edge / 鸿蒙等

// 从 storage 读取用户设置（目标语言 + 翻译引擎）
async function getSettings() {
  const def = { target: 'zh-CN', engine: 'mymemory' };
  try {
    const s = await browser.storage.local.get(def);
    return Object.assign(def, s);
  } catch (e) {
    return def;
  }
}

// 翻译引擎 1：Google 翻译（免费、无需 key，但国内可能需要代理）
async function translateGoogle(text, target) {
  const url =
    'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=' +
    encodeURIComponent(target) +
    '&dt=t&q=' +
    encodeURIComponent(text);
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  let out = '';
  if (Array.isArray(data) && Array.isArray(data[0])) {
    for (const seg of data[0]) {
      if (seg && seg[0]) out += seg[0];
    }
  }
  if (!out) throw new Error('空结果');
  return out;
}

// 猜源语言：含汉字 → 视为中文（译到目标语言）；否则默认英文（最常见的「外文→中文」）
function guessSource(text) {
  return /[　-〿㐀-鿿豈-﫿]/.test(text) ? 'zh-CN' : 'en';
}

// 翻译引擎 2：MyMemory（免费、无需 key，有每日额度，国内一般可直连）
async function translateMyMemory(text, target, source) {
  const langpair = source + '|' + target;
  const url =
    'https://api.mymemory.translated.net/get?q=' +
    encodeURIComponent(text) +
    '&langpair=' +
    encodeURIComponent(langpair);
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  if (data && data.responseData && data.responseData.translatedText) {
    return data.responseData.translatedText;
  }
  throw new Error('空结果');
}

async function translate(text, settings) {
  const src = guessSource(text);
  // 按所选引擎排定主/备顺序，依次尝试，任一成功即返回
  const order =
    settings.engine === 'mymemory'
      ? [
          () => translateMyMemory(text, settings.target, src),
          () => translateGoogle(text, settings.target)
        ]
      : [
          () => translateGoogle(text, settings.target),
          () => translateMyMemory(text, settings.target, src)
        ];

  let lastErr;
  for (const fn of order) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
    }
  }
  return '(翻译失败：' + (lastErr ? lastErr.message : '未知错误') + '；请检查网络或刷新页面)';
}

function isRestrictedUrl(url) {
  return (
    !url ||
    url.startsWith('chrome://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('view-source:')
  );
}

browser.commands.onCommand.addListener(async (command) => {
  if (command !== 'translate-selection') return;

  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab || isRestrictedUrl(tab.url)) return;

  try {
    const sel = await browser.tabs.sendMessage(tab.id, { type: 'getSelection' });
    const selectedText = (sel && sel.text ? sel.text : '').trim();

    if (!selectedText) {
      await browser.tabs.sendMessage(tab.id, {
        type: 'notify',
        message: '请先选中要翻译的文字，再按快捷键'
      });
      return;
    }

    const settings = await getSettings();
    const translation = await translate(selectedText, settings);
    await browser.tabs.sendMessage(tab.id, {
      type: 'showTranslation',
      text: selectedText,
      translation: translation
    });
  } catch (e) {
    // 内容脚本可能尚未注入（极少数情况），忽略即可
    console.error('划词快译出错：', e);
  }
});

// 来自页面内「按 L 键」的翻译请求：在后台完成网络请求后回传结果
browser.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg && msg.type === 'translateText') {
    getSettings()
      .then(function (settings) {
        return translate(msg.text, settings);
      })
      .then(function (translation) {
        sendResponse({ translation: translation });
      })
      .catch(function () {
        sendResponse({ translation: '(翻译失败)' });
      });
    return true; // 保持消息通道开放以支持异步回传
  }
});
