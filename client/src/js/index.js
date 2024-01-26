import { app, container } from './render.js'
import MultiplayerClient from './multiplayer.js';
const { controller, InputType } = UniversalGameController;

window.addEventListener('load', () => {
    const client = new MultiplayerClient();

    const gameContainer = new PIXI.Container();
    container.addChild(gameContainer);

    const ship = PIXI.Sprite.from('assets/images/ship-1.png');
    ship.anchor.set(0.5, 0.65);
    ship.scale.set(0.05);
    ship.vx = 0;
    ship.vy = 0;
    gameContainer.addChild(ship);

    client.addEventListener('message', (event) => {
        const data = event.detail;
        ship.x = data.x;
        ship.y = data.y;
        ship.vx = data.vx;
        ship.vy = data.vy;
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
            client.send({
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