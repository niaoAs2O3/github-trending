const axios = require("axios");
const cheerio = require("cheerio");
const { translate } = require("google-translate-api-x");

const SERVERCHAN_KEY = process.env.SERVERCHAN_KEY;

async function run() {
    try {
        console.log("开始抓取 GitHub Trending...");
        const response = await axios.get('https://github.com/trending');
        const $ = cheerio.load(response.data);

        let markdownContent = "";

        const items = $('.Box-row').slice(0, 10).toArray();

        for (let i = 0; i < items.length; i++) {
            const el = items[i];
            const title = $(el).find('h2 a').text().replace(/\s+/g, '').trim();
            const rawDescription = $(el).find('p').text().trim() || '暂无描述';
            const language = $(el).find('[itemprop="programmingLanguage"]').text().trim() || 'Unknown';
            const url = `https://github.com/${title}`;

            let cnDescription = rawDescription;

            if (rawDescription !== '暂无描述') {
                try {
                    console.log(`正在翻译第 ${i+1} 个项目...`);
                    const res = await translate(rawDescription, { to: 'zh-CN' });
                    cnDescription = res.text;
                } catch (err) {
                    console.log(`第 ${i+1} 个项目翻译失败，将使用原文`);
                }
            }

            markdownContent += `### ${i + 1}. [${title}](${url})\n`;
            markdownContent += `> **语言:** ${language}\n>\n`;
            markdownContent += `> **💡 简介:** ${cnDescription}\n>\n`;
            markdownContent += `> *📝 原文: ${rawDescription}*\n\n---\n\n`;
        }

        if (!markdownContent) {
            console.log("未抓取到数据！");
            return;
        }

        console.log("抓取和翻译全部完成，准备通过 Server酱 推送到微信...");

        const pushResponse = await axios.post(`https://sctapi.ftqq.com/${SERVERCHAN_KEY}.send`, {
            title: '🔥 GitHub 今日热榜 Top 10',
            desp: markdownContent
        });

        console.log('推送完成，接口返回:', pushResponse.data);

    } catch (error) {
        console.error("发生错误:", error.message);
    }
}

run();
