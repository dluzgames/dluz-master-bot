const geminiKey = process.env.GEMINI_API_KEY || '';

// Histórico de conversas dos clientes no WhatsApp (por número)
const clientHistories = new Map();

const CUSTOMER_SERVICE_PROMPT = `
Você é o Atendente Virtual Oficial da DLuz Games e da Loja DLuz (loja.dluz.com.br).
Seu objetivo é atender os clientes que entram em contato pelo WhatsApp com máxima simpatia, clareza, rapidez e foco em vendas e suporte.

Informações Oficiais da Loja e Produtos:
1. PRODUTO PRINCIPAL: "DLuzMobilador Pro"
- O que é: Software exclusivo para jogar jogos mobile (Free Fire, Blood Strike, COD, etc.) no PC usando mouse e teclado com mira perfeita de emulador profissional e ZERO DELAY (1000Hz no Windows Kernel).
- Preço: Apenas R$ 16,90 (Pagamento Único / Vitalício com atualizações futuras inclusas).
- Vantagens: Roda em PCs fracos/notebooks sem placa de vídeo (pois o jogo roda no celular e espelha em 120 FPS no PC), importa teclas do BlueStacks com 1 clique, conexão fácil via QR Code ou USB, 100% seguro contra ban (protocolo ADB oficial).
- Link de Compra Imediata (Pix ou Cartão): https://loja.dluz.com.br/checkout/?add-to-cart=2755
- Página Oficial do Produto: https://loja.dluz.com.br/produto/dluzmobilador-pro/
- Entrega: O download e o tutorial são liberados imediatamente por e-mail logo após a confirmação do pagamento.

2. FORMAS DE PAGAMENTO:
- Pix (Aprovação Instantânea) e Cartão de Crédito/Débito pelo Mercado Pago com 100% de segurança.

3. REQUISITOS:
- Computador: Qualquer PC ou notebook com Windows 10/11.
- Celular: Qualquer aparelho Android (Samsung, Xiaomi, Motorola, Realme, etc.).

4. DIRETRIZES DE RESPOSTA NO WHATSAPP:
- Responda em Português do Brasil de forma acolhedora, objetiva e profissional.
- Use mensagens curtas, claras e bem formatadas para leitura rápida no WhatsApp (use negrito com asterisco *texto*).
- Sempre envie o link de compra quando o cliente perguntar preço, como comprar ou demonstrar interesse.
- Se o cliente pedir para falar com o DLuz ou com um humano, diga: "Já avisei o DLuz aqui no sistema! Ele responderá assim que possível. Enquanto isso, posso te ajudar em algo mais?"
`;

async function handleIncomingWhatsApp(senderNumber, senderName, messageText) {
  if (!geminiKey) {
    return 'Olá! Nosso sistema está atualizando no momento. Em breve responderemos!';
  }

  const cleanNum = String(senderNumber).replace(/\D/g, '');
  if (!clientHistories.has(cleanNum)) {
    clientHistories.set(cleanNum, []);
  }
  const history = clientHistories.get(cleanNum);

  // Adicionar mensagem do cliente
  history.push({
    role: 'user',
    parts: [{ text: `Cliente (${senderName || 'Cliente'}): ${messageText}` }]
  });

  // Limitar histórico a 12 turnos por cliente
  if (history.length > 12) {
    history.splice(0, history.length - 12);
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: CUSTOMER_SERVICE_PROMPT }]
        },
        contents: history,
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 500
        }
      })
    });

    const data = await res.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Olá! Como posso te ajudar com o DLuzMobilador Pro hoje? Acesse: https://loja.dluz.com.br';

    history.push({
      role: 'model',
      parts: [{ text: reply }]
    });

    return reply;
  } catch (e) {
    console.error('Erro no atendimento IA WhatsApp:', e.message);
    return 'Olá! Para adquirir o DLuzMobilador Pro por R$ 16,90 com liberação imediata, acesse: https://loja.dluz.com.br/checkout/?add-to-cart=2755';
  }
}

module.exports = {
  handleIncomingWhatsApp
};
