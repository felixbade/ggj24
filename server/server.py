import os
import asyncio
import json
import random
import websockets
from dotenv import load_dotenv
from websockets import WebSocketServerProtocol

# Load the WebSocket port number from .env file or environment variable
load_dotenv()
WS_PORT = os.getenv('WS_PORT', 8000)

# This dictionary will store the connected clients along with their counter-ids
connected_clients = {}
counter = 0

game_state = {}
game_state_id = None
unhandled_events = {}


# Commands
# 1. welcome: Sent to the client when the client connects
# 2. join: Sent to all other clients when a new client joins
# 3. message: Arbitrary broadcast message sent by a client
# 4. leave: Sent to all other clients when a client leaves


async def handler(websocket: WebSocketServerProtocol):
    global counter, game_state_id, game_state, unhandled_events
    # Assign a unique counter-id to the client
    counter_id = counter = counter + 1
    connected_clients[counter_id] = websocket
    print(f"Client #{counter_id} connected")

    try:

        # Reply a welcome message to the client
        await websocket.send(json.dumps({
            "command": "welcome",
            "client_id": counter_id
        }))

        # Send the current game state to the client
        await websocket.send(json.dumps({
            "command": "state",
            "state": game_state,
            "id": game_state_id,
            "handled_event_ids": []
        }))

        # Send all unhandled events to the client, one by one
        for id, event in unhandled_events.items():
            await websocket.send(json.dumps({
                "command": "event",
                "event": event,
                "id": id
            }))

        # Broadcast a join message to all connected clients, except the one who joined
        await broadcast(json.dumps({
            "command": "join",
            "client_id": counter_id
        }), websocket)

        async for message in websocket:
            data = json.loads(message)
            command = data.get("command")

            # if command == "event":
            #     unhandled_events.append(data)
            #     print(f"Client #{counter_id} sent an event: {data}")
            #     continue

            if command == "state":
                based_on_id = data.get("based_on_id")
                if based_on_id != game_state_id:
                    continue

                # TODO: delta compression
                game_state = data.get("state")
                game_state_id = data.get("id")
                handled_event_ids = data.get("handled_event_ids", [])

                unhandled_events = {k: v for k, v in unhandled_events.items(
                ) if k not in handled_event_ids}

                # Send the game state to all clients except the one who sent it
                await broadcast(json.dumps({
                    "command": "state",
                    "state": game_state,
                    "id": game_state_id,
                    "handled_event_ids": handled_event_ids

                }), websocket)

                # That client gets the list of handled events
                await websocket.send(json.dumps({
                    "command": "handled-events",
                    "handled_event_ids": handled_event_ids
                }))

            if command == "event":
                event = data.get("event")
                id = data.get("id")
                unhandled_events[id] = event

                # Broadcast the event to all clients except the one who sent it
                await broadcast(json.dumps({
                    "command": "event",
                    "event": data,
                    "id": id
                }), websocket)
                continue

    except websockets.ConnectionClosed:
        pass
    finally:
        await disconnected(counter_id, websocket)


async def disconnected(counter_id, websocket: WebSocketServerProtocol):
    # Remove the client from the connected clients when disconnected
    try:
        connected_clients.pop(counter_id)
    except KeyError:
        # sometimes the client gets multiple messages that all fail and each tries to disconnect
        return

    print(f"Client #{counter_id} disconnected")

    # Broadcast a leave message to all connected clients, except the one who left
    await broadcast(json.dumps({
        "command": "leave",
        "client_id": counter_id
    }), websocket)


async def broadcast(message, sender_websocket=None):
    # Send the message to all connected clients except the sender
    # might change during iteration
    clients = [x for x in connected_clients.items()]
    for counter_id, client in clients:
        if client != sender_websocket:
            try:
                await client.send(message)
            except (
                websockets.exceptions.ConnectionClosedError, websockets.exceptions.ConnectionClosedOK
            ):
                await disconnected(counter_id, client)


async def main():
    # Start the WebSocket server
    async with websockets.serve(handler, "localhost", WS_PORT):
        print(f"Server started on ws://localhost:{WS_PORT}")
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    asyncio.run(main())
