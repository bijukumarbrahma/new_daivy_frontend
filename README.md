# Glint AI 🤖

> A modern AI chatbot powered by Gemini 2.5 Flash

Glint AI is a sleek, production-ready chatbot interface built with vanilla HTML, CSS, and JavaScript. It delivers seamless conversations with an AI assistant using Google's Gemini 2.5 Flash model.

![Glint AI Screenshot](./screenshot.png)

## ✨ Features

- **Modern Chat Interface** - Clean, minimalist design inspired by ChatGPT and Claude
- **Real-time Responses** - Powered by Gemini 2.5 Flash for intelligent conversations
- **Responsive Design** - Works flawlessly on desktop, tablet, and mobile
- **Typing Indicator** - Visual feedback while AI is generating responses
- **Copy Messages** - One-click copy for AI responses
- **Markdown Support** - Bold, italic, and code block rendering
- **Smooth Animations** - Polished transitions and micro-interactions

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Python Flask
- **AI Model**: Google Gemini 2.5 Flash

## 🚀 Getting Started

### Prerequisites

- Python 3.x
- Gemini API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/lordhanya/glint-frontend.git
   cd glint-frontend
   ```

2. **Set up the backend**
   ```bash
   cd glint-backend-main
   ```

3. **Configure API Key**

   Create a `.env` file in the backend directory:
   ```
   GEMINI_API_KEY=your_google_api_key_here
   ```

   Get your API key from: [Google AI Studio](https://aistudio.google.com/app/apikey)

4. **Run the backend**
   ```bash
   pip install -r requirements.txt
   python gemini_chatbot.py
   ```

5. **Open the frontend**

   Simply open `index.html` in your browser, or use a local server:
   ```bash
   python -m http.server 8000
   ```
   Then visit `http://localhost:8000`

## 📁 Project Structure

```
glint-frontend/
├── index.html      # Main HTML file
├── styles.css      # Custom styles
├── script.js       # Frontend logic
├── G.png          # Logo
└── README.md      # This file
```

## 🎨 Design System

| Color | Hex | Usage |
|-------|-----|-------|
| Background | `#0D0D0D` | Main background |
| Surface | `#161616` | Cards, input |
| Accent | `#A855F7` | Primary actions |
| Text | `#FAFAFA` | Primary text |

## ⚠️ Note

This is a prototype version. You may experience:
- Occasional slow response times
- Connectivity issues during high traffic
- Unexpected errors

## 📄 License

MIT License

---

Made with 💜 by [Ashif Rahman](https://github.com/lordhanya)
