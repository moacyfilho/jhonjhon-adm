const https = require('https');

// Hardcoded string from previous context
const API_KEY = '$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjcyMDEwZjRlLTVmNDUtNGM2Yi05NTY2LTgyOGY2MmJiOWNjYjo6JGFhY2hfYzc2NmVkZGQtN2MwNy00ODllLTllNTgtZjA0ZjU4MjdmMjM5';
const API_URL = 'https://sandbox.asaas.com/api/v3';

console.log('Validating Key Chars...');
let clean = true;
for (let i = 0; i < API_KEY.length; i++) {
    const code = API_KEY.charCodeAt(i);
    // console.log(i, API_KEY[i], code);
    if (code < 32 || code > 126) {
        console.log(`Bad char at ${i}: ${code}`);
        clean = false;
    }
}
if (clean) console.log('Key contains only printable ASCII.');

const url = `${API_URL}/customers?limit=1`;
const options = {
    method: 'GET',
    headers: {
        'access_token': API_KEY,
        'Content-Type': 'application/json',
        'User-Agent': 'TestScript'
    }
};

console.log(`Sending Request to ${url}...`);

try {
    const req = https.request(url, options, (res) => {
        console.log('Status:', res.statusCode);
        let d = '';
        res.on('data', chunk => d += chunk);
        res.on('end', () => console.log('Response:', d.substring(0, 200)));
    });

    req.on('error', e => console.error('Req Error:', e));
    req.end();
} catch (e) {
    console.error('Sync Error:', e);
}
