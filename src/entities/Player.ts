import { Entity } from './Entity';
import { InputHandler } from '../InputHandler';
import { AnimationState } from '../enums/AnimationState';

export class Player extends Entity {
    private velocityX: number = 0;
    private velocityY: number = 0;
    private speed: number = 4;
    public facing: number = 1; // 1 Right, -1 Left
    private lastShotTime: number = 0;
    private fireRate: number = 250; // ms

    public maxHealth: number = 100;
    public health: number = 100;
    private invulnerable: boolean = false;
    private invulnerabilityDuration: number = 1000;
    private lastDamageTime: number = 0;

    // Animation Props
    private images: HTMLImageElement[] = [];
    private gameFrame: number = 0;
    private staggerFrames: number = 15; // Slower animation (was 7)
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

    // Old Map
    private defaultAnimationMap: any = {
        [AnimationState.IDLE]: [1],
        [AnimationState.RUN]: [2, 3, 4, 5, 6],
        [AnimationState.JUMP]: [7],    // Start Jump (Rising)
        [AnimationState.FALL]: [8],    // Air/Landing (Falling)
        [AnimationState.SHOOT]: [10, 11, 12, 12], // Take -> Show -> Fire -> Recoil
        [AnimationState.RUN_SHOOT]: [11]
    };

    private altAnimationMap: any = {
        [AnimationState.IDLE]: [222],
        [AnimationState.RUN]: [111, 222],
        [AnimationState.JUMP]: [333],
        [AnimationState.FALL]: [333],
        [AnimationState.SHOOT]: [444, 555],
        [AnimationState.RUN_SHOOT]: [444, 555]
    };

    private animationMap: any = this.altAnimationMap;
    private isAltSkin: boolean = true;

    constructor(x: number, y: number) {
        super(x, y, 77, 173); // Increased size: 77x173 (1.2x of 64x144)

        // Preload images 1 through 12
        for (let i = 1; i <= 12; i++) {
            const img = new Image();
            img.src = `assets/player/${i}.png`;
            this.images[i] = img; // Store at index matching filename
        }

        // Preload Alt images
        const altImages = [111, 222, 333, 444, 555];
        altImages.forEach(i => {
            const img = new Image();
            img.src = `assets/player/${i}.png`;
            this.images[i] = img;
        });
    }

    public toggleCharacter() {
        this.isAltSkin = !this.isAltSkin;
        this.animationMap = this.isAltSkin ? this.altAnimationMap : this.defaultAnimationMap;

        // Reset to Idle immediately to prevent 1-frame glitch where old frame renders with new skin flags
        this.state = AnimationState.IDLE;
        this.currentFrameIndex = this.animationMap[this.state][0];
    }

    update(dt: number, input: InputHandler, mapWidth: number): any | null {
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

        // Vertical Movement (Depth)
        this.velocityY = 0;
        if (input.isDown('KeyW') || input.isDown('ArrowUp')) {
            this.velocityY = -this.speed * 0.7; // Slightly slower Y movement for perspective
            isMoving = true;
        }
        if (input.isDown('KeyS') || input.isDown('ArrowDown')) {
            this.velocityY = this.speed * 0.7;
            isMoving = true;
        }

        // Apply Position
        this.x += this.velocityX * timeScale;
        this.y += this.velocityY * timeScale;

        // X Boundaries
        if (this.x < 0) this.x = 0;
        if (this.x > mapWidth - this.width) this.x = mapWidth - this.width;

        // Y Boundaries (Floor Depth)
        // Adjust these values to match the visual floor of the background
        const floorTop = 300;     // Back of the room (feet pos)
        const floorBottom = 580;  // Front of the room (feet pos)

        // Constrain feet (y + height) to floor area
        if (this.y + this.height < floorTop) this.y = floorTop - this.height;
        if (this.y + this.height > floorBottom) this.y = floorBottom - this.height;

        // Update Animation State
        if (isShooting) {
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
            this.currentFrameIndex = 1; // Default
        }

        return null;
    }

    // Check if currently punching (Alt skin + Shoot state)
    isPunching(): boolean {
        return this.isAltSkin && this.state === AnimationState.SHOOT;
    }

    // Explicit shoot method
    shoot(now: number): any | null {
        if (this.isAltSkin) return null; // Alt skin cannot shoot bullets

        if (now - this.lastShotTime > this.fireRate) {
            this.lastShotTime = now;
            return { x: this.x + (this.facing === 1 ? this.width : 0), y: this.y + 48, dir: this.facing };
        }
        return null;
    }

    draw(ctx: CanvasRenderingContext2D): void {
        const img = this.images[this.currentFrameIndex];
        if (!img) return;

        const drawX = Math.floor(this.x);
        const drawY = Math.floor(this.y);

        // Base dimensions
        let w = img.naturalWidth || 128;
        let h = img.naturalHeight || 144;

        if (this.isAltSkin) {
            // "Same height as another" -> Target standard height (approx 128)
            const targetHeight = 143; // 119 * 1.2
            const naturalW = img.naturalWidth || 69;
            const naturalH = img.naturalHeight || 116;
            const aspectRatio = naturalW / naturalH;

            h = targetHeight;
            w = h * aspectRatio;
        } else {
            h = (img.naturalHeight || 144) + 5;
        }

        // Apply Scaling to match new hitbox size
        const scale = 1.2;
        w *= scale;
        h *= scale;

        const diffX = (w - this.width) / 2;
        const diffY = (h - this.height);

        ctx.save();

        let flip = this.facing === -1;
        // Invert flip for Alt Skin specific states
        if (this.isAltSkin && (this.state === AnimationState.JUMP || this.state === AnimationState.FALL || this.state === AnimationState.SHOOT)) {
            flip = !flip;
        }

        if (flip) {
            ctx.scale(-1, 1);
            ctx.drawImage(img, -drawX - this.width - diffX, drawY - diffY, w, h);
        } else {
            ctx.drawImage(img, drawX - diffX, drawY - diffY, w, h);
        }
        ctx.restore();
    }

    public takeDamage(amount: number) {
        if (this.invulnerable) return;

        this.health -= amount;
        if (this.health < 0) this.health = 0;

        this.invulnerable = true;
        this.lastDamageTime = Date.now();
        console.log(`Player Health: ${this.health}`);

        // Simple knockback
        this.velocityY = -5;
        this.velocityX = -5 * this.facing;
    }

    public updateInvulnerability() {
        if (this.invulnerable) {
            if (Date.now() - this.lastDamageTime > this.invulnerabilityDuration) {
                this.invulnerable = false;
            }
        }
    }
}
