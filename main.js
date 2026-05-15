var chatHistory = [];
var attachedFiles = [];
// RPD設定を管理するオブジェクト（初期値例）
var rpdSettings = {};

try {
    const savedRpd = localStorage.getItem('RPD_SETTINGS');
    if (savedRpd) rpdSettings = JSON.parse(savedRpd);
} catch (e) {
    console.error("RPD settings parse error:", e);
    rpdSettings = {};
}

// ページ読み込み時にLocalStorageからAPIキーを復元
window.addEventListener('DOMContentLoaded', (event) => {
    var savedKey = localStorage.getItem('GEMINI_KEY');
    if (savedKey) {
        document.getElementById('apiKey').value = savedKey;
        // キーがある場合はリストを更新
        fetchModels();
    }
    updateRpdJsonArea();
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
        if (!response.ok) throw new Error("API Key invalid",response);

        var data = await response.json();
        var models = data.models.filter(m => m.supportedGenerationMethods.includes('generateContent'));
        console.log("models",models)

        // APIキーをLocalStorageに保存
        localStorage.setItem('GEMINI_KEY', apiKey);
        
        // 1. 各モデルの表示用オブジェクトを作成
        const modelListWithLabels = models.map(model => {
            const rpd = rpdSettings[model.name];
            const hasRpd = (rpd !== undefined && rpd !== null);
            const rpdVal = hasRpd ? rpd : -1; // 未設定は-1

            // 背景色のクラス判定
            let colorClass = "rpd-none";
            if (hasRpd) {
                if (rpd === 0) colorClass = "rpd-zero";
                else if (rpd < 100) colorClass = "rpd-low";
                else if (rpd < 1000) colorClass = "rpd-mid";
                else colorClass = "rpd-high";
            }
            
            // 0を許容するため、undefined/nullチェックに変更
            const prefix = hasRpd ? `[${rpd}] ` : "";
            return {
                id: model.name,
                label: prefix + (model.displayName || model.name),
                rpd: rpdVal,
                className: colorClass
            };
        });

        // 2. 表示名（label）で名前順にソート
        modelListWithLabels.sort((a, b) => a.label.localeCompare(b.label, 'ja', { numeric: true }));

        // 3. セレクトボックスに反映
        select.innerHTML = '<option value="">モデルを選択</option>';

        let maxRpd = -1;
        let maxRpdId = "";

        modelListWithLabels.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.innerText = m.label;
            if (m.className) opt.className = m.className;
            select.appendChild(opt);

            // 最大RPDのモデルを記録
            if (m.rpd > maxRpd) {
                maxRpd = m.rpd;
                maxRpdId = m.id;
            }
        });

        if (maxRpdId){ select.value = maxRpdId; }
        
        // RPD入力欄との連動および色の更新
        select.onchange = () => {
            const rpdInput = document.getElementById('currentRpd');
            if (rpdInput) {
                const currentVal = rpdSettings[select.value];
                rpdInput.value = (currentVal !== undefined && currentVal !== null) ? currentVal : "";
            }
            updateSelectColor(); // 色を更新
        };
        
        // 初期選択状態の反映
        if (select.value) {
            select.dispatchEvent(new Event('change'));
        }
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
    const area = document.getElementById('rpdJsonArea');
    try {
        rpdSettings = JSON.parse(area.value);
        localStorage.setItem('RPD_SETTINGS', JSON.stringify(rpdSettings));
        fetchModels();
        closeRpdModal(); // 閉じる
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

function updateRpdJsonArea() {
    document.getElementById('rpdJsonArea').value = JSON.stringify(rpdSettings, null, 2);
}

// 選択中のモデルに応じて、select要素自体の背景色を更新する関数
function updateSelectColor() {
    const select = document.getElementById('modelSelect');
    const selectedOption = select.options[select.selectedIndex];
    
    // 一旦全ての背景色クラスを削除
    select.classList.remove('rpd-zero', 'rpd-low', 'rpd-mid', 'rpd-high');
    
    // 選択されたoptionのクラスをselect本体にコピー
    if (selectedOption && selectedOption.className) {
        select.classList.add(selectedOption.className);
    }
}

function openRpdModal() {
    updateRpdJsonArea(); // 最新の状態を反映
    document.getElementById('rpdModal').style.display = 'flex';
}

function closeRpdModal() {
    document.getElementById('rpdModal').style.display = 'none';
}
