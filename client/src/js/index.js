import { app, container } from './render.js'
import MultiplayerClient from './multiplayer.js';
const { controller, InputType } = UniversalGameController;

window.addEventListener('load', () => {
    const client = new MultiplayerClient();

    const gameContainer = new PIXI.Container();
    container.addChild(gameContainer);

    const particle = PIXI.Sprite.from('assets/images/gas-particle.svg');
    particle.anchor.set(0.5);
    particle.scale.set(0.5); // 2x dpi
    gameContainer.addChild(particle);

    client.addEventListener('message', (event) => {
        const data = event.detail;
        particle.x = data.x;
        particle.y = data.y;
    });

    app.ticker.add(delta => {
        const speed = 5;
        particle.x += controller.move.x * delta * speed;
        particle.y += controller.move.y * delta * speed;

        // if controller !== (0,0) then send message
        // so we can get updates from other clients when we are resting
        if (controller.move.x !== 0 || controller.move.y !== 0) {
            client.send({
                x: particle.x,
                y: particle.y,
            });
        }

        // if trigger is pressed, move player to the center
        if (controller.trigger) {
            particle.x = 0;
            particle.y = 0;
            client.send({
                x: particle.x,
                y: particle.y,
            });
        }
    });

});