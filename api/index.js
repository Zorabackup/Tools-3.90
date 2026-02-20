  const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ✅ CRITICAL: Serve index.html for ALL routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// YOUR ORIGINAL SOCKET EVENTS - UNCHANGED
io.on('connection', (socket) => {
  console.log('Client connected');
  
  // YOUR ORIGINAL PACKET LOGIC
  setInterval(() => {
    const packet = {
      src: `192.168.1.${Math.floor(Math.random()*255)}`,
      dst: `10.0.0.${Math.floor(Math.random()*255)}`,
      protocol: Math.random() > 0.5 ? 'TCP' : 'UDP',
      size: Math.floor(Math.random() * 1500)
    };
    socket.emit('packet', \`TCP ${packet.src}:${Math.floor(Math.random()*65535)} → ${packet.dst}:${Math.floor(Math.random()*65535)} | ${packet.size} bytes\`);
  }, 2000);
  
  socket.on('scan_network', () => {
    // YOUR ORIGINAL SCAN LOGIC
    const subnet = '192.168.1';
    for(let i = 1; i <= 50; i++) {
      setTimeout(() => {
        socket.emit('device', {
          ip: `${subnet}.${i}`,
          mac: `00:14:22:01:23:${i.toString(16).padStart(2, '0')}`,
          vendor: `Device ${i}`,
          openPorts: [80, 443, 22]
        });
      }, i * 100);
    }
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});

module.exports = app;
