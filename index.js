const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
const config = require('./config');
const wc = require('./services/woocommerce');
const coolify = require('./services/coolify');
const youtube = require('./services/youtube');
const github = require('./services/github');
const whatsapp = require('./services/whatsapp');
const ai = require('./services/ai');
const whatsappAi = require('./services/whatsapp-ai');

const token = config.TELEGRAM_BOT_TOKEN;
const adminId = String(config.ADMIN_CHAT_ID);
const apiUrl = `https://api.telegram.org/bot${token}`;

let lastUpdateId = 0;

// ==========================================
// 1. SERVIDOR WEBHOOK EXPRESS (WHATSAPP INBOUND)
// ==========================================
const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    status: 'online',
    name: 'DLuz Master AI Ecosystem',
    version: '2.0.0',
    channels: ['Telegram Admin', 'WhatsApp 24/7 Sales Agent']
  });
});

// Endpoint receptor de mensagens da Evolution API
app.post('/webhook/evolution', async (req, res) => {
  res.status(200).json({ received: true });

  try {
    const body = req.body;
    const event = body.event || body.type;
    const data = body.data;

    // Verificar se é mensagem nova recebida
    if (event === 'messages.upsert' || event === 'MESSAGES_UPSERT') {
      const msg = data?.message || data;
      const key = data?.key || msg?.key;
      
      // Ignorar se a mensagem foi enviada pelo próprio bot
      if (key?.fromMe) return;

      const remoteJid = key?.remoteJid || '';
      // Ignorar mensagens de grupos e status
      if (remoteJid.endsWith('@g.us') || remoteJid.includes('status@broadcast')) return;

      const senderNumber = remoteJid.replace('@s.whatsapp.net', '');
      const pushName = data?.pushName || 'Cliente';

      // Extrair o texto da mensagem
      const messageContent = data?.message || msg?.message;
      const text = messageContent?.conversation || 
                   messageContent?.extendedTextMessage?.text || 
                   messageContent?.imageMessage?.caption || '';

      if (!text || text.trim() === '') return;

      console.log(`[WHATSAPP INBOUND] De: ${pushName} (${senderNumber}) -> "${text}"`);

      // 1. Gerar resposta com a IA de Atendimento
      const reply = await whatsappAi.handleIncomingWhatsApp(senderNumber, pushName, text);

      // 2. Enviar resposta para o cliente no WhatsApp
      await whatsapp.sendTextMessage(senderNumber, reply);

      // 3. Notificar o DLuz no Telegram em tempo real
      const telegramNotice = `🔔 <b>Novo Atendimento no WhatsApp:</b>\n\n` +
        `👤 <b>Cliente:</b> ${pushName} (+${senderNumber})\n` +
        `💬 <b>Perguntou:</b> <i>"${text}"</i>\n\n` +
        `🤖 <b>IA Respondeu:</b>\n<i>"${reply}"</i>`;

      await sendMessage(adminId, telegramNotice);
    }
  } catch (e) {
    console.error('Erro ao processar webhook Evolution:', e.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Servidor Webhook Evolution rodando na porta ${PORT}`);
});

// ==========================================
// 2. MOTOR DO TELEGRAM BOT (MESA DE COMANDO)
// ==========================================

// Enviar Ação de Digitando no Telegram
async function sendTyping(chatId) {
  try {
    await fetch(`${apiUrl}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action: 'typing' })
    });
  } catch (e) {}
}

// Enviar Mensagem Segura com Fallback para Texto Puro
async function sendMessage(chatId, text, inlineKeyboard = null, parseMode = 'HTML') {
  try {
    const payload = {
      chat_id: chatId,
      text: text
    };
    if (parseMode) payload.parse_mode = parseMode;
    if (inlineKeyboard) {
      payload.reply_markup = { inline_keyboard: inlineKeyboard };
    }

    let res = await fetch(`${apiUrl}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    let data = await res.json();

    if (!data.ok && parseMode) {
      console.warn(`[Fallback] Falha ao enviar com ${parseMode}: ${data.description}. Tentando em texto puro...`);
      const cleanText = text.replace(/<[^>]+>/g, '');
      const fallbackPayload = {
        chat_id: chatId,
        text: cleanText
      };
      if (inlineKeyboard) {
        fallbackPayload.reply_markup = { inline_keyboard: inlineKeyboard };
      }
      res = await fetch(`${apiUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fallbackPayload)
      });
      data = await res.json();
    }

    return data;
  } catch (e) {
    console.error('Erro ao enviar mensagem:', e.message);
  }
}

