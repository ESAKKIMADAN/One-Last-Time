import { Enemy } from './Enemy';
import bossIdleUrl from '../assets/boss/1-removebg-preview.png';
import bossWalk1Url from '../assets/boss/2-removebg-preview.png';
import bossWalk2Url from '../assets/boss/3-removebg-preview.png';
import bossAttack1Url from '../assets/boss/4-removebg-preview.png';
import bossAttack2Url from '../assets/boss/5-removebg-preview.png';

import { AnimationState } from '../enums/AnimationState';

export class Boss extends Enemy {
    private idleImage: HTMLImageElement;
    private walkImages: HTMLImageElement[] = [];
    private attackImages: HTMLImageElement[] = [];

    private animationTimer: number = 0;
    private animationFrame: number = 0;
    // Uses inherited 'protected state' from Enemy

    constructor(x: number, y: number) {
        super(x, y);
        console.log("BOSS CREATED - RESIZED");
        this.width = 77; // Match Player Width
        this.height = 173; // Match Player Height
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
            this.state = AnimationState.SHOOT; // ATTACK
        } else if (dist < 600) {
            this.state = AnimationState.RUN; // WALK
        } else {
            this.state = AnimationState.IDLE;
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

        if (this.state === AnimationState.IDLE) {
            currentImage = this.idleImage;
        } else if (this.state === AnimationState.RUN) {
            const frameIndex = this.animationFrame % this.walkImages.length;
            currentImage = this.walkImages[frameIndex];
        } else if (this.state === AnimationState.SHOOT) {
            const frameIndex = this.animationFrame % this.attackImages.length;
            currentImage = this.attackImages[frameIndex];
        }


        // Calculate rendered dimensions preserving aspect ratio
        let renderW = this.width;
        let renderH = this.height;

        if (currentImage.complete && currentImage.naturalHeight > 0) {
            const ratio = currentImage.naturalWidth / currentImage.naturalHeight;
            renderH = 173; // Match Player Height
            renderW = renderH * ratio;
        }

        ctx.save();

        // Centering logic if width differs from hitbox
        const offsetX = (this.width - renderW) / 2;
        const offsetY = (this.height - renderH); // Bottom align

        if (this.direction === 1) {
            // Flip for right
            // Translate to center of where we want to draw, then flip
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2); // Center of hitbox
            ctx.scale(-1, 1);
            // Draw centered
            ctx.drawImage(currentImage, -renderW / 2, -renderH / 2, renderW, renderH);
        } else {
            // Draw normally
            // Align bottom-center of hitbox? Or just simple overlay
            // Let's align bottom to ensure feet match ground
            ctx.drawImage(currentImage, this.x + offsetX, this.y + offsetY, renderW, renderH);
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
