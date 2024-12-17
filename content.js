/**
 * 文件名: content.js
 * 描述: Chrome截图插件的内容脚本
 * 功能:
 * 1. 实现页面截图功能
 * 2. 处理区域选择
 * 3. 图片处理和下载
 */

// 防止重复加载
if (window.hasScreenshotExtension) {
  throw new Error('Screenshot extension already loaded');
}
window.hasScreenshotExtension = true;

// 全局变量
const screenshotState = {
  isSelecting: false,        // 是否正在选择区域
  startX: 0,                // 选择起始X坐标
  startY: 0,                // 选择起始Y坐标
  selectionBox: null,       // 选择框DOM元素
  selectedFormat: 'jpg',    // 选择的图片格式
  overlay: null            // 遮罩层元素
};

/**
 * 创建遮罩层
 */
function createOverlay() {
  screenshotState.overlay = document.createElement('div');
  screenshotState.overlay.style.position = 'fixed';
  screenshotState.overlay.style.top = '0';
  screenshotState.overlay.style.left = '0';
  screenshotState.overlay.style.width = '100%';
  screenshotState.overlay.style.height = '100%';
  screenshotState.overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
  screenshotState.overlay.style.zIndex = '999998';
  document.body.appendChild(screenshotState.overlay);
}

/**
 * 创建选择框DOM元素
 * @returns {HTMLElement} 选择框元素
 */
function createSelectionBox() {
  const box = document.createElement('div');
  box.className = 'screenshot-selection';
  
  // 添加四角标记
  const corners = ['tl', 'tr', 'bl', 'br'];
  corners.forEach(corner => {
    const cornerElement = document.createElement('div');
    cornerElement.className = `corner corner-${corner}`;
    box.appendChild(cornerElement);
  });

  document.body.appendChild(box);
  return box;
}

/**
 * 更新选择框的位置和大小
 * @param {MouseEvent} e - 鼠标事件对象
 */
function updateSelectionBox(e) {
  if (!screenshotState.selectionBox) return;
  
  const width = Math.abs(e.pageX - screenshotState.startX);
  const height = Math.abs(e.pageY - screenshotState.startY);
  const left = Math.min(e.pageX, screenshotState.startX);
  const top = Math.min(e.pageY, screenshotState.startY);
  
  // 更新选择框位置和大小
  screenshotState.selectionBox.style.left = left + 'px';
  screenshotState.selectionBox.style.top = top + 'px';
  screenshotState.selectionBox.style.width = width + 'px';
  screenshotState.selectionBox.style.height = height + 'px';
  
  // 更新尺寸指示器
  screenshotState.selectionBox.setAttribute('data-size', `${width} × ${height}`);
}

/**
 * 开始区域选择过程
 */
function startAreaSelection() {
  console.log('开始区域选择');
  screenshotState.isSelecting = false;
  document.body.style.cursor = 'crosshair';
  
  // 创建遮罩层
  createOverlay();
  
  // 添加事件监听器
  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('keydown', onKeyDown);
}

/**
 * 处理键盘事件
 * @param {KeyboardEvent} e - 键盘事件对象
 */
function onKeyDown(e) {
  if (e.key === 'Escape') {
    cleanup();
  }
}

/**
 * 清理选择相关的元素和事件
 */
function cleanup() {
  screenshotState.isSelecting = false;
  document.body.style.cursor = 'default';
  
  // 移除事件监听器
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
  document.removeEventListener('mousedown', onMouseDown);
  document.removeEventListener('keydown', onKeyDown);
  
  // 移除选择框
  if (screenshotState.selectionBox) {
    screenshotState.selectionBox.remove();
    screenshotState.selectionBox = null;
  }
  
  // 移除遮罩层
  if (screenshotState.overlay) {
    screenshotState.overlay.remove();
    screenshotState.overlay = null;
  }
}

/**
 * 处理鼠标按下事件
 * @param {MouseEvent} e - 鼠标事件对象
 */
