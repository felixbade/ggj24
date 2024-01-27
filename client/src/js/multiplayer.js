const localURL = 'ws://localhost:8000';
const remoteURL = 'wss://server.ggj24.bloat.app';
const runningLocally = window.location.hostname === 'localhost';
const serverURL = runningLocally ? localURL : remoteURL;

const getRandomId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

class MultiplayerClient extends EventTarget {
    constructor() {
        super();
        this.state = {};
        this.gameStateId = null;
        this.unhandledEvents = {};
        this.locallyHandledEvents = {};
        this.clientId = null;
        this.socket = new WebSocket(serverURL);
        this.socket.addEventListener('message', (event) => {
            const data = JSON.parse(event.data);

            const { command } = data;
            if (command === 'welcome') {
                this.clientId = data.client_id;
                this.dispatchEvent(new CustomEvent('welcome', { detail: data }));

            } else if (command === 'join') {
                this.dispatchEvent(new CustomEvent('join', { detail: data }));

            } else if (command === 'leave') {
                this.dispatchEvent(new CustomEvent('leave', { detail: data }));

            } else if (command === 'state') {
                this.gameStateId = data.id;
                this.state = data.state;
                for (const handled_event_id of data.handled_event_ids) {
                    delete this.unhandledEvents[handled_event_id];
                    delete this.locallyHandledEvents[handled_event_id];
                }

                // State command means someone else updated it.
                // We need to move all locally handled events to unhandled events.
                // And delete all locally handled events.
                for (const id in this.locallyHandledEvents) {
                    this.unhandledEvents[id] = this.locallyHandledEvents[id];
                    delete this.locallyHandledEvents[id];
                }

                this.dispatchEvent(new CustomEvent('state', {
                    detail: {
                        state: data.state,
                        unhandledEvents: this.unhandledEvents,
                    }
                }));

            } else if (command === 'handled-events') {
                for (const handled_event_id of data.handled_event_ids) {
                    delete this.unhandledEvents[handled_event_id];
                    delete this.locallyHandledEvents[handled_event_id];
                }

            } else if (command === 'event') {
                // add event to unhandled events
                this.unhandledEvents[data.id] = data.event;

            } else if (command === 'message') {
                this.dispatchEvent(new CustomEvent('message', { detail: data }));
            }
        });
    }

    setState(newState) {
        const oldStateId = this.gameStateId;
        const newStateId = getRandomId();

        this.gameStateId = newStateId;
        this.state = newState;

        if (this.socket.readyState !== WebSocket.OPEN) {
            return;
        }
        this.send({
            command: 'state',
            based_on_id: oldStateId,
            id: newStateId,
            state: newState,
            handled_event_ids: Object.keys(this.locallyHandledEvents),
        });
    }

    addEvent(event) {
        const id = getRandomId();
        // todo
        // event.time = new Date();
        this.unhandledEvents[id] = event;
        if (this.socket.readyState !== WebSocket.OPEN) {
            return;
        }
        this.send({
            command: 'event',
            id: id,
            event: event,
        });
    }

    handleEvent(eventId) {
        // move from unhandledEvents to locallyHandledEvents
        const event = this.unhandledEvents[eventId];
        delete this.unhandledEvents[eventId];
        this.locallyHandledEvents[eventId] = event;
    }

    send(data) {
        this.socket.send(JSON.stringify(data));
    }
}

export default MultiplayerClient;