// Menu Principal
function getMainKeyboard() {
  return [
    [
      { text: '🛒 Loja DLuz', callback_data: 'menu_loja' },
      { text: '📱 WhatsApp (Evolution)', callback_data: 'menu_zap' }
    ],
    [
      { text: '🖥️ Servidor VPS', callback_data: 'menu_servidor' },
      { text: '🎥 YouTube', callback_data: 'menu_youtube' }
    ],
    [
      { text: '🐙 GitHub DLuz', callback_data: 'menu_github' },
      { text: '🔄 Atualizar Painel', callback_data: 'menu_main' }
    ]
  ];
}

// Menu Loja
function getLojaKeyboard() {
  return [
    [
      { text: '📦 Últimos Pedidos', callback_data: 'loja_pedidos' },
      { text: '💰 Faturamento Hoje', callback_data: 'loja_faturamento' }
    ],
    [
      { text: '🏷️ Produtos Ativos', callback_data: 'loja_produtos' }
    ],
    [
      { text: '⬅️ Voltar ao Início', callback_data: 'menu_main' }
    ]
  ];
}

// Menu Servidor
function getServidorKeyboard() {
  return [
    [
      { text: '🟢 Apps & Containers', callback_data: 'servidor_apps' },
      { text: '📊 Info da VPS', callback_data: 'servidor_info' }
    ],
    [
      { text: '⬅️ Voltar ao Início', callback_data: 'menu_main' }
    ]
  ];
}

// Menu YouTube
function getYoutubeKeyboard() {
  return [
    [
      { text: '🎮 Canal Joga Dluz', callback_data: 'yt_jogadluz' },
      { text: '⚡ Canal DLuz Games', callback_data: 'yt_dluzgames' }
    ],
    [
      { text: '⬅️ Voltar ao Início', callback_data: 'menu_main' }
    ]
  ];
}

