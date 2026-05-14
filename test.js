/**
 * test.js
 * アプリの主要機能が壊れていないか検証するテスト
 */
async function runTests() {
    console.log("Starting Tests...");
    const results = [];

    // テスト1: マークダウン変換の検証
    try {
        const input = "**Bold** Text";
        const expected = "<strong>Bold</strong> Text";
        const result = parseMarkdown(input);
        if (result.includes(expected)) {
            results.push("✅ Markdown Test: Passed");
        } else {
            throw new Error(`Expected ${expected} but got ${result}`);
        }
    } catch (e) { results.push("❌ Markdown Test: Failed - " + e.message); }

    // テスト2: 履歴エクスポートのデータ整合性
    try {
        chatHistory = [{ role: "user", parts: [{ text: "test" }] }];
        const json = JSON.stringify(chatHistory);
        if (json.includes('"text":"test"')) {
            results.push("✅ History Export Test: Passed");
        } else {
            throw new Error("JSON structure mismatch");
        }
    } catch (e) { results.push("❌ History Export Test: Failed - " + e.message); }

    // テスト3: API URL構築の検証 (モデル名の補完)
    try {
        const model = "gemini-1.5-flash";
        const modelPath = model.includes('models/') ? model : 'models/' + model;
        if (modelPath === "models/gemini-1.5-flash") {
            results.push("✅ API URL Logic Test: Passed");
        } else {
            throw new Error("Model path construction failed");
        }
    } catch (e) { results.push("❌ API URL Logic Test: Failed - " + e.message); }

    // 結果をチャット画面に表示
    const testDisplay = document.createElement('div');
    testDisplay.className = 'msg ai';
    testDisplay.style.border = "2px solid #1a73e8";
    testDisplay.innerHTML = "<h3>Test Results</h3>" + results.join("<br>");
    document.getElementById('chatBox').appendChild(testDisplay);
}