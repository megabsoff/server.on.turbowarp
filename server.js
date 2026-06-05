const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const server = new WebSocket.Server({ port: PORT });

let players = [];
let idCounter = 0;

console.log('Сервер запущен на порту ' + PORT);

server.on('connection', (socket, req) => {
    idCounter++;
    const myId = idCounter;

    let ip = req.socket.remoteAddress;
    if (ip.startsWith('::ffff:')) ip = ip.slice(7);

    players.push({ id: myId, socket, ip });

    console.log(`[+] Игрок ${myId} | IP: ${ip} | Всего: ${players.length}`);

    socket.send(`0;${myId};${players.length}`);

    players.forEach(p => {
        if (p.socket !== socket && p.socket.readyState === WebSocket.OPEN) {
            p.socket.send(`99;${myId};${players.length}`);
        }
    });

    socket.on('message', data => {
        const text = data.toString();
        const parts = text.split(';');
        const cmd = parseInt(parts[0], 10);

        if (cmd === 1) {
            players.forEach(p => {
                if (p.socket !== socket && p.socket.readyState === WebSocket.OPEN) {
                    p.socket.send(text);
                }
            });
        }

        if (cmd === 2) {
            socket.send(`3;${parts[1]}`);
        }
    });

    socket.on('close', () => {
        console.log(`[-] Игрок ${myId} | IP: ${ip} | Всего: ${players.length - 1}`);
        players = players.filter(p => p.socket !== socket);
        players.forEach(p => {
            if (p.socket.readyState === WebSocket.OPEN) {
                p.socket.send(`100;${myId};${players.length}`);
            }
        });
    });
});
