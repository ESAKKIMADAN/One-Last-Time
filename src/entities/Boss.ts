import { Enemy } from './Enemy';
import bossIdleUrl from '../assets/boss/1.png';
import bossWalk1Url from '../assets/boss/2.png';
import bossWalk2Url from '../assets/boss/3.png';
import bossAttack1Url from '../assets/boss/4.png';
import bossAttack2Url from '../assets/boss/5.png';

export class Boss extends Enemy {
    private idleImage: HTMLImageElement;
    private walkImages: HTMLImageElement[] = [];
    private attackImages: HTMLImageElement[] = [];

    private animationTimer: number = 0;
    private animationFrame: number = 0;
    private state: 'IDLE' | 'WALK' | 'ATTACK' = 'IDLE';

    constructor(x: number, y: number) {
        super(x, y);
        this.width = 128; // Double width
        this.height = 256; // Double height
        this.maxHealth = 50; // 10x normal health
        this.health = this.maxHealth;
        this.speed = 0.3; // Slower

        // Load Images
        this.idleImage = new Image();
        this.idleImage.src = bossIdleUrl;

        const w1 = new Image(); w1.src = bossWalk1Url;
        const w2 = new Image(); w2.src = bossWalk2Url;
        this.walkImages = [w1, w2];

        const a1 = new Image(); a1.src = bossAttack1Url;
        const a2 = new Image(); a2.src = bossAttack2Url;
        this.attackImages = [a1, a2];
    }

    update(deltaTime: number, playerX: number, playerY: number): void {
        super.update(deltaTime, playerX, playerY);

        // State Logic (Simple)
        const dist = Math.abs(playerX - this.x);

        if (dist < 100) {
            this.state = 'ATTACK';
        } else if (dist < 600) {
            this.state = 'WALK';
        } else {
            this.state = 'IDLE';
        }

        // Animation Timer
        this.animationTimer += deltaTime;
        if (this.animationTimer > 200) { // 200ms per frame
            this.animationTimer = 0;
            this.animationFrame++;
        }
    }

    draw(ctx: CanvasRenderingContext2D): void {
        if (!this.active) return;

        let currentImage = this.idleImage;

        if (this.state === 'IDLE') {
            currentImage = this.idleImage;
        } else if (this.state === 'WALK') {
            const frameIndex = this.animationFrame % this.walkImages.length;
            currentImage = this.walkImages[frameIndex];
        } else if (this.state === 'ATTACK') {
            const frameIndex = this.animationFrame % this.attackImages.length;
            currentImage = this.attackImages[frameIndex];
        }

        ctx.save();
        if (this.direction === 1) {
            // Flip for right
            ctx.translate(this.x + this.width, this.y);
            ctx.scale(-1, 1);
            ctx.drawImage(currentImage, 0, 0, this.width, this.height);
        } else {
            ctx.drawImage(currentImage, this.x, this.y, this.width, this.height);
        }
        ctx.restore();


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
