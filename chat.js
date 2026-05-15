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

    // Google検索ツールを最新の仕様に修正
    if (useSearch) {
        body.tools = [
            {
                google_search_retrieval: {
                    dynamic_retrieval_config: {
                        mode: "unspecified", // 自動的に検索が必要か判断
                        dynamic_threshold: 0.06 // 検索を利用する閾値（標準的な値）
                    }
                }
            }
        ];
    }

    try {
        recordRequest(model);

        var response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        // 通信は成功したが、API側でエラー（400, 500等）が返った場合
        if (!response.ok) {
            const errorText = await response.text(); // エラーの詳細JSONを取得
            throw new Error(errorText);
        }

        var data = await response.json();
        if (data.error) throw new Error(data.error.message);

        var aiText = data.candidates[0].content.parts[0].text;
        loadingDiv.innerHTML = parseMarkdown(aiText);

        // 履歴の更新
        chatHistory.push({ role: "user", parts: userParts });
        chatHistory.push({
            role: "model",
            parts: [{ text: aiText }],
            usedModel: model // モデル名を記録
        });
        
        appendMessage('ai', aiResponse, model);
    } catch (error) {
        // エラーの詳細（JSON全体やメッセージ）を画面に表示する
        loadingDiv.innerHTML = `<div style="color:red; font-weight:bold;">API Error Details:</div>
                                <pre style="white-space:pre-wrap; background:#fff1f1; padding:10px; border:1px solid #ffcccc;">${error.message}</pre>`;
        // コンソールにはオブジェクトとして出力
        try {
            console.error("Full Error Object:", error);
            console.error("Decoded Error Object:", JSON.parse(error.message));
        } catch (e) {
            console.error("Raw Error Message:", error.message);
        }
    } finally {
        document.getElementById('chatBox').scrollTop = document.getElementById('chatBox').scrollHeight;
    }
}

function appendMessage(role, text, modelName = "") {
    const chatBox = document.getElementById('chatBox');
    const msgDiv = document.createElement('div');
    msgDiv.className = `msg ${role}`;
    
    let content = text;
    if (role === 'ai' && modelName) {
        // 回答の下に小さくモデル名を表示
        content += `<div style="font-size: 10px; color: #888; margin-top: 5px; border-top: 1px dotted #ccc;">Model: ${modelName}</div>`;
    }
    
    msgDiv.innerHTML = content;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    return msgDiv
}