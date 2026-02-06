import { supabase } from './supabaseClient';
import { InputHandler } from './InputHandler';
import { Player } from './entities/Player';
import { Bullet } from './entities/Bullet';
import { Enemy } from './entities/Enemy';
import { Boss } from './entities/Boss';
import { FloatingText } from './entities/FloatingText';
import { HealthPickup } from './entities/HealthPickup';

enum GameState {
    START_SCREEN,
    DIALOGUE,
    PLAYING,
    GAME_OVER
}

export class Game {
    private canvas: HTMLCanvasElement;
    public ctx: CanvasRenderingContext2D;
    private lastTime: number = 0;

    private cameraX: number = 0; // Camera position

    private dialogueMusic: HTMLAudioElement; // Dialogue Music

    private bgImage: HTMLImageElement; // Background
    private dialogueImage: HTMLImageElement; // Dialogue Character

    private shootSound: HTMLAudioElement;
    private punchSound: HTMLAudioElement;

    private healthBar: HTMLImageElement; // Health Bar UI

    private input: InputHandler;
    private player: Player;
    private bullets: Bullet[] = [];
    private enemies: Enemy[] = [];
    private floatingTexts: FloatingText[] = [];
    private healthPickups: HealthPickup[] = [];

    private gameState: GameState = GameState.START_SCREEN;

    private score: number = 0;
    private currentLevel: number = 1;
    private boss: Boss | null = null;
    private powerUnlocked: boolean = false;

    constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
        this.canvas = canvas;
        this.ctx = ctx;

        this.input = new InputHandler();
        this.player = new Player(200, 100);

        // Load Background
        this.bgImage = new Image();
        this.bgImage.src = 'assets/warehouse_bg.png';

        // Load Health Bar Frame
        this.healthBar = new Image();
        this.healthBar.src = 'assets/ui/health_bar_frame.png';

        // Load Dialogue Music
        this.dialogueMusic = new Audio('assets/vijay-thalapathy-vs-vijay-sethupati-master-prime-video-1_R7h0FHiU.mp3');
        this.dialogueMusic.loop = false;


        // Load Dialogue Character
        this.dialogueImage = new Image();
        this.dialogueImage.src = 'assets/player/222.png';

        // Load SFX
        this.shootSound = new Audio('assets/sounds/shoot.mp3');
        this.punchSound = new Audio('assets/sounds/punch.mp3');


        // Spawn some enemies
        this.spawnEnemy(500, 222); // 350 (ground) - 128 (height)
        this.spawnEnemy(700, 222);

        // Mouse Listener for UI Interactions (Retry Button)
        this.canvas.addEventListener('click', (e) => {
            if (this.gameState === GameState.GAME_OVER) {
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

                // Retry Button Coordinates (Centered)
                const btnW = 200;
                const btnH = 50;
                const btnX = this.canvas.width / 2 - btnW / 2;
                const btnY = this.canvas.height / 2 + 50;

                if (mouseX >= btnX && mouseX <= btnX + btnW &&
                    mouseY >= btnY && mouseY <= btnY + btnH) {
                    this.resetGame();
                }
            }
        });

