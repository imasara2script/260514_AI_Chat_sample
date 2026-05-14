function handlePaste(e) {
    var items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (var i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) processFile(items[i].getAsFile());
    }
}

function handleFiles(files) {
    for (var i = 0; i < files.length; i++) processFile(files[i]);
}

function processFile(file) {
    var reader = new FileReader();
    reader.onload = e => {
        attachedFiles.push({ mimeType: file.type, data: e.target.result.split(',')[1], raw: e.target.result });
        renderPreviews();
    };
    reader.readAsDataURL(file);
}

function renderPreviews() {
    var container = document.getElementById('previewContainer');
    container.innerHTML = attachedFiles.map((f, i) => 
        `<div class="preview-item"><img src="${f.raw}"><button class="remove-btn" onclick="attachedFiles.splice(${i},1);renderPreviews()">✕</button></div>`
    ).join('');
}

function parseMarkdown(text) {
    return text.replace(/^### (.*$)/gim, '<h3>$1</h3>')
               .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
               .replace(/^\s*[\-\*]\s+(.*$)/gim, '<ul><li>$1</li></ul>')
               .replace(/\n/g, '<br>');
}

async function sendMessage() {
    var input = document.getElementById('userInput');
    var apiKey = sessionStorage.getItem('GEMINI_KEY') || document.getElementById('apiKey').value;
    var model = document.getElementById('modelSelect').value;
    var useSearch = document.getElementById('useSearch').checked;
    
    if (!input.value.trim() && attachedFiles.length === 0) return;
    if (!apiKey || !model) return alert("APIキーとモデルを選択してください");

    // ユーザーメッセージの表示
    var userText = input.value;
    var userMsgDiv = appendMessage('user', userText);
    attachedFiles.forEach(function(f) {
        var img = document.createElement('img');
        img.src = f.raw;
        userMsgDiv.appendChild(img);
    });

    // API用データ構築
    var userParts = [{ text: userText || "画像を解析してください" }];
    attachedFiles.forEach(function(f) {
        userParts.push({ inline_data: { mime_type: f.mimeType, data: f.data } });
    });

    input.value = '';
    var currentFiles = attachedFiles.concat();
    attachedFiles = [];
    renderPreviews();

    var loadingDiv = appendMessage('ai', '回答生成中...');
    
    // URLの組み立て (models/ が重複しないように処理)
    var modelPath = model.includes('models/') ? model : 'models/' + model;
    var url = 'https://generativelanguage.googleapis.com/v1beta/' + modelPath + ':generateContent?key=' + apiKey;

    // リクエストボディ
    var body = {
        contents: chatHistory.concat([{ role: "user", parts: userParts }])
    };

    // Google検索ツールの設定 (最新の形式)
    if (useSearch) {
        body.tools = [{ google_search: {} }]; 
    }

    try {
        var response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        var data = await response.json();
        if (data.error) throw new Error(data.error.message);

        var aiText = data.candidates[0].content.parts[0].text;
        loadingDiv.innerHTML = parseMarkdown(aiText);

        // 履歴の更新
        chatHistory.push({ role: "user", parts: userParts });
        chatHistory.push({ role: "model", parts: [{ text: aiText }] });

    } catch (error) {
        loadingDiv.innerText = "Error: " + error.message;
        loadingDiv.style.color = "red";
    } finally {
        document.getElementById('chatBox').scrollTop = document.getElementById('chatBox').scrollHeight;
    }
}

function appendMessage(role, text) {
    var div = document.createElement('div');
    div.className = 'msg ' + role;
    div.innerText = text;
    document.getElementById('chatBox').appendChild(div);
    return div;
}