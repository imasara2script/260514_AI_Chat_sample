var aiSettings = JSON.parse(localStorage.getItem('AI_SETTINGS')) || {};
var requestLogs = JSON.parse(localStorage.getItem('REQUEST_LOGS')) || {};

try {
    const savedRpd = localStorage.getItem('RPD_SETTINGS');
    if (savedRpd) aiSettings = JSON.parse(savedRpd);
} catch (e) {
    console.error("RPD settings parse error:", e);
    aiSettings = {};
}

function saveSettings() {
    localStorage.setItem('AI_SETTINGS', JSON.stringify(aiSettings));
}

// 24時間以内のリクエスト数をカウントし、古いログを掃除する
function getRequestCount(modelName) {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    if (!requestLogs[modelName]) return 0;
    
    // 24時間より前のログを除外
    requestLogs[modelName] = requestLogs[modelName].filter(ts => ts > oneDayAgo);
    localStorage.setItem('REQUEST_LOGS', JSON.stringify(requestLogs));
    
    return requestLogs[modelName].length;
}

// リクエスト実行時に記録する
function recordRequest(modelName) {
    if (!requestLogs[modelName]) requestLogs[modelName] = [];
    requestLogs[modelName].push(Date.now());
    localStorage.setItem('REQUEST_LOGS', JSON.stringify(requestLogs));
    updateUsageDisplay(); // 表示を更新
}

