import { Entity } from './Entity';
import { AnimationState } from '../enums/AnimationState';

export class Enemy extends Entity {
    protected speed: number = 0.5;
    protected direction: number = 1;
    public maxHealth: number = 5;
    public health: number = 5;
    public active: boolean = true;

    // Animation Props
    private images: HTMLImageElement[] = [];
    private gameFrame: number = 0;
    private staggerFrames: number = 10;
    private currentFrameIndex: number = 1;
    private state: AnimationState = AnimationState.IDLE;

    private animationMap: any = {
        [AnimationState.IDLE]: [1],
        [AnimationState.RUN]: [2, 3],
        [AnimationState.SHOOT]: [4, 5] // Using SHOOT for punching
    };

    constructor(x: number, y: number) {
        super(x, y, 77, 173); // Using same size as player for consistency

        // Preload images 1 through 5 from Enemey1
        for (let i = 1; i <= 5; i++) {
            const img = new Image();
            img.src = `assets/Enemey1/${i}-removebg-preview (1).png`;
            this.images[i] = img;
        }

    }

    update(dt: number, playerX: number, playerY: number): void {
        const timeScale = dt / (1000 / 60);

        // Follow Player Logic (X Axis)
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const stopDistance = 60; // Distance to start punching

        let isMoving = false;
        let isAttacking = false;

        // X Movement
        if (Math.abs(dx) > stopDistance) {
            this.direction = dx > 0 ? 1 : -1;
            this.x += this.speed * this.direction * timeScale;
            isMoving = true;
        } else {
            // Close enough to punch if also close enough in Y
            if (Math.abs(dy) < 30) {
                isAttacking = true;
            }
        }

        // Y Movement (Depth)
        if (Math.abs(dy) > 5) {
            const yDir = dy > 0 ? 1 : -1;
            this.y += (this.speed * 0.5) * yDir * timeScale;
            isMoving = true;
        }

        // Update Animation State
        if (isAttacking) {
            this.state = AnimationState.SHOOT;
        } else if (isMoving) {
            this.state = AnimationState.RUN;
        } else {
            this.state = AnimationState.IDLE;
        }

        // Animation Frame Update
        this.gameFrame++;
        const frameIndices = this.animationMap[this.state];
        if (frameIndices && frameIndices.length > 0) {
            const pos = Math.floor(this.gameFrame / this.staggerFrames) % frameIndices.length;
            this.currentFrameIndex = frameIndices[pos];
        } else {
            this.currentFrameIndex = 1;
        }
    }

    draw(ctx: CanvasRenderingContext2D): void {
        const img = this.images[this.currentFrameIndex];
        if (!img || !img.complete || img.naturalWidth === 0) {
            // Fallback if image not loaded
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(Math.floor(this.x), Math.floor(this.y), this.width, this.height);
        } else {
            const drawX = Math.floor(this.x);
            const drawY = Math.floor(this.y);

            ctx.save();
            // Assets might need horizontal flip depending on original sprite orientation
            // Standardizing: 1 is right-facing usually.
            if (this.direction === -1) {
                ctx.scale(-1, 1);
                ctx.drawImage(img, -drawX - this.width, drawY, this.width, this.height);
            } else {
                ctx.drawImage(img, drawX, drawY, this.width, this.height);
            }
            ctx.restore();
        }

        // Draw Health Bar
        const barWidth = this.width;
        const barHeight = 6;
        const barX = this.x;
        const barY = this.y - 15;

        ctx.fillStyle = '#450a0a';
        ctx.fillRect(barX, barY, barWidth, barHeight);

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

