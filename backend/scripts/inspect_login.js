const axios = require('axios');
const cheerio = require('cheerio');

async function check() {
  const loginGet = await axios.get('http://41.173.250.126:8081/Legacy/forms/fm_login.aspx');
  const $ = cheerio.load(loginGet.data);
  $('input').each((i, el) => {
    console.log($(el).attr('name'), $(el).attr('type'));
  });
}
check();
