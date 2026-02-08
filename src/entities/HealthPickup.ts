import { Entity } from './Entity';

export class HealthPickup extends Entity {
    private image: HTMLImageElement;
    public active: boolean = true;
    public healAmount: number = 50;

    constructor(x: number, y: number) {
        super(x, y, 0, 0); // Start with 0, will update on load
        this.image = new Image();
        this.image.src = 'assets/pickups/health.png';
        this.image.onload = () => {
            // Scale to match Player height (173px) as requested
            const targetHeight = 90;
            if (this.image.naturalHeight > 0) {
                const ratio = this.image.naturalWidth / this.image.naturalHeight;
                this.width = targetHeight * ratio;
                this.height = targetHeight;
            } else {
                this.width = 30;
                this.height = 40;
            }
        };
    }

    update(_dt: number) {
        // Floating animation?
        this.y += Math.sin(Date.now() / 200) * 0.5;
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (!this.active) return;

        if (this.image.complete && this.image.naturalWidth > 0) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        } else {
            // Fallback for loading
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}
