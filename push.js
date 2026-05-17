const https = require("https");
const http = require("http");

// GitHub Trending scraper
function fetchTrending() {
  return new Promise((resolve, reject) => {
    https.get("https://github.com/trending", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html"
      }
    }, res => {
      let html = "";
      res.on("data", c => html += c);
      res.on("end", () => {
        const repos = [];
        const re = /<article[^>]*class="Box-row"[^>]*>([\s\S]*?)<\/article>/g;
        let m;
        while ((m = re.exec(html)) && repos.length < 10) {
          const b = m[1];
          const hm = b.match(/<h2[^>]*>[\s\S]*?<a[^>]*href="(\/[^"]+)"[^>]*>/);
          const href = hm ? hm[1].trim() : "";
          const fn = href.replace(/^\//, "");
          const p = fn.split("/");
          const dm = b.match(/<p[^>]*class="[^"]*col-9[^"]*"[^>]*>([\s\S]*?)<\/p>/);
          const desc = dm ? dm[1].replace(/<[^>]+>/g, "").trim() : "";
          const lm = b.match(/<span[^>]*itemprop="programmingLanguage"[^>]*>([\s\S]*?)<\/span>/);
          const lang = lm ? lm[1].trim() : "";
          const sm = b.match(/href="\/[^"]+\/stargazers"[^>]*>[\s\S]*?([\d,]+)\s*<\/a>/);
          const st = sm ? parseInt(sm[1].replace(/,/g, "")) : 0;
          const ssm = b.match(/([\d,]+)\s*stars?\s*today/);
          const ss = ssm ? parseInt(ssm[1].replace(/,/g, "")) : 0;
          repos.push({ rank: repos.length + 1, owner: p[0] || "", name: p[1] || "", fullName: fn, description: desc, language: lang, starsTotal: st, starsSince: ss, url: "https://github.com/" + fn });
        }
        resolve(repos);
      });
      res.on("error", reject);
    }).on("error", reject);
  });
}

// Push via Server酱
function pushToWeChat(sckey, title, content) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ title: title, desp: content });
    const req = https.request({
      hostname: "sctapi.ftqq.com",
      path: "/" + sckey + ".send",
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) }
    }, res => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => resolve(JSON.parse(d)));
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  try {
    const sckey = process.env.SERVERCHAN_KEY;
    if (!sckey) { console.error("请设置 SERVERCHAN_KEY"); process.exit(1); }

    console.log("抓取 GitHub Trending...");
    const repos = await fetchTrending();
    console.log(`抓取到 ${repos.length} 个仓库`);

    // Build push content
    const title = "🔥 GitHub 今日热榜 Top 10";
    let body = repos.map(r => `**#${r.rank}** [${r.fullName}](${r.url})  ★${r.starsTotal} | +${r.starsSince} today\n> ${r.description || "暂无描述"}\n`).join("\n");
    body += `\n\n📅 更新于 ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`;

    console.log("发送推送...");
    const result = await pushToWeChat(sckey, title, body);
    console.log("推送结果:", JSON.stringify(result));
    if (result.code === 0) console.log("✅ 推送成功！手机微信应已收到");
    else console.log("推送失败:", result.message || result);

  } catch (e) {
    console.error("错误:", e.message);
  } finally {
    process.exit(0);
  }
}

run();
