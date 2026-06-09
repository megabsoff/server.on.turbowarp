const WebSocket = require('ws');
const PORT = process.env.PORT || 8080;
const server = new WebSocket.Server({ port: PORT });

let clients = {}; // { socketId: { socket, role, id } }
let idCounter = 0;

console.log('Сервер управления запущен на порту ' + PORT);

server.on('connection', (socket, req) => {
    idCounter++;
    const myId = idCounter;
    let ip = req.socket.remoteAddress;
    if (ip.startsWith('::ffff:')) ip = ip.slice(7);

    // Временно без роли
    clients[myId] = { socket, role: null, id: myId, ip };
    console.log(`[+] Подключился ${myId} | IP: ${ip}`);

    socket.on('message', (data) => {
        const text = data.toString();
        const parts = text.split(';');
        const cmd = parts[0];

        // Регистрация роли
        if (cmd === 'reg') {
            const role = parts[1]; // 'controller' или 'client'
            if (role === 'controller' || role === 'client') {
                clients[myId].role = role;
                socket.send(`info;${myId};${role}`);
                console.log(`ID ${myId} зарегистрирован как ${role}`);
            }
            return;
        }

        // Дальше только если роль уже есть
        if (!clients[myId].role) {
            socket.send('error;Сначала зарегистрируйся (reg;controller или reg;client)');
            return;
        }

        // Команда 1: ПК → конкретному клиенту
        if (cmd === '1' && clients[myId].role === 'controller') {
            const targetId = parseInt(parts[1], 10);
            const action = parts.slice(2).join(';'); // всё остальное
            if (clients[targetId] && clients[targetId].role === 'client') {
                clients[targetId].socket.send(`1;${action}`);
                socket.send(`ok;отправлено клиенту ${targetId}`);
            } else {
                socket.send(`error;Клиент ${targetId} не найден или не является клиентом`);
            }
            return;
        }

        // Команда 2: ПК → всем клиентам
        if (cmd === '2' && clients[myId].role === 'controller') {
            const action = parts.slice(2).join(';');
            let count = 0;
            for (let id in clients) {
                if (clients[id].role === 'client' && clients[id].socket.readyState === WebSocket.OPEN) {
                    clients[id].socket.send(`1;${action}`);
                    count++;
                }
            }
            socket.send(`ok;отправлено ${count} клиентам`);
            return;
        }

        // Если клиент шлёт что-то — просто логируем
        if (clients[myId].role === 'client') {
            console.log(`Клиент ${myId} прислал: ${text}`);
            // Можно переслать контроллеру для обратной связи
            for (let id in clients) {
                if (clients[id].role === 'controller') {
                    clients[id].socket.send(`from_client;${myId};${text}`);
                }
            }
        }
    });

    socket.on('close', () => {
        console.log(`[-] Отключился ${myId} (${clients[myId]?.role || 'без роли'})`);
        delete clients[myId];
    });
});