        // UI Logic (Login/Register)
        this.setupUI();
        this.checkSession();
    }

    private async checkSession() {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
            console.log("Session restored:", data.session.user);
            // Hide UI
            const uiLayer = document.getElementById('ui-layer');
            if (uiLayer) uiLayer.style.display = 'none';

            // Initial State: START_SCREEN (Title Page) - Wait for User Input
            this.gameState = GameState.START_SCREEN;
            this.toggleCooldown = 1500;

            const btnTrophy = document.getElementById('btn-trophy');
            if (btnTrophy) btnTrophy.style.display = 'block';
        }
    }

    private setupUI() {
        const uiLayer = document.getElementById('ui-layer');
        const loginTab = document.getElementById('tab-login');
        const registerTab = document.getElementById('tab-register');
        const loginForm = document.getElementById('login-form') as HTMLFormElement;
        const registerForm = document.getElementById('register-form') as HTMLFormElement;

        const loginEmailInput = document.getElementById('login-email') as HTMLInputElement;
        const loginPassInput = document.getElementById('login-password') as HTMLInputElement;
        const regEmailInput = document.getElementById('register-email') as HTMLInputElement;
        const regPassInput = document.getElementById('register-password') as HTMLInputElement;

        if (!loginTab || !registerTab || !loginForm || !registerForm) return;

        // Tab Switching
        loginTab.addEventListener('click', () => {
            loginTab.classList.add('active');
            registerTab.classList.remove('active');
            loginForm.style.display = 'flex';
            registerForm.style.display = 'none';
        });

        registerTab.addEventListener('click', () => {
            registerTab.classList.add('active');
            loginTab.classList.remove('active');
            registerForm.style.display = 'flex';
            loginForm.style.display = 'none';
        });

        const DOMAIN_SUFFIX = "@onelasttime.local";

        // REGISTER LOGIC
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = regEmailInput.value;
            const password = regPassInput.value;
            const email = username + DOMAIN_SUFFIX;

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
            });

            if (error) {
                alert("Registration Failed: " + error.message);
                console.error(error);
            } else {
                alert("Registration Successful! Please Login.");
                console.log("Registered user:", data);
                // Switch to Login Tab
                registerTab.classList.remove('active');
                loginTab.classList.add('active');
                registerForm.style.display = 'none';
                loginForm.style.display = 'flex';
                // Pre-fill username (without domain)
                loginEmailInput.value = username;
            }
        });

        // LOGIN LOGIC
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = loginEmailInput.value;
            const password = loginPassInput.value;
            const email = username + DOMAIN_SUFFIX;

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                alert("Login Failed: " + error.message);
                console.error(error);
            } else {
                console.log("Login Successful:", data);
                // Hide UI
                if (uiLayer) uiLayer.style.display = 'none';

                // Initial State: START_SCREEN (Title Page) - Wait for User Input
                this.gameState = GameState.START_SCREEN;
                this.toggleCooldown = 1500; // 1.5s delay before accepting input to start game

                const btnTrophy = document.getElementById('btn-trophy');
                if (btnTrophy) btnTrophy.style.display = 'block';
            }
        });

        // Leaderboard Navigation
        const btnShowLeaderboard = document.getElementById('btn-show-leaderboard');
        const btnHideLeaderboard = document.getElementById('btn-hide-leaderboard');
        const authContainer = document.getElementById('auth-container');
        const leaderboardContainer = document.getElementById('leaderboard-container');
        const btnTrophy = document.getElementById('btn-trophy');

        if (btnShowLeaderboard && btnHideLeaderboard && authContainer && leaderboardContainer) {
            btnShowLeaderboard.addEventListener('click', () => {
                authContainer.style.display = 'none';
                leaderboardContainer.style.display = 'block';
                this.fetchLeaderboard();
            });

            btnHideLeaderboard.addEventListener('click', () => {
                leaderboardContainer.style.display = 'none';
                if (this.gameState === GameState.START_SCREEN) {
                    authContainer.style.display = 'flex';
                }
            });
        }

        // Trophy Button Logic
        if (btnTrophy) {
            btnTrophy.addEventListener('click', () => {
                this.toggleLeaderboard();
            });
        }
    }

    private toggleLeaderboard() {
        const leaderboardContainer = document.getElementById('leaderboard-container');
        const uiLayer = document.getElementById('ui-layer');
        if (!leaderboardContainer || !uiLayer) return;

        // If hidden or effectively hidden (uiLayer none), show it
        const isHidden = leaderboardContainer.style.display === 'none' || uiLayer.style.display === 'none';

        if (isHidden) {
            uiLayer.style.display = 'flex';
            leaderboardContainer.style.display = 'block';
            this.fetchLeaderboard();

            // Hide Auth if visible to avoid checking it
            const authContainer = document.getElementById('auth-container');
            if (authContainer) authContainer.style.display = 'none';
        } else {
            leaderboardContainer.style.display = 'none';
            // If playing, hide UI layer entirely
            if (this.gameState === GameState.PLAYING) {
                uiLayer.style.display = 'none';
            } else if (this.gameState === GameState.START_SCREEN) {
                // Return to auth? Or just close leaderboard logic
                const authContainer = document.getElementById('auth-container');
                if (authContainer) authContainer.style.display = 'flex';
            }
        }
    }

    public start() {
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    private spawnEnemy(x: number, y: number) {
        this.enemies.push(new Enemy(x, y));
    }

    public resetGame() {
        this.player = new Player(100, 360);
        this.bullets = [];
        this.enemies = [];
        this.floatingTexts = [];
        this.healthPickups = [];
        this.score = 0;
        this.currentLevel = 1;
        this.boss = null;
        this.powerUnlocked = false;
        this.startLevel(this.currentLevel);
        this.gameState = GameState.PLAYING;
        this.cameraX = 0;

        // Ensure UI is hidden
        const uiLayer = document.getElementById('ui-layer');
        if (uiLayer) uiLayer.style.display = 'none';

        const btnTrophy = document.getElementById('btn-trophy');
        if (btnTrophy) btnTrophy.style.display = 'none';
    }

    private startLevel(level: number) {
        this.enemies = [];
        this.boss = null;
        this.powerUnlocked = false; // Reset power unlock each level? Or keep it? The user said "when 5 level only alter character need to activate", so assuming per-level or just specific to L5 boss fight. Safe to reset.

        if (level === 5) {
            console.log("BOSS LEVEL!");
            // Spawn Boss
            this.boss = new Boss(600, 200); // 350 - 256 + ... fix Y
            // Boss Height is 256. Ground is roughly at Y=350 + Player Height(128) -> ~478?
            // Player Y is 360 (reset).
            // Let's use similar Y to player but adjusted for height.
            // Player height 128. Boss height 256.
            // If Player Y=360 is top-left, and he stands on "ground".
            // Boss should also stand on ground.
            // Boss Y = Player Y - (BossHeight - PlayerHeight) = 360 - (256 - 128) = 360 - 128 = 232.
            this.boss.y = 232;
            this.enemies.push(this.boss);
            return;
        }

        let enemyCount = 0;

        if (level === 1) enemyCount = 2;
        else if (level === 2) enemyCount = 5;
        else enemyCount = level + 3; // Scaling

        console.log(`Starting Level ${level} with ${enemyCount} enemies`);

        // Spawn enemies
        for (let i = 0; i < enemyCount; i++) {
            const x = 500 + Math.random() * 800;
            const y = 350; // Simplify Y for now or randomize if needed
            this.spawnEnemy(x, y);
        }
    }

    private gameLoop(timestamp: number) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.update(deltaTime, timestamp);
        this.draw();

        requestAnimationFrame(this.gameLoop.bind(this));
    }

    private update(deltaTime: number, now: number) {
        if (this.toggleCooldown > 0) {
            this.toggleCooldown -= deltaTime;
        }

        if (this.gameState === GameState.START_SCREEN) {
            // Wait for UI Interaction (Login) is done.
            // Converting to Title Screen Logic: Wait for any key to start Dialogue
            if (this.input.isDown('Enter') || this.input.isDown('Space')) {
                if (this.toggleCooldown > 0) return;
                this.gameState = GameState.DIALOGUE;
                this.toggleCooldown = 500;
                this.dialogueMusic.play().catch(e => console.error("Audio playback failed:", e));

                // Hide Trophy Button
                const btnTrophy = document.getElementById('btn-trophy');
                if (btnTrophy) btnTrophy.style.display = 'none';
            }
            return;
        }

        if (this.gameState === GameState.DIALOGUE) {
            if (this.toggleCooldown <= 0 && ((this.input.isDown('Enter') || this.input.isDown('Space')) || this.dialogueMusic.ended)) {
                this.gameState = GameState.PLAYING;
                this.dialogueMusic.pause();
                this.dialogueMusic.currentTime = 0;
                // Start Level 1 if needed
                if (this.enemies.length === 0 && this.currentLevel === 1) {
                    this.startLevel(1);
                }
            }
            return;
        }

        if (this.gameState === GameState.GAME_OVER) {
            return; // Stop updating game logic
        }

        // Check for Game Over Condition
        if (this.player.health <= 0) {
            this.gameState = GameState.GAME_OVER;
            this.saveScore();
            return;
        }

        // Check Level Criteria (All enemies dead)
        if (this.enemies.length === 0) {
            this.currentLevel++;
            this.startLevel(this.currentLevel);
        }

        // Player Update
        let mapWidth = 800;
        if (this.bgImage.complete && this.bgImage.naturalHeight > 0) {
            const scale = this.canvas.height / this.bgImage.naturalHeight;
            mapWidth = this.bgImage.naturalWidth * scale;
        }
        this.player.update(deltaTime, this.input, mapWidth);
        this.player.updateInvulnerability();

        // Player Shoot Input
        if (this.input.isDown('KeyF') || this.input.isDown('KeyJ')) {
            const bulletData = this.player.shoot(now);
            if (bulletData) {
                this.bullets.push(new Bullet(bulletData.x, bulletData.y, bulletData.dir));
                this.shootSound.currentTime = 0;
                this.shootSound.play().catch(() => { });
            }
        }

        // Toggle Character Input
        if (this.input.isDown('KeyX')) {
            this.handleToggleInput();
        }

        // Toggle Leaderboard Input
        if (this.input.isDown('KeyL')) {
            if (this.toggleCooldown <= 0) {
                this.toggleLeaderboard();
                this.toggleCooldown = 500; // Debounce
            }
        }

        // Bullets Update & Cleanup
        this.bullets.forEach(b => b.update(deltaTime));
        this.bullets = this.bullets.filter(b => b.active);

        // Enzymes Update
        this.enemies.forEach(e => e.update(deltaTime, this.player.x, this.player.y));
        this.enemies = this.enemies.filter(e => e.active);

        // Remove Boss from tracker if dead
        if (this.boss && !this.boss.active) {
            this.boss = null;
        }

        // Check Boss Health for Power Unlock (Level 5)
        if (this.currentLevel === 5 && this.boss && this.boss.active) {
            if (this.boss.health <= this.boss.maxHealth / 2) {
                if (!this.powerUnlocked) {
                    this.powerUnlocked = true;
                    this.addFloatingText(this.player.x, this.player.y - 50, "POWER UNLOCKED!", '#3b82f6'); // Blue text
                }
            }
        }

        // Health Pickups Update & Spawning
        this.healthPickups.forEach(hp => hp.update(deltaTime));
        this.healthPickups = this.healthPickups.filter(hp => hp.active);

        // Random Spawn (Example: 1% chance per frame)
        if (this.healthPickups.length < 3 && Math.random() < 0.01) {
            const x = 50 + Math.random() * (this.canvas.width - 100);
            this.healthPickups.push(new HealthPickup(x, 350));
        }

        // Floating Texts Update
        this.floatingTexts.forEach(ft => ft.update(deltaTime));
        this.floatingTexts = this.floatingTexts.filter(ft => ft.life > 0);

        // Collisions
        this.checkCollisions();
    }



    private addFloatingText(x: number, y: number, text: string, color: string = '#fbbf24') {
        this.floatingTexts.push(new FloatingText(x, y, text, color));
    }

    private checkCollisions() {
        // Bullets vs Enemies
        for (const bullet of this.bullets) {
            for (const enemy of this.enemies) {
                if (bullet.active && enemy.active && this.isColliding(bullet, enemy)) {
                    bullet.active = false;
                    enemy.takeDamage(1);

                    if (enemy.active) {
                        // Hit but alive
                        this.score += 20;
                        this.addFloatingText(enemy.x, enemy.y, "+20");
                    } else {
                        // Kill
                        this.score += 50;
                        this.addFloatingText(enemy.x, enemy.y, "+50", '#ef4444');
                    }
                }
            }
        }

        // Punch vs Enemies (Melee)
        if (this.player.isPunching()) {
            this.handlePunchDamage();
        }

        // Enemies vs Player (Simple Reset)
        for (const enemy of this.enemies) {
            if (enemy.active && this.isColliding(this.player, enemy)) {
                this.player.takeDamage(10); // Enemy deals 10 damage
            }
        }

        // Player vs Pickups
        for (const pickup of this.healthPickups) {
            if (pickup.active && this.isColliding(this.player, pickup)) {
                pickup.active = false;
                this.player.health = Math.min(this.player.health + pickup.healAmount, this.player.maxHealth);
                this.addFloatingText(this.player.x, this.player.y - 30, "HEALTH UP!", '#22c55e');
            }
        }
    }

    private lastPunchTime: number = 0;
    private punchCooldown: number = 400; // ms

    private handlePunchDamage() {
        const now = Date.now();
        if (now - this.lastPunchTime < this.punchCooldown) return;

        this.punchSound.currentTime = 0;
        this.punchSound.play().catch(() => { });

        // Define Punch Hitbox (In front of player)
        const range = 60;
        const hitbox = {
            x: this.player.facing === 1 ? this.player.x + this.player.width : this.player.x - range,
            y: this.player.y,
            width: range,
            height: this.player.height
        };

        let hit = false;
        for (const enemy of this.enemies) {
            if (enemy.active && this.isColliding(hitbox, enemy)) {
                enemy.takeDamage(1); // Punch deals 1 damage (or more)

                if (enemy.active) {
                    this.score += 20;
                    this.addFloatingText(enemy.x, enemy.y, "+20");
                } else {
                    this.score += 50;
                    this.addFloatingText(enemy.x, enemy.y, "+50", '#ef4444');
                }

                hit = true;
            }
        }

        if (hit) {
            this.lastPunchTime = now;
        }
    }

    private isColliding(a: any, b: any): boolean {
        return (
            a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y
        );
    }

    private draw() {
        // Clear screen
        this.ctx.fillStyle = '#202020';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Background
        if (this.bgImage.complete && this.bgImage.naturalWidth > 0) {
            this.ctx.drawImage(this.bgImage, 0, 0, this.canvas.width, this.canvas.height);
        }

        if (this.gameState === GameState.START_SCREEN) {
            // Match "outside" background color
            this.ctx.fillStyle = '#242424';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = '#FFFFFF'; // White Text

            // Title
            this.ctx.font = '40px "Press Start 2P"';
            this.ctx.fillText("ONE LAST TIME", this.canvas.width / 2, this.canvas.height / 2 - 20);

            // Blinking Start Text
            const now = Date.now();
            if (Math.floor(now / 500) % 2 === 0) {
                this.ctx.font = '20px "Press Start 2P"';
                this.ctx.fillText("PRESS ENTER TO START", this.canvas.width / 2, this.canvas.height / 2 + 40);
            }

            return;
        }

        // Common Background Drawing for Dialogue and Playing
        // Draw Background
        if (this.bgImage.complete && this.bgImage.naturalHeight > 0) {
            // Calculate scale to fit canvas height while maintaining aspect ratio
            const scale = this.canvas.height / this.bgImage.naturalHeight;
            const renderedWidth = this.bgImage.naturalWidth * scale;

            // Recalculate Camera with new world width
            // Note: We need to override the previous camera calculation or update mapWidth usage above if possible.
            // But since cameraX depends on mapWidth, we should update mapWidth first.
            const mapWidth = renderedWidth;

            // Re-Clamp Camera (logic repeated for correctness with new width)
            this.cameraX = this.player.x - this.canvas.width / 2;
            this.cameraX = Math.max(0, Math.min(this.cameraX, mapWidth - this.canvas.width));

            // Draw visible portion of background
            this.ctx.drawImage(this.bgImage, -this.cameraX, 0, mapWidth, this.canvas.height);
        }



        if (this.gameState === GameState.DIALOGUE) {
            // Dark Overlay
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Draw Character (Left side, large)
            if (this.dialogueImage.complete && this.dialogueImage.naturalWidth > 0) {
                // Calculate scale to fit canvas height (e.g. 80%)
                const naturalW = this.dialogueImage.naturalWidth || 69;
                const naturalH = this.dialogueImage.naturalHeight || 116;
                const aspectRatio = naturalW / naturalH;

                const imgH = this.canvas.height * 0.8; // 80% of screen height
                const imgW = imgH * aspectRatio;

                const x = 50;
                const y = this.canvas.height - imgH - 50; // Moved up by 50px

                this.ctx.drawImage(this.dialogueImage, x, y, imgW, imgH);
            }

            // Draw Speech Bubble
            const bubbleX = 300;
            const bubbleY = 100;
            const bubbleW = 400;
            const bubbleH = 150;
            const radius = 20;

            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.beginPath();
            this.ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, radius);
            this.ctx.fill();

            // Triangle pointer for bubble
            this.ctx.beginPath();
            this.ctx.moveTo(bubbleX, bubbleY + 100);
            this.ctx.lineTo(bubbleX - 30, bubbleY + 120);
            this.ctx.lineTo(bubbleX + 10, bubbleY + 120);
            this.ctx.fill();


            // Draw Text
            this.ctx.fillStyle = '#000000';
            this.ctx.font = '20px "Press Start 2P"'; // Assuming font availability or fallback
            this.ctx.textAlign = 'left';
            this.ctx.fillText("Enga yarda Bhavani", bubbleX + 30, bubbleY + 60);
            this.ctx.fillText("haaa..!", bubbleX + 30, bubbleY + 90);


            return;
        }

        // Draw Entities
        this.ctx.save();
        this.ctx.translate(-this.cameraX, 0); // Apply camera transform

        // Depth Sorting (Z-Order)
        const renderList = [this.player, ...this.enemies];
        renderList.sort((a, b) => (a.y + a.height) - (b.y + b.height));

        renderList.forEach(entity => entity.draw(this.ctx));

        // Draw Bullets on top (or could be sorted too)
        this.bullets.forEach(b => b.draw(this.ctx));

        // Draw Pickups
        this.healthPickups.forEach(hp => hp.draw(this.ctx));

        // Draw Floating Texts
        this.floatingTexts.forEach(ft => ft.draw(this.ctx));

        this.ctx.restore(); // Restore for UI

        // UI
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '16px "Press Start 2P"';
        this.ctx.textAlign = 'left';
        // this.ctx.fillText("F: Shoot", 10, 80); // Removed

        // Draw Level & Score
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`LEVEL: ${this.currentLevel}`, this.canvas.width - 20, 40);
        this.ctx.fillText(`SCORE: ${this.score}`, this.canvas.width - 20, 70);

        // Draw Power Unlock UI
        if (this.powerUnlocked) {
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = '#3b82f6'; // Blue
            this.ctx.font = '16px "Press Start 2P"';

            // Blink effect
            if (Math.floor(Date.now() / 300) % 2 === 0) {
                this.ctx.fillText("POWER UNLOCKED! PRESS X", this.canvas.width / 2, 100);
            }
        }

        // Game Over Screen Overlay
        if (this.gameState === GameState.GAME_OVER) {
            // Transparent Black Background
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.textAlign = 'center';

            // "DEAD" Text - Red Pixel
            this.ctx.fillStyle = '#ef4444'; // Tailwind Red-500
            this.ctx.font = '60px "Press Start 2P"';
            this.ctx.fillText("DEAD", this.canvas.width / 2, this.canvas.height / 2 - 20);

            // "RETRY" Button
            const btnW = 200;
            const btnH = 50;
            const btnX = this.canvas.width / 2 - btnW / 2;
            const btnY = this.canvas.height / 2 + 50;

            // Button Rect
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(btnX, btnY, btnW, btnH);

            // Button Text
            this.ctx.fillStyle = '#000000';
            this.ctx.font = '24px "Press Start 2P"';
            this.ctx.fillText("RETRY", this.canvas.width / 2, btnY + 35);

            // Don't draw health bar if dead
            const btnTrophy = document.getElementById('btn-trophy');
            if (btnTrophy) btnTrophy.style.display = 'block';
            return;
        }

        // Draw Health Bar Frame
        if (this.healthBar.complete && this.healthBar.naturalWidth > 0) {
            const barX = 20;
            const barY = 20;
            const barScale = 0.15; // Even smaller size
            const w = this.healthBar.naturalWidth * barScale;
            const h = this.healthBar.naturalHeight * barScale;

            // Calculate Fill Area (Trial & Error estimation based on standard pixel art health bars)
            // Assuming Heart is ~25% width, and there's a margin.
            // Let's position the fill relatively.
            const fillX = barX + (w * 0.26);
            const fillY = barY + (h * 0.25);
            const fillW = (w * 0.71);
            const fillH = (h * 0.5);

            const healthPct = Math.max(0, this.player.health / this.player.maxHealth);
            const currentFillW = fillW * healthPct;

            // Draw Red Fill
            this.ctx.fillStyle = '#dc2626';
            this.ctx.fillRect(fillX, fillY, currentFillW, fillH);

            // Draw Frame on Top
            this.ctx.drawImage(this.healthBar, barX, barY, w, h);
        }
    }

    private toggleCooldown: number = 0;
    private handleToggleInput() {
        if (this.toggleCooldown > 0) return;
        if (!this.powerUnlocked) {
            // Optional: Show "Locked" message
            return;
        }
        this.player.toggleCharacter();
        this.toggleCooldown = 500; // 500ms debounce
    }

    private async saveScore() {
        // Use tracked score
        const score = this.score;

        const user = (await supabase.auth.getUser()).data.user;
        if (!user) return;

        // 1. Get current high score
        const { data: profile } = await supabase
            .from('profiles')
            .select('high_score')
            .eq('id', user.id)
            .single();

        const currentHigh = profile?.high_score || 0;

        // 2. Update if new score is higher
        if (score > currentHigh) {
            console.log(`New High Score! ${score} > ${currentHigh}`);
            await supabase
                .from('profiles')
                .update({ high_score: score })
                .eq('id', user.id);
        }
    }

    private async fetchLeaderboard() {
        const tbody = document.getElementById('leaderboard-body');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';

        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('username, high_score')
            .order('high_score', { ascending: false })
            .limit(5);

        if (error) {
            console.error("Error fetching leaderboard:", error);
            alert("Leaderboard Error: " + error.message + "\nHint: Check RLS Policies in Supabase.");
            tbody.innerHTML = '<tr><td colspan="3">Error loading data</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        if (!profiles || profiles.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3">No scores yet</td></tr>';
            return;
        }

        profiles.forEach((profile, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${profile.username || 'Anonymous'}</td>
                <td>${profile.high_score || 0}</td>
            `;
            tbody.appendChild(row);
        });
    }
}
