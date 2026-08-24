const config = require('../config');

async function getLatestVideos(channelId = config.YOUTUBE.jogaDluzId) {
  try {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const res = await fetch(rssUrl);
    const xml = await res.text();

    const items = [];
    const entries = xml.split('<entry>');
    for (let i = 1; i < Math.min(entries.length, 6); i++) {
      const entry = entries[i];
      const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = entry.match(/<link rel="alternate" href="([\s\S]*?)"\/>/);
      const pubMatch = entry.match(/<published>([\s\S]*?)<\/published>/);
      if (titleMatch && linkMatch) {
        items.push({
          title: titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim(),
          link: linkMatch[1].trim(),
          published: pubMatch ? pubMatch[1].split('T')[0] : ''
        });
      }
    }
    return items;
  } catch (e) {
    console.error('Erro ao buscar vídeos do YouTube:', e.message);
    return [];
  }
}

module.exports = {
  getLatestVideos
};
