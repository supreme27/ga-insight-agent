
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
  host: 'smtp.zoho.com',
  port: 465,
  secure: true,
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

cron.schedule('15 9 * * *', sendDailyReport);
console.log('🚀 GA Insight Agent running...');
sendDailyReport();
