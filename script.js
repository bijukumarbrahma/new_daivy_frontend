/* ══════════════════════════════════════════════════════════
   Daivy AI – Enhanced Script
   ══════════════════════════════════════════════════════════ */

// ── Config ───────────────────────────────────────────────
const BACKEND_URL = 'https://glint-backend-7d4a.onrender.com/chat';

// ── State ────────────────────────────────────────────────
let sessions       = [];      // [{ id, title, messages }]
let activeId       = null;    // current session id
let isStreaming    = false;
let streamInterval = null;

// ── DOM refs ─────────────────────────────────────────────
const sidebar          = document.getElementById('sidebar');
const overlay          = document.getElementById('overlay');
const historyList      = document.getElementById('historyList');
const messagesContainer= document.getElementById('messagesContainer');
const welcomeScreen    = document.getElementById('welcomeScreen');
const chatContainer    = document.getElementById('chatContainer');
const userInput        = document.getElementById('userInput');
const sendBtn          = document.getElementById('sendBtn');
const toast            = document.getElementById('toast');

// ── Init ─────────────────────────────────────────────────
(function init() {
  loadSessions();
  setupMarked();
  bindEvents();
  updateThemeIcon();
})();

// ── Marked.js config ─────────────────────────────────────
function setupMarked() {
  if (!window.marked) return;
  marked.setOptions({
    breaks: true,
    gfm: true,
    highlight: (code, lang) => {
      if (window.hljs && lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return window.hljs ? hljs.highlightAuto(code).value : code;
    }
  });
}

// ── Event bindings ────────────────────────────────────────
function bindEvents() {
  // Sidebar open/close
  document.getElementById('menuToggle').addEventListener('click', () => toggleSidebar(true));
  overlay.addEventListener('click', () => toggleSidebar(false));

  // New chat
  document.getElementById('newChatBtn').addEventListener('click', startNewChat);

  // Clear all
  document.getElementById('clearAllBtn').addEventListener('click', () => {
    if (!confirm('Delete all conversations?')) return;
    sessions = []; activeId = null;
    saveSessions(); renderHistory(); showWelcome();
  });

  // Theme
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('themeToggleSide').addEventListener('click', toggleTheme);

  // Textarea
  userInput.addEventListener('input', () => {
    autoResize(userInput);
    sendBtn.disabled = !userInput.value.trim() || isStreaming;
  });

  userInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) handleSend();
    }
  });

  sendBtn.addEventListener('click', handleSend);

  // Suggestion cards
  document.querySelectorAll('.suggestion-card').forEach(card => {
    card.addEventListener('click', () => {
      const prompt = card.dataset.prompt;
      userInput.value = prompt;
      autoResize(userInput);
      sendBtn.disabled = false;
      handleSend();
    });
  });
}

// ── Sidebar ───────────────────────────────────────────────
function toggleSidebar(open) {
  sidebar.classList.toggle('open', open);
  overlay.classList.toggle('active', open);
}

// ── Theme ─────────────────────────────────────────────────
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.dataset.theme === 'dark';
  html.dataset.theme = isDark ? 'light' : 'dark';
  localStorage.setItem('daivy-theme', html.dataset.theme);
  updateThemeIcon();
  // Swap hljs stylesheet
  const hljsLink = document.getElementById('hljs-theme');
  if (hljsLink) {
    hljsLink.href = isDark
      ? 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css'
      : 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css';
  }
}
function updateThemeIcon() {
  const isDark = document.documentElement.dataset.theme === 'dark';
  const icon = document.getElementById('themeIcon');
  if (!icon) return;
  icon.innerHTML = isDark
    ? '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>'
    : '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>';
}

// Restore saved theme
const savedTheme = localStorage.getItem('daivy-theme');
if (savedTheme) { document.documentElement.dataset.theme = savedTheme; updateThemeIcon(); }

