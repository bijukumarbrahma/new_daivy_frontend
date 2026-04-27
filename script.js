// ── State ──────────────────────────────────────────────────
let conversationHistory = [];
let isGenerating = false;
let chatSessions = JSON.parse(localStorage.getItem("daivySessions") || "[]");

// ── DOM Refs ───────────────────────────────────────────────
const chatArea = document.getElementById("chatArea");
const messagesEl = document.getElementById("messages");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const welcome = document.getElementById("welcome");
const menuBtn = document.getElementById("menuBtn");
const sidebar = document.getElementById("sidebar");
const closeSidebar = document.getElementById("closeSidebar");
const overlay = document.getElementById("overlay");
const themeToggle = document.getElementById("themeToggle");
const newChatBtn = document.getElementById("newChatBtn");
const historyList = document.getElementById("historyList");

// ── Theme ──────────────────────────────────────────────────
const savedTheme = localStorage.getItem("daivyTheme") || "dark";
document.documentElement.setAttribute("data-theme", savedTheme);

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("daivyTheme", next);
});

// ── Sidebar ────────────────────────────────────────────────
menuBtn.addEventListener("click", () => {
  sidebar.classList.add("open");
  overlay.classList.add("show");
});

closeSidebar.addEventListener("click", closeSidebarFn);
overlay.addEventListener("click", closeSidebarFn);

function closeSidebarFn() {
  sidebar.classList.remove("open");
  overlay.classList.remove("show");
}

// ── New Chat ───────────────────────────────────────────────
newChatBtn.addEventListener("click", () => {
  startNewChat();
  closeSidebarFn();
});

function startNewChat() {
  conversationHistory = [];
  messagesEl.innerHTML = "";
  welcome.style.display = "flex";
  messagesEl.style.display = "none";
  userInput.value = "";
  updateSendBtn();
}

// ── History ────────────────────────────────────────────────
function saveSession(title) {
  const session = { id: Date.now(), title, history: conversationHistory };
  chatSessions.unshift(session);
  if (chatSessions.length > 20) chatSessions.pop();
  localStorage.setItem("daivySessions", JSON.stringify(chatSessions));
  renderHistory();
}

function renderHistory() {
  historyList.innerHTML = "";
  chatSessions.forEach(session => {
    const li = document.createElement("li");
    li.textContent = session.title;
    li.title = session.title;
    li.addEventListener("click", () => {
      loadSession(session);
      closeSidebarFn();
    });
    historyList.appendChild(li);
  });
}

function loadSession(session) {
  conversationHistory = [...session.history];
  messagesEl.innerHTML = "";
  welcome.style.display = "none";
  messagesEl.style.display = "flex";

  session.history.forEach(msg => {
    if (msg.role === "user") appendMessage("user", msg.parts[0].text);
    else appendMessage("ai", msg.parts[0].text);
  });

  scrollToBottom();
}

renderHistory();

// ── Input ──────────────────────────────────────────────────
userInput.addEventListener("input", () => {
  autoResizeTextarea();
  updateSendBtn();
});

userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (!sendBtn.disabled) sendMessage();
  }
});

function autoResizeTextarea() {
  userInput.style.height = "auto";
  userInput.style.height = Math.min(userInput.scrollHeight, 180) + "px";
}

function updateSendBtn() {
  sendBtn.disabled = userInput.value.trim() === "" || isGenerating;
}

sendBtn.addEventListener("click", sendMessage);

// ── Suggestion cards ───────────────────────────────────────
document.querySelectorAll(".suggestion-card").forEach(card => {
  card.addEventListener("click", () => {
    userInput.value = card.getAttribute("data-prompt");
    autoResizeTextarea();
    updateSendBtn();
    sendMessage();
  });
});

// ── Send ───────────────────────────────────────────────────
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text || isGenerating) return;

  welcome.style.display = "none";
  messagesEl.style.display = "flex";

  appendMessage("user", text);
  conversationHistory.push({ role: "user", parts: [{ text }] });

  userInput.value = "";
  userInput.style.height = "auto";
  updateSendBtn();
  scrollToBottom();

  const typingEl = showTyping();
  isGenerating = true;
  updateSendBtn();

  try {
    const res = await fetch("https://glint-backend-7d4a.onrender.com/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.reply || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const aiText = data.reply;

    if (!aiText) {
      throw new Error("No response from server");
    }

    typingEl.remove();
    await typeMessage(aiText);

    conversationHistory.push({ role: "model", parts: [{ text: aiText }] });

    if (conversationHistory.length === 2) {
      const title = text.length > 42 ? text.slice(0, 42) + "…" : text;
      saveSession(title);
    }

  } catch (err) {
    typingEl.remove();
    appendError(err.message || "Something went wrong. Please try again.");
    console.error("API error:", err);
  } finally {
    isGenerating = false;
    updateSendBtn();
    scrollToBottom();
  }
}

