const cron = require('node-cron');
const apiUrl = process.env.API_URL || 'http://localhost:3000/api/cron/reminders';

console.log(`Starting Scheduler Service...`);
console.log(`Target URL: ${apiUrl}`);

// Schedule task to run every minute
cron.schedule('* * * * *', async () => {
    try {
        console.log(`[${new Date().toISOString()}] Triggering Cron Job...`);
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                // If you implemented authentication in the route, add the header here
                // 'Authorization': `Bearer ${process.env.CRON_SECRET}`
            }
        });

        const data = await response.json();
        console.log(`[${new Date().toISOString()}] Success:`, JSON.stringify(data));
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error triggering cron:`, error.message);
    }
});
