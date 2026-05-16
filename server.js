const express = require('express');
const cron = require('node-cron');
const https = require('https');

const app = express();
const PORT = 3000;

let cachedData = [];
let lastFetchTime = null;

function fetchTrending() {
  return new Promise((resolve, reject) => {
    const url = 'https://github.com/trending';
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, rejectUnauthorized: false }, (res) => {
      let html = '';
      res.on('data', chunk => html += chunk);
      res.on('end', () => {
        const repos = [];
        const articleRegex = /<article[^>]*class="Box-row"[^>]*>([\s\S]*?)<\/article>/g;
        let match;
        while ((match = articleRegex.exec(html)) !== null && repos.length < 10) {
          const block = match[1];
          const h2Match = block.match(/<h2[^>]*>[\s\S]*?<a[^>]*href="(\/[^"]+)"[^>]*>/);
          const href = h2Match ? h2Match[1].trim() : '';
          const fullName = href.replace(/^\//, '');
          const parts = fullName.split('/');
          const owner = parts[0] || '';
          const name = parts[1] || '';
          const descMatch = block.match(/<p[^>]*class="[^"]*col-9[^"]*"[^>]*>([\s\S]*?)<\/p>/);
          const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '';
          const langMatch = block.match(/<span[^>]*itemprop="programmingLanguage"[^>]*>([\s\S]*?)<\/span>/);
          const language = langMatch ? langMatch[1].trim() : '';
          const starsTotalMatch = block.match(/href="\/[^"]+\/stargazers"[^>]*>[\s\S]*?([\d,]+)\s*<\/a>/);
          const starsTotal = starsTotalMatch ? parseInt(starsTotalMatch[1].replace(/,/g, '')) : 0;
          const starsSinceMatch = block.match(/([\d,]+)\s*stars?\s*today/);
          const starsSince = starsSinceMatch ? parseInt(starsSinceMatch[1].replace(/,/g, '')) : 0;
          repos.push({
            rank: repos.length + 1,
            owner,
            name,
            fullName,
            description,
            language,
            starsTotal,
            starsSince,
            url: `https://github.com/${fullName}`
          });
        }
        resolve(repos);
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function updateCache() {
  try {
    const data = await fetchTrending();
    if (data.length > 0) {
      cachedData = data;
      lastFetchTime = new Date().toISOString();
      console.log(`[${lastFetchTime}] 已更新热榜，共 ${data.length} 条`);
    }
  } catch (err) {
    console.error('抓取失败:', err.message);
  }
}

app.use(express.static('public'));

app.get('/api/trending', (req, res) => {
  res.json({ data: cachedData, updatedAt: lastFetchTime });
});

// 每天 9:00 更新
cron.schedule('0 9 * * *', updateCache);

// 启动时立即抓取一次
updateCache();

app.listen(PORT, () => {
  console.log(`服务已启动: http://localhost:${PORT}`);
});
