import { Entity } from './Entity';

export class Bullet extends Entity {
    public speed: number;
    public active: boolean = true;
    public direction: number; // 1 for right, -1 for left

    constructor(x: number, y: number, direction: number) {
        super(x, y, 8, 8); // Small square bullet
        this.direction = direction;
        this.speed = 10;
    }

    update(dt: number): void {
        const timeScale = dt / (1000 / 60);
        this.x += this.speed * this.direction * timeScale;

        // Destroy if off screen (approximate bounds)
        if (this.x < -50 || this.x > 2000) {
            this.active = false;
        }
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = '#ffeb3b'; // Yellow bullet
        ctx.fillRect(Math.floor(this.x), Math.floor(this.y), this.width, this.height);
    }
}
