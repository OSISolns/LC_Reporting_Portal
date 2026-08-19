const fs = require('fs');
const { parseRoster } = require('./src/controllers/rosterController');

const filePath = '/home/noble/Downloads/DUTY ROSTER FOR 17TH AUGUST 2026.docx';
const mockReq = {
  file: {
    originalname: 'Duty_Roster.docx',
    buffer: fs.readFileSync(filePath)
  }
};

const mockRes = {
  json: function(data) {
    console.log(JSON.stringify(data.parsedUnits, null, 2));
  },
  status: function(code) {
    return this;
  }
};

parseRoster(mockReq, mockRes).catch(console.error);
