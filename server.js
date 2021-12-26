const WebSocketServer = require('websocket').server;
const http = require('http');
const fs = require('fs');
const { spawn } = require('child_process');

const config = {
	serverDir: 'test/',
	password: 'test'
}

const html = fs.readFileSync('index.html');
const js   = fs.readFileSync('index.js');

const server = http.createServer((req, res) => {
	if (req.url == '/') {
		res.end(html);
	} else if (req.url == '/index.js') {
		res.end(js);
	} else {
		res.writeHead(404);
		res.end();
	}
});

server.listen(8080, () => {
	console.log('Server is listening');
});

const wsServer = new WebSocketServer({ httpServer: server, autoAcceptConnections: false });

var p;

function log(d) {
	if (typeof d !== 'string') { // Buffer
		d = d.toString();
	}
	return JSON.stringify({ type: 'log', data: d });
}

const conns = [];

function broadcast(m) {
	m = log(m);
	conns.forEach(c => {
		c.sendUTF(m);
	});
}

wsServer.on('request', req => {
	const conn = req.accept('', req.origin);

	function send(m) {
		conn.sendUTF(log(m));
	}

	conns.push(conn);

	console.log(conn.remoteAddress + ' connected');

	conn.on('message', msg => {
		if (msg.type === 'utf8') {
			const data = msg.utf8Data;
			var json;
			try {
				json = JSON.parse(data);
			}
			catch (e) {
			}
			if (!json.type || !json.data) {
				return;
			}
			if (json.type == 'action') {
				if (json.data == 'start') {
					if (!p) {
						p = spawn('java', [ '-jar', 'server.jar' ], { cwd: config.serverDir });
						p.stdout.on('data', broadcast);
						p.stderr.on('data', broadcast);
						p.on('close', () => {
							broadcast(`\nMinecraft server exited.\n\n`);
							p = null;
						});
					} else {
						send(`Can't start, server is already running\n`);
					}
				} else if (json.data == 'stop') {
					if (p) {
						broadcast(`> stop\n`);
						p.stdin.write('stop\n');
					} else {
						send(`Can't stop, server is not running\n`);
					}
				}
			} else if (json.type == 'command') {
				if (p) {
					broadcast(`> ${json.data}\n`);
					p.stdin.write(json.data + '\n');
				}
			}
		}
	});

	conn.on('close', () => {
		console.log(conn.remoteAddress + ' disconnected');
		const index = conns.indexOf(conn);
		if (index !== -1) {
			conns.splice(index, 1);
		}
	});
});
