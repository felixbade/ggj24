import { app, container } from './render.js'
import MultiplayerClient from './multiplayer.js';
const { controller, InputType } = UniversalGameController;

window.addEventListener('load', () => {
    const client = new MultiplayerClient();

    const gameContainer = new PIXI.Container();
    container.addChild(gameContainer);

    const bgTexture = PIXI.Texture.from('assets/images/starfield-tile.png');
    const bgContainer = new PIXI.Container();
    gameContainer.addChild(bgContainer);

    const bgSprites = [];
    const bgScale = 0.5;
    for (let x = -5; x <= 5; x++) {
        for (let y = -5; y <= 5; y++) {
            const bgSprite = new PIXI.Sprite(bgTexture);
            bgSprite.anchor.set(0.5);
            bgSprite.scale.set(bgScale);
            bgSprite.x = x * 1000 * bgScale;
            bgSprite.y = y * 1000 * bgScale;
            bgContainer.addChild(bgSprite);
            bgSprites.push(bgSprite);
        }
    }

    const ship = PIXI.Sprite.from('assets/images/ship-1.png');
    ship.anchor.set(0.5, 0.7);
    ship.scale.set(0.05);
    ship.vx = 0;
    ship.vy = 0;
    gameContainer.addChild(ship);

    client.addEventListener('state', (event) => {
        const state = event.detail;

        ship.x = state.x;
        ship.y = state.y;
        ship.vx = state.vx;
        ship.vy = state.vy;
    });

    client.addEventListener('welcome', (event) => {
        const { client_id } = event.detail;
        alert(`Our ID: ${client_id}`);
    });

    client.addEventListener('join', (event) => {
        const { client_id } = event.detail;
        alert(`Client ${client_id} joined`);
    });

    client.addEventListener('leave', (event) => {
        const { client_id } = event.detail;
        alert(`Client ${client_id} left`);
    });

    app.ticker.add(delta => {
        const speed = 0.2;
        ship.vx += controller.move.x * delta * speed;
        ship.vy += controller.move.y * delta * speed;
        ship.x += ship.vx * delta;
        ship.y += ship.vy * delta;

        // rotate according to acceleration
        if (controller.move.x !== 0 || controller.move.y !== 0) {
            ship.rotation = Math.PI / 2 + Math.atan2(controller.move.y, controller.move.x);
        }

        // if controller !== (0,0) then send message
        // so we can get updates from other clients when we are resting
        if (controller.move.x !== 0 || controller.move.y !== 0) {
            client.updateState({
                x: ship.x,
                y: ship.y,
                vx: ship.vx,
                vy: ship.vy,
            });
        }

        // if trigger is pressed, move player to the center
        if (controller.trigger) {
            ship.x = 0;
            ship.y = 0;
            ship.vx = 0;
            ship.vy = 0;
            client.send({
                x: ship.x,
                y: ship.y,
                vx: ship.vx,
                vy: ship.vy,
            });
        }
    });

});