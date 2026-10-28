// 内容脚本：获取选区文字、在页面上显示翻译浮层
// 注意：本文件之前已在 manifest 中先于它加载 browser-polyfill.min.js，故可直接使用 browser.*

let box = null;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c];
  });
}

function removeBox() {
  if (box) {
    box.remove();
    box = null;
  }
  document.removeEventListener('mousedown', onDocDown, true);
  document.removeEventListener('keydown', onEsc, true);
}

function onDocDown(e) {
  if (box && !box.contains(e.target)) removeBox();
}

function onEsc(e) {
  if (e.key === 'Escape') removeBox();
}

function showTranslation(text, translation) {
  removeBox();

  box = document.createElement('div');
  box.id = 'quick-translate-box';
  box.setAttribute('data-qt', '1');
  box.style.cssText = [
    'position:absolute',
    'z-index:2147483647',
    'max-width:360px',
    'padding:12px 14px',
    'border-radius:10px',
    'background:rgba(28,30,38,0.96)',
    'color:#fff',
    'font-size:15px',
    'line-height:1.5',
    'box-shadow:0 6px 24px rgba(0,0,0,0.35)',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif',
    'cursor:default',
    'word-break:break-word'
  ].join(';');

  const orig = document.createElement('div');
  orig.style.cssText = 'opacity:0.6;font-size:13px;margin-bottom:6px;';
  orig.textContent = text || '提示';

  const tr = document.createElement('div');
  tr.style.cssText = 'font-size:16px;';
  tr.innerHTML = escapeHtml(translation);

  box.appendChild(orig);
  box.appendChild(tr);
  document.body.appendChild(box);

  // 定位到选区附近
  let x = window.scrollX + 120;
  let y = window.scrollY + 120;
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    x = rect.left + window.scrollX;
    y = rect.bottom + window.scrollY + 8;
  }
  // 防止超出右边界
  const w = box.offsetWidth || 320;
  if (x + w > window.scrollX + document.documentElement.clientWidth) {
    x = window.scrollX + document.documentElement.clientWidth - w - 12;
  }
  box.style.left = Math.max(8, x) + 'px';
  box.style.top = Math.max(8, y) + 'px';

  document.addEventListener('mousedown', onDocDown, true);
  document.addEventListener('keydown', onEsc, true);
}

browser.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.type === 'getSelection') {
    sendResponse({ text: window.getSelection().toString() });
  } else if (msg.type === 'showTranslation') {
    showTranslation(msg.text || '', msg.translation || '');
  } else if (msg.type === 'notify') {
    showTranslation('', msg.message || '');
  }
  return true;
});

// 判断当前焦点是否在可编辑元素里（输入框 / 文本域 / 富文本）
function isEditable(el) {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
  if (el.isContentEditable) return true;
  return false;
}

// 核心：选中文字后，单独按 L（不带任何修饰键）即翻译
document.addEventListener(
  'keydown',
  function (e) {
    // 只响应单独的 L 键：忽略带 Ctrl / Alt / ⌘ / Shift 的情况
    if (e.key !== 'l' && e.key !== 'L') return;
    if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
    // 在输入框里打字时不拦截，避免影响正常输入
    if (isEditable(document.activeElement)) return;

    const sel = window.getSelection();
    const text = sel ? sel.toString().trim() : '';
    if (!text) return; // 没选中东西就不动作

    // 关键：阻止浏览器用字母 'l' 把选中的文字替换掉
    e.preventDefault();

    browser.runtime.sendMessage({ type: 'translateText', text: text }).then(function (resp) {
      if (browser.runtime.lastError) {
        // 后台服务未响应：通常是该标签页在装扩展前就打开、脚本未注入
        showTranslation(text, '(后台未响应：' + browser.runtime.lastError.message + '；请刷新本页面后重试)');
        return;
      }
      if (resp && typeof resp.translation === 'string') {
        showTranslation(text, resp.translation);
      } else {
        showTranslation(text, '(翻译失败：后台无返回，请刷新页面)');
      }
    }).catch(function () {
      showTranslation(text, '(翻译失败：请刷新页面后重试)');
    });
  },
  true
);