// ── Sessions (localStorage) ───────────────────────────────
function saveSessions() {
  localStorage.setItem('daivy-sessions', JSON.stringify(sessions));
}
function loadSessions() {
  try {
    const raw = localStorage.getItem('daivy-sessions');
    if (raw) sessions = JSON.parse(raw);
  } catch { sessions = []; }
  renderHistory();
  if (sessions.length) loadSession(sessions[sessions.length - 1].id);
  else showWelcome();
}
function startNewChat() {
  showWelcome();
  activeId = null;
  toggleSidebar(false);
}
function loadSession(id) {
  const session = sessions.find(s => s.id === id);
  if (!session) return;
  activeId = id;
  renderHistory();
  showMessages();
  messagesContainer.innerHTML = '';
  session.messages.forEach(m => {
    if (m.role === 'user') appendUserMessage(m.content, false);
    else appendAiMessage(m.content, false);
  });
  scrollToBottom();
  toggleSidebar(false);
}
function getActiveSession() {
  return sessions.find(s => s.id === activeId);
}
function createSession(firstMsg) {
  const id = Date.now().toString();
  const title = firstMsg.slice(0, 42) + (firstMsg.length > 42 ? '…' : '');
  const session = { id, title, messages: [] };
  sessions.push(session);
  activeId = id;
  saveSessions();
  renderHistory();
  return session;
}

