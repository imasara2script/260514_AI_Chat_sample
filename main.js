var chatHistory = [];
var attachedFiles = [];
// RPD設定を管理するオブジェクト（初期値例）
var rpdSettings = JSON.parse(localStorage.getItem('RPD_SETTINGS')) || {};

// ページ読み込み時にLocalStorageからAPIキーを復元
window.addEventListener('DOMContentLoaded', (event) => {
    var savedKey = localStorage.getItem('GEMINI_KEY');
    if (savedKey) {
        document.getElementById('apiKey').value = savedKey;
        // キーがある場合はリストを更新
        fetchModels();
    }
    // JSONエリアがあれば初期値をセット
    var rpdArea = document.getElementById('rpdJsonArea');
    if (rpdArea) {
        updateRpdJsonArea();
    }
});

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
        console.error("Fetch Models Error:", err);
        alert("モデルリストの取得に失敗しました。APIキーを確認してください。");
    }
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
// main.js

// 1. 選択中のモデルにRPDを設定する
function updateCurrentModelRpd() {
    var select = document.getElementById('modelSelect');
    var rpdInput = document.getElementById('currentRpd');
    var modelName = select.value;

    if (!modelName) return alert("モデルを選択してください");
    
    var val = parseInt(rpdInput.value);
    if (isNaN(val)) return alert("有効な数値を入力してください");

    rpdSettings[modelName] = val;
    localStorage.setItem('RPD_SETTINGS', JSON.stringify(rpdSettings));
    
    updateRpdJsonArea(); // JSON表示を更新
    fetchModels();       // リストの表示名 [RPD] を更新
    alert(modelName + " のRPDを " + val + " に設定しました");
}

// 2. JSONエリアの書き換えから全体を更新する
function saveRpdFromJson() {
    var jsonText = document.getElementById('rpdJsonArea').value;
    try {
        rpdSettings = JSON.parse(jsonText);
        localStorage.setItem('RPD_SETTINGS', JSON.stringify(rpdSettings));
        fetchModels();
        alert("JSON設定を反映しました");
    } catch (e) {
        alert("JSONの形式が正しくありません");
    }
}

// 3. モデル選択が変わった時に、入力ボックスの値を同期させる
document.getElementById('modelSelect').addEventListener('change', function() {
    var modelName = this.value;
    var rpdInput = document.getElementById('currentRpd');
    rpdInput.value = rpdSettings[modelName] || "";
});
