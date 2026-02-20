  const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.use(express.static('public'));
app.use(express.json());

// HTML RESPONSE - EMBEDDED (no file system crashes)
app.get('/', (req, res) => res.send(htmlResponse));
app.get('*', (req, res) => res.send(htmlResponse));

const htmlResponse = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Network Inspector</title>
<script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
<script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
<style>
body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-image:url('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSFVOZ2CsKQIPT0Lk06f5bNALaBIuEhMWppBg&s');margin:0;padding:0;color:#333;}
header,footer{background:#000000;color:rgb(0,255,42);text-align:center;padding:20px 10px;}
main{display:flex;flex-wrap:wrap;padding:20px;gap:20px;justify-content:space-around;}
section{background:white;padding:20px;border-radius:8px;flex:1 1 45%;box-shadow:0 2px 4px rgba(0,0,0,0.1);}
#network{width:100%;height:400px;border:1px solid #ddd;}
#log-container{height:400px;overflow-y:auto;background:#000;color:#0f0;padding:10px;font-family:monospace;font-size:14px;border:1px solid #333;}
#device-list{list-style:none;padding-left:0;font-family:monospace;font-size:14px;max-height:400px;overflow-y:auto;}
.device{margin:4px 0;border-bottom:1px dashed #ccc;padding:5px;}
.vuln{color:red;font-weight:bold;}
button{margin-bottom:10px;padding:6px 12px;background:#ff0000;color:rgb(0,255,85);border:none;border-radius:4px;cursor:pointer;}
.loading{text-align:center;color:#666;padding:20px;}
</style>
</head>
<body>
<header><h1>Network Inspector Dashboard</h1></header>
<main>
<section><h2>Connected Devices</h2><button onclick="fetchDevices()">Scan Devices</button><ul id="device-list"><li class="loading">Ready to scan...</li></ul></section>
<section><h2>Live Network Activity</h2><div id="log-container">Waiting for packets...</div></section>
<section><h2>Network Topology</h2><div id="network"></div></section>
<section><h2>Current Wi-Fi Connection</h2><div id="wifi-info" class="loading">Loading...</div></section>
</main>
<footer><p>&copy; 2025 Network Inspector</p></footer>

<script>
const socket=io();const logContainer=document.getElementById("log-container");const deviceList=document.getElementById("device-list");const wifiInfo=document.getElementById("wifi-info");let scanning=false;const deviceRatings={};let totalPackets=0;
socket.on("packet",(data)=>{const time=new Date().toLocaleTimeString();const entry=document.createElement("div");entry.textContent=\`[\${time}] \${data}\`;logContainer.appendChild(entry);logContainer.scrollTop=logContainer.scrollHeight;const ip=extractIPFromData(data);if(ip){if(!deviceRatings[ip])deviceRatings[ip]={count:0,rating:0};deviceRatings[ip].count+=1;totalPackets+=1;deviceRatings[ip].rating=(deviceRatings[ip].count/totalPackets)*100;}});
function extractIPFromData(data){const ipMatch=data.match(/(\\d{1,3}\\.){3}\\d{1,3}/);return ipMatch?ipMatch[0]:null;}
function getLocalIP(callback){const pc=new RTCPeerConnection({iceServers:[]});pc.createDataChannel('');pc.createOffer().then(offer=>pc.setLocalDescription(offer));pc.onicecandidate=(event)=>{if(!event||!event.candidate)return;const ipMatch=event.candidate.candidate.match(/([0-9]{1,3}(\\.[0-9]{1,3}){3})/);if(ipMatch)callback(ipMatch[1]);pc.close();};}
function displayWifiInfo(){if(navigator.connection){const c=navigator.connection;wifiInfo.innerHTML=\`<strong>Connection Type:</strong> \${c.effectiveType}<br><strong>Downlink:</strong> \${c.downlink} Mbps<br><strong>RTT:</strong> \${c.rtt} ms<br><strong>Save Data:</strong> \${c.saveData?'Yes':'No'}\`;}else{wifiInfo.textContent='Network info unavailable';}}
async function fetchDevices(){if(scanning)return;scanning=true;deviceList.innerHTML="<li>Scanning...</li>";getLocalIP((localIP)=>{const subnetBase=localIP.split('.').slice(0,3).join('.');deviceList.innerHTML="";const nodes=[],edges=[];for(let i=1;i<=50;i++){const ip=\`\${subnetBase}.\${i}\`;deviceRatings[ip]={count:0,rating:0};const li=document.createElement("li");li.className="device";li.textContent=\`\${ip} | 00:14:22:01:23:\${i.toString(16).padStart(2,'0')} | Device \${i} | Rating: 0.00%\`;deviceList.appendChild(li);nodes.push({id:i,label:ip,title:'Device '+i});if(i>1)edges.push({from:1,to:i});}drawTopology(nodes,edges);scanning=false;});}
function drawTopology(nodes,edges){const container=document.getElementById("network");const data={nodes:new vis.DataSet(nodes),edges:new vis.DataSet(edges)};const options={nodes:{shape:"box",color:"#007bff",font:{color:"white"}},edges:{arrows:'to',color:"#888"},physics:{enabled:true}};new vis.Network(container,data,options);}
displayWifiInfo();
</script>
</body></html>`;

// Socket.IO Server
const server = require('http').createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on('connection', (socket) => {
  console.log('Client connected');
  
  // Live packets (your original logic)
  setInterval(() => {
    const packet = `TCP 192.168.1.${Math.floor(Math.random()*255)}:54321 → 8.8.8.8:443 | 1024 bytes`;
    socket.emit('packet', packet);
  }, 1500);
});

module.exports = app;
