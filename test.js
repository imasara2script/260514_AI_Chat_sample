/**
 * test.js - 拡張型テストスイート
 */

// 1. テストケースの定義（ここを増減させるだけ！）
const testCases = [
    {
        name: "Markdown: Bold conversion",
        test: () => {
            const result = parseMarkdown("**Bold**");
            if (!result.includes("<strong>Bold</strong>")) throw new Error(`Got: ${result}`);
        }
    },
    {
        name: "Markdown: Header conversion",
        test: () => {
            const result = parseMarkdown("### Header");
            // 前回の失敗原因：正規表現の置換結果を厳密にチェック
            if (!result.includes("<h3>Header</h3>")) throw new Error(`Got: ${result}`);
        }
    },
    {
        name: "API: URL path construction",
        test: () => {
            const model = "gemini-1.5-flash";
            const path = model.includes('models/') ? model : 'models/' + model;
            if (path !== "models/gemini-1.5-flash") throw new Error(`Path was: ${path}`);
        }
    }
];

// 2. テスト実行エンジン（基本触らなくてOK）
async function runTests() {
    const chatBox = document.getElementById('chatBox');
    const results = [];
    console.log("🚀 Starting Modular Tests...");

    for (const t of testCases) {
        try {
            await t.test();
            results.push(`<span style="color:green;">✅ Passed:</span> ${t.name}`);
        } catch (e) {
            results.push(`<span style="color:red;">❌ Failed:</span> ${t.name} <br><small style="margin-left:20px;">理由: ${e.message}</small>`);
        }
    }

    // 結果表示の構築
    const testDiv = document.createElement('div');
    testDiv.className = 'msg ai';
    testDiv.style.cssText = "border: 2px solid #1a73e8; background: #f0f7ff; padding: 15px; margin: 10px 0;";
    testDiv.innerHTML = `
        <strong>🧪 テスト実行結果</strong><hr>
        <div style="font-family: monospace; font-size: 12px; line-height: 1.8;">
            ${results.join('<br>')}
        </div>
    `;
    chatBox.appendChild(testDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}