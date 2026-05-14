var chatHistory = [];
var attachedFiles = [];
// RPD設定を管理するオブジェクト（初期値例）
var rpdSettings = JSON.parse(localStorage.getItem('RPD_SETTINGS')) || {
    "models/gemini-1.5-flash": 1500,
    "models/gemini-1.5-pro": 50
};

// ページ読み込み時にLocalStorageからAPIキーを復元
window.onload = function() {
    var savedKey = localStorage.getItem('GEMINI_KEY');
    if (savedKey) {
        document.getElementById('apiKey').value = savedKey;
        fetchModels(); // キーがあれば自動でモデルリストを更新
    }
    updateRpdJsonArea();
};

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
        if (!response.ok) throw new Error("API Key invalid");

        var data = await response.json();
        var models = data.models.filter(m => m.supportedGenerationMethods.includes('generateContent'));

        // APIキーをLocalStorageに保存
        localStorage.setItem('GEMINI_KEY', apiKey);
        
        select.innerHTML = '';
        models.forEach(model => {
            var opt = document.createElement('option');
            opt.value = model.name;
            // RPD値があれば名前に付与
            var rpd = rpdSettings[model.name];
            var prefix = rpd ? `[${rpd}] ` : "";
            opt.innerText = prefix + (model.displayName || model.name);
        });
    } catch (err) {
        console.error(err);
    }
}

// RPD設定の保存と反映
function saveRpdSettings() {
    var jsonText = document.getElementById('rpdJsonArea').value;
    try {
        rpdSettings = JSON.parse(jsonText);
        localStorage.setItem('RPD_SETTINGS', JSON.stringify(rpdSettings));
        alert("RPD設定を保存しました。モデルリストを更新します。");
        fetchModels();
    } catch (e) {
        alert("JSONの形式が正しくありません");
    }
}

function updateRpdJsonArea() {
    document.getElementById('rpdJsonArea').value = JSON.stringify(rpdSettings, null, 2);
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