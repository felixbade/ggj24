import { app, container } from './render.js'
import MultiplayerClient from './multiplayer.js';
const { controller, InputType } = UniversalGameController;

window.addEventListener('load', () => {
    const client = new MultiplayerClient();

    const gameContainer = new PIXI.Container();
    container.addChild(gameContainer);

    const particle = PIXI.Sprite.from('assets/images/ship-1.png');
    particle.anchor.set(0.5);
    particle.scale.set(0.05);
    particle.vx = 0;
    particle.vy = 0;
    gameContainer.addChild(particle);

    client.addEventListener('message', (event) => {
        const data = event.detail;
        particle.x = data.x;
        particle.y = data.y;
        particle.vx = data.vx;
        particle.vy = data.vy;
    });

    app.ticker.add(delta => {
        const speed = 0.2;
        particle.vx += controller.move.x * delta * speed;
        particle.vy += controller.move.y * delta * speed;
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;

        // rotate according to acceleration
        if (controller.move.x !== 0 || controller.move.y !== 0) {
            particle.rotation = Math.PI / 2 + Math.atan2(controller.move.y, controller.move.x);
        }

        // if controller !== (0,0) then send message
        // so we can get updates from other clients when we are resting
        if (controller.move.x !== 0 || controller.move.y !== 0) {
            client.send({
                x: particle.x,
                y: particle.y,
                vx: particle.vx,
                vy: particle.vy,
            });
        }

        // if trigger is pressed, move player to the center
        if (controller.trigger) {
            particle.x = 0;
            particle.y = 0;
            particle.vx = 0;
            particle.vy = 0;
            client.send({
                x: particle.x,
                y: particle.y,
                vx: particle.vx,
                vy: particle.vy,
            });
        }
    });

});