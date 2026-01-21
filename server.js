const fetch = require('node-fetch'); // из dependencies/node_modules
const compression = require('compression');
const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const http = require('http').Server(app);
const { Server } = require('socket.io');
const io = new Server(http);

app.use(compression());
app.use(cors());
app.use(express.static('dist', { index: 'demo.html', maxage: '4h' }));
app.use(bodyParser.json());

// Telegram webhook endpoint
app.post('/hook', (req, res) => {
  try {
    const message = req.body.message || req.body.channel_post;
    if (!message) {
      return res.status(400).send('No message');
    }

    const chatId = message.chat.id;
    const name = message.chat.first_name || message.chat.title || "admin";
    const text = message.text || "";
    const reply = message.reply_to_message;

    if (text.startsWith("/start")) {
      console.log("/start chatId " + chatId);
      sendTelegramMessage(chatId,
        "*Welcome to Intergram* \n" +
        "Your unique chat id is `" + chatId + "`\n" +
        "Use it to link between the embedded chat and this telegram chat",
        "Markdown");
    } else if (reply) {
      const replyText = reply.text || "";
      const userId = replyText.split(':')[0];
      io.to(userId).emit(chatId + "-" + userId, { name, text, from: 'admin' });
    } else if (text) {
      io.emit(chatId, { name, text, from: 'admin' });
    }

  } catch (err) {
    console.error("hook error", err, req.body);
  }
  res.status(200).end();
});

// WebSocket connection
io.on('connection', (socket) => {
  socket.on('register', (registerMsg) => {
    const userId = registerMsg.userId;
    const chatId = registerMsg.chatId;
    let messageReceived = false;

    socket.join(userId);
    console.log(`userId ${userId} connected to chatId ${chatId}`);

    socket.on('message', (msg) => {
      messageReceived = true;
      io.to(userId).emit(chatId + "-" + userId, msg);
      const visitorName = msg.visitorName ? `[${msg.visitorName}]: ` : "";
      sendTelegramMessage(chatId, `${userId}: ${visitorName} ${msg.text}`);
    });

    socket.on('disconnect', () => {
      if (messageReceived) {
        sendTelegramMessage(chatId, `${userId} has left`);
      }
    });
  });
});

// Telegram message sender with fetch
async function sendTelegramMessage(chatId, text, parseMode = 'Markdown') {
  try {
    const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ chat_id: chatId, text, parse_mode: parseMode })
    });
    if (!response.ok) {
      console.error('Failed to send Telegram message:', await response.text());
    }
  } catch (error) {
    console.error('Error sending Telegram message:', error);
  }
}

// Usage endpoints
app.post('/usage-start', (req, res) => {
  console.log('usage from', req.query.host);
  res.status(200).end();
});

app.post('/usage-end', (req, res) => {
  res.status(200).end();
});

// Listen on PORT or 3000
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`listening on port: ${PORT}`);
});

// Certbot challenge
app.get("/.well-known/acme-challenge/:content", (req, res) => {
  res.send(process.env.CERTBOT_RESPONSE);
});
