const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Read from functions/.env
const envPath = path.join(__dirname, 'functions', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split('\n');
const env = {};
lines.forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const clientId = env.NAVER_CLIENT_ID;
const clientSecret = env.NAVER_CLIENT_SECRET;

console.log(`Testing with Client ID: ${clientId}`);

async function test() {
    try {
        const url = `https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving`;
        const response = await axios.get(url, {
            params: {
                start: '127.1058,37.359598',
                goal: '127.109717,37.358502',
                option: 'traoptimal'
            },
            headers: {
                "X-NCP-APIGW-API-KEY-ID": clientId,
                "X-NCP-APIGW-API-KEY": clientSecret
            }
        });
        console.log("SUCCESS: Naver API responded correctly!");
        console.log("Data sample:", JSON.stringify(response.data).substring(0, 100));
    } catch (error) {
        console.error("FAILED: Naver API returned error.");
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Data:`, JSON.stringify(error.response.data));
        } else {
            console.error(error.message);
        }
    }
}

test();