function onMouseDown(e) {
  console.log('鼠标按下');
  e.preventDefault();
  screenshotState.isSelecting = true;
  screenshotState.startX = e.pageX;
  screenshotState.startY = e.pageY;
  
  if (screenshotState.selectionBox) {
    screenshotState.selectionBox.remove();
  }
  screenshotState.selectionBox = createSelectionBox();
  
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

/**
 * 处理鼠标移动事件
 * @param {MouseEvent} e - 鼠标事件对象
 */
function onMouseMove(e) {
  if (!screenshotState.isSelecting) return;
  e.preventDefault();
  updateSelectionBox(e);
}

/**
 * 处理鼠标释放事件
 * @param {MouseEvent} e - 鼠标事件对象
 */
function onMouseUp(e) {
  if (!screenshotState.isSelecting) return;
  console.log('鼠标释放');
  e.preventDefault();
  screenshotState.isSelecting = false;
  
  const width = Math.abs(e.pageX - screenshotState.startX);
  const height = Math.abs(e.pageY - screenshotState.startY);
  const left = Math.min(e.pageX, screenshotState.startX);
  const top = Math.min(e.pageY, screenshotState.startY);
  
  // 确保选区大小有效
  if (width > 10 && height > 10) {
    // 延迟一下以便用户看到最终的选择区域
    setTimeout(() => {
      captureArea(left, top, width, height);
      cleanup();
    }, 100);
  } else {
    cleanup();
  }
}

/**
 * 发送消息到扩展并处理错误
 * @param {Object} message - 要发送的消息
 * @returns {Promise} 返回处理结果的Promise
 */
function sendMessageToExtension(message) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, response => {
        if (chrome.runtime.lastError) {
          console.warn('消息发送错误:', chrome.runtime.lastError);
          // 如果是连接错误，尝试重新发送
          if (chrome.runtime.lastError.message.includes('connection')) {
            setTimeout(() => {
              sendMessageToExtension(message)
                .then(resolve)
                .catch(reject);
            }, 100);
          } else {
            reject(chrome.runtime.lastError);
          }
        } else {
          resolve(response);
        }
      });
    } catch (error) {
      console.error('发送消息异常:', error);
      reject(error);
    }
  });
}

/**
 * 下载图片
 * @param {string} dataUrl - 图片的Data URL
 * @param {string} filename - 保存的文件名
 */
function downloadImage(dataUrl, filename) {
  sendMessageToExtension({
    action: 'downloadImage',
    dataUrl: dataUrl,
    filename: filename
  }).catch(error => {
    console.error('下载图片失败:', error);
    // 显示错误提示
    const errorTip = document.createElement('div');
    errorTip.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255, 0, 0, 0.8);
      color: white;
      padding: 10px 20px;
      border-radius: 20px;
      font-size: 14px;
      z-index: 999999;
    `;
    errorTip.textContent = '保存失败，请重试';
    document.body.appendChild(errorTip);
    setTimeout(() => errorTip.remove(), 3000);
  });
}

/**
 * 截取选定区域并转换为PDF
 * @param {number} left - 左边距
 * @param {number} top - 上边距
 * @param {number} width - 宽度
 * @param {number} height - 高度
 */
function captureArea(left, top, width, height) {
  console.log('捕获区域:', left, top, width, height);
  
  if (screenshotState.selectedFormat === 'pdf') {
    // 使用优化的html2canvas配置
    html2canvas(document.body, {
      useCORS: true,
      allowTaint: true,
      scrollX: 0,
      scrollY: 0,
      x: left,
      y: top,
      width: width,
      height: height,
      scale: 1.5,  // 降低scale值但保持清晰度
      logging: false,  // 关闭日志
      backgroundColor: null,
      imageTimeout: 0,  // 禁用超时
      removeContainer: true,  // 自动清理
      foreignObjectRendering: true,  // 使用更快的渲染方式
      async: false  // 同步渲染
    }).then(canvas => {
      // 创建PDF（使用A4尺寸）
      const imgData = canvas.toDataURL('image/jpeg', 0.8);  // 降低图像质量
      const pdf = new window.jspdf.jsPDF({
        orientation: width > height ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true  // 启用压缩
      });

      // 计算图像在PDF中的尺寸
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pdfWidth / width, pdfHeight / height);
      const imgWidth = width * ratio;
      const imgHeight = height * ratio;
      const x = (pdfWidth - imgWidth) / 2;
      const y = (pdfHeight - imgHeight) / 2;

      // 添加图像到PDF并立即保存
      pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight);
      downloadImage(pdf.output('datauristring'), 'screenshot.pdf');
    });
  } else {
    sendMessageToExtension({
      action: 'captureVisibleTab'
    }).then(response => {
      if (response && response.dataUrl) {
        const image = new Image();
        image.onload = function() {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          const scrollX = window.scrollX;
          const scrollY = window.scrollY;
          
          ctx.drawImage(
            image,
            left + scrollX, top + scrollY, width, height,
            0, 0, width, height
          );
          
          downloadImage(canvas.toDataURL('image/jpeg', 0.95), 'screenshot.jpg');
        };
        image.src = response.dataUrl;
      }
    }).catch(error => {
      console.error('区域截图失败:', error);
      const errorTip = document.createElement('div');
      errorTip.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(255, 0, 0, 0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 20px;
        font-size: 14px;
        z-index: 999999;
      `;
      errorTip.textContent = '截图失败，请重试';
      document.body.appendChild(errorTip);
      setTimeout(() => errorTip.remove(), 3000);
    });
  }
}

