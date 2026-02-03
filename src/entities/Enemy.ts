import { Entity } from './Entity';

export class Enemy extends Entity {
    private speed: number = 2;
    private direction: number = 1;
    public maxHealth: number = 5;
    public health: number = 5;
    public active: boolean = true;

    constructor(x: number, y: number) {
        super(x, y, 64, 128); // Same size as player
    }

    update(dt: number, playerX: number): void {
        const timeScale = dt / (1000 / 60);

        // Follow Player Logic
        const distance = playerX - this.x;
        const stopDistance = 5; // Don't stack exactly on top

        if (Math.abs(distance) > stopDistance) {
            this.direction = distance > 0 ? 1 : -1;
            this.x += this.speed * this.direction * timeScale;
        }
    }

    draw(ctx: CanvasRenderingContext2D): void {
        // Draw Enemy
        ctx.fillStyle = '#ef4444'; // Red enemy
        ctx.fillRect(Math.floor(this.x), Math.floor(this.y), this.width, this.height);

        // Eyes to show direction
        ctx.fillStyle = '#fff';
        if (this.direction === 1) {
            ctx.fillRect(Math.floor(this.x + 20), Math.floor(this.y + 10), 4, 4);
        } else {
            ctx.fillRect(Math.floor(this.x + 8), Math.floor(this.y + 10), 4, 4);
        }

        // Draw Health Bar
        const barWidth = this.width;
        const barHeight = 6;
        const barX = this.x;
        const barY = this.y - 15; // Above head

        // Background (Red/Empty)
        ctx.fillStyle = '#450a0a';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Health (Green/Filled)
        const healthPercent = Math.max(0, this.health / this.maxHealth);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
    }

    takeDamage(amount: number) {
        this.health -= amount;
        if (this.health <= 0) {
            this.active = false;
        }
    }
}
