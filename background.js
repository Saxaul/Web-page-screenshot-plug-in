/**
 * 文件名: background.js
 * 描述: Chrome截图插件的后台脚本
 * 功能:
 * 1. 处理截图请求
 * 2. 处理图片下载
 * 3. 与content script通信
 */

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 处理截图请求
  if (request.action === 'captureVisibleTab') {
    chrome.tabs.captureVisibleTab(null, { 
      format: 'jpeg', 
      quality: 100 
    }, dataUrl => {
      sendResponse({ dataUrl: dataUrl });
    });
    return true; // 保持消息通道打开
  }
  
  // 处理下载请求
  if (request.action === 'downloadImage') {
    chrome.downloads.download({
      url: request.dataUrl,
      filename: request.filename,
      saveAs: true  // 显示保存对话框
    });
  }
}); 