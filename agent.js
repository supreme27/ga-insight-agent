require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const cron = require('node-cron');
const nodemailer = require('nodemailer');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const analyticsClient = new BetaAnalyticsDataClient({
  credentials: JSON.parse(process.env.GA_SERVICE_ACCOUNT_JSON)
});

async function fetchGAMetrics() {
  const [response] = await analyticsClient.runReport({
    property: `properties/${process.env.GA_PROPERTY_ID}`,
    dateRanges: [{ startDate: '30daysAgo', endDate: 'yesterday' }],
    metrics: [
      { name: 'sessions' },
      { name: 'activeUsers' },
      { name: 'bounceRate' },
      { name: 'averageSessionDuration' },
      { name: 'screenPageViews' },
      { name: 'newUsers' }
    ],
    dimensions: [{ name: 'date' }],
    orderBys: [{ dimension: { dimensionName: 'date' } }]
  });
  return response;
}

async function generateInsights(metricsData) {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `Analyze this GA4 website traffic data and provide a daily insights report.
Data: ${JSON.stringify(metricsData, null, 2)}

Please provide:
1. Overall traffic summary
2. Key trends (positive and negative)
3. Anomalies or things that need attention
4. 3 specific actionable recommendations
Keep it concise and useful for a business owner.`
    }]
  });
  return message.content[0].text;
}

async function sendDailyReport() {
  console.log('🤖 Running daily GA4 analysis...');
  try {
    const metrics = await fetchGAMetrics();
    const insights = await generateInsights(metrics);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.REPORT_RECIPIENTS,
      subject: `📊 Daily GA4 Insights — ${new Date().toLocaleDateString()}`,
      text: insights
    });

    console.log('✅ Report sent successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run every day at 8:00 AM
cron.schedule('0 8 * * *', sendDailyReport);
console.log('🚀 GA Insight Agent running...');

// Uncomment the line below to send a test report immediately on startup
// sendDailyReport();
```

4. Click **"Commit changes"** → **"Commit changes"**

---

## Step 3 — Create `.gitignore`

1. **"Add file" → "Create new file"**
2. Name it `.gitignore`
3. Paste:
```
.env
node_modules/
```
4. **"Commit changes"**

---

## Step 4 — Go back to Railway

Once all 3 files are in GitHub:

1. Go to [railway.app](https://railway.app)
2. **New Project → Deploy from GitHub repo**
3. Select `supreme27/ga-insight-agent`
4. Go to **Variables** tab and add all your credentials
5. Check **Logs** for `🚀 GA Insight Agent running...`

---

Your repo should look like this when done:
```
ga-insight-agent/
├── agent.js
├── package.json
└── .gitignore
