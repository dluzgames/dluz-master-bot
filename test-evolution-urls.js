const apiKey = 'B717A3120273-45EA-B083-A534BD6A1557';
const instance = 'teste';

const candidateUrls = [
  'https://mcfvm8grpj363as7nzesigwb.dluz.com.br',
  'https://evolution.dluz.com.br',
  'https://zap.dluz.com.br',
  'https://api-whatsapp.dluz.com.br',
  'https://whatsapp.dluz.com.br',
  'http://207.180.228.14:8080',
  'http://207.180.228.14:8081',
  'http://207.180.228.14:3000',
  'https://evolution.dluzgames.com.br'
];

async function testUrl(url) {
  try {
    const res = await fetch(`${url}/instance/fetchInstances`, {
      headers: { 'apikey': apiKey },
      signal: AbortSignal.timeout(5000)
    });
    console.log(`[${res.status}] ${url} -> OK!`);
    const data = await res.json();
    console.log('Instances:', data);
    return { url, ok: true, data };
  } catch (e) {
    console.log(`[FAIL] ${url} -> ${e.message}`);
    return { url, ok: false, error: e.message };
  }
}

async function main() {
  console.log('Testando URLs candidatas da Evolution API...');
  for (const u of candidateUrls) {
    const result = await testUrl(u);
    if (result.ok) {
      console.log(`\n🎉 ENCONTRADA A URL CORRETA DA EVOLUTION API: ${u}`);
      break;
    }
  }
}

main().catch(console.error);
