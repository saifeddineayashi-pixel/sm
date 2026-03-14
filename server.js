const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    // خدمة ملفات HTML (اختياري، يمكن استخدام GitHub Pages بدلاً من ذلك)
    if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>WebRTC Signaling Server</h1><p>استخدم <a href="/sender.html">/sender.html</a> أو <a href="/receiver.html">/receiver.html</a></p>');
    } else if (req.url === '/sender.html') {
        fs.readFile(path.join(__dirname, 'sender.html'), (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('الملف غير موجود');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            }
        });
    } else if (req.url === '/receiver.html') {
        fs.readFile(path.join(__dirname, 'receiver.html'), (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('الملف غير موجود');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            }
        });
    } else {
        res.writeHead(404);
        res.end('غير موجود');
    }
});

const wss = new WebSocket.Server({ server });

let clients = { sender: null, receiver: null };

wss.on('connection', (ws) => {
    console.log('🟢 عميل جديد متصل');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'register') {
                clients[data.role] = ws;
                console.log(`✅ تم تسجيل ${data.role}`);
            }
            else if (data.type === 'offer') {
                if (clients.receiver) {
                    clients.receiver.send(JSON.stringify({ type: 'offer', offer: data.offer }));
                    console.log('📤 تم تمرير العرض إلى المستقبل');
                }
            }
            else if (data.type === 'answer') {
                if (clients.sender) {
                    clients.sender.send(JSON.stringify({ type: 'answer', answer: data.answer }));
                    console.log('📤 تم تمرير الرد إلى المرسل');
                }
            }
            else if (data.type === 'ice-candidate') {
                const target = data.target === 'receiver' ? clients.receiver : clients.sender;
                if (target) {
                    target.send(JSON.stringify({ type: 'ice-candidate', candidate: data.candidate }));
                    console.log(`📤 تم تمرير ICE candidate إلى ${data.target}`);
                }
            }
        } catch (e) {
            console.error('❌ خطأ في معالجة الرسالة:', e);
        }
    });

    ws.on('close', () => {
        if (clients.sender === ws) clients.sender = null;
        if (clients.receiver === ws) clients.receiver = null;
        console.log('🔴 عميل قطع الاتصال');
    });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`🚀 خادم Signaling يعمل على المنفذ ${PORT}`);
    console.log(`🔗 رابط الخادم المحلي: http://localhost:${PORT}`);
});