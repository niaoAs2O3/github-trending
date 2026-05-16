const https = require('https');
const fs = require('fs');
const path = require('path');

function fetchTrending() {
  return new Promise((resolve, reject) => {
    https.get('https://github.com/trending', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      },
      rejectUnauthorized: false
    }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error('HTTP ' + res.statusCode + ': ' + res.statusMessage));
        return;
      }
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
            owner: parts[0] || '',
            name: parts[1] || '',
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
    }).on('error', reject).setTimeout(30000, () => {
      reject(new Error('Request timeout'));
    });
  });
}

async function main() {
  const data = await fetchTrending();
  const output = {
    data,
    updatedAt: new Date().toISOString()
  };
  const outPath = path.join(__dirname, 'public', 'trending.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`Written ${data.length} repos to ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