/**
 * 自动滚动截图
 * @returns {Promise} 返回截图Promise
 */
async function autoScrollCapture() {
  return new Promise((resolve, reject) => {
    const segments = [];
    const viewportHeight = window.innerHeight;
    const totalHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight
    );
    let currentPosition = 0;
    
    // 创建进度提示
    const progressTip = document.createElement('div');
    progressTip.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px 20px;
      border-radius: 20px;
      font-size: 14px;
      z-index: 999999;
    `;
    document.body.appendChild(progressTip);

    // 保存原始滚动位置和页面状态
    const originalScrollPos = window.scrollY;
    const originalStyle = document.body.style.cssText;
    
    // 禁用页面滚动和动画
    document.body.style.cssText += `
      overflow: hidden !important;
      scroll-behavior: auto !important;
    `;

    // 截取当前视窗
    function captureCurrentView() {
      return new Promise((resolve, reject) => {
        const retryCount = 3;
        let currentTry = 0;

        function tryCapture() {
          currentTry++;
          // 确保页面完全停止滚动
          setTimeout(() => {
            sendMessageToExtension({
              action: 'captureVisibleTab'
            }).then(response => {
              if (response && response.dataUrl) {
                // 创建图片对象验证截图是否有效
                const img = new Image();
                img.onload = () => {
                  // 检查图片是否有效
                  if (img.width > 0 && img.height > 0) {
                    segments.push({
                      dataUrl: response.dataUrl,
                      position: currentPosition,
                      height: viewportHeight
                    });
                    resolve();
                  } else if (currentTry < retryCount) {
                    console.log(`截图无效，重试 ${currentTry}/${retryCount}`);
                    tryCapture();
                  } else {
                    reject(new Error('截图无效'));
                  }
                };
                img.onerror = () => {
                  if (currentTry < retryCount) {
                    console.log(`截图加载失败，重试 ${currentTry}/${retryCount}`);
                    tryCapture();
                  } else {
                    reject(new Error('截图加载失败'));
                  }
                };
                img.src = response.dataUrl;
              } else if (currentTry < retryCount) {
                console.log(`截图失败，重试 ${currentTry}/${retryCount}`);
                tryCapture();
              } else {
                reject(new Error('截图失败'));
              }
            }).catch(error => {
              if (currentTry < retryCount) {
                console.log(`发生错误，重试 ${currentTry}/${retryCount}`, error);
                tryCapture();
              } else {
                reject(error);
              }
            });
          }, 300); // 等待页面渲染和动画完成
        }

        tryCapture();
      });
    }

    // 递归滚动和截图
    async function scrollAndCapture() {
      try {
        // 更新进度提示
        const progress = Math.min(100, Math.round((currentPosition / totalHeight) * 100));
        progressTip.textContent = `正在截图... ${progress}%`;

        // 等待页面稳定后再截图
        await new Promise(resolve => setTimeout(resolve, 200));
        await captureCurrentView();

        // 检查是否需要继续滚动
        if (currentPosition + viewportHeight < totalHeight) {
          // 计算下一个滚动位置，添加少量重叠以确保连续性
          const overlap = 50; // 50像素的重叠区域
          const scrollAmount = viewportHeight - overlap;
          currentPosition = Math.min(currentPosition + scrollAmount, totalHeight - viewportHeight);
          
          // 使用 scrollTo 进行精确滚动
          window.scrollTo(0, currentPosition);

          // 等待滚动和重绘完成
          await new Promise(resolve => setTimeout(resolve, 300));
          return scrollAndCapture();
        } else {
          // 所有分段都已截取，开始拼接
          try {
            const finalImage = await stitchImages(segments, totalHeight, window.innerWidth);
            // 恢复页面状态
            document.body.style.cssText = originalStyle;
            window.scrollTo(0, originalScrollPos);
            progressTip.remove();
            resolve(finalImage);
          } catch (error) {
            reject(error);
          }
        }
      } catch (error) {
        reject(error);
      }
    }

    // 开始截图过程
    scrollAndCapture().catch(error => {
      // 恢复页面状态
      document.body.style.cssText = originalStyle;
      window.scrollTo(0, originalScrollPos);
      progressTip.remove();
      reject(error);
    });
  });
}

/**
 * 拼接图片
 * @param {Array} segments - 图片段数组
 * @param {number} totalHeight - 总高度
 * @param {number} width - 图片宽度
 * @returns {Promise} 返回拼接后的图片数据URL
 */
function stitchImages(segments, totalHeight, width) {
  return new Promise((resolve, reject) => {
    if (segments.length === 0) {
      reject(new Error('没有可用的图片片段'));
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = totalHeight;
    const ctx = canvas.getContext('2d');

    // 设置白色背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let loadedCount = 0;
    const totalImages = segments.length;
    const overlap = 50; // 与滚动时的重叠区域相同

    // 创建离屏canvas用于图片处理
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    segments.forEach((segment, index) => {
      const img = new Image();
      img.onload = () => {
        // 使用临时canvas处理每个片段
        tempCanvas.width = width;
        tempCanvas.height = segment.height;
        tempCtx.drawImage(img, 0, 0);

        // 计算绘制位置，考虑重叠区域
        let drawPosition = segment.position;
        if (index > 0) {
          drawPosition -= overlap * index;
        }

        // 将处理后的图片绘制到主canvas
        ctx.drawImage(
          tempCanvas,
          0, 0, width, segment.height,  // 源矩形
          0, drawPosition, width, segment.height  // 目标矩形
        );

        loadedCount++;
        if (loadedCount === totalImages) {
          // 清理临时canvas
          tempCanvas.remove();
          resolve(canvas.toDataURL('image/jpeg', 0.95));
        }
      };
      img.onerror = () => {
        reject(new Error(`图片片段 ${index + 1} 加载失败`));
      };
      img.src = segment.dataUrl;
    });
  });
}

/**
 * 处理图片加载错误
 * @param {HTMLImageElement} img - 图片元素
 * @returns {Promise} 返回处理后的Promise
 */
function handleImageLoad(img) {
  return new Promise((resolve) => {
    const timeout = 5000;
    let isResolved = false;

    // 处理跨域图片
    if (img.src.startsWith('http')) {
      img.crossOrigin = 'anonymous';
      // 添加时间戳避免缓存
      img.src = img.src + (img.src.includes('?') ? '&' : '?') + 'timestamp=' + new Date().getTime();
    }

    // 超时处理
    const timeoutId = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        // 保持原始尺寸的空白图片
        const canvas = document.createElement('canvas');
        canvas.width = img.width || 100;
        canvas.height = img.height || 100;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        img.src = canvas.toDataURL();
        resolve();
      }
    }, timeout);

    // 图片加载成功
    img.onload = () => {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timeoutId);
        resolve();
      }
    };

    // 图片加载失��时的处理
    img.onerror = () => {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timeoutId);
        
        // 尝试通过代理加载图片
        const proxyUrl = 'https://images.weserv.nl/?url=' + encodeURIComponent(img.src);
        img.src = proxyUrl;
        
        // 如果代理也失败，使用空白图片
        img.onerror = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width || 100;
          canvas.height = img.height || 100;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          img.src = canvas.toDataURL();
          resolve();
        };
      }
    };
  });
}

/**
 * 截取整个页面
 */
function captureFullPage() {
  if (screenshotState.selectedFormat === 'pdf') {
    // 显示加载提示
    const loadingTip = document.createElement('div');
    loadingTip.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px 20px;
      border-radius: 20px;
      font-size: 14px;
      z-index: 999999;
    `;
    loadingTip.textContent = '正在生成PDF，请稍候...';
    document.body.appendChild(loadingTip);

    try {
      // 保存原始滚动位置
      const originalScrollPos = window.scrollY;

      // 获取页面实际大小
      const fullWidth = Math.max(
        document.documentElement.scrollWidth,
        document.body.scrollWidth,
        document.documentElement.offsetWidth,
        document.body.offsetWidth
      );
      const fullHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
        document.documentElement.offsetHeight,
        document.body.offsetHeight
      );

      // 创建临时容器
      const tempContainer = document.createElement('div');
      tempContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: ${fullWidth}px;
        height: ${fullHeight}px;
        background: white;
        z-index: -1;
        overflow: hidden;
      `;

      // 克隆页面内容
      const clone = document.documentElement.cloneNode(true);
      // 移除不需要的元素
      const scripts = clone.getElementsByTagName('script');
      const iframes = clone.getElementsByTagName('iframe');
      while (scripts.length > 0) scripts[0].remove();
      while (iframes.length > 0) iframes[0].remove();

      tempContainer.appendChild(clone);
      document.body.appendChild(tempContainer);

      // 预加载所有图片
      const images = tempContainer.getElementsByTagName('img');
      const imagePromises = Array.from(images).map(img => handleImageLoad(img));

      // 等待所有图片加载完成
      Promise.all(imagePromises)
        .then(() => {
          loadingTip.textContent = '正在生成PDF...';
          return html2canvas(clone, {
            useCORS: true,
            allowTaint: false,
            scrollX: 0,
            scrollY: 0,
            width: fullWidth,
            height: fullHeight,
            scale: 2,
            logging: false,
            backgroundColor: '#ffffff',
            imageTimeout: 5000,
            removeContainer: true,
            foreignObjectRendering: false,
            proxy: 'https://images.weserv.nl/?url=',
            onclone: function(clonedDoc) {
              const clonedBody = clonedDoc.body;
              const allElements = clonedBody.getElementsByTagName('*');
              
              // 处理所有图片元素
              const images = clonedDoc.getElementsByTagName('img');
              Array.from(images).forEach(img => {
                if (img.src.startsWith('http')) {
                  // 尝试使用代理服务加载图片
                  const originalSrc = img.src;
                  img.crossOrigin = 'anonymous';
                  img.onerror = () => {
                    img.src = 'https://images.weserv.nl/?url=' + encodeURIComponent(originalSrc);
                  };
                }
              });

              // 处理其他元素样式
              for (let el of allElements) {
                const style = window.getComputedStyle(el);
                if (style.display === 'none') continue;
                
                // 保持原始字体样式
                el.style.fontFamily = style.fontFamily;
                el.style.fontSize = style.fontSize;
                el.style.fontWeight = style.fontWeight;
                el.style.lineHeight = style.lineHeight;
                el.style.letterSpacing = style.letterSpacing;
                
                el.style.display = style.display;
                el.style.position = style.position;
                el.style.overflow = style.overflow;
                el.style.visibility = 'visible';
                
                // 处理背景图片
                if (style.backgroundImage && style.backgroundImage !== 'none') {
                  const bgUrl = style.backgroundImage.replace(/url\(['"]?(.*?)['"]?\)/g, '$1');
                  if (bgUrl.startsWith('http')) {
                    el.style.backgroundImage = `url(https://images.weserv.nl/?url=${encodeURIComponent(bgUrl)})`;
                  }
                }
              }
            }
          });
        })
        .then(canvas => {
          loadingTip.textContent = '正在保存PDF...';
          const scaleFactor = 1.5;
          const pdfWidth = fullWidth / scaleFactor;
          const pdfHeight = fullHeight / scaleFactor;

          const pdf = new window.jspdf.jsPDF({
            orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
            unit: 'pt',
            format: [pdfWidth, pdfHeight],
            compress: true,
            hotfixes: ['px_scaling']
          });

          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, null, 'FAST');

          // 保存PDF
          const pdfData = pdf.output('datauristring');
          downloadImage(pdfData, 'fullpage.pdf');

          // 清理
          tempContainer.remove();
          loadingTip.remove();
          window.scrollTo(0, originalScrollPos);
        })
        .catch(error => {
          console.error('PDF生成失败:', error);
          loadingTip.textContent = 'PDF生成失败，请重试';
          setTimeout(() => {
            loadingTip.remove();
            window.scrollTo(0, originalScrollPos);
          }, 2000);
          if (tempContainer) {
            tempContainer.remove();
          }
        });
    } catch (error) {
      console.error('PDF处理错误:', error);
      loadingTip.textContent = 'PDF处理失败，请重试';
      setTimeout(() => loadingTip.remove(), 2000);
    }
  } else {
    // 显示加载提示
    const loadingTip = document.createElement('div');
    loadingTip.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px 20px;
      border-radius: 20px;
      font-size: 14px;
      z-index: 999999;
    `;
    loadingTip.textContent = '准备开始截图...';
    document.body.appendChild(loadingTip);

    // 使用自动滚动截图
    autoScrollCapture()
      .then(imgData => {
        downloadImage(imgData, 'fullpage.jpg');
        loadingTip.remove();
      })
      .catch(error => {
        console.error('截图失败:', error);
        loadingTip.textContent = '截图失败，请重试';
        setTimeout(() => {
          loadingTip.remove();
        }, 2000);
      });
  }
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('收到消息:', request.action);
  switch (request.action) {
    case 'startSelection':
      screenshotState.selectedFormat = request.format;
      startAreaSelection();
      break;
    case 'captureFullPage':
      screenshotState.selectedFormat = 'jpg';
      captureFullPage();
      break;
    case 'capturePDF':
      screenshotState.selectedFormat = 'pdf';
      captureFullPage();
      break;
  }
  sendResponse({ success: true });
  return true;
}); 