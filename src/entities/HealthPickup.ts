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
            this.width = this.image.naturalWidth;
            this.height = this.image.naturalHeight;
            // Adjust y to align bottom since we might have changed height? 
            // Or just let it be. Usually pickups are grounded. 
            // If we spawned it at y=380 assuming 32 height, it bottom was 412.
            // If new height is bigger, we might need to adjust y up.
            // But for now, just setting dimensions is what was asked.
        };
    }

    update(_dt: number) {
        // Floating animation?
        this.y += Math.sin(Date.now() / 200) * 0.5;
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (!this.active) return;

        if (this.image.complete) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        } else {
            // Fallback for loading
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}
