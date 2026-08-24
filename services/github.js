const config = require('../config');

async function getRecentRepos() {
  try {
    const res = await fetch(`https://api.github.com/users/${config.GITHUB.user}/repos?sort=updated&per_page=6`, {
      headers: { 'User-Agent': 'DLuz-Telegram-Bot' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const repos = await res.json();
    return repos.map(r => ({
      name: r.name,
      description: r.description || 'Sem descrição',
      url: r.html_url,
      updated_at: r.updated_at.split('T')[0],
      is_private: r.private
    }));
  } catch (e) {
    console.error('Erro GitHub Repos:', e.message);
    return [];
  }
}

module.exports = {
  getRecentRepos
};
