import { InputHandler } from './InputHandler';
import { Player } from './entities/Player';
import { Bullet } from './entities/Bullet';
import { Enemy } from './entities/Enemy';

enum GameState {
    START_SCREEN,
    PLAYING
}

export class Game {
    private canvas: HTMLCanvasElement;
    public ctx: CanvasRenderingContext2D;
    private lastTime: number = 0;

    private bgImage: HTMLImageElement; // Background

    private input: InputHandler;
    private player: Player;
    private bullets: Bullet[] = [];
    private enemies: Enemy[] = [];

    private gameState: GameState = GameState.START_SCREEN;

    constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
        this.canvas = canvas;
        this.ctx = ctx;

        this.input = new InputHandler();
        this.player = new Player(100, 300);

        // Load Background
        this.bgImage = new Image();
        this.bgImage.src = 'assets/WhatsApp Image 2026-02-03 at 14.07.19.jpeg';

        // Spawn some enemies
        this.spawnEnemy(500, 272); // 400 (ground) - 128 (height)
        this.spawnEnemy(700, 272);
    }

    public start() {
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    private spawnEnemy(x: number, y: number) {
        this.enemies.push(new Enemy(x, y));
    }

    private gameLoop(timestamp: number) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.update(deltaTime, timestamp);
        this.draw();

        requestAnimationFrame(this.gameLoop.bind(this));
    }

    private update(deltaTime: number, now: number) {
        if (this.toggleCooldown > 0) {
            this.toggleCooldown -= deltaTime;
        }

        if (this.gameState === GameState.START_SCREEN) {
            // Check for start input (Enter or Click on button area - simplified to any key/click for now or Enter)
            if (this.input.isDown('Enter') || this.input.isDown('Space')) {
                this.gameState = GameState.PLAYING;
            }
            // Also check for mouse click if InputHandler supported it, but keyboard is safer for now.
            return;
        }

        // Player Update
        this.player.update(deltaTime, this.input);

        // Player Shoot Input
        if (this.input.isDown('KeyF') || this.input.isDown('KeyJ')) {
            const bulletData = this.player.shoot(now);
            if (bulletData) {
                this.bullets.push(new Bullet(bulletData.x, bulletData.y, bulletData.dir));
            }
        }

        // Toggle Character Input
        if (this.input.isDown('KeyX')) {
            this.handleToggleInput();
        }

        // Bullets Update & Cleanup
        this.bullets.forEach(b => b.update(deltaTime));
        this.bullets = this.bullets.filter(b => b.active);

        // Enemies Update
        this.enemies.forEach(e => e.update(deltaTime, this.player.x));
        this.enemies = this.enemies.filter(e => e.active);

        // Collisions
        this.checkCollisions();
    }

    private checkCollisions() {
        // Bullets vs Enemies
        for (const bullet of this.bullets) {
            for (const enemy of this.enemies) {
                if (bullet.active && enemy.active && this.isColliding(bullet, enemy)) {
                    bullet.active = false;
                    enemy.takeDamage(1);
                }
            }
        }

        // Punch vs Enemies (Melee)
        // Only check if player is punching and we haven't hit this punch yet (debounce per keypress/state cycle needed)
        // For simplicity, we'll check overlap + active punch + cooldown.
        // Assuming update loop runs every frame, we need to limit damage to once per 'attack'.
        // Since we don't have complex attack state tracking, we'll use a simple cooldown.
        if (this.player.isPunching()) {
            this.handlePunchDamage();
        }

        // Enemies vs Player (Simple Reset)
        for (const enemy of this.enemies) {
            if (enemy.active && this.isColliding(this.player, enemy)) {
                // Game Over or Damage logic
                // For now, just logging hit, removed reset to spawn
                console.log("Player hit!");
            }
        }
    }

    private lastPunchTime: number = 0;
    private punchCooldown: number = 400; // ms

    private handlePunchDamage() {
        const now = Date.now();
        if (now - this.lastPunchTime < this.punchCooldown) return;

        // Define Punch Hitbox (In front of player)
        const range = 60;
        const hitbox = {
            x: this.player.facing === 1 ? this.player.x + this.player.width : this.player.x - range,
            y: this.player.y,
            width: range,
            height: this.player.height
        };

        let hit = false;
        for (const enemy of this.enemies) {
            if (enemy.active && this.isColliding(hitbox, enemy)) {
                enemy.takeDamage(1); // Punch deals 1 damage (or more)
                hit = true;
            }
        }

        if (hit) {
            this.lastPunchTime = now;
        }
    }

    private isColliding(a: any, b: any): boolean {
        return (
            a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y
        );
    }

    private draw() {
        // Clear screen
        this.ctx.fillStyle = '#202020';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Background
        if (this.bgImage.complete) {
            this.ctx.drawImage(this.bgImage, 0, 0, this.canvas.width, this.canvas.height);
        }

        if (this.gameState === GameState.START_SCREEN) {
            // Solid Grey Background for Start Screen
            this.ctx.fillStyle = '#202020'; // Dark Grey
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = '#FFFAFA'; // Snow White

            // Title
            this.ctx.font = '40px "Press Start 2P"';
            this.ctx.fillText("ONE LAST TIME", this.canvas.width / 2, this.canvas.height / 2 - 50);

            // Start Button (Visual only, Input handled via keyboard for simplicity)
            this.ctx.font = '20px "Press Start 2P"';
            this.ctx.fillText("PRESS ENTER TO START", this.canvas.width / 2, this.canvas.height / 2 + 50);

            return;
        }

        // Draw Ground (Visual indication of the floor)
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // Dark semi-transparent overlay
        this.ctx.fillRect(0, 400, this.canvas.width, this.canvas.height - 400);

        // Draw a top border for the ground for better visibility
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, 400);
        this.ctx.lineTo(this.canvas.width, 400);
        this.ctx.stroke();

        // Draw Entities
        this.player.draw(this.ctx);
        this.bullets.forEach(b => b.draw(this.ctx));
        this.enemies.forEach(e => e.draw(this.ctx));

        // UI
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '16px "Press Start 2P"';
        this.ctx.textAlign = 'left';
        this.ctx.fillText("F: Shoot", 10, 30);
    }

    private toggleCooldown: number = 0;
    private handleToggleInput() {
        if (this.toggleCooldown > 0) return;
        this.player.toggleCharacter();
        this.toggleCooldown = 500; // 500ms debounce
    }
}
