var chatHistory = [];
var attachedFiles = [];

function handleKeyDown(e) {
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
    }
}

async function fetchModels() {
    var apiKey = document.getElementById('apiKey').value.trim();
    var select = document.getElementById('modelSelect');
    if (!apiKey) return alert("APIキーを入力してください");
    try {
        var response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey);
        var data = await response.json();
        var models = data.models.filter(m => m.supportedGenerationMethods.includes('generateContent'));
        select.innerHTML = '';
        models.forEach(model => {
            var opt = document.createElement('option');
            opt.value = model.name;
            opt.innerText = model.displayName || model.name;
            if(model.name.includes('1.5-flash')) opt.selected = true;
            select.appendChild(opt);
        });
        sessionStorage.setItem('GEMINI_KEY', apiKey);
    } catch (err) { alert("モデル取得エラー"); }
}

// 履歴のエクスポート
function exportHistory() {
    if (chatHistory.length === 0) return alert("履歴がありません");
    var blob = new Blob([JSON.stringify(chatHistory, null, 2)], {type: 'application/json'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'chat_history_' + Date.now() + '.json';
    a.click();
}

// 履歴のインポート
function importHistory(input) {
    var file = input.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
        try {
            var imported = JSON.parse(e.target.result);
            chatHistory = imported;
            rebuildChatDisplay();
        } catch (err) { alert("無効なJSONファイルです"); }
    };
    reader.readAsText(file);
}

function rebuildChatDisplay() {
    var chatBox = document.getElementById('chatBox');
    chatBox.innerHTML = '';
    chatHistory.forEach(item => {
        var msgDiv = appendMessage(item.role === 'user' ? 'user' : 'ai', "");
        var textContent = item.parts.map(p => p.text || "").join("\n");
        if (item.role === 'model') {
            msgDiv.innerHTML = parseMarkdown(textContent);
        } else {
            msgDiv.innerText = textContent;
            // インポート時に画像データがあれば表示する処理などは必要に応じて追加
        }
    });
}