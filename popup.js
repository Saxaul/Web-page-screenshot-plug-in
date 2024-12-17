/**
 * 文件名: popup.js
 * 描述: Chrome截图插件的弹出窗口逻辑
 * 功能:
 * 1. 处理用户界面交互
 * 2. 与content script通信
 * 3. 执行截图操作
 */

document.addEventListener('DOMContentLoaded', function() {
  // 获取DOM元素
  const captureFullPage = document.getElementById('captureFullPage');
  const captureSelection = document.getElementById('captureSelection');

  /**
   * 获取用户选择的图片格式
   * @returns {string} 'jpg' 或 'pdf'
   */
  function getSelectedFormat() {
    return document.querySelector('input[name="format"]:checked').value;
  }

  // 截取整个页面的点击事件处理
  captureFullPage.addEventListener('click', async () => {
    const format = getSelectedFormat();
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (format === 'pdf') {
      chrome.tabs.sendMessage(tab.id, { action: 'capturePDF' });
    } else {
      chrome.tabs.sendMessage(tab.id, { action: 'captureFullPage' });
    }
    window.close();
  });

  // 截取选定区域的点击事件处理
  captureSelection.addEventListener('click', async () => {
    const format = getSelectedFormat();
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.tabs.sendMessage(tab.id, { 
      action: 'startSelection',
      format: format
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('消息发送失败:', chrome.runtime.lastError);
      }
    });
    window.close();
  });
}); 