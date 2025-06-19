document.addEventListener('DOMContentLoaded', function() {
    const apiKeyInput = document.getElementById('apiKey');
    const querySizeInput = document.getElementById('querySize');
    const saveApiKeyBtn = document.getElementById('saveApiKey');
    const saveQuerySizeBtn = document.getElementById('saveQuerySize');
    const startQuakeBtn = document.getElementById('startQuake');
    const statusDiv = document.getElementById('status');

    // 加载保存的设置
    loadSettings();

    // 保存API Key
    saveApiKeyBtn.addEventListener('click', function() {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            chrome.storage.local.set({ quakeKey: apiKey }, function() {
                showStatus('API Key 保存成功！', 'success');
            });
        } else {
            showStatus('请输入有效的API Key', 'error');
        }
    });

    // 保存查询页数
    saveQuerySizeBtn.addEventListener('click', function() {
        const size = parseInt(querySizeInput.value);
        if (size && size > 0 && size <= 100) {
            chrome.storage.local.set({ quakeSize: size }, function() {
                showStatus(`查询页数已设置为: ${size}`, 'success');
            });
        } else {
            showStatus('请输入有效的查询页数 (1-100)', 'error');
        }
    });

    // 开始Quake查询
    startQuakeBtn.addEventListener('click', function() {
        chrome.storage.local.get(['quakeKey'], function(result) {
            if (!result.quakeKey) {
                showStatus('请先设置API Key', 'error');
                return;
            }

            // 获取当前活动标签页
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                if (tabs[0]) {
                    const tab = tabs[0];
                    // 首先检查页面URL
                    const url = tab.url;
                    if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('edge://') || url.startsWith('about:')) {
                        showStatus('此页面不支持扩展功能，请访问普通网页', 'error');
                        return;
                    }
                    
                    // 确保content script已注入
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['content.js']
                    }, function() {
                        if (chrome.runtime.lastError) {
                            showStatus('脚本注入失败，请刷新页面重试', 'error');
                            return;
                        }
                        
                        // 等待一下确保脚本加载完成
                        setTimeout(() => {
                            // 向content script发送消息
                            chrome.tabs.sendMessage(tab.id, {
                                action: 'startQuakeQuery'
                                                    }, function(response) {
                            if (chrome.runtime.lastError) {
                                showStatus('页面通信失败，请刷新页面重试', 'error');
                            } else if (response && response.success) {
                                    showStatus('正在查询...', 'success');
                                    setTimeout(() => window.close(), 1000); // 延迟关闭popup
                                } else {
                                    showStatus('启动查询失败', 'error');
                                }
                            });
                        }, 100);
                    });
                } else {
                    showStatus('无法获取当前页面信息', 'error');
                }
            });
        });
    });

    function loadSettings() {
        chrome.storage.local.get(['quakeKey', 'quakeSize'], function(result) {
            if (result.quakeKey) {
                apiKeyInput.value = result.quakeKey;
            }
            if (result.quakeSize) {
                querySizeInput.value = result.quakeSize;
            } else {
                querySizeInput.value = 20; // 默认值
            }
        });
    }

    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.className = 'status';
        }, 3000);
    }
}); 