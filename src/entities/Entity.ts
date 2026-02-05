export abstract class Entity {
    public x: number;
    public y: number;
    public width: number;
    public height: number;

    constructor(x: number, y: number, width: number, height: number) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    abstract update(dt: number, ...args: any[]): void;
    abstract draw(ctx: CanvasRenderingContext2D): void;
}
