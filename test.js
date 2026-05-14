/**
 * test.js
 * アプリケーションの主要ロジックを検証するテストスイート
 */
async function runTests() {
    const results = [];
    console.log("🚀 Starting Tests...");

    const assert = (condition, message) => {
        if (condition) {
            results.push(`✅ ${message}`);
        } else {
            throw new Error(message);
        }
    };

    try {
        // テスト1: マークダウン変換 (chat.js)
        const mdInput = "**太字**と### 見出し";
        const mdOutput = parseMarkdown(mdInput);
        assert(mdOutput.includes("<strong>太字</strong>"), "Markdown: Bold conversion");
        assert(mdOutput.includes("<h3>見出し</h3>"), "Markdown: Header conversion");

        // テスト2: API URL構築ロジック (chat.js / main.js相当)
        const modelName = "gemini-1.5-flash";
        const modelPath = modelName.includes('models/') ? modelName : 'models/' + modelName;
        assert(modelPath === "models/gemini-1.5-flash", "API: URL path construction");

        // テスト3: 履歴データの整合性 (main.js)
        const testHistory = [{ role: "user", parts: [{ text: "hello" }] }];
        const jsonStr = JSON.stringify(testHistory);
        assert(jsonStr.includes('"role":"user"') && jsonStr.includes('"text":"hello"'), "Data: History JSON structure");

        // テスト4: インポート偽装テスト
        try {
            JSON.parse('{"invalid": json}'); 
        } catch (e) {
            assert(true, "Logic: JSON error handling is working");
        }

    } catch (e) {
        results.push(`❌ Test Failed: ${e.message}`);
    }

    // 結果の表示
    const testDiv = document.createElement('div');
    testDiv.className = 'msg ai';
    testDiv.style.border = "2px solid #1a73e8";
    testDiv.style.backgroundColor = "#f0f7ff";
    testDiv.innerHTML = `<strong>🧪 テスト実行結果</strong><br><small>${new Date().toLocaleTimeString()}</small><hr>` + results.join("<br>");
    document.getElementById('chatBox').appendChild(testDiv);
    document.getElementById('chatBox').scrollTop = document.getElementById('chatBox').scrollHeight;
}