export class FloatingText {
    public x: number;
    public y: number;
    public text: string;
    public color: string;
    public life: number; // Life in ms
    public maxLife: number;
    public velocityY: number;

    constructor(x: number, y: number, text: string, color: string = '#fff') {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.maxLife = 1000; // 1 second
        this.life = this.maxLife;
        this.velocityY = -20; // Move up
    }

    update(deltaTime: number) {
        this.life -= deltaTime;
        this.y += this.velocityY * (deltaTime / 1000);
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (this.life <= 0) return;

        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
        ctx.fillStyle = this.color;
        ctx.font = '16px "Press Start 2P"';
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}
