const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

function loadEnvFile() {
    const envPath = path.join(__dirname, '.env');

    if (!fs.existsSync(envPath)) {
        return;
    }

    const envLines = fs.readFileSync(envPath, 'utf8').split('\n');

    for (const line of envLines) {
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }

        const separatorIndex = trimmed.indexOf('=');
        if (separatorIndex === -1) {
            continue;
        }

        const key = trimmed.slice(0, separatorIndex).trim();
        const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');

        if (!(key in process.env)) {
            process.env[key] = value;
        }
    }
}

loadEnvFile();

const baseUrl = process.env.API_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const apiUrl = baseUrl.endsWith('/api/cron/reminders')
    ? baseUrl
    : `${baseUrl.replace(/\/$/, '')}/api/cron/reminders`;

console.log(`Starting Scheduler Service...`);
console.log(`Target URL: ${apiUrl}`);
console.log(`CRON_SECRET loaded: ${process.env.CRON_SECRET ? 'yes' : 'no'}`);

// Schedule task to run every minute
cron.schedule('* * * * *', async () => {
    try {
        console.log(`[${new Date().toISOString()}] Triggering Cron Job...`);
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                ...(process.env.CRON_SECRET
                    ? { Authorization: `Bearer ${process.env.CRON_SECRET}` }
                    : {}),
            }
        });

        const rawBody = await response.text();
        let data;

        try {
            data = rawBody ? JSON.parse(rawBody) : null;
        } catch {
            data = rawBody;
        }

        if (!response.ok) {
            console.error(
                `[${new Date().toISOString()}] Cron request failed with ${response.status}:`,
                typeof data === 'string' ? data.slice(0, 500) : JSON.stringify(data)
            );
            return;
        }

        if (typeof data === 'string') {
            console.error(
                `[${new Date().toISOString()}] Cron request returned non-JSON content:`,
                data.slice(0, 500)
            );
            return;
        }

        console.log(`[${new Date().toISOString()}] Success:`, JSON.stringify(data));
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error triggering cron:`, error.message);
    }
});
