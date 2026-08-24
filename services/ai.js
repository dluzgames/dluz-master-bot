const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const whatsapp = require('./whatsapp');
const geminiKey = process.env.GEMINI_API_KEY || '';

// Memória de curto prazo por chat (mantém os últimos 15 turnos)
const chatHistories = new Map();

const SYSTEM_INSTRUCTION = `
Você é o Antigravity, o assistente de inteligência artificial pessoal e parceiro de programação do DLuz.
O DLuz é criador dos canais no YouTube "Joga Dluz" e "DLuz Games", desenvolvedor do "DLuzMobilador Pro" e proprietário da "Loja DLuz" (loja.dluz.com.br) e da empresa "Dluz Digital".

Suas características:
- Extremamente inteligente, prestativo, rápido e focado em soluções práticas.
- Você tem INTEGRAÇÃO DIRETA COM O WHATSAPP do DLuz via Evolution API!
- Se o DLuz pedir para enviar uma mensagem no WhatsApp para algum número, você pode confirmar que a mensagem pode ser disparada ou instruir o uso do comando /zap <numero> <mensagem>.
- Especialista em: Programação (Node.js, Python, PHP, Docker), SEO e YouTube, Otimização de Jogos/Emuladores, WordPress/WooCommerce, Servidores Linux/Coolify e Estratégias de Vendas.
- Fale sempre em português do Brasil (PT-BR), com tom parceiro, animado, direto e sem enrolação.
- Formate suas respostas para ficarem bonitas e fáceis de ler no Telegram (use negrito, tópicos e emojis estratégicos).
`;

// Detector inteligente de comando de envio de WhatsApp na fala natural
function detectWhatsAppIntent(text) {
  // Exemplos: "manda um zap para 63981249724 dizendo oi tudo bem"
  // "envie whatsapp para (63) 98124-9724: seu pedido foi aprovado"
  const zapPattern = /(?:manda|mandar|enviar|envie|disparar|dispara|avisar|avise)(?:\s+um)?(?:\s+mensagem)?(?:\s+no|\s+pro|\s+para\s+o|\s+para)?\s+(?:whatsapp|zap|whats|wpp)\s+(?:para\s+o\s+n[uú]mero|para\s+o|pro|para|ao)\s+([0-9\(\)\s\-\+]+)(?:\s+dizendo|\s+falando|\s*:\s*|\s+com\s+o\s+texto|\s+que\s+)([\s\S]+)/i;
  const match = text.match(zapPattern);
  if (match) {
    return {
      isWhatsApp: true,
      number: match[1].trim(),
      message: match[2].trim()
    };
  }
  return { isWhatsApp: false };
}

async function chatWithAI(chatId, userMessage) {
  if (!geminiKey) {
    return '⚠️ Chave de IA não configurada no servidor. Avise no terminal.';
  }

  // 1. Checar se é um pedido direto de envio de WhatsApp
  const zapIntent = detectWhatsAppIntent(userMessage);
  if (zapIntent.isWhatsApp && zapIntent.number.replace(/\D/g, '').length >= 8) {
    const zapResult = await whatsapp.sendTextMessage(zapIntent.number, zapIntent.message);
    if (zapResult.success) {
      return `✅ <b>WhatsApp Enviado com Sucesso!</b>\n\n` +
        `📱 <b>Destinatário:</b> +${zapResult.number}\n` +
        `💬 <b>Mensagem:</b> <i>"${zapIntent.message}"</i>\n\n` +
        `🚀 Disparado via Evolution API na sua instância <code>teste</code>.`;
    } else {
      return `❌ <b>Falha ao enviar WhatsApp:</b> ${zapResult.error}\nVerifique se o número está correto e tente novamente.`;
    }
  }

  // 2. Processamento Conversacional Padrão com Gemini
  if (!chatHistories.has(chatId)) {
    chatHistories.set(chatId, []);
  }
  const history = chatHistories.get(chatId);

  history.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  if (history.length > 20) {
    history.splice(0, history.length - 20);
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }]
        },
        contents: history,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000
        }
      })
    });

    const data = await res.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Desculpe, não consegui processar a resposta no momento.';

    history.push({
      role: 'model',
      parts: [{ text: replyText }]
    });

    return replyText;
  } catch (e) {
    console.error('Erro ao chamar Gemini:', e.message);
    return `❌ Ocorreu um erro ao processar sua resposta: ${e.message}`;
  }
}

function clearHistory(chatId) {
  chatHistories.delete(chatId);
}

module.exports = {
  chatWithAI,
  clearHistory
};
