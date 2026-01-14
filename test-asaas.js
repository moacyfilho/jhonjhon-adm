const https = require('https');
const fs = require('fs');
const path = require('path');

// Read .env manually to avoid package issues
const envPath = path.resolve(process.cwd(), '.env');
try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            let key = match[1].trim();
            let value = match[2].trim();
            if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
                value = value.slice(1, -1);
            }
            envVars[key] = value;
        }
    });

    const API_KEY = envVars.ASAAS_API_KEY;
    const API_URL = envVars.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';

    console.log('Testing Asaas Connection...');
    console.log('URL:', API_URL);
    console.log('Key found:', !!API_KEY);
    if (API_KEY) {
        console.log('Key length:', API_KEY.length);
        console.log('Key preview:', API_KEY.substring(0, 10) + '...');
    }

    // Simple GET request to /customers
    const url = `${API_URL}/customers?limit=1`;
    const options = {
        method: 'GET',
        headers: {
            'access_token': API_KEY,
            'Content-Type': 'application/json',
            'User-Agent': 'Node.js Test Script'
        }
    };

    console.log('Sending request to:', url);

    const req = https.request(url, options, (res) => {
        console.log('Response Status:', res.statusCode);
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            console.log('Response Body:', data.substring(0, 1000));
        });
    });

    req.on('error', (e) => {
        console.error('Request Error:', e);
    });

    req.end();

} catch (err) {
    console.error('Error reading .env or running script:', err);
}
