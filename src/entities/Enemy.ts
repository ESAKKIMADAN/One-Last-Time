import { Entity } from './Entity';

export class Enemy extends Entity {
    private speed: number = 2;
    private direction: number = 1;
    private startX: number;
    private patrolRange: number = 200;
    public health: number = 3;
    public active: boolean = true;

    constructor(x: number, y: number) {
        super(x, y, 64, 128); // Same size as player
        this.startX = x;
    }

    update(dt: number): void {
        const timeScale = dt / (1000 / 60);

        // Simple Patrol Logic
        this.x += this.speed * this.direction * timeScale;

        if (this.x > this.startX + this.patrolRange) {
            this.direction = -1;
        } else if (this.x < this.startX - this.patrolRange) {
            this.direction = 1;
        }
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = '#ef4444'; // Red enemy
        ctx.fillRect(Math.floor(this.x), Math.floor(this.y), this.width, this.height);

        // Eyes to show direction
        ctx.fillStyle = '#fff';
        if (this.direction === 1) {
            ctx.fillRect(Math.floor(this.x + 20), Math.floor(this.y + 10), 4, 4);
        } else {
            ctx.fillRect(Math.floor(this.x + 8), Math.floor(this.y + 10), 4, 4);
        }
    }

    takeDamage(amount: number) {
        this.health -= amount;
        if (this.health <= 0) {
            this.active = false;
        }
    }
}
