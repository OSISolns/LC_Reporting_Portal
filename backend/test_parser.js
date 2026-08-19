const { processDocxRoster } = require('./src/controllers/rosterController');

(async () => {
  try {
    const filePath = '/home/noble/Downloads/DUTY ROSTER FOR 17TH AUGUST 2026.docx';
    const fs = require('fs');
    const buffer = fs.readFileSync(filePath);
    
    // Simulate req object for parseDocx if needed, but wait processDocxRoster is internal?
    // Let's check how rosterController exports its functions.
  } catch (err) {
    console.error(err);
  }
})();
