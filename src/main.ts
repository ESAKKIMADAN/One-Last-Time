import '../style.css'
import { Game } from './Game'

window.addEventListener('error', (event) => {
    alert("Global Error: " + event.message);
});

try {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!canvas) throw new Error("Canvas element not found");

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("2D Context not found");

    // Set canvas size (example: fixed resolution scaled up, or full screen)
    // For pixel art, often a fixed internal resolution is better.
    canvas.width = 800;
    canvas.height = 450;

    const game = new Game(canvas, ctx);
    game.start();
} catch (e: any) {
    console.error(e);
    alert("Initialization Error: " + e.message);
}
