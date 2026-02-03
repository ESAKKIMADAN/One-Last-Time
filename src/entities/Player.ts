import { Entity } from './Entity';
import { InputHandler } from '../InputHandler';
import { AnimationState } from '../enums/AnimationState';

export class Player extends Entity {
    private velocityX: number = 0;
    private velocityY: number = 0;
    private gravity: number = 0.5;
    private jumpStrength: number = -12;
    private speed: number = 4;
    private grounded: boolean = false;
    private facing: number = 1; // 1 Right, -1 Left
    private lastShotTime: number = 0;
    private fireRate: number = 250; // ms

    // Animation Props
    private images: HTMLImageElement[] = [];
    private gameFrame: number = 0;
    private staggerFrames: number = 7;
    private currentFrameIndex: number = 0;
    private state: AnimationState = AnimationState.IDLE;

    // Sprite Configuration mapping State -> Array of Image Indices (1-based from filename)
    // 1: Standing
    // 2-6: Walking
    // 7: Start Jump
    // 8: Jumped
    // 9: Stop Jumping
    // 10: Taking Gun
    // 11: Showing Gun
    // 12: Shooting Gun

    private animationMap: any = {
        [AnimationState.IDLE]: [1],
        [AnimationState.RUN]: [2, 3, 4, 5, 6],
        [AnimationState.JUMP]: [7],    // Start Jump (Rising)
        [AnimationState.FALL]: [8],    // Air/Landing (Falling)
        [AnimationState.SHOOT]: [10, 11, 12, 12], // Take -> Show -> Fire -> Recoil
        [AnimationState.RUN_SHOOT]: [11]
    };

    constructor(x: number, y: number) {
        super(x, y, 64, 128); // Keep 64x128 hitbox

        // Preload images 1 through 12
        for (let i = 1; i <= 12; i++) {
            const img = new Image();
            img.src = `assets/player/${i}.png`;
            this.images[i] = img; // Store at index matching filename
        }
    }

    update(dt: number, input: InputHandler): any | null {
        const timeScale = dt / (1000 / 60);

        // State determination
        let isMoving = false;
        let isShooting = false;

        // Check shoot input
        if (input.isDown('KeyF') || input.isDown('KeyJ')) {
            isShooting = true;
        }

        // Horizontal Movement
        this.velocityX = 0;
        if (input.isDown('KeyA') || input.isDown('ArrowLeft')) {
            this.velocityX = -this.speed;
            this.facing = -1;
            isMoving = true;
        }
        if (input.isDown('KeyD') || input.isDown('ArrowRight')) {
            this.velocityX = this.speed;
            this.facing = 1;
            isMoving = true;
        }

        // Jumping
        if ((input.isDown('Space') || input.isDown('KeyW') || input.isDown('ArrowUp')) && this.grounded) {
            this.velocityY = this.jumpStrength;
            this.grounded = false;
        }

        // Gravity
        this.velocityY += this.gravity * timeScale;

        // Apply Position
        this.x += this.velocityX * timeScale;
        this.y += this.velocityY * timeScale;

        // Simple Floor Collision
        if (this.y + this.height > 400) {
            this.y = 400 - this.height;
            this.velocityY = 0;
            this.grounded = true;
        }

        // Update Animation State
        if (isShooting) {
            this.state = AnimationState.SHOOT;
        } else if (!this.grounded) {
            if (this.velocityY >= 0) {
                this.state = AnimationState.FALL;
            } else {
                this.state = AnimationState.JUMP;
            }
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
            this.currentFrameIndex = 1; // Default
        }

        return null;
    }

    // Explicit shoot method
    shoot(now: number): any | null {
        if (now - this.lastShotTime > this.fireRate) {
            this.lastShotTime = now;
            return { x: this.x + (this.facing === 1 ? this.width : 0), y: this.y + 40, dir: this.facing };
        }
        return null;
    }

    draw(ctx: CanvasRenderingContext2D): void {
        const img = this.images[this.currentFrameIndex];
        if (!img) return;

        const drawX = Math.floor(this.x);
        const drawY = Math.floor(this.y);

        // Center image on hitbox. Assumes images are roughly same size or centered.
        // If images vary in size, we might need per-frame offsets, but let's assume centered.
        // Using image.naturalWidth provided they are loaded
        const w = img.naturalWidth || 128; // Fallbacks
        const h = img.naturalHeight || 144;

        const diffX = (w - this.width) / 2;
        const diffY = (h - this.height);

        ctx.save();
        if (this.facing === -1) {
            ctx.scale(-1, 1);
            ctx.drawImage(img, -drawX - this.width - diffX, drawY - diffY);
        } else {
            ctx.drawImage(img, drawX - diffX, drawY - diffY);
        }
        ctx.restore();
    }
}
