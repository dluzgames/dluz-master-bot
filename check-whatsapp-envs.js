const config = require('./config');

const headers = {
  'Authorization': 'Bearer ' + config.COOLIFY.token,
  'Content-Type': 'application/json'
};

async function main() {
  const res = await fetch(`${config.COOLIFY.url}/applications/mcfvm8grpj363as7nzesigwb/envs`, { headers });
  const envs = await res.json();
  console.log('Envs for WhatsApp Baileys / Evolution:', envs);
}

main().catch(console.error);
