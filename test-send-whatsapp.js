const baseUrl = 'https://evolution.dluz.com.br';
const apiKey = 'B717A3120273-45EA-B083-A534BD6A1557';
const instance = 'teste';

async function testSendWhatsApp(targetNumber, message) {
  console.log(`Enviando WhatsApp para ${targetNumber}...`);
  try {
    const res = await fetch(`${baseUrl}/message/sendText/${instance}`, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number: targetNumber,
        text: message
      })
    });
    const data = await res.json();
    console.log('Status HTTP:', res.status);
    console.log('Response:', data);
    return { ok: res.ok, data };
  } catch (e) {
    console.error('Erro ao enviar:', e.message);
    return { ok: false, error: e.message };
  }
}

async function main() {
  // Testar envio para o número oficial de suporte do DLuz
  await testSendWhatsApp('5563981249724', '🤖 *DLuz Antigravity:* Teste de integração de WhatsApp realizado com sucesso!');
}

main().catch(console.error);
