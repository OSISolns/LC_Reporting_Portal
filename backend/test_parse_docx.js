const fs = require('fs');
const mammoth = require('mammoth');
const cheerio = require('cheerio');
const { parseHtmlToRoster } = require('./src/controllers/rosterController'); // oops, it's not exported.

// I will copy the core logic of the parseHtmlToRoster to see what it outputs.
