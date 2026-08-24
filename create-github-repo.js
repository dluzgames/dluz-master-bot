const token = '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';
const repoName = 'dluz-master-bot';

async function main() {
  console.log('1. Verificando/Criando repositório no GitHub...');
  const checkRes = await fetch(`https://api.github.com/repos/dluzgames/${repoName}`, {
    headers: {
      'Authorization': `token ${token}`,
      'User-Agent': 'DLuz-Bot-Deployer'
    }
  });

  if (checkRes.status === 404) {
    console.log(`Criando repositório privado ${repoName}...`);
    const createRes = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'DLuz-Bot-Deployer'
      },
      body: JSON.stringify({
        name: repoName,
        description: 'DLuz Master AI Ecosystem — Telegram Admin & WhatsApp 24/7 Sales Agent',
        private: true,
        auto_init: true
      })
    });
    console.log('Create Repo Status:', createRes.status);
    const data = await createRes.json();
    console.log('Repo URL:', data.html_url);
  } else {
    console.log(`Repositório ${repoName} já existe no GitHub.`);
  }
}

main().catch(console.error);