// ── History list ──────────────────────────────────────────
function renderHistory() {
  historyList.innerHTML = '';
  [...sessions].reverse().forEach(session => {
    const li = document.createElement('li');
    li.className = 'history-item' + (session.id === activeId ? ' active' : '');
    li.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
      <span>${escHtml(session.title)}</span>
      <button class="del-btn" title="Delete" data-id="${session.id}">✕</button>`;
    li.addEventListener('click', e => {
      if (e.target.classList.contains('del-btn') || e.target.closest('.del-btn')) return;
      loadSession(session.id);
    });
    li.querySelector('.del-btn').addEventListener('click', e => {
      e.stopPropagation();
      deleteSession(session.id);
    });
    historyList.appendChild(li);
  });
}
function deleteSession(id) {
  sessions = sessions.filter(s => s.id !== id);
  if (activeId === id) { activeId = null; showWelcome(); }
  saveSessions();
  renderHistory();
}

// ── UI state ──────────────────────────────────────────────
function showWelcome() {
  welcomeScreen.style.display = 'flex';
  messagesContainer.classList.remove('visible');
  messagesContainer.innerHTML = '';
}
function showMessages() {
  welcomeScreen.style.display = 'none';
  messagesContainer.classList.add('visible');
}

// ── Message rendering ─────────────────────────────────────
function appendUserMessage(text, save = true) {
  showMessages();
  const div = document.createElement('div');
  div.className = 'message user';
  div.innerHTML = `
    <div class="msg-wrap">
      <div class="message-bubble">${escHtml(text)}</div>
      <div class="message-actions">
        <button class="msg-action-btn" onclick="copyText(this,'${escAttr(text)}')">
          ${iconCopy()} Copy
        </button>
      </div>
    </div>`;
  messagesContainer.appendChild(div);
  if (save) {
    let session = getActiveSession();
    if (!session) session = createSession(text);
    session.messages.push({ role: 'user', content: text });
    saveSessions();
  }
  scrollToBottom();
}

function appendAiMessage(text, save = true) {
  const div = document.createElement('div');
  div.className = 'message ai';
  const html = renderMarkdown(text);
  div.innerHTML = `
    <div class="ai-avatar">D</div>
    <div class="msg-wrap">
      <div class="message-bubble">${html}</div>
      <div class="message-actions">
        <button class="msg-action-btn" onclick="copyText(this,${JSON.stringify(text)})">
          ${iconCopy()} Copy
        </button>
      </div>
    </div>`;
  messagesContainer.appendChild(div);
  // Highlight code
  div.querySelectorAll('pre code').forEach(block => {
    if (window.hljs) hljs.highlightElement(block);
  });
  if (save) {
    const session = getActiveSession();
    if (session) {
      session.messages.push({ role: 'assistant', content: text });
      saveSessions();
    }
  }
  scrollToBottom();
  return div;
}

function appendTypingIndicator() {
  const div = document.createElement('div');
  div.className = 'typing-indicator';
  div.id = 'typingIndicator';
  div.innerHTML = `
    <div class="ai-avatar" style="width:30px;height:30px;font-size:11px;flex-shrink:0;">D</div>
    <div class="typing-dots">
      <span></span><span></span><span></span>
    </div>`;
  messagesContainer.appendChild(div);
  scrollToBottom();
  return div;
}
function removeTypingIndicator() {
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

// ── Streaming typewriter ──────────────────────────────────
function typewriterEffect(msgDiv, fullText) {
  const bubble = msgDiv.querySelector('.message-bubble');
  const chars  = [...fullText];
  let i = 0, current = '';

  return new Promise(resolve => {
    clearInterval(streamInterval);
    streamInterval = setInterval(() => {
      const chunk = Math.min(4, chars.length - i);
      current += chars.slice(i, i + chunk).join('');
      i += chunk;
      bubble.innerHTML = renderMarkdown(current);
      bubble.querySelectorAll('pre code').forEach(b => { if (window.hljs) hljs.highlightElement(b); });
      scrollToBottom();
      if (i >= chars.length) {
        clearInterval(streamInterval);
        // Final render
        bubble.innerHTML = renderMarkdown(fullText);
        bubble.querySelectorAll('pre code').forEach(b => { if (window.hljs) hljs.highlightElement(b); });
        scrollToBottom();
        resolve();
      }
    }, 12);
  });
}

// ── Main send flow ────────────────────────────────────────
async function handleSend() {
  const text = userInput.value.trim();
  if (!text || isStreaming) return;

  userInput.value = '';
  autoResize(userInput);
  sendBtn.disabled = true;
  isStreaming = true;

  appendUserMessage(text);
  showMessages();
  appendTypingIndicator();

  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.reply || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const reply = data.reply || '';

    removeTypingIndicator();

    // Create placeholder AI message div for typewriter
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message ai';
    msgDiv.innerHTML = `
      <div class="ai-avatar">D</div>
      <div class="msg-wrap">
        <div class="message-bubble"></div>
        <div class="message-actions">
          <button class="msg-action-btn" onclick="copyText(this,${JSON.stringify(reply)})">
            ${iconCopy()} Copy
          </button>
        </div>
      </div>`;
    messagesContainer.appendChild(msgDiv);
    scrollToBottom();

    await typewriterEffect(msgDiv, reply);

    // Save
    const ses = getActiveSession();
    if (ses) {
      ses.messages.push({ role: 'assistant', content: reply });
      saveSessions();
    }

  } catch (err) {
    removeTypingIndicator();
    showToast('Error: ' + (err.message || 'Something went wrong'), 'error');
  } finally {
    isStreaming = false;
    sendBtn.disabled = !userInput.value.trim();
  }
}

// ── Markdown rendering ────────────────────────────────────
function renderMarkdown(text) {
  if (!window.marked) return escHtml(text).replace(/\n/g, '<br>');

  // Pre-process: wrap code blocks with custom header
  let html = marked.parse(text);

  // Replace bare <pre><code ...> with code-block wrapper
  html = html.replace(
    /<pre><code class="(language-(\w+))">([\s\S]*?)<\/code><\/pre>/g,
    (_, cls, lang, code) => `
      <div class="code-block">
        <div class="code-block-header">
          <span class="code-lang">${lang}</span>
          <button class="copy-code-btn" onclick="copyCode(this)">
            ${iconCopy()} Copy code
          </button>
        </div>
        <pre><code class="${cls}">${code}</code></pre>
      </div>`
  );

  // Handle code blocks with no language
  html = html.replace(
    /<pre><code>([\s\S]*?)<\/code><\/pre>/g,
    (_, code) => `
      <div class="code-block">
        <div class="code-block-header">
          <span class="code-lang">code</span>
          <button class="copy-code-btn" onclick="copyCode(this)">
            ${iconCopy()} Copy code
          </button>
        </div>
        <pre><code>${code}</code></pre>
      </div>`
  );

  return html;
}

// ── Helpers ───────────────────────────────────────────────
function scrollToBottom() {
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 200) + 'px';
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function escAttr(str) {
  return str.replace(/'/g, "\\'").replace(/\n/g, ' ');
}

function showToast(msg, type = 'error') {
  toast.textContent = msg;
  toast.className = `toast ${type} visible`;
  setTimeout(() => { toast.classList.remove('visible'); }, 3500);
}

function copyText(btn, text) {
  navigator.clipboard.writeText(text).then(() => {
    btn.classList.add('copied');
    const orig = btn.innerHTML;
    btn.innerHTML = `${iconCheck()} Copied`;
    setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 1800);
  }).catch(() => showToast('Copy failed', 'error'));
}

function copyCode(btn) {
  const code = btn.closest('.code-block').querySelector('code');
  const text = code.innerText || code.textContent;
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.innerHTML;
    btn.innerHTML = `${iconCheck()} Copied!`;
    setTimeout(() => { btn.innerHTML = orig; }, 1800);
  }).catch(() => showToast('Copy failed', 'error'));
}

function iconCopy() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
  </svg>`;
}
function iconCheck() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
    <polyline points="20 6 9 17 4 12"/>
  </svg>`;
}