// ── Append message ─────────────────────────────────────────
function appendMessage(role, text) {
  if (role === "user") {
    const row = document.createElement("div");
    row.className = "message-row user";

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.textContent = text;

    row.appendChild(bubble);
    messagesEl.appendChild(row);
  } else {
    const row = document.createElement("div");
    row.className = "message-row ai";

    const avatar = document.createElement("div");
    avatar.className = "ai-avatar";
    avatar.textContent = "D";

    const content = document.createElement("div");
    content.className = "ai-message-content";

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.innerHTML = formatAIResponse(text);

    content.appendChild(bubble);
    row.appendChild(avatar);
    row.appendChild(content);
    messagesEl.appendChild(row);
  }

  scrollToBottom();
}

// ── Typewriter animation ───────────────────────────────────
async function typeMessage(fullText) {
  const row = document.createElement("div");
  row.className = "message-row ai";

  const avatar = document.createElement("div");
  avatar.className = "ai-avatar";
  avatar.textContent = "D";

  const content = document.createElement("div");
  content.className = "ai-message-content";

  const bubble = document.createElement("div");
  bubble.className = "message-bubble typing-text";

  const cursor = document.createElement("span");
  cursor.className = "type-cursor";
  cursor.textContent = "▋";

  content.appendChild(bubble);
  row.appendChild(avatar);
  row.appendChild(content);
  messagesEl.appendChild(row);
  scrollToBottom();

  let displayed = "";
  const chars = [...fullText];
  const SPEED = 12;

  await new Promise(resolve => {
    let i = 0;
    function tick() {
      if (i >= chars.length) {
        bubble.innerHTML = formatAIResponse(fullText);
        resolve();
        return;
      }
      const burst = i < 60 ? 1 : 3;
      for (let b = 0; b < burst && i < chars.length; b++, i++) {
        displayed += chars[i];
      }
      bubble.textContent = displayed;
      bubble.appendChild(cursor);
      scrollToBottom();
      setTimeout(tick, SPEED);
    }
    tick();
  });
}

// ── Format AI text ─────────────────────────────────────────
function formatAIResponse(text) {
  let html = escapeHtml(text);

  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });

  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  html = html.replace(/^[\s]*[-•*]\s+(.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>[\s\S]+?<\/li>)/g, "<ul>$1</ul>");

  const parts = html.split(/\n{2,}/);
  html = parts.map(part => {
    part = part.trim();
    if (!part) return "";
    if (part.startsWith("<ul>") || part.startsWith("<pre>")) return part;
    part = part.replace(/\n/g, "<br>");
    return `<p>${part}</p>`;
  }).join("");

  return html;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Typing indicator ───────────────────────────────────────
function showTyping() {
  const row = document.createElement("div");
  row.className = "message-row ai";

  const avatar = document.createElement("div");
  avatar.className = "ai-avatar";
  avatar.textContent = "D";

  const content = document.createElement("div");
  content.className = "ai-message-content";

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";

  const indicator = document.createElement("div");
  indicator.className = "typing-indicator";
  indicator.innerHTML = `
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
  `;

  bubble.appendChild(indicator);
  content.appendChild(bubble);
  row.appendChild(avatar);
  row.appendChild(content);
  messagesEl.appendChild(row);

  scrollToBottom();
  return row;
}

// ── Error ──────────────────────────────────────────────────
function appendError(msg) {
  const row = document.createElement("div");
  row.className = "message-row ai";

  const avatar = document.createElement("div");
  avatar.className = "ai-avatar";
  avatar.textContent = "D";

  const content = document.createElement("div");
  content.className = "ai-message-content";

  const errEl = document.createElement("div");
  errEl.className = "error-msg";
  errEl.innerHTML = `${escapeHtml(msg)}`;

  content.appendChild(errEl);
  row.appendChild(avatar);
  row.appendChild(content);
  messagesEl.appendChild(row);
}

// ── Scroll ─────────────────────────────────────────────────
function scrollToBottom() {
  requestAnimationFrame(() => {
    chatArea.scrollTop = chatArea.scrollHeight;
  });
}

// ── Init ───────────────────────────────────────────────────
messagesEl.style.display = "none";
updateSendBtn();