// Handler de Botões Interativos
async function handleCallbackQuery(query) {
  const chatId = query.message.chat.id;
  const data = query.data;

  await fetch(`${apiUrl}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: query.id })
  });

  if (String(chatId) !== adminId) return;

  if (data === 'menu_main') {
    await sendMessage(chatId, `⚡ <b>PAINEL DE CONTROLE CENTRAL — DLUZ</b>\n\nSelecione um projeto para gerenciar ou digite qualquer mensagem para conversar comigo:`, getMainKeyboard());
  } else if (data === 'menu_zap') {
    const zapMsg = `📱 <b>WHATSAPP (EVOLUTION API) — 24/7 ATIVO!</b>\n\n` +
      `🌐 <b>URL:</b> <code>https://evolution.dluz.com.br</code>\n` +
      `🟢 <b>Instância Conectada:</b> <code>teste</code>\n` +
      `🤖 <b>Atendente IA 24h:</b> Habilitado para responder dúvidas e vendas do DLuzMobilador Pro.\n\n` +
      `💡 <b>Como enviar mensagens manuais:</b>\n` +
      `• Digite no chat: <i>"Manda um zap para 63981249724 dizendo Olá!"</i>\n` +
      `• Ou use o comando direto: <code>/zap &lt;numero&gt; &lt;mensagem&gt;</code>`;
    await sendMessage(chatId, zapMsg, getMainKeyboard());
  } else if (data === 'menu_loja') {
    await sendMessage(chatId, `🛒 <b>LOJA DLUZ (loja.dluz.com.br)</b>\n\nEscolha uma opção de gerenciamento:`, getLojaKeyboard());
  } else if (data === 'loja_pedidos') {
    const orders = await wc.getRecentOrders(5);
    if (!orders || orders.length === 0) {
      await sendMessage(chatId, `📦 <b>Nenhum pedido recente encontrado.</b>`, getLojaKeyboard());
    } else {
      let msg = `📦 <b>ÚLTIMOS PEDIDOS NA LOJA:</b>\n\n`;
      orders.forEach(o => {
        const items = o.line_items?.map(i => `${i.name} (x${i.quantity})`).join(', ') || 'N/A';
        const method = o.payment_method_title || o.payment_method || 'Pix/Cartão';
        msg += `🔸 <b>#${o.id}</b> — R$ ${o.total} (${o.status})\n`;
        msg += `👤 <i>${o.billing?.first_name || 'Cliente'} ${o.billing?.last_name || ''}</i>\n`;
        msg += `🛒 <i>${items}</i>\n`;
        msg += `💳 <i>${method}</i>\n\n`;
      });
      await sendMessage(chatId, msg, getLojaKeyboard());
    }
  } else if (data === 'loja_faturamento') {
    const report = await wc.getTodaySummary();
    const msg = `💰 <b>FATURAMENTO DE HOJE — LOJA DLUZ</b>\n\n` +
      `💵 <b>Total Vendido:</b> R$ ${report.total_sales || '0.00'}\n` +
      `📦 <b>Total de Pedidos:</b> ${report.total_orders || 0}\n` +
      `🌐 <b>Status:</b> Operação Normal (Mercado Pago Pix/Cartão Ativo)`;
    await sendMessage(chatId, msg, getLojaKeyboard());
  } else if (data === 'loja_produtos') {
    const products = await wc.getProductsList(8);
    let msg = `🏷️ <b>PRODUTOS ATIVOS NO CATÁLOGO:</b>\n\n`;
    products.forEach(p => {
      msg += `🔹 <b>[#${p.id}]</b> ${p.name}\n`;
      msg += `   💵 R$ ${p.price} | Status: ${p.status}\n\n`;
    });
    await sendMessage(chatId, msg, getLojaKeyboard());
  } else if (data === 'menu_servidor') {
    await sendMessage(chatId, `🖥️ <b>SERVIDOR VPS & COOLIFY (coolify.dluz.com.br)</b>\n\nEscolha uma opção:`, getServidorKeyboard());
  } else if (data === 'servidor_apps') {
    const apps = await coolify.getApplications();
    if (!apps || apps.length === 0) {
      await sendMessage(chatId, `ℹ️ Nenhuma aplicação encontrada ou erro na API.`, getServidorKeyboard());
    } else {
      let msg = `🟢 <b>APLICAÇÕES & CONTAINERS NA VPS:</b>\n\n`;
      apps.forEach(a => {
        const st = a.status === 'running' ? '🟢 Rodando' : `🔴 ${a.status || 'Parado'}`;
        msg += `📦 <b>${a.name}</b> (${st})\n`;
        msg += `   🔗 Domínio: ${a.fqdn || 'Sem domínio'}\n\n`;
      });
      await sendMessage(chatId, msg, getServidorKeyboard());
    }
  } else if (data === 'servidor_info') {
    const servers = await coolify.getServerInfo();
    let msg = `📊 <b>STATUS DO SERVIDOR DLUZ VPS:</b>\n\n`;
    if (servers && servers.length > 0) {
      servers.forEach(s => {
        msg += `🖥️ <b>${s.name}</b> (IP: ${s.ip})\n`;
        msg += `⚙️ Status: ${s.settings?.is_reachable ? '✅ Online & Acessível' : '⚠️ Verificando'}\n\n`;
      });
    } else {
      msg += `✅ Servidor Coolify Online em coolify.dluz.com.br`;
    }
    await sendMessage(chatId, msg, getServidorKeyboard());
  } else if (data === 'menu_youtube') {
    await sendMessage(chatId, `🎥 <b>CANAIS DO YOUTUBE</b>\n\nEscolha qual canal deseja consultar:`, getYoutubeKeyboard());
  } else if (data === 'yt_jogadluz') {
    const videos = await youtube.getLatestVideos(config.YOUTUBE.jogaDluzId);
    let msg = `🎮 <b>ÚLTIMOS VÍDEOS — JOGA DLUZ:</b>\n\n`;
    videos.forEach(v => {
      msg += `🎬 <b>${v.title}</b>\n`;
      msg += `📅 Postado em: ${v.published}\n`;
      msg += `🔗 ${v.link}\n\n`;
    });
    await sendMessage(chatId, msg, getYoutubeKeyboard());
  } else if (data === 'yt_dluzgames') {
    const videos = await youtube.getLatestVideos(config.YOUTUBE.dluzGamesId);
    let msg = `⚡ <b>ÚLTIMOS VÍDEOS — DLUZ GAMES:</b>\n\n`;
    if (videos.length === 0) {
      msg += `ℹ️ Nenhum vídeo recente encontrado no feed do canal secundário.`;
    } else {
      videos.forEach(v => {
        msg += `🎬 <b>${v.title}</b>\n`;
        msg += `📅 Postado em: ${v.published}\n`;
        msg += `🔗 ${v.link}\n\n`;
      });
    }
    await sendMessage(chatId, msg, getYoutubeKeyboard());
  } else if (data === 'menu_github') {
    const repos = await github.getRecentRepos();
    let msg = `🐙 <b>REPOSITÓRIOS GITHUB (dluzgames):</b>\n\n`;
    repos.forEach(r => {
      const priv = r.is_private ? '🔒 Privado' : '🌍 Público';
      msg += `📁 <b>${r.name}</b> (${priv})\n`;
      msg += `   📝 ${r.description}\n`;
      msg += `   🔗 ${r.url}\n\n`;
    });
    await sendMessage(chatId, msg, getMainKeyboard());
  }
}

