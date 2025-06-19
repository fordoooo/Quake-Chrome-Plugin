// 监听来自popup的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'startQuakeQuery') {
        try {
            startQuakeFind();
            sendResponse({success: true});
        } catch (error) {
            sendResponse({success: false, error: error.message});
        }
        return true; // 保持消息通道开启
    }
});

function startQuakeFind() {
    chrome.storage.local.get(['quakeKey', 'quakeSize'], function(result) {
        const API_KEY = result.quakeKey;
        const querySize = result.quakeSize || 20;
        
        if (!API_KEY) {
            alert("请先设置Quake API Key");
            return;
        }

        createQuakeUI();
        
        const target = window.location.hostname;
        const isIP = /(\d{1,3}\.){3}\d{1,3}/.test(target);
        
        // 构造Quake查询语句
        const query = isIP ? `ip:${target}` : `host:${target}`;
        
        // 通过background script发送查询请求
        chrome.runtime.sendMessage({
            action: 'quakeQuery',
            data: {
                query: query,
                apiKey: API_KEY,
                size: querySize
            }
        }, function(response) {
            if (chrome.runtime.lastError) {
                alert("通信失败，请重试");
                return;
            }
            
            if (response.success) {
                const data = response.data || [];
                if (data.length === 0) {
                    alert("未找到相关数据");
                    return;
                }
                updateQuakeUI(data);
            } else {
                alert(`查询失败: ${response.error || '请检查网络连接和API Key'}`);
            }
        });
    });
}

