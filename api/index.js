const express = require('express');
const { exec } = require('child_process');
const { NetworkInterface } = require('systeminformation');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve frontend files

let activeScans = new Set();

// Real network scanning
async function scanNetwork() {
  const devices = [];
  
  try {
    // Get local network info
    const interfaces = await NetworkInterface.networkInterfaces();
    const activeInterface = interfaces.find(iface => 
      iface.operstate === 'up' && iface.type === 'wired' || iface.type === 'wireless'
    );
    
    if (activeInterface) {
      const subnet = activeInterface.ip4.split('.').slice(0, 3).join('.');
      
      // Real ping sweep (limited to avoid network flood)
      for (let i = 1; i <= 254; i += 10) { // Scan every 10th IP for performance
        const ip = `${subnet}.${i}`;
        exec(`ping -c 1 -W 1 ${ip}`, (err, stdout) => {
          if (!err && stdout.includes('1 packets received')) {
            const device = {
              ip,
              mac: 'N/A (ARP scan required)',
              vendor: 'Unknown',
              open_ports: [],
              services: [],
              vulnerabilities: []
            };
            devices.push(device);
            io.emit('device', device);
          }
        });
      }
    }
  } catch (error) {
    console.error('Scan error:', error);
  }
  
  setTimeout(() => {
    io.emit('scan_complete', devices);
  }, 5000);
}

// Simulate realistic network traffic
function generateTraffic() {
  const protocols = ['TCP', 'UDP', 'ICMP'];
  const services = ['HTTP', 'HTTPS', 'SSH', 'DNS', 'SMB'];
  const ips = ['192.168.1.', '10.0.0.', '172.16.'];
  
  setInterval(() => {
    const packet = {
      src: `${ips[Math.floor(Math.random()*ips.length)]}${Math.floor(Math.random()*255)}`,
      dst: `${ips[Math.floor(Math.random()*ips.length)]}${Math.floor(Math.random()*255)}`,
      protocol: protocols[Math.floor(Math.random()*protocols.length)],
      size: Math.floor(Math.random()*1500) + 64,
      service: services[Math.floor(Math.random()*services.length)],
      timestamp: new Date().toISOString()
    };
    
    io.emit('packet', packet);
  }, 1000);
}

// Get real system metrics
async function getNetworkMetrics() {
  try {
    const si = require('systeminformation');
    const networkStats = await si.networkStats();
    const interfaces = await si.networkInterfaces();
    
    const activeInterface = interfaces.find(iface => iface.operstate === 'up');
    
    return {
      local_ip: activeInterface?.ip4 || 'unknown',
      gateway: activeInterface?.gateway || 'unknown',
      network: activeInterface?.cidr || 'unknown',
      interface: activeInterface?.iface || 'unknown',
      uptime: `${Math.floor(os.uptime() / 3600)}h ${Math.floor((os.uptime() % 3600) / 60)}m`,
      connections: networkStats.length
    };
  } catch (error) {
    return {
      local_ip: '127.0.0.1',
      gateway: 'unknown',
      network: 'unknown',
      interface: 'unknown',
      uptime: 'unknown',
      connections: 0
    };
  }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('scan_network', async () => {
    if (!activeScans.has(socket.id)) {
      activeScans.add(socket.id);
      await scanNetwork();
      activeScans.delete(socket.id);
    }
  });
  
  socket.on('get_metrics', async () => {
    const metrics = await getNetworkMetrics();
    socket.emit('metrics', metrics);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    activeScans.delete(socket.id);
  });
});

// API endpoints
app.get('/api/metrics', async (req, res) => {
  const metrics = await getNetworkMetrics();
  res.json(metrics);
});

app.get('/api/scan', async (req, res) => {
  await scanNetwork();
  res.json({ status: 'scan initiated' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start traffic generation and server
generateTraffic();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Network Inspector server running on port ${PORT}`);
});