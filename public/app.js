const app = document.getElementById('app');
const updateTimeEl = document.getElementById('updateTime');
const langColors = {
  'JavaScript': '#f1e05a', 'TypeScript': '#3178c6', 'Python': '#3572A5',
  'Java': '#b07219', 'Go': '#00ADD8', 'Rust': '#dea584', 'C++': '#f34b7d',
  'C': '#555555', 'Ruby': '#701516', 'Swift': '#F05138', 'Kotlin': '#A97BFF'
};

function formatNum(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toString();
}

function renderCard(repo) {
  const color = langColors[repo.language] || '#8b949e';
  const rankClass = repo.rank <= 3 ? ' top3' : '';
  return `
    <div class="card" onclick="window.open('${repo.url}', '_blank')">
      <div class="card-header">
        <span class="rank${rankClass}">#${repo.rank}</span>
        <span class="repo-name">${repo.owner}<span> / ${repo.name}</span></span>
      </div>
      ${repo.description ? `<p class="description">${repo.description}</p>` : ''}
      <div class="meta">
        ${repo.language ? `<span class="meta-item"><span class="lang-dot" style="background:${color}"></span> ${repo.language}</span>` : ''}
        <span class="meta-item"><span class="star-icon">★</span> ${formatNum(repo.starsTotal)}</span>
        <span class="meta-item">今日 +${formatNum(repo.starsSince)} stars</span>
      </div>
    </div>
  `;
}

async function loadData() {
  app.innerHTML = '<div class="loading">加载中...</div>';
  try {
    const res = await fetch('trending.json');
    const json = await res.json();
    if (json.data && json.data.length > 0) {
      app.innerHTML = json.data.map(renderCard).join('');
      if (json.updatedAt) {
        const d = new Date(json.updatedAt);
        updateTimeEl.textContent = `更新于 ${d.toLocaleString('zh-CN')}`;
      }
    } else {
      app.innerHTML = '<div class="empty">暂无数据</div>';
    }
  } catch (err) {
    app.innerHTML = '<div class="error">加载失败，请检查网络后刷新</div>';
  }
}

function refresh() {
  const btn = document.getElementById('refreshBtn');
  btn.textContent = '刷新中...';
  btn.disabled = true;
  loadData().finally(() => {
    btn.textContent = '刷新';
    btn.disabled = false;
  });
}

loadData();
