const WebSocket = require('ws');

const PORT = 8080;
const server = new WebSocket.Server({ port: PORT });

let players = [];
let idCounter = 0;

console.log('========================================');
console.log('Сервер запущен на порту ' + PORT);
console.log('Код для Турбоварпа на этом ПК: ws://localhost:' + PORT);
console.log('Для других устройств узнайте IP командой ipconfig');
console.log('========================================\n');

function broadcast(message, exceptSocket) {
    players.forEach(p => {
        if (p.socket !== exceptSocket && p.socket.readyState === WebSocket.OPEN) {
            p.socket.send(message);
        }
    });
}

function sendToAll(message) {
    players.forEach(p => {
        if (p.socket.readyState === WebSocket.OPEN) {
            p.socket.send(message);
        }
    });
}

server.on('connection', (socket, req) => {
    idCounter++;
    const myId = idCounter;
    
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (ip.startsWith('::ffff:')) ip = ip.slice(7);
    
    players.push({ id: myId, socket: socket, ip: ip, data: null });
    
    console.log(`[+] Игрок ${myId} | IP: ${ip} | Всего игроков: ${players.length}`);
    
    socket.send(`0;${myId};${players.length}`);
    broadcast(`99;${myId};${players.length}`, socket);

    socket.on('message', (data) => {
        const text = data.toString();
        const parts = text.split(';');
        const cmd = parseInt(parts[0], 10);

        if (cmd === 1 && parts.length >= 8) {
            broadcast(text, socket);
        }

        if (cmd === 2) {
            socket.send(`3;${parts[1]}`);
        }
    });

    socket.on('close', () => {
        console.log(`[-] Игрок ${myId} | IP: ${ip} | Всего игроков: ${players.length - 1}`);
        players = players.filter(p => p.socket !== socket);
        sendToAll(`100;${myId};${players.length}`);
    });
});