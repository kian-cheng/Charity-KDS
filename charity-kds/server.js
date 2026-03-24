const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// This line allows the iPads to see files (like ding.mp3) in your folder
app.use(express.static(__dirname));

let salesTally = {}; 
let activeOrders = {}; // Crucial for "Remembering" what to subtract when cancelling

// Routing
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/station/:type', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

io.on('connection', (socket) => {
    // 1. Sync the tally for the Register
    socket.emit('update_tally', salesTally);

    // 2. NEW: Sync active orders for the Kitchen Stations
    // We wait for the station to tell us what type it is (juice, smoothie, etc.)
    socket.on('request_sync', (stationType) => {
        console.log(`Syncing station: ${stationType}`);
        Object.values(activeOrders).forEach(order => {
            if (order.category === stationType) {
                socket.emit('display_order', order);
            }
        });
    });

    socket.on('new_order', (data) => {
        activeOrders[data.id] = data; 
        salesTally[data.name] = (salesTally[data.name] || 0) + 1;
        io.emit('display_order', data);
        io.emit('update_tally', salesTally);
    });

    socket.on('cancel_order', (orderId) => {
        const orderToCancel = activeOrders[orderId];
        if (orderToCancel) {
            if (salesTally[orderToCancel.name] > 0) {
                salesTally[orderToCancel.name] -= 1;
            }
            delete activeOrders[orderId];
            io.emit('remove_order', orderId);
            io.emit('update_tally', salesTally);
        }
    });

    socket.on('complete_order', (orderId) => {
        delete activeOrders[orderId];
        io.emit('remove_order', orderId);
    });
});

// The '0.0.0.0' is the secret to letting iPads connect via your IP
server.listen(3000, '0.0.0.0', () => {
    console.log('✅ Charity System Active!');
    console.log('Access via http://localhost:3000 on this laptop');
});