function createQuakeUI() {
    // 移除已存在的UI
    const existingUI = document.getElementById('quakeMainUI');
    if (existingUI) {
        existingUI.remove();
    }
    
    const existingBtn = document.getElementById('expandBtn');
    if (existingBtn) {
        existingBtn.remove();
    }

    const body = document.body;
    const mainDiv = document.createElement("div");
    mainDiv.id = "quakeMainUI";
    mainDiv.style = `
        position: fixed; left: 20px; top: 20px; width: 800px; height: 600px;
        background-color: #fff; border-radius: 8px; border: 1px solid #ebebeb;
        box-shadow: 0 2px 12px rgba(0,0,0,0.15); z-index: 1000000;
        padding: 12px; display: flex; flex-direction: column;
    `;
    
    mainDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
          <div style="font-weight: bold; color: #1890ff; font-size: 16px;">🚀 Quake 查询结果</div>
          <div id="hideBtn" style="cursor: pointer; font-size: 12px; color: rgb(96, 98, 102); padding: 2px 6px; border-radius: 3px; transition: background-color 0.2s;">隐藏</div>
        </div>
        
        <div id="contentDiv" style="flex: 1; display: flex; flex-direction: column; background-color: #fff;">
            <div style="padding: 12px; background-color: #f8f9fa; border-radius: 6px; margin-bottom: 12px;">
                <div style="margin-bottom: 8px; display: flex; align-items: center;">
                  <div style="margin-right: 12px; white-space: nowrap; font-weight: 500; min-width: 60px;">IP段:</div>
                  <div class="ip_cidr" style="word-wrap: break-word; word-break: normal; overflow: hidden; color: #2c3e50;">N/A</div>
                </div>
                <div style="margin-bottom: 8px; display: flex; align-items: center;">
                  <div style="margin-right: 12px; white-space: nowrap; font-weight: 500; min-width: 60px;">地区:</div>
                  <div class="location" style="word-wrap: break-word; word-break: normal; overflow: hidden; color: #2c3e50;">null</div>
                </div>
                <div style="margin-bottom: 8px; display: flex; align-items: center;">
                  <div style="margin-right: 12px; white-space: nowrap; font-weight: 500; min-width: 60px;">运营商:</div>
                  <div class="org" style="word-wrap: break-word; word-break: normal; overflow: hidden; color: #2c3e50;">null</div>
                </div>
                <div style="margin-bottom: 8px; display: flex; align-items: center;">
                  <div style="margin-right: 12px; white-space: nowrap; font-weight: 500; min-width: 60px;">协议:</div>
                  <div class="protocol" style="word-wrap: break-word; word-break: normal; overflow: hidden; color: #2c3e50;">null</div>
                </div>
                <div style="margin-bottom: 0; display: flex; align-items: center;">
                  <div style="margin-right: 12px; white-space: nowrap; font-weight: 500; min-width: 60px;">端口:</div>
                  <div class="port" style="word-wrap: break-word; overflow: hidden; color: #2c3e50;">null</div>
                </div>
            </div>
            
            <div class="copy-text-data" style="cursor: pointer; display: flex; justify-content: flex-end; padding: 8px 12px; border-top: 1px solid #ebebeb; border-bottom: 1px solid #ebebeb; background-color: #f8f9fa; margin-bottom: 8px; font-size: 12px; color: #666; transition: background-color 0.2s;">
                📋 复制结果
            </div>
            
            <div class="demo1" style="flex: 1; overflow: auto; background-color: #fff;">
                <div style="display: flex; background-color: #f1f3f4; padding: 8px 0; font-weight: 500; border-bottom: 1px solid #e1e4e8;">
                  <div style="padding: 0 12px; min-width: 120px; border-right: 1px solid #e1e4e8;">
                    <div class="table_service" style="font-size: 12px;">标题</div>
                  </div>
                  <div style="padding: 0 12px; min-width: 80px; border-right: 1px solid #e1e4e8;">
                    <div class="table_protocol" style="font-size: 12px;">协议</div>
                  </div>
                  <div style="padding: 0 12px; min-width: 60px; border-right: 1px solid #e1e4e8;">
                    <div class="table_port" style="font-size: 12px;">端口</div>
                  </div>
                  <div style="padding: 0 12px; min-width: 100px; border-right: 1px solid #e1e4e8;">
                    <div class="table_product" style="font-size: 12px;">Server</div>
                  </div>
                  <div style="padding: 0 12px; flex: 1;">
                    <div class="table_url" style="font-size: 12px;">URL</div>
                  </div>
                </div>
            </div>
        </div>
    `;
    
    body.appendChild(mainDiv);

    const expandBtn = document.createElement("div");
    expandBtn.id = "expandBtn";
    expandBtn.innerText = "Quake展开";
    expandBtn.style = `
        position: fixed; left: 20px; top: 20px; padding: 5px 10px;
        background-color: #fff; border: 1px solid #ebebeb;
        border-radius: 5px; box-shadow: 0 2px 12px rgba(0,0,0,0.15);
        color: rgb(24, 36, 127); font-size: 12px; cursor: pointer;
        display: none;
    `;
    body.appendChild(expandBtn);

    // 绑定事件
    const hideBtn = document.getElementById("hideBtn");
    hideBtn.onclick = function () {
        mainDiv.style.display = "none";
        expandBtn.style.display = "block";
    };
    
    // 添加hover效果
    hideBtn.onmouseover = function() {
        this.style.backgroundColor = '#f0f0f0';
    };
    hideBtn.onmouseout = function() {
        this.style.backgroundColor = 'transparent';
    };

    expandBtn.onclick = function () {
        mainDiv.style.display = "flex";
        expandBtn.style.display = "none";
    };
    
    // 复制功能
    const copyBtn = document.querySelector('.copy-text-data');
    copyBtn.onclick = function() {
        const content = getResultsText();
        navigator.clipboard.writeText(content).then(() => {
            alert('结果已复制到剪贴板');
        }).catch(() => {
            alert('复制失败');
        });
    };
    
    // 添加复制按钮hover效果
    copyBtn.onmouseover = function() {
        this.style.backgroundColor = '#e9ecef';
    };
    copyBtn.onmouseout = function() {
        this.style.backgroundColor = '#f8f9fa';
    };
}

function updateQuakeUI(data) {
    // 更新基本信息
    const firstResult = data[0];
    document.querySelector('.ip_cidr').textContent =
        `${firstResult.ip}/${firstResult.ip_cidr_num || 24}`;

    document.querySelector('.location').textContent = [
        firstResult.location?.country_cn,
        firstResult.location?.province_cn,
        firstResult.location?.city_cn
    ].filter(item => item).join('-') || 'N/A';

    document.querySelector('.org').textContent = [
        firstResult.org,
    ].filter(item => item).join(' ') || 'N/A';

    // 协议和端口（去重）
    const protocols = [...new Set(data.map(d => d.service?.name))].filter(Boolean);
    document.querySelector('.protocol').textContent = protocols.join(',') || 'N/A';

    const ports = [...new Set(data.map(d => d.port))].filter(Boolean);
    document.querySelector('.port').textContent = ports.join(',') || 'N/A';

    // 构建表格数据
    let tableContent = '';
    
    data.forEach((item, index) => {
        const title = item.service?.http?.title || 'N/A';
        const serviceName = item.service?.name || 'N/A';
        const serverhttp = item.service?.http?.server || 'N/A';
        const port = item.port || 0;

        // URL生成逻辑
        const protocol = serviceName.toLowerCase();
        const showPort = ![80, 443].includes(port) && port > 0;
        const adjustedProtocol = (protocol === 'http/ssl') ? 'https' : protocol;
        const url = `${adjustedProtocol}://${item.service?.http?.host || item.ip}${showPort ? ':' + port : ''}`;

        // URL部分
        const isHttpOrHttps = ['http', 'https'].includes(adjustedProtocol.toLowerCase());
        const urlDisplay = url ? 
            (isHttpOrHttps ? 
                `<a href="${url}" target="_blank" style="color: #1890ff; text-decoration: none;">${url}</a>` :
                `<span style="color: #666;">${url}</span>`
            ) : 'N/A';

        tableContent += `
            <div style="display: flex; padding: 8px 0; border-bottom: 1px solid #f1f3f4; ${index % 2 === 0 ? 'background-color: #fafbfc;' : 'background-color: #fff;'}">
                <div style="padding: 0 12px; min-width: 120px; border-right: 1px solid #e1e4e8; font-size: 12px; word-break: break-all;">${title}</div>
                <div style="padding: 0 12px; min-width: 80px; border-right: 1px solid #e1e4e8; font-size: 12px;">${serviceName}</div>
                <div style="padding: 0 12px; min-width: 60px; border-right: 1px solid #e1e4e8; font-size: 12px;">${port}</div>
                <div style="padding: 0 12px; min-width: 100px; border-right: 1px solid #e1e4e8; font-size: 12px; word-break: break-all;">${serverhttp}</div>
                <div style="padding: 0 12px; flex: 1; font-size: 12px; word-break: break-all;">${urlDisplay}</div>
            </div>
        `;
    });

    // 添加表格内容到demo1容器
    document.querySelector('.demo1').innerHTML += tableContent;
}

function getResultsText() {
    const ip_cidr = document.querySelector('.ip_cidr').textContent;
    const location = document.querySelector('.location').textContent;
    const org = document.querySelector('.org').textContent;
    const protocol = document.querySelector('.protocol').textContent;
    const port = document.querySelector('.port').textContent;
    
    return `IP段: ${ip_cidr}\n地区: ${location}\n运营商: ${org}\n协议: ${protocol}\n端口: ${port}`;
} 