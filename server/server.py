import os
import asyncio
import websockets
from dotenv import load_dotenv
from websockets import WebSocketServerProtocol

# Load the WebSocket port number from .env file or environment variable
load_dotenv()
WS_PORT = os.getenv('WS_PORT', 6789)  # Assuming 6789 as default port if not defined

# This dictionary will store the connected clients along with their counter-ids
connected_clients = {}
counter = 0

async def handler(websocket: WebSocketServerProtocol):
    global counter
    # Assign a unique counter-id to the client
    counter_id = counter = counter + 1
    connected_clients[counter_id] = websocket
    print(f"Client #{counter_id} connected")

    try:
        async for message in websocket:
            print(f"Client #{counter_id} says: {message}")
            # Broadcast the message to all clients except the one who sent it
            await broadcast(message, websocket)
    except websockets.ConnectionClosed:
        pass
    finally:
        # Remove the client from the connected clients when disconnected
        connected_clients.pop(counter_id)
        print(f"Client #{counter_id} disconnected")

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
