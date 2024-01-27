import { cameraFollow } from './cameraFollow.js'
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
    const bgSize = 1000 * bgScale;
    for (let x = -5; x <= 5; x++) {
        for (let y = -5; y <= 5; y++) {
            const bgSprite = new PIXI.Sprite(bgTexture);
            bgSprite.anchor.set(bgScale);
            bgSprite.scale.set(bgScale);
            bgSprite.x = x * bgSize;
            bgSprite.y = y * bgSize;
            bgSprite.dx = x * bgSize;
            bgSprite.dy = y * bgSize;
            bgContainer.addChild(bgSprite);
            bgSprites.push(bgSprite);
        }
    }

    const shipTexture = PIXI.Texture.from('assets/images/ship-1.png');
    let thrusterTexture = PIXI.Texture.from('assets/images/exhaust-1.png');
    let spaceShipSprites = [];


    client.addEventListener('welcome', (event) => {
        // const nick = prompt('Enter your nickname');
        // client.addEvent({
        //     type: 'set-nick',
        //     nick,
        // });

        // add a new spaceship for us
        client.addEvent({
            type: 'add-spaceship',
            rocket_id: client.clientId,
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            rotation: 0,
        });
    });

    client.addEventListener('join', (event) => {
        const { client_id } = event.detail;
    });

    client.addEventListener('leave', (event) => {
        const { client_id } = event.detail;
        client.addEvent({
            type: 'remove-spaceship',
            rocket_id: client_id,
        });
    });

    let lastSimulateTime = performance.now();
    const simulateStep = () => {
        const now = performance.now();
        const delta = (now - lastSimulateTime) / 1000;

        // handle input -> events
        if (controller.move.x !== 0 || controller.move.y !== 0) {
            const acceleration = 720;
            client.addEvent({
                type: 'impulse',
                rocket_id: client.clientId,
                x: controller.move.x * acceleration * delta,
                y: controller.move.y * acceleration * delta,
            });
        }
        const { x, y } = controller.move;
        client.addEvent({
            type: 'set-thruster-level',
            rocket_id: client.clientId,
            level: Math.sqrt(x * x + y * y),
        })

        // handle events
        const state = client.state;
        if (!state.spaceships) {
            state.spaceships = {};
        }

        for (const [eventId, event] of Object.entries(client.unhandledEvents)) {
            if (event.type === 'add-spaceship') {
                state.spaceships[event.rocket_id] = {
                    x: event.x,
                    y: event.y,
                    vx: event.vx,
                    vy: event.vy,
                    rotation: event.rotation,
                };
                client.handleEvent(eventId);
            }
            if (event.type === 'remove-spaceship') {
                delete state.spaceships[event.rocket_id];
                client.handleEvent(eventId);
            }
            if (event.type === 'impulse') {
                const spaceship = state.spaceships[event.rocket_id];
                spaceship.vx += event.x;
                spaceship.vy += event.y;
                spaceship.rotation = Math.PI / 2 + Math.atan2(event.y, event.x);
                client.handleEvent(eventId);
            }
            if (event.type === 'set-thruster-level') {
                if (state.spaceships[event.rocket_id]) {
                    const spaceship = state.spaceships[event.rocket_id];
                    spaceship.thrusterLevel = event.level;
                    client.handleEvent(eventId);
                }
            }
        }

        // simulate world
        for (const spaceship of Object.values(state.spaceships)) {
            spaceship.x += spaceship.vx * delta;
            spaceship.y += spaceship.vy * delta;

            // warp
            // if (spaceship.x < -500) {
            //     spaceship.x += 1000;
            // }
            // if (spaceship.x > 500) {
            //     spaceship.x -= 1000;
            // }
            // if (spaceship.y < -500) {
            //     spaceship.y += 1000;
            // }
            // if (spaceship.y > 500) {
            //     spaceship.y -= 1000;
            // }
        }

        client.setState(state);
        lastSimulateTime = now;
    }

    simulateStep();
    setInterval(simulateStep, 1000 / 50);

    app.ticker.add(delta => {
        const age = (performance.now() - lastSimulateTime) / 1000;

        // delete all spaceships from the game
        for (const sprite of spaceShipSprites) {
            gameContainer.removeChild(sprite);
        }
        spaceShipSprites = [];

        // draw state on the screen
        const state = client.state;
        // if state === {} -> continue
        if (!state.spaceships) {
            console.log('no spaceships')
            return;
        }

        for (const [rocketId, spaceship] of Object.entries(state.spaceships)) {
            const sprite = new PIXI.Sprite(shipTexture);
            sprite.anchor.set(0.5, 0.7);
            sprite.scale.set(0.05);
            sprite.x = spaceship.x + age * spaceship.vx;
            sprite.y = spaceship.y + age * spaceship.vy;
            sprite.vx = spaceship.vx;
            sprite.vy = spaceship.vy;
            sprite.rotation = spaceship.rotation;
            spaceShipSprites.push(sprite);
            gameContainer.addChild(sprite);

            // thruster
            if (spaceship.thrusterLevel > 0) {
                const thrusterSprite = new PIXI.Sprite(thrusterTexture);
                thrusterSprite.anchor.set(0.5, 0.5118);
                thrusterSprite.scale.set(1.5, 5 * spaceship.thrusterLevel);
                thrusterSprite.y = 300;
                sprite.addChild(thrusterSprite);
            }

            // camera follow's player
            // one of them is a string, the other is a number, thus '==' instead of '==='
            if (client.clientId == rocketId) {
                cameraFollow(sprite);
            }
        }

        const playerShip = state.spaceships[client.clientId];

        // warp background with spaceship
        if (playerShip) {
            for (const bgSprite of bgSprites) {
                bgSprite.x = bgSprite.dx + Math.round(playerShip.x / bgSize) * bgSize;
                bgSprite.y = bgSprite.dy + Math.round(playerShip.y / bgSize) * bgSize;
            }
        }

    });

});