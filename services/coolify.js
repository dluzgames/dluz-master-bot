const config = require('../config');

const headers = {
  'Authorization': 'Bearer ' + config.COOLIFY.token,
  'Content-Type': 'application/json'
};
const baseUrl = config.COOLIFY.url;

async function getApplications() {
  try {
    const res = await fetch(`${baseUrl}/applications`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const apps = await res.json();
    return apps;
  } catch (e) {
    console.error('Erro Coolify Apps:', e.message);
    return [];
  }
}

async function restartApplication(uuid) {
  try {
    const res = await fetch(`${baseUrl}/applications/${uuid}/restart`, {
      method: 'POST',
      headers
    });
    const data = await res.json();
    return { ok: res.ok, data };
  } catch (e) {
    console.error('Erro Restart Coolify:', e.message);
    return { ok: false, error: e.message };
  }
}

async function getServerInfo() {
  try {
    const res = await fetch(`${baseUrl}/servers`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const servers = await res.json();
    return servers;
  } catch (e) {
    console.error('Erro Server Info:', e.message);
    return [];
  }
}

module.exports = {
  getApplications,
  restartApplication,
  getServerInfo
};
