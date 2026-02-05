import { Enemy } from './Enemy';

export class Boss extends Enemy {
    constructor(x: number, y: number) {
        super(x, y);
        this.width = 128; // Double width
        this.height = 256; // Double height
        this.maxHealth = 50; // 10x normal health
        this.health = this.maxHealth;
        this.speed = 0.3; // Slower
    }

    draw(ctx: CanvasRenderingContext2D): void {
        if (!this.active) return;

        // Draw Boss (Purple)
        ctx.fillStyle = '#9333ea'; // Tailwind Purple-600
        ctx.fillRect(Math.floor(this.x), Math.floor(this.y), this.width, this.height);

        // Eyes (Menacing)
        ctx.fillStyle = '#fbbf24'; // Yellow eyes
        const eyeSize = 10;
        const eyeY = this.y + 40;
        if (this.direction === 1) {
            ctx.fillRect(Math.floor(this.x + this.width - 40), Math.floor(eyeY), eyeSize, eyeSize);
        } else {
            ctx.fillRect(Math.floor(this.x + 30), Math.floor(eyeY), eyeSize, eyeSize);
        }

        // Draw Health Bar (Big)
        const barWidth = this.width;
        const barHeight = 10;
        const barX = this.x;
        const barY = this.y - 25;

        // Background
        ctx.fillStyle = '#450a0a';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Health
        const healthPercent = Math.max(0, this.health / this.maxHealth);
        ctx.fillStyle = '#dc2626'; // Red health for boss
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

        // Border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
}
