const fs = require('fs');
const babel = require('@babel/parser');
try {
  const code = fs.readFileSync(process.argv[2], 'utf-8');
  babel.parse(code, {
    sourceType: 'module',
    plugins: ['jsx']
  });
  console.log("No syntax errors found.");
} catch (err) {
  console.error("Syntax Error:", err.message);
}
