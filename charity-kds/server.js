const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

// --- THE MASTER DATA ---
let menuItems = {
    'Watermelon Juice': { category: 'juice', tally: 0, available: true },
    'Orange Juice': { category: 'juice', tally: 0, available: true },
    'Pineapple Punch': { category: 'juice', tally: 0, available: true },
    'Apple Juice': { category: 'juice', tally: 0, available: true },
    'Berries Smoothie': { category: 'smoothie', tally: 0, available: true },
    'Avocado Smoothie': { category: 'smoothie', tally: 0, available: true },
    'Banana Smoothie': { category: 'smoothie', tally: 0, available: true },
    'Matcha Latte': { category: 'cafe', tally: 0, available: true },
    'Tea': { category: 'cafe', tally: 0, available: true },
    'Americano': { category: 'cafe', tally: 0, available: true },
    'Cafe Latte': { category: 'cafe', tally: 0, available: true }
};

let activeOrders = {}; 

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/station/:type', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

io.on('connection', (socket) => {
    socket.emit('sync_menu', menuItems);

    socket.on('request_sync', (stationType) => {
        Object.values(activeOrders).forEach(order => {
            if (order.category === stationType) socket.emit('display_order', order);
        });
    });

    socket.on('new_order', (data) => {
        if (menuItems[data.name]) {
            // We use 'data.isUndo !== true' to be absolutely sure.
            // If it's a regular order, this is true. If it's an undo, this is false.
            if (data.isUndo !== true) {
                menuItems[data.name].tally += 1;
                console.log(`New Sale: ${data.name}. Tally is now ${menuItems[data.name].tally}`);
            } else {
                console.log(`Undo received for: ${data.name}. Tally remains ${menuItems[data.name].tally}`);
            }

            activeOrders[data.id] = data;
            io.emit('display_order', data);
            io.emit('sync_menu', menuItems);
        }
    });

    socket.on('complete_order', (orderId) => {
        delete activeOrders[orderId];
        io.emit('remove_order', orderId);
    });

    socket.on('cancel_order', (orderId) => {
        const order = activeOrders[orderId];
        if (order && menuItems[order.name]) {
            menuItems[order.name].tally = Math.max(0, menuItems[order.name].tally - 1);
            delete activeOrders[orderId];
            io.emit('remove_order', orderId);
            io.emit('sync_menu', menuItems);
        }
    });

    socket.on('admin_toggle_stock', (itemName) => {
        if (menuItems[itemName]) {
            menuItems[itemName].available = !menuItems[itemName].available;
            io.emit('sync_menu', menuItems);
        }
    });

    socket.on('admin_adjust_tally', (data) => {
        if (menuItems[data.name]) {
            menuItems[data.name].tally += data.amount;
            if (menuItems[data.name].tally < 0) menuItems[data.name].tally = 0;
            io.emit('sync_menu', menuItems);
        }
    });
});

server.listen(3000, '0.0.0.0', () => {
    console.log('✅ Server Running on Port 3000');
});
