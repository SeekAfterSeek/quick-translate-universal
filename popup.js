// 弹窗：读取/保存设置，并跳转到快捷键设置页
// 注意：popup.html 已先于本文件加载 browser-polyfill.min.js，可直接使用 browser.*
const engineSel = document.getElementById('engine');
const targetSel = document.getElementById('target');
const link = document.getElementById('shortcutLink');

browser.storage.local.get({ engine: 'mymemory', target: 'zh-CN' }).then(function (s) {
  engineSel.value = s.engine;
  targetSel.value = s.target;
});

engineSel.addEventListener('change', function () {
  browser.storage.local.set({ engine: engineSel.value });
});

targetSel.addEventListener('change', function () {
  browser.storage.local.set({ target: targetSel.value });
});

link.addEventListener('click', function (e) {
  e.preventDefault();
  // Firefox 没有 chrome://extensions/shortcuts，改打开 about:addons
  const isFirefox = /Firefox/.test(navigator.userAgent);
  const url = isFirefox ? 'about:addons' : 'chrome://extensions/shortcuts';
  browser.tabs.create({ url: url }).catch(function () {});
});
