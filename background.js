// 扩展安装时的初始化
chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason === 'install') {
        // 设置默认值
        chrome.storage.local.set({
            quakeSize: 20
        });
        
        console.log('Quake View 扩展已安装');
    }
});

// 处理来自content script的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'getSettings') {
        chrome.storage.local.get(['quakeKey', 'quakeSize'], function(result) {
            sendResponse(result);
        });
        return true; // 保持消息通道开启
    }
    
    if (request.action === 'quakeQuery') {
        const { query, apiKey, size } = request.data;
        
        if (!apiKey) {
            sendResponse({ success: false, error: '缺少API Key' });
            return;
        }
        
        // 执行Quake API查询
        fetch('https://quake.360.net/api/v3/search/quake_service', {
            method: 'POST',
            headers: {
                'X-QuakeToken': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: query,
                start: 0,
                size: size,
                include: ["ip", "port", "hostname", "transport", "asn", "org", "service.name", "location.country_cn", "location.province_cn", "location.city_cn", "service.http.host", "service.http.title", "service.http.server"]
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(res => {
            if (res.code !== 0) {
                throw new Error(res.message || '查询失败');
            }
            sendResponse({ success: true, data: res.data });
        })
        .catch(error => {
            let errorMessage = '查询失败';
            
            if (error.message.includes('401')) {
                errorMessage = 'API Key无效或已过期';
            } else if (error.message.includes('403')) {
                errorMessage = 'API权限不足或已超出配额';
            } else if (error.message.includes('429')) {
                errorMessage = '请求过于频繁，请稍后重试';
            } else if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
                errorMessage = '网络连接失败，请检查网络设置或防火墙配置';
            } else if (error.message.includes('net::')) {
                errorMessage = '网络错误: ' + error.message;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            sendResponse({ success: false, error: errorMessage });
        });
        
        return true; // 保持消息通道开启以处理异步响应
    }
}); 