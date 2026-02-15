import { Entity } from './Entity';
import { InputHandler } from '../input/InputHandler';
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
    public invulnerable: boolean = false;
    private invulnerabilityDuration: number = 1000;
    private invulnerabilityTimer: number = 0;

    // Animation Props
    private images: HTMLImageElement[] = [];
    private gameFrame: number = 0;
    private staggerFrames: number = 15; // Slower animation (was 7)
    private currentFrameIndex: number = 0;
    public state: AnimationState = AnimationState.IDLE;

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

    private bossAnimationMap: any = {
        [AnimationState.IDLE]: [901],
        [AnimationState.RUN]: [902, 903],
        [AnimationState.JUMP]: [902],
        [AnimationState.FALL]: [903],
        [AnimationState.SHOOT]: [904, 905],
        [AnimationState.RUN_SHOOT]: [904, 905]
    };

    private animationMap: any = this.defaultAnimationMap;
    private isAltSkin: boolean = false;
    public multiplayerMode: boolean = false;

    public get isAltSkinActive(): boolean {
        return this.isAltSkin;
    }

    public get isBossSkinActive(): boolean {
        return this.isBossSkin;
    }

    public get isBossSkin(): boolean {
        return this._isBossSkin;
    }

    private _isBossSkin: boolean = false;

    constructor(x: number, y: number) {
        super(x, y, 64, 144); // Restored to original: 64x144

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

        // Preload Boss Images (901-905)
        const bossImgs = [901, 902, 903, 904, 905];
        // 901 = 1-removebg...
        // Map 901->1, 902->2, etc.
        bossImgs.forEach((id, index) => {
            const img = new Image();
            const fileId = index + 1; // 1,2,3,4,5
            img.src = `assets/boss/${fileId}-removebg-preview.png`;
            this.images[id] = img;
        });
    }

    public toggleCharacter() {
        this.isAltSkin = !this.isAltSkin;
        this._isBossSkin = false;
        this.animationMap = this.isAltSkin ? this.altAnimationMap : this.defaultAnimationMap;

        // Reset to Idle
        this.state = AnimationState.IDLE;
        this.currentFrameIndex = this.animationMap[this.state][0];
    }

    public setBossMode() {
        this._isBossSkin = true;
        this.isAltSkin = false;
        this.animationMap = this.bossAnimationMap;

        // Adjust hitbox if needed? (Boss is same size 77x173)
        // Reset state
        this.state = AnimationState.IDLE;
        if (this.animationMap[this.state]) {
            this.currentFrameIndex = this.animationMap[this.state][0];
        }
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
        const floorTop = 280;     // Back of the room (feet pos)
        const floorBottom = 450;  // Front of the room (feet pos)

        // Constrain feet (y + height) to floor area
        if (this.y + this.height < floorTop) this.y = floorTop - this.height;
        if (this.y + this.height > floorBottom) this.y = floorBottom - this.height;

        // Update Animation
        this.updateAnimationState(isMoving, isShooting);
        this.updateAnimation(dt);
        this.updateInvulnerability(dt);

        return null;
    }

    public updateAnimationState(isMoving: boolean, isShooting: boolean) {
        if (isShooting) {
            this.state = AnimationState.SHOOT;
        } else if (isMoving) {
            this.state = AnimationState.RUN;
        } else {
            this.state = AnimationState.IDLE;
        }
    }

    public updateAnimation(deltaTime: number) {
        // DeltaTime based animation (assuming 60fps base)
        this.gameFrame += deltaTime / (1000 / 60);
        const frameIndices = this.animationMap[this.state];
        if (frameIndices && frameIndices.length > 0) {
            const pos = Math.floor(this.gameFrame / this.staggerFrames) % frameIndices.length;
            this.currentFrameIndex = frameIndices[pos];
        } else {
            this.currentFrameIndex = 1; // Default
        }
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
            // Adjusted for 1.5x scale (Visual gun is higher and wider)
            const spawnY = this.y + 35;
            const spawnX = this.x + (this.facing === 1 ? this.width + 20 : -20);
            return { x: spawnX, y: spawnY, dir: this.facing };
        }
        return null;
    }

    draw(ctx: CanvasRenderingContext2D): void {
        const img = this.images[this.currentFrameIndex];
        if (!img || !img.complete || img.naturalWidth === 0) return;

        const drawX = Math.floor(this.x);
        const drawY = Math.floor(this.y);

        // Standardize Rendering Size
        const naturalW = img.naturalWidth || 64;
        const naturalH = img.naturalHeight || 144;
        const aspectRatio = naturalW / naturalH;

        let w: number, h: number;

        if (this.multiplayerMode) {
            // Balanced visual heights for 1v1
            let visualHeight = 180;
            if (this.isAltSkin) visualHeight = 165;
            else if (this.isBossSkin) visualHeight = 185;

            h = visualHeight;
            w = h * aspectRatio;

            // Global multiplayer scale
            const scale = 1.5;
            w *= scale;
            h *= scale;
        } else {
            // Original Story Mode Logic
            h = (img.naturalHeight || 144);
            if (!this.isAltSkin && !this.isBossSkin) h += 5; // Slight boost for default

            w = h * aspectRatio;

            // Original relative scales
            // Restoration: User requested "Old Story Mode" size (smaller)
            const scale = this.isAltSkin ? 1.0 : (this.isBossSkin ? 1.5 : 1.0);
            w *= scale;
            h *= scale;
        }

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

            // Invulnerability Flashing
            if (this.invulnerable && Math.floor(Date.now() / 100) % 2 === 0) {
                ctx.globalAlpha = 0.5;
            }

            ctx.drawImage(img, -drawX - this.width - diffX, drawY - diffY, w, h);

            ctx.globalAlpha = 1.0; // Reset
        } else {
            // Invulnerability Flashing
            if (this.invulnerable && Math.floor(Date.now() / 100) % 2 === 0) {
                ctx.globalAlpha = 0.5;
            }

            ctx.drawImage(img, drawX - diffX, drawY - diffY, w, h);

            ctx.globalAlpha = 1.0; // Reset
        }
        ctx.restore();
    }

    public takeDamage(amount: number) {
        if (this.invulnerable) return;

        this.health -= amount;
        if (this.health < 0) this.health = 0;

        this.invulnerable = true;
        this.invulnerabilityTimer = this.invulnerabilityDuration;
        console.log(`Player Health: ${this.health}`);

        // Simple knockback
        this.velocityY = -5;
        this.velocityX = -5 * this.facing;
    }

    public updateInvulnerability(dt: number) {
        if (this.invulnerable) {
            this.invulnerabilityTimer -= dt;
            if (this.invulnerabilityTimer <= 0) {
                this.invulnerable = false;
                this.invulnerabilityTimer = 0;
            }
        }
    }
}
