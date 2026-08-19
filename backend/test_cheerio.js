const cheerio = require('cheerio');
const html = '<p><strong>(From 9am-5pm)<br /></strong>Dr. Gakindi Leornard</p>';
const $ = cheerio.load(html);
$('br').replaceWith('\n'); // <--- DOES THIS HELP?
const text = $('p').text();
console.log(text);
const parts = text.split('\n');
console.log(parts);
