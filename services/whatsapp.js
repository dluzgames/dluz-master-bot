const config = require('../config');

const baseUrl = config.EVOLUTION.url;
const apiKey = config.EVOLUTION.apiKey;
const instance = config.EVOLUTION.instance;

// Limpar e formatar o número para formato padrão internacional (55DDD9XXXXXXXX)
function cleanPhoneNumber(number) {
  let cleaned = String(number).replace(/\D/g, '');
  if (!cleaned.startsWith('55') && (cleaned.length === 10 || cleaned.length === 11)) {
    cleaned = '55' + cleaned;
  }
  return cleaned;
}

async function sendTextMessage(targetNumber, text) {
  const number = cleanPhoneNumber(targetNumber);
  console.log(`[WHATSAPP] Disparando mensagem para ${number} via Evolution API (${instance})...`);

  try {
    const res = await fetch(`${baseUrl}/message/sendText/${instance}`, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number: number,
        text: text
      })
    });

    const data = await res.json();
    if (res.ok || res.status === 201) {
      return { success: true, number, data };
    } else {
      return { success: false, error: data?.response?.message || data?.message || 'Erro desconhecido' };
    }
  } catch (e) {
    console.error('Erro ao enviar mensagem WhatsApp:', e.message);
    return { success: false, error: e.message };
  }
}

module.exports = {
  sendTextMessage,
  cleanPhoneNumber
};
