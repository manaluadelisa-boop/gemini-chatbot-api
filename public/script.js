const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');
const toneOptions = document.querySelectorAll('.tone-option');
const sendButton = form.querySelector('button[type="submit"]');
const themeToggle = document.getElementById('theme-toggle');
const clearButton = document.getElementById('clear-chat');
const promptButtons = document.querySelectorAll('[data-prompt]');
const welcomeMessage = document.getElementById('welcome-message');

let conversationHistory = [];
let selectedTone = 'santai';
let isBusy = false;

const timeFormatter = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
});

/* ---------- Tone ---------- */
toneOptions.forEach((option) => {
  option.addEventListener('click', () => {
    selectedTone = option.dataset.tone;
    toneOptions.forEach((item) => {
      const isActive = item === option;
      item.classList.toggle('active', isActive);
      item.setAttribute('aria-pressed', String(isActive));
    });
  });
});

/* ---------- Theme ---------- */
const themeColorMeta = document.querySelector('meta[name="theme-color"]');

function syncThemeLabel() {
  const isDark = document.documentElement.dataset.theme === 'dark';
  themeToggle.setAttribute('aria-label', isDark ? 'Aktifkan tema terang' : 'Aktifkan tema gelap');
  themeToggle.setAttribute('title', isDark ? 'Tema terang' : 'Tema gelap');
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', isDark ? '#160f14' : '#fbf0f4');
  }
}

themeToggle.addEventListener('click', () => {
  const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = nextTheme;
  try {
    localStorage.setItem('adelisa-theme', nextTheme);
  } catch (error) {
    // Tema tetap berfungsi meski localStorage diblokir.
  }
  syncThemeLabel();
});

syncThemeLabel();

/* ---------- Composer helpers ---------- */
function resizeInput() {
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 132)}px`;
}

function scrollToBottom() {
  chatBox.scrollTop = chatBox.scrollHeight;
}

function setBusy(busy) {
  isBusy = busy;
  input.disabled = busy;
  sendButton.disabled = busy;
  promptButtons.forEach((button) => {
    button.disabled = busy;
  });
  input.placeholder = busy ? 'Adelisa sedang mengetik...' : 'Tulis pertanyaanmu untuk Adelisa...';
}

input.addEventListener('input', resizeInput);

input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    form.requestSubmit();
  }
});

/* ---------- Message rendering ---------- */
function createMeta(sender, label) {
  const meta = document.createElement('div');
  meta.className = 'msg-meta';

  const name = document.createElement('span');
  name.textContent = sender === 'bot' ? 'Adelisa' : 'Kamu';

  const separator = document.createElement('span');
  separator.setAttribute('aria-hidden', 'true');
  separator.textContent = '·';

  const time = document.createElement('time');
  time.textContent = label || timeFormatter.format(new Date());

  meta.append(name, separator, time);
  return meta;
}

function createAvatar() {
  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = 'A';
  return avatar;
}

function appendMessage(sender, text) {
  const row = document.createElement('div');
  row.className = `msg-row ${sender}`;

  if (sender === 'bot') {
    row.appendChild(createAvatar());
  }

  const content = document.createElement('div');
  content.className = 'msg-content';

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;

  content.append(bubble, createMeta(sender));
  row.appendChild(content);
  chatBox.appendChild(row);
  return row;
}

function createTypingIndicator() {
  const row = document.createElement('div');
  row.className = 'msg-row bot typing';
  row.setAttribute('aria-label', 'Adelisa sedang menulis');
  row.appendChild(createAvatar());

  const content = document.createElement('div');
  content.className = 'msg-content';

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.append(document.createElement('span'), document.createElement('span'), document.createElement('span'));

  const meta = document.createElement('div');
  meta.className = 'msg-meta';
  const name = document.createElement('span');
  name.textContent = 'Adelisa';
  const separator = document.createElement('span');
  separator.setAttribute('aria-hidden', 'true');
  separator.textContent = '·';
  const status = document.createElement('span');
  status.textContent = 'sedang menulis';
  meta.append(name, separator, status);

  content.append(bubble, meta);
  row.appendChild(content);
  return row;
}

function fillBotMessage(row, text) {
  row.classList.remove('typing');
  row.removeAttribute('aria-label');

  const content = row.querySelector('.msg-content');
  content.innerHTML = '';

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;

  content.append(bubble, createMeta('bot'));
}

/* ---------- Send message ---------- */
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (isBusy) return;

  const userMessage = input.value.trim();
  if (!userMessage) return;

  appendMessage('user', userMessage);
  conversationHistory.push({ role: 'user', text: userMessage });

  input.value = '';
  resizeInput();

  const typingRow = createTypingIndicator();
  chatBox.appendChild(typingRow);
  scrollToBottom();
  setBusy(true);

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversation: conversationHistory,
        tone: selectedTone,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();

    if (data && data.result) {
      conversationHistory.push({ role: 'model', text: data.result });
      fillBotMessage(typingRow, data.result);
    } else {
      fillBotMessage(typingRow, 'Maaf, aku belum menerima jawaban. Coba kirim ulang ya.');
    }
  } catch (error) {
    console.error('Error fetching response:', error);
    fillBotMessage(typingRow, 'Maaf, koneksi ke server sedang bermasalah. Coba lagi sebentar ya.');
  } finally {
    setBusy(false);
    input.focus();
    scrollToBottom();
  }
});

/* ---------- Quick prompts ---------- */
promptButtons.forEach((button) => {
  button.addEventListener('click', () => {
    if (isBusy) return;
    input.value = button.dataset.prompt || '';
    resizeInput();
    form.requestSubmit();
  });
});

/* ---------- Reset conversation ---------- */
clearButton.addEventListener('click', () => {
  if (isBusy) return;

  conversationHistory = [];
  chatBox.querySelectorAll('.msg-row:not(#welcome-message)').forEach((row) => row.remove());
  input.value = '';
  resizeInput();
  scrollToBottom();
  input.focus();
});

/* ---------- Init ---------- */
const welcomeTime = welcomeMessage.querySelector('time');
if (welcomeTime) {
  welcomeTime.textContent = timeFormatter.format(new Date());
}

resizeInput();
