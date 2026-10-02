const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html','utf8');

assert(html.includes('href="/freelance.html"'), 'Hero should expose the paid freelance path');
assert(html.includes('pack-emploi-maroc-cv-candidatures-2'), 'Hero should expose the Pack Emploi product');
assert(html.includes('💰 الربح'), 'Main navigation should expose the revenue section');
assert(!html.includes('الدفع الحقيقي ما متفعلش حالياً'), 'Homepage should not foreground a non-selling payment disclaimer');


assert(html.includes('https://bubble.quickchat.ai/chat.js'), 'Quickchat website widget script should be embedded');
assert(html.includes('_quickchat("init", "p5i973siem")'), 'Quickchat Agent should be initialized on the site');
