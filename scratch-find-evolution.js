const config = require('./config');

const headers = {
  'Authorization': 'Bearer ' + config.COOLIFY.token,
  'Content-Type': 'application/json'
};

async function main() {
  console.log('1. Buscando aplicações no Coolify...');
  const res = await fetch(`${config.COOLIFY.url}/applications`, { headers });
  const apps = await res.json();
  
  if (Array.isArray(apps)) {
    console.log(`Total de Apps no Coolify: ${apps.length}`);
    apps.forEach(a => {
      console.log(`- [${a.status}] ${a.name} | FQDN: ${a.fqdn} | UUID: ${a.uuid}`);
    });
  } else {
    console.log('Apps:', apps);
  }
}

main().catch(console.error);
