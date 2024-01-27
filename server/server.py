import os
import asyncio
import json
import websockets
from dotenv import load_dotenv
from websockets import WebSocketServerProtocol

# Load the WebSocket port number from .env file or environment variable
load_dotenv()
WS_PORT = os.getenv('WS_PORT', 8000)

# This dictionary will store the connected clients along with their counter-ids
connected_clients = {}
counter = 0

# Commands
# 1. welcome: Sent to the client when the client connects
# 2. join: Sent to all other clients when a new client joins
# 3. message: Arbitrary broadcast message sent by a client
# 4. leave: Sent to all other clients when a client leaves


async def handler(websocket: WebSocketServerProtocol):
    global counter
    # Assign a unique counter-id to the client
    counter_id = counter = counter + 1
    connected_clients[counter_id] = websocket
    print(f"Client #{counter_id} connected")

    # Reply a welcome message to the client
    await websocket.send(json.dumps({
        "command": "welcome",
        "client_id": counter_id
    }))

    # Broadcast a join message to all connected clients, except the one who joined
    await broadcast(json.dumps({
        "command": "join",
        "client_id": counter_id
    }), websocket)

    try:
        async for message in websocket:
            print(f"Client #{counter_id} says: {message}")
            # Broadcast the message to all clients except the one who sent it
            await broadcast(json.dumps({
                "command": "message",
                "client_id": counter_id,
                "message": message
            }), websocket)
    except websockets.ConnectionClosed:
        pass
    finally:
        # Remove the client from the connected clients when disconnected
        connected_clients.pop(counter_id)
        print(f"Client #{counter_id} disconnected")

        # Broadcast a leave message to all connected clients, except the one who left
        await broadcast(json.dumps({
            "command": "leave",
            "client_id": counter_id
        }), websocket)


async def broadcast(message, sender_websocket):
    # Send the message to all connected clients except the sender
    for counter_id, client in connected_clients.items():
        if client != sender_websocket:
            await client.send(message)


async def main():
    # Start the WebSocket server
    async with websockets.serve(handler, "localhost", WS_PORT):
        print(f"Server started on ws://localhost:{WS_PORT}")
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    asyncio.run(main())
