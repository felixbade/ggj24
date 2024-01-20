import { app, container } from './render.js'
const { controller, InputType } = UniversalGameController;

window.addEventListener('load', () => {

    const gameContainer = new PIXI.Container();
    container.addChild(gameContainer);

    const particle = PIXI.Sprite.from('assets/images/gas-particle.svg');
    particle.anchor.set(0.5);
    particle.scale.set(0.5); // 2x dpi
    gameContainer.addChild(particle);

    app.ticker.add(delta => {
        const speed = 5;
        particle.x += controller.move.x * delta * speed;
        particle.y += controller.move.y * delta * speed;
    });

});