// Handler de Mensagens do Telegram
async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const text = msg.text || '';
  const fromName = msg.from?.first_name || 'DLuz';

  if (String(chatId) !== adminId) {
    await sendMessage(chatId, `⛔ <b>Acesso Não Autorizado.</b>\nEste bot é privado para o ecossistema DLuz Games.`);
    return;
  }

  const cleanText = text.trim();
  const lowerText = cleanText.toLowerCase();

  // Comandos Rápidos
  if (lowerText === '/start' || lowerText === '/menu' || lowerText === 'menu') {
    const welcome = `🚀 <b>OLÁ, ${fromName.toUpperCase()}! BEM-VINDO AO SEU ASSISTENTE ANTIGRAVITY</b>\n\n` +
      `Estou conectado em tempo real à sua <b>Loja</b>, <b>WhatsApp (Evolution)</b>, <b>Servidores Coolify</b>, <b>YouTube</b> e <b>GitHub</b>.\n\n` +
      `💬 <b>Conversa & Envio de WhatsApp:</b>\n` +
      `• Para conversar: envie qualquer dúvida ou solicitação.\n` +
      `• Para enviar WhatsApp: <i>"Manda um zap para 63981249724 dizendo Olá!"</i> ou <code>/zap &lt;numero&gt; &lt;mensagem&gt;</code>\n\n` +
      `👇 Ou use os botões abaixo para gerenciar seus projetos:`;
    await sendMessage(chatId, welcome, getMainKeyboard());
    return;
  }

  if (lowerText.startsWith('/zap ') || lowerText.startsWith('/whatsapp ')) {
    const parts = cleanText.split(' ');
    if (parts.length >= 3) {
      const number = parts[1];
      const message = parts.slice(2).join(' ');
      await sendTyping(chatId);
      const res = await whatsapp.sendTextMessage(number, message);
      if (res.success) {
        await sendMessage(chatId, `✅ <b>WhatsApp Enviado com Sucesso!</b>\n\n📱 <b>Número:</b> +${res.number}\n💬 <b>Mensagem:</b> <i>"${message}"</i>`, getMainKeyboard());
      } else {
        await sendMessage(chatId, `❌ <b>Falha ao enviar WhatsApp:</b> ${res.error}`, getMainKeyboard());
      }
      return;
    } else {
      await sendMessage(chatId, `ℹ️ <b>Uso correto:</b> <code>/zap &lt;numero&gt; &lt;mensagem&gt;</code>`);
      return;
    }
  }

  if (lowerText === '/limpar' || lowerText === '/reset') {
    ai.clearHistory(chatId);
    await sendMessage(chatId, `🧹 <b>Memória da conversa resetada!</b> Pode mandar uma nova mensagem.`, getMainKeyboard());
    return;
  }

  if (lowerText === '/loja') {
    await sendMessage(chatId, `🛒 <b>LOJA DLUZ</b>`, getLojaKeyboard());
    return;
  }

  if (lowerText === '/servidor' || lowerText === '/vps') {
    await sendMessage(chatId, `🖥️ <b>SERVIDOR VPS</b>`, getServidorKeyboard());
    return;
  }

  if (lowerText === '/youtube') {
    await sendMessage(chatId, `🎥 <b>CANAIS DO YOUTUBE</b>`, getYoutubeKeyboard());
    return;
  }

  if (lowerText === '/github') {
    const repos = await github.getRecentRepos();
    let rMsg = `🐙 <b>REPOSITÓRIOS GITHUB:</b>\n\n`;
    repos.forEach(r => {
      rMsg += `📁 <b>${r.name}</b>\n🔗 ${r.url}\n\n`;
    });
    await sendMessage(chatId, rMsg, getMainKeyboard());
    return;
  }

  // Resposta Inteligente com o Cérebro de IA
  await sendTyping(chatId);
  const aiReply = await ai.chatWithAI(chatId, text);
  await sendMessage(chatId, aiReply, null, null);
}

// Loop Principal de Polling do Telegram
async function pollUpdates() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    const res = await fetch(`${apiUrl}/getUpdates?offset=${lastUpdateId + 1}&timeout=25`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      setTimeout(pollUpdates, 3000);
      return;
    }
    const data = await res.json();
    if (data.ok && Array.isArray(data.result)) {
      for (const update of data.result) {
        lastUpdateId = update.update_id;
        if (update.message) {
          await handleMessage(update.message);
        } else if (update.callback_query) {
          await handleCallbackQuery(update.callback_query);
        }
      }
    }
  } catch (e) {}
  setTimeout(pollUpdates, 500);
}

console.log('=== DLUZ MASTER AI ECOSYSTEM INICIADO ===');
console.log('1. Telegram Polling Ativo');
console.log('2. Webhook Evolution Ativo na porta ' + PORT);
pollUpdates();
