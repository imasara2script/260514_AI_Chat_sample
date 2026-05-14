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

    var userParts = [{ text: input.value }];
    attachedFiles.forEach(f => userParts.push({ inline_data: { mime_type: f.mimeType, data: f.data } }));
    
    var userMsgDiv = appendMessage('user', input.value);
    attachedFiles.forEach(f => { var img = document.createElement('img'); img.src = f.raw; userMsgDiv.appendChild(img); });

    input.value = '';
    var currentFiles = [...attachedFiles];
    attachedFiles = [];
    renderPreviews();

    var loadingDiv = appendMessage('ai', '...');
    
    // リクエストボディの構築
    var body = {
        contents: chatHistory.concat([{ role: "user", parts: userParts }])
    };

    // Google検索ツールを動的に追加
    if (useSearch) {
        body.tools = [{ google_search_retrieval: {} }];
    }

    try {
        var response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        var data = await response.json();
        var aiText = data.candidates[0].content.parts[0].text;
        
        loadingDiv.innerHTML = parseMarkdown(aiText);
        chatHistory.push({ role: "user", parts: userParts });
        chatHistory.push({ role: "model", parts: [{ text: aiText }] });
    } catch (error) {
        loadingDiv.innerText = "Error: " + error.message;
    }
    document.getElementById('chatBox').scrollTop = document.getElementById('chatBox').scrollHeight;
}

function appendMessage(role, text) {
    var div = document.createElement('div');
    div.className = 'msg ' + role;
    div.innerText = text;
    document.getElementById('chatBox').appendChild(div);
    return div;
}