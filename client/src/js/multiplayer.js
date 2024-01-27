const localURL = 'ws://localhost:8000';
const remoteURL = 'wss://server.ggj24.bloat.app';
const runningLocally = window.location.hostname === 'localhost';
const serverURL = runningLocally ? localURL : remoteURL;

class MultiplayerClient extends EventTarget {
    constructor() {
        super();
        this.socket = new WebSocket(serverURL);
        this.socket.addEventListener('message', (event) => {
            const data = JSON.parse(event.data);

            const { command } = data;
            if (command === 'welcome') {
                this.dispatchEvent(new CustomEvent('welcome', { detail: data }));

            } else if (command === 'join') {
                this.dispatchEvent(new CustomEvent('join', { detail: data }));

            } else if (command === 'leave') {
                this.dispatchEvent(new CustomEvent('leave', { detail: data }));

            } else if (command === 'state') {
                this.gameStateId = data.id;
                this.state = data.state;
                this.dispatchEvent(new CustomEvent('state', { detail: this.state }));

            } else if (command === 'message') {
                this.dispatchEvent(new CustomEvent('message', { detail: data }));
            }
        });
    }

    updateState(state) {
        const oldStateId = this.gameStateId;
        const newStateId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        this.gameStateId = newStateId;
        this.state = state;
        this.send({
            command: 'state',
            based_on_id: oldStateId,
            id: newStateId,
            state: state,
        });
    }

    send(data) {
        this.socket.send(JSON.stringify(data));
    }
}

export default MultiplayerClient;