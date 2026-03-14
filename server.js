const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>WebRTC Signaling Server</h1><p>Use <a href="/sender.html">/sender.html</a> or <a href="/receiver.html">/receiver.html</a></p>');
    } else if (req.url === '/sender.html') {
        fs.readFile(path.join(__dirname, 'sender.html'), (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('File not found');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(data);
            }
        });
    } else if (req.url === '/receiver.html') {
        fs.readFile(path.join(__dirname, 'receiver.html'), (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('File not found');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(data);
            }
        });
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

const wss = new WebSocket.Server({ server });

let clients = { sender: null, receiver: null };

wss.on('connection', (ws) => {
    console.log('🟢 New client connected');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'register') {
                clients[data.role] = ws;
                console.log(`✅ Registered as ${data.role}`);
            }
            else if (data.type === 'offer') {
                if (clients.receiver) {
                    clients.receiver.send(JSON.stringify({ type: 'offer', offer: data.offer }));
                    console.log('📤 Offer forwarded to receiver');
                } else {
                    console.log('❌ No receiver available');
                }
            }
            else if (data.type === 'answer') {
                if (clients.sender) {
                    clients.sender.send(JSON.stringify({ type: 'answer', answer: data.answer }));
                    console.log('📤 Answer forwarded to sender');
                } else {
                    console.log('❌ No sender available');
                }
            }
            else if (data.type === 'ice-candidate') {
                const target = data.target === 'receiver' ? clients.receiver : clients.sender;
                if (target) {
                    target.send(JSON.stringify({ type: 'ice-candidate', candidate: data.candidate }));
                    console.log(`📤 ICE candidate forwarded to ${data.target}`);
                } else {
                    console.log(`❌ No ${data.target} available for ICE candidate`);
                }
            }
        } catch (e) {
            console.error('❌ Error processing message:', e);
        }
    });

    ws.on('close', () => {
        if (clients.sender === ws) clients.sender = null;
        if (clients.receiver === ws) clients.receiver = null;
        console.log('🔴 Client disconnected');
    });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`🚀 Signaling server running on port ${PORT}`);
    console.log(`🔗 Local URL: http://localhost:${PORT}`);
});
