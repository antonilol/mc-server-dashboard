const id = e => document.getElementById(e);

const ws = new WebSocket('ws://[::1]:8080');

const send = j => ws.send(JSON.stringify(j));

ws.onopen = () => {
};

function serverLog(data) {
	id('log').innerText += data;
	id('log').scrollTop = id('log').scrollHeight;
}

ws.onmessage = e => {
	const m = JSON.parse(e.data);
	if (m.type == 'log') {
		serverLog(m.data);
	}
};

id('start').addEventListener('click', e => {
	send({ type: 'action', data: 'start' });
});

id('stop').addEventListener('click', e => {
	send({ type: 'action', data: 'stop' });
});

