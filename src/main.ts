import '../style.css'
import { Game } from './Game'

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');

if (canvas && ctx) {
    // Set canvas size (example: fixed resolution scaled up, or full screen)
    // For pixel art, often a fixed internal resolution is better.
    canvas.width = 800;
    canvas.height = 450;

    const game = new Game(canvas, ctx);
    game.start();
} else {
    console.error("Canvas not found!");
}
