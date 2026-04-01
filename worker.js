const runFullTest = require('./testRunner');

(async () => {
  console.log("🚀 Starting Lexpal Test...");

  const results = await runFullTest();

  console.log("✅ Test Completed\n");
  console.log(JSON.stringify(results, null, 2));
})();