import { supabase } from './supabaseClient';
import { InputHandler } from './InputHandler';
import { Player } from './entities/Player';
import { Bullet } from './entities/Bullet';
import { Enemy } from './entities/Enemy';
import { Boss } from './entities/BossEntity';
import { FloatingText } from './entities/FloatingText';
import { HealthPickup } from './entities/HealthPickup';
import bgMusicUrl from './assets/bg_music.mp3';
import shootSoundUrl from './assets/sounds/Gun.mp3';
import punchSoundUrl from './assets/sounds/Punch.mp3';
import gameplayMusicUrl from './assets/sounds/gameplay_bgm.mp3';
import level4DialogueUrl from './assets/sounds/level4_dialogue.mp3';
import bossBgSkyUrl from './assets/boss_bg_sky.png';
import leoDialogueUrl from './assets/sounds/Naan thaanda Leo, leo das   Leo   Thalapathy vijay, Sanjay Dutt.mp3';
import bossAppearanceUrl from './assets/sounds/the-iconic-climax-fight-vijay-thalapathy-vijay-sethupathi-master-prime-video-in_BeXI1Pu1.mp3';
import level5DialogueUrl from './assets/sounds/jd-to-bhavani-intreval-talking-scene_Qz3qP6uv.mp3';
import level5HeroDialogueUrl from './assets/sounds/jd-to-bhavani-intreval-talking-scene_lhKnVFAo.mp3';
import bossDialogueUrl from './assets/boss/1-removebg-preview.png';



enum GameState {
    START_SCREEN,
    VIDEO_INTRO,
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
    private level4DialogueMusic: HTMLAudioElement; // Level 4 Dialogue Music
    private bgMusic: HTMLAudioElement; // Title Screen Music
    private gameplayMusic: HTMLAudioElement; // Gameplay Music

    private bgImage: HTMLImageElement; // Background
    private titleBgImage: HTMLImageElement; // Title Screen Background
    private bossBgSkyImage: HTMLImageElement; // Phase 2 Background
    private dialogueImage: HTMLImageElement; // Dialogue Character

    private punchSound: HTMLAudioElement;
    private leoDialogueSound: HTMLAudioElement;
    private bossAppearanceSound: HTMLAudioElement;
    private shootSound: HTMLAudioElement;




    private videoElement: HTMLVideoElement; // Intro Video

    private healthBar: HTMLImageElement; // Health Bar UI

    private input: InputHandler;
    private player: Player;
    private bullets: Bullet[] = [];
    private level5DialogueMusic: HTMLAudioElement;
    private level5HeroDialogueMusic: HTMLAudioElement;
    private bossDialogueImage: HTMLImageElement;
    private dialogueStep: number = 0; // 0: None, 1: Boss, 2: Hero
    private enemies: Enemy[] = [];
    private floatingTexts: FloatingText[] = [];
    private healthPickups: HealthPickup[] = [];

    private gameState: GameState = GameState.START_SCREEN;

    private score: number = 0;
    private currentLevel: number = 1;
    private boss: Boss | null = null;
    private powerUnlocked: boolean = false;
    private killCount: number = 0;




    // Fade Transition
    private fadeOpacity: number = 0;
    private fadeState: 'NONE' | 'FADE_OUT' | 'FADE_IN' = 'NONE';
    private onFadeOutComplete: (() => void) | null = null;

    // UI State
    private instructionDismissed: boolean = false;
    private toggleCooldown: number = 0; // Cooldown for UI interactions and transitions

    constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
        this.canvas = canvas;
        this.ctx = ctx;

        this.input = new InputHandler();
        this.player = new Player(200, 100);

        // Load Background
        // Load Background
        this.bgImage = new Image();
        this.bgImage.src = 'assets/warehouse_bg.png';

        this.titleBgImage = new Image();
        this.titleBgImage.src = 'assets/title_bg.png';

        this.bossBgSkyImage = new Image();
        this.bossBgSkyImage.src = bossBgSkyUrl;

        // Load Health Bar Frame
        this.healthBar = new Image();
        this.healthBar.src = 'assets/ui/health_bar_frame.png';

        // Load Dialogue Music
        this.dialogueMusic = new Audio('assets/vijay-thalapathy-vs-vijay-sethupati-master-prime-video-1_R7h0FHiU.mp3');
        this.dialogueMusic.loop = false;

        // Load Title Screen Music
        // Use the existing HTML element for aggressive autoplay
        const bgMusicEl = document.getElementById('bg-music') as HTMLAudioElement;
        if (bgMusicEl) {
            this.bgMusic = bgMusicEl;
        } else {
            // Fallback (though index.html should have it)
            this.bgMusic = new Audio(bgMusicUrl);
            document.body.appendChild(this.bgMusic);
        }
        this.bgMusic.loop = true;
        this.bgMusic.volume = 0.5;


        // Load Dialogue Character
        this.dialogueImage = new Image();
        this.dialogueImage.src = 'assets/player/222.png';

        // Load SFX
        this.shootSound = new Audio(shootSoundUrl);
        this.shootSound.volume = 0.25;
        this.punchSound = new Audio(punchSoundUrl);


        // Load Gameplay Music
        this.gameplayMusic = new Audio(gameplayMusicUrl);
        this.gameplayMusic.loop = true;
        this.gameplayMusic.volume = 0.25;

        // Load Level 4 Dialogue Music
        this.level4DialogueMusic = new Audio(level4DialogueUrl);
        this.level4DialogueMusic.loop = false;

        // Load Level 5 Dialogue Music (Boss)
        this.level5DialogueMusic = new Audio(level5DialogueUrl);
        this.level5DialogueMusic.loop = false;

        // Load Level 5 Hero Dialogue Music
        this.level5HeroDialogueMusic = new Audio(level5HeroDialogueUrl);
        this.level5HeroDialogueMusic.loop = false;

        // Load Boss Dialogue Image
        this.bossDialogueImage = new Image();
        this.bossDialogueImage.src = bossDialogueUrl;

        // Load Leo Dialogue Sound
        this.leoDialogueSound = new Audio(leoDialogueUrl);
        this.leoDialogueSound.loop = false;

        // Load Boss Appearance Sound
        this.bossAppearanceSound = new Audio(bossAppearanceUrl);
        this.bossAppearanceSound.loop = false;
        this.bossAppearanceSound.volume = 0.5;




        // Spawn some enemies
        this.spawnEnemy(500, 222, 1); // 350 (ground) - 128 (height)
        this.spawnEnemy(700, 222, 2);

        // UI Logic (Login/Register)
        this.setupUI();
        this.checkSession();

        // Get Video Element
        this.videoElement = document.getElementById('intro-video') as HTMLVideoElement;
        if (this.videoElement) {
            this.videoElement.onended = () => {
                // Video ended -> Fade out -> Start Dialogue
                this.triggerTransition(() => {
                    this.videoElement.style.display = 'none';
                    this.startDialogue();
                });
            };
            // Add click listener for mobile tap to skip
            this.videoElement.addEventListener('click', () => {
                if (this.toggleCooldown <= 0) {
                    this.advanceState();
                }
            });
        }

        // Unified Listener for UI Interactions (Retry Button, Start Screen, etc.)
        const handleCanvasInteraction = (clientX: number, clientY: number) => {
            const rect = this.canvas.getBoundingClientRect();
            // Map client coordinates to internal canvas resolution (800x450)
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const mouseX = (clientX - rect.left) * scaleX;
            const mouseY = (clientY - rect.top) * scaleY;

            if (this.gameState === GameState.GAME_OVER) {
                // Retry Button Coordinates (Centered in 800x450 space)
                const btnW = 200;
                const btnH = 50;
                const btnX = this.canvas.width / 2 - btnW / 2;
                const btnY = this.canvas.height / 2 + 50;

                if (mouseX >= btnX && mouseX <= btnX + btnW &&
                    mouseY >= btnY && mouseY <= btnY + btnH) {
                    this.restartGame();
                }

                // If Post-Boss Death (Level > 5), allow click anywhere
                if (this.currentLevel > 5) {
                    this.restartGame();
                }
            }
            // Tap to Start / Advance (For Mobile/Mouse)
            else if (this.gameState === GameState.START_SCREEN) {
                if (this.toggleCooldown <= 0) {
                    this.triggerStartGame();
                }
            }
            else if (this.gameState === GameState.DIALOGUE || this.gameState === GameState.VIDEO_INTRO) {
                if (this.toggleCooldown <= 0) {
                    this.advanceState();
                }
            }
        };

        this.canvas.addEventListener('click', (e) => {
            handleCanvasInteraction(e.clientX, e.clientY);
        });

        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) {
                // Prevent default can sometimes block legitimate scrolling, 
                // but here we are on the game canvas in landscape.
                // e.preventDefault(); 
                handleCanvasInteraction(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });
    }

    private triggerStartGame() {
        if (this.gameState !== GameState.START_SCREEN) return;

        // Stop Title Music
        this.bgMusic.pause();
        this.bgMusic.currentTime = 0;

        // switch to VIDEO_INTRO
        this.gameState = GameState.VIDEO_INTRO;
        this.toggleCooldown = 500;

        // Hide UI Elements
        const logoutBtn = document.getElementById('btn-logout');
        const trophyBtn = document.getElementById('btn-trophy');
        const fullscreenBtn = document.getElementById('btn-fullscreen');
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (trophyBtn) trophyBtn.style.display = 'none';
        if (fullscreenBtn) fullscreenBtn.style.display = 'none';

        // Auto Fullscreen for Android
        if (this.isAndroid()) {
            this.toggleFullscreen();
        }

        if (this.videoElement) {
            this.videoElement.style.display = 'block';
            this.videoElement.style.opacity = '1';
            this.videoElement.play().catch(e => {
                console.error("Video play failed:", e);
                this.videoElement.style.display = 'none';
                this.startDialogue();
            });
        } else {
            this.startDialogue();
        }
    }

    private toggleFullscreen() {
        const container = document.getElementById('game-container');
        if (!container) return;

        if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
            if (container.requestFullscreen) {
                container.requestFullscreen();
            } else if ((container as any).webkitRequestFullscreen) {
                (container as any).webkitRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if ((document as any).webkitExitFullscreen) {
                document.exitFullscreen();
            }
        }
    }

    private isAndroid(): boolean {
        return /Android/i.test(navigator.userAgent);
    }

    private advanceState() {
        if (this.gameState === GameState.VIDEO_INTRO) {
            if (this.videoElement && this.fadeState === 'NONE') {
                this.videoElement.pause();
                this.triggerTransition(() => {
                    this.videoElement.style.display = 'none';
                    this.startDialogue();
                });
            }
        } else if (this.gameState === GameState.DIALOGUE) {
            this.handleDialogueProgression();
        }
    }

    private handleDialogueProgression() {
        if (this.gameState !== GameState.DIALOGUE) return;

        // Level 5 Sequence Handling
        if (this.currentLevel === 5) {
            if (this.dialogueStep === 1) {
                // Stop Boss Music
                this.level5DialogueMusic.pause();
                this.level5DialogueMusic.currentTime = 0;

                // Start Hero Dialogue
                this.dialogueStep = 2;
                this.level5HeroDialogueMusic.currentTime = 0;
                this.level5HeroDialogueMusic.play().catch(e => console.error("L5 Hero Dialogue failed:", e));
                this.toggleCooldown = 500;
            } else if (this.dialogueStep === 2) {
                // Stop Hero Music
                this.level5HeroDialogueMusic.pause();
                this.level5HeroDialogueMusic.currentTime = 0;

                // End Dialogue
                this.gameState = GameState.PLAYING;
                this.dialogueStep = 0;

                // Start Gameplay Music
                this.gameplayMusic.currentTime = 0;
                this.gameplayMusic.play().catch(e => console.warn("Gameplay music failed:", e));

                // Start Level 5
                this.startLevel(5);
                this.toggleCooldown = 500;
            }
            return;
        }

        // Normal Dialogue Handling (Level 1 & 4)
        this.gameState = GameState.PLAYING;

        // Stop Dialogue Musics
        this.dialogueMusic.pause();
        this.dialogueMusic.currentTime = 0;
        this.level4DialogueMusic.pause();
        this.level4DialogueMusic.currentTime = 0;

        // Start Gameplay Music
        this.gameplayMusic.currentTime = 0;
        this.gameplayMusic.play().catch(e => console.warn("Gameplay music failed:", e));

        // Start Level Logic
        if (this.enemies.length === 0) {
            if (this.currentLevel === 1) {
                this.startLevel(1);
            } else if (this.currentLevel === 4) {
                this.startLevel(4);
            }
        }
        this.toggleCooldown = 500;
    }

    public returnToTitle() {
        this.resetGameState();
        this.gameState = GameState.START_SCREEN;
        this.toggleCooldown = 1500;

        // Reset music
        if (this.gameplayMusic) {
            this.gameplayMusic.pause();
            this.gameplayMusic.currentTime = 0;
        }
        if (this.bgMusic) {
            this.bgMusic.currentTime = 0;
            this.bgMusic.play().catch(() => { });
        }

        // Show UI Layer
        const uiLayer = document.getElementById('ui-layer');
        if (uiLayer) {
            uiLayer.style.display = 'flex';
        }

        // Show Start Screen UI elements
        const startScreenUI = document.getElementById('start-screen-ui');
        if (startScreenUI) startScreenUI.style.display = 'flex';

        // Show/Hide specific buttons
        const btnTrophy = document.getElementById('btn-trophy');
        if (btnTrophy) btnTrophy.style.display = 'block';

        const btnLogout = document.getElementById('btn-logout');
        if (btnLogout) btnLogout.style.display = 'block';

        const authContainer = document.getElementById('auth-container');
        if (authContainer) {
            // Only show auth container if effectively not showing leaderboard
            const leaderboardContainer = document.getElementById('leaderboard-container');
            const isLeaderboardHidden = !leaderboardContainer || leaderboardContainer.style.display === 'none';
            if (isLeaderboardHidden) {
                authContainer.style.display = 'flex';
            }
        }
    }

    public restartGame() {
        this.resetGameState();
        this.gameState = GameState.PLAYING;
        this.toggleCooldown = 500;

        // Reset music
        if (this.gameplayMusic) {
            this.gameplayMusic.pause();
            this.gameplayMusic.currentTime = 0;
        }

        // Hide UI Layer
        const uiLayer = document.getElementById('ui-layer');
        if (uiLayer) {
            uiLayer.style.display = 'none';
        }

        this.startLevel(1);

        if (this.gameplayMusic) {
            this.gameplayMusic.play().catch(e => console.warn("Gameplay music failed:", e));
        }
    }

    private resetGameState() {
        this.player = new Player(100, 360);
        this.bullets = [];
        this.enemies = [];
        this.floatingTexts = [];
        this.healthPickups = [];
        this.score = 0;
        this.currentLevel = 1;
        this.boss = null;
        this.powerUnlocked = false;
        this.killCount = 0;
        this.cameraX = 0;

        // Reset Background
        this.bgImage = new Image();
        this.bgImage.src = 'assets/warehouse_bg.png';
    }



    private triggerTransition(callback: () => void) {
        this.fadeState = 'FADE_OUT';
        this.fadeOpacity = 0;
        this.onFadeOutComplete = callback;
    }

    private startDialogue() {
        this.gameState = GameState.DIALOGUE;
        this.toggleCooldown = 500;
        this.dialogueMusic.play().catch(e => console.error("Audio playback failed:", e));

        // Hide Trophy Button / Logout (Already hidden in start screen logic but good to ensure)
        const btnTrophy = document.getElementById('btn-trophy');
        if (btnTrophy) btnTrophy.style.display = 'none';

        const btnLogout = document.getElementById('btn-logout');
        if (btnLogout) btnLogout.style.display = 'none';
    }

    private tryPlayBgMusic() {
        this.bgMusic.play().catch(() => {
            // Passive-aggressive fallback: Catch any user interaction
            const playOnInteraction = () => {
                this.bgMusic.play().then(() => {
                    // Success
                    this.removeInteractionListeners(playOnInteraction);
                }).catch(() => {
                    // Still failed? Keep existing listeners.
                });
            };

            this.addInteractionListeners(playOnInteraction);
        });
    }

    private addInteractionListeners(handler: () => void) {
        document.addEventListener('click', handler);
        document.addEventListener('keydown', handler);
        document.addEventListener('touchstart', handler);
        document.addEventListener('scroll', handler);
        document.addEventListener('mousemove', handler); // Very aggressive
    }

    private removeInteractionListeners(handler: () => void) {
        document.removeEventListener('click', handler);
        document.removeEventListener('keydown', handler);
        document.removeEventListener('touchstart', handler);
        document.removeEventListener('scroll', handler);
        document.removeEventListener('mousemove', handler);
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

            const btnLogout = document.getElementById('btn-logout');
            if (btnLogout) btnLogout.style.display = 'block';

            // Music already handled by tryPlayBgMusic or continues playing
            // Re-attempt play just in case logic missed it
            this.tryPlayBgMusic();
        }
    }

    private setupUI() {
        const btnFullscreen = document.getElementById('btn-fullscreen');
        if (btnFullscreen) {
            btnFullscreen.addEventListener('click', () => {
                this.toggleFullscreen();
            });
        }

        // Mobile Action Button Overrides (Manual Switch - Power/X)
        // No specific listener needed for btn-power here as it's bound via InputHandler
        // We'll handle its visibility in the update loop based on the story state.

        const btnGoogleLogin = document.getElementById('btn-google-login');

        // Leaderboard Navigation
        const btnShowLeaderboard = document.getElementById('btn-show-leaderboard');
        const btnHideLeaderboard = document.getElementById('btn-hide-leaderboard');
        const authContainer = document.getElementById('auth-container');
        const leaderboardContainer = document.getElementById('leaderboard-container');
        const btnTrophy = document.getElementById('btn-trophy');
        const btnLogout = document.getElementById('btn-logout');

        // Logout Logic
        if (btnLogout) {
            btnLogout.addEventListener('click', async () => {
                await supabase.auth.signOut();
                window.location.reload();
            });
        }

        // Google Login Logic
        if (btnGoogleLogin) {
            btnGoogleLogin.addEventListener('click', async () => {
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: window.location.origin
                    }
                });
                if (error) console.error('Google Auth Error:', error.message);
            });
        }

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
                // Only show auth container if NOT logged in (checked via logout button visibility)
                const btnLogout = document.getElementById('btn-logout');
                const isLoggedIn = btnLogout && btnLogout.style.display !== 'none';

                if (!isLoggedIn) {
                    const authContainer = document.getElementById('auth-container');
                    if (authContainer) authContainer.style.display = 'flex';
                }
            }
        }
    }

    public start() {
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    private spawnEnemy(x: number, y: number, type: number = 1) {
        this.enemies.push(new Enemy(x, y, type));
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
        this.killCount = 0;
        this.startLevel(this.currentLevel);
        this.gameState = GameState.PLAYING;

        // Start Gameplay Music
        this.gameplayMusic.currentTime = 0;
        this.gameplayMusic.play().catch(e => console.warn("Gameplay music failed:", e));

        this.cameraX = 0;

        // Ensure UI is hidden
        const uiLayer = document.getElementById('ui-layer');
        if (uiLayer) uiLayer.style.display = 'none';

        const btnTrophy = document.getElementById('btn-trophy');
        if (btnTrophy) btnTrophy.style.display = 'none';

        const btnLogout = document.getElementById('btn-logout');
        if (btnLogout) btnLogout.style.display = 'none';
    }

    private startLevel(level: number) {
        this.enemies = [];
        this.boss = null;
        this.instructionDismissed = false; // Reset instruction state for new level/restart

        if (level === 5) {
            console.log("BOSS LEVEL!");
            // Play Boss Appearance Sound
            this.bossAppearanceSound.currentTime = 0;
            this.bossAppearanceSound.play().catch(e => console.warn("Boss appearance sound failed:", e));

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
        else if (level > 5) enemyCount = level * 2; // Infinite Mode Scaling (Harder)
        else enemyCount = level + 3; // Scaling

        console.log(`Starting Level ${level} with ${enemyCount} enemies`);

        // Spawn enemies
        for (let i = 0; i < enemyCount; i++) {
            const x = 500 + Math.random() * 800;
            const y = 350; // Simplify Y for now or randomize if needed
            const type = (i % 2) + 1; // Alternate 1, 2, 1, 2...
            this.spawnEnemy(x, y, type);
        }

        // Reset Background if Level > 5 (Infinite Mode)
        if (level > 5) {
            this.bgImage = new Image();
            this.bgImage.src = 'assets/warehouse_bg.png';

            // Resume Music if paused
            if (this.gameplayMusic.paused) {
                this.gameplayMusic.play().catch(e => console.warn("Gameplay music resume failed:", e));
            }
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
        // Handle Fade Transition
        if (this.fadeState === 'FADE_OUT') {
            this.fadeOpacity += deltaTime / 1000; // 1 second fade

            // Sync video opacity if in VIDEO_INTRO
            if (this.gameState === GameState.VIDEO_INTRO && this.videoElement) {
                this.videoElement.style.opacity = (1 - this.fadeOpacity).toString();
            }

            if (this.fadeOpacity >= 1) {
                this.fadeOpacity = 1;
                this.fadeState = 'FADE_IN';
                if (this.onFadeOutComplete) {
                    this.onFadeOutComplete();
                    this.onFadeOutComplete = null;
                }
            }
        }
        else if (this.fadeState === 'FADE_IN') {
            this.fadeOpacity -= deltaTime / 1000;
            if (this.fadeOpacity <= 0) {
                this.fadeOpacity = 0;
                this.fadeState = 'NONE';
            }
        }

        // Control Visibility of mobile SWITCH button (tied to KeyX/Power)
        const btnPower = document.getElementById('btn-power');
        if (btnPower) {
            btnPower.style.display = this.powerUnlocked ? 'flex' : 'none';
        }

        // Check for Boss Phase 2 Interaction (Triggered by KeyX when boss is at 50% HP)
        if (this.boss && this.boss.active && this.boss.health <= this.boss.maxHealth / 2) {
            if (this.input.isDown('KeyX') && this.bgImage !== this.bossBgSkyImage) {
                // Change Background
                this.bgImage = this.bossBgSkyImage;

                // Ensure character is in Fist mode for Phase 2 start
                if (!this.player.isAltSkinActive) {
                    this.player.toggleCharacter();
                }

                // Reset positions
                this.player.x = 400;
                this.player.y = 360;
                this.boss.x = 600;
                this.boss.y = 232;

                console.log("Phase 2 Activated!");
            }
        }

        if (this.toggleCooldown > 0) {
            this.toggleCooldown -= deltaTime;
        }

        if (this.gameState === GameState.START_SCREEN) {
            if (this.input.isDown('Enter') || this.input.isDown('Space')) {
                if (this.toggleCooldown > 0) return;
                this.triggerStartGame();
            }
            return;
        }

        if (this.gameState === GameState.VIDEO_INTRO) {
            if (this.toggleCooldown <= 0 && (this.input.isDown('Escape') || this.input.isDown('Enter'))) {
                this.advanceState();
            }
            return;
        }

        if (this.gameState === GameState.DIALOGUE) {
            if (this.input.isDown('Enter') || this.input.isDown('Space')) {
                if (this.toggleCooldown <= 0) {
                    this.handleDialogueProgression();
                }
            } else if (this.currentLevel === 1 ? this.dialogueMusic.ended : (this.currentLevel === 4 ? this.level4DialogueMusic.ended : (this.dialogueStep === 1 ? this.level5DialogueMusic.ended : this.level5HeroDialogueMusic.ended))) {
                if (this.toggleCooldown <= 0) {
                    this.handleDialogueProgression();
                }
            }
            return;
        }

        if (this.gameState === GameState.GAME_OVER) {
            return; // Stop updating game logic
        }


        // Boss Music Logic: Stop at 50% health
        if (this.boss && this.gameplayMusic && !this.gameplayMusic.paused) {
            if (this.boss.health <= this.boss.maxHealth / 2) {
                this.gameplayMusic.pause();
            }
        }

        // Check for Game Over Condition
        if (this.player.health <= 0) {
            this.gameState = GameState.GAME_OVER;

            // Stop Gameplay Music
            if (this.gameplayMusic) {
                this.gameplayMusic.pause();
                this.gameplayMusic.currentTime = 0;
            }

            this.saveScore();
            return;
        }


        // Check Level Criteria (All enemies dead)
        if (this.enemies.length === 0) {
            this.currentLevel++;

            if (this.currentLevel === 6) {
                // Just defeated the boss
                this.addFloatingText(this.player.x, this.player.y - 150, "BOSS DEFEATED!", '#3b82f6');
                setTimeout(() => {
                    this.addFloatingText(this.player.x, this.player.y - 120, "INFINITE MODE START", '#ef4444');
                }, 1500);
            }

            // Trigger Dialogue before Level 4

            if (this.currentLevel === 4) {
                this.gameState = GameState.DIALOGUE;
                this.gameplayMusic.pause(); // Stop gameplay music

                this.level4DialogueMusic.currentTime = 0;
                this.level4DialogueMusic.play().catch(e => console.error("L4 Dialogue failed:", e));
                this.toggleCooldown = 500; // Debounce input
                return;
            }

            // Trigger Dialogue before Level 5
            if (this.currentLevel === 5) {
                this.gameState = GameState.DIALOGUE;
                this.dialogueStep = 1; // Start with Boss
                this.gameplayMusic.pause(); // Stop gameplay music

                this.level5DialogueMusic.currentTime = 0;
                this.level5DialogueMusic.play().catch(e => console.error("L5 Dialogue failed:", e));
                this.toggleCooldown = 500; // Debounce input
                return;
            }

            this.startLevel(this.currentLevel);
        }


        // Player Update
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
                // Overlapping sound logic
                const s = this.shootSound.cloneNode() as HTMLAudioElement;
                s.volume = 0.25;
                s.play().catch(() => { });

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

        // Random Spawn Logic REMOVED for deterministic "every 2 kills" logic

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

                        this.killCount++;
                        // Spawn Health Pickup (Every 2 kills, but NOT from Boss)
                        // Boss is identifiable by type or class check. 
                        // Since Boss extends Enemy, we can check instanceof or just ensuring it's not the boss obj.
                        const isBoss = (enemy as any) === this.boss;

                        if (!isBoss && this.killCount % 2 === 0) {
                            this.healthPickups.push(new HealthPickup(enemy.x, enemy.y));
                        }
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

                    this.killCount++;
                    if (this.killCount % 2 === 0) {
                        this.healthPickups.push(new HealthPickup(enemy.x, enemy.y));
                    }
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
            // Draw Title Background
            if (this.titleBgImage.complete && this.titleBgImage.naturalWidth > 0) {
                this.ctx.drawImage(this.titleBgImage, 0, 0, this.canvas.width, this.canvas.height);
            } else {
                this.ctx.fillStyle = '#242424';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            }

            this.ctx.textAlign = 'left';

            // Title
            this.ctx.font = '40px "Press Start 2P"';
            this.ctx.fillStyle = '#FFFFFF'; // White Text
            this.ctx.strokeStyle = '#000000'; // Black Outline
            this.ctx.lineWidth = 4;

            // Stroke then Fill for Title
            this.ctx.strokeText("ONE LAST TIME", 40, this.canvas.height / 2 - 20);
            this.ctx.fillText("ONE LAST TIME", 40, this.canvas.height / 2 - 20);

            // Blinking Start Text
            const now = Date.now();
            if (Math.floor(now / 500) % 2 === 0) {
                this.ctx.font = '20px "Press Start 2P"';
                this.ctx.lineWidth = 3;
                const isMobile = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
                const startText = isMobile ? "TAP TO START" : "PRESS ENTER TO START";
                this.ctx.strokeText(startText, 40, this.canvas.height / 2 + 40);
                this.ctx.fillText(startText, 40, this.canvas.height / 2 + 40);
            }

            return;
        }

        if (this.gameState === GameState.VIDEO_INTRO) {
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            return;
        }

        // Common Background Drawing for Dialogue and Playing

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

            let characterImg = this.dialogueImage;

            // Override image for Boss Dialogue Phase
            if (this.currentLevel === 5 && this.dialogueStep === 1) {
                characterImg = this.bossDialogueImage;
            }

            // Draw Character
            if (characterImg.complete && characterImg.naturalWidth > 0) {
                // Calculate scale to fit canvas height (e.g. 80%)
                const naturalW = characterImg.naturalWidth || 69;
                const naturalH = characterImg.naturalHeight || 116;
                const aspectRatio = naturalW / naturalH;

                const imgH = this.canvas.height * 0.8; // 80% of screen height
                const imgW = imgH * aspectRatio;

                // Position: If Boss (Step 1), maybe flip or put on Right?
                // For simplicity, let's just keep position but maybe mirror if it faces wrong way?
                // Assuming default is Left.

                let x = 50;
                if (this.currentLevel === 5 && this.dialogueStep === 1) {
                    // Boss on Right
                    x = this.canvas.width - imgW - 50;
                }

                const y = this.canvas.height - imgH - 50; // Moved up by 50px

                this.ctx.drawImage(characterImg, x, y, imgW, imgH);
            }



            // Draw Speech Bubble
            // Default (Hero on Left)
            let bubbleX = 300;
            const bubbleY = 100;
            const bubbleW = 400;
            const bubbleH = 150;
            const radius = 20;

            // Adjust for Boss on Right (Level 5, Step 1)
            if (this.currentLevel === 5 && this.dialogueStep === 1) {
                // Boss is on Right, so Bubble goes Left
                bubbleX = 50;
            }

            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.beginPath();
            this.ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, radius);
            this.ctx.fill();

            // Triangle pointer for bubble
            this.ctx.beginPath();

            if (this.currentLevel === 5 && this.dialogueStep === 1) {
                // Point Right (towards Boss)
                // Start near bottom right of bubble
                const pointerX = bubbleX + bubbleW - 40;
                this.ctx.moveTo(pointerX, bubbleY + bubbleH);
                this.ctx.lineTo(pointerX + 30, bubbleY + bubbleH + 20); // Down-Right
                this.ctx.lineTo(pointerX - 10, bubbleY + bubbleH); // Back
            } else {
                // Point Left (towards Hero) - Default
                this.ctx.moveTo(bubbleX, bubbleY + 100);
                this.ctx.lineTo(bubbleX - 30, bubbleY + 120);
                this.ctx.lineTo(bubbleX + 10, bubbleY + 120);
            }

            this.ctx.fill();


            // Draw Text
            this.ctx.fillStyle = '#000000';
            this.ctx.font = '20px "Press Start 2P"';
            this.ctx.textAlign = 'left';

            if (this.currentLevel === 5) {
                if (this.dialogueStep === 1) {
                    const currentTime = this.level5DialogueMusic.currentTime;
                    this.ctx.font = '12px "Press Start 2P"';

                    // Estimated timestamps based on text
                    if (currentTime < 4) {
                        this.ctx.fillText("Naa solla poradhu onnum", bubbleX + 30, bubbleY + 40);
                        this.ctx.fillText("unakku pudhusilla...", bubbleX + 30, bubbleY + 70);
                    } else if (currentTime < 8) {
                        this.ctx.fillText("Irundhalum naa solren", bubbleX + 30, bubbleY + 60);
                        this.ctx.fillText("nee kelu.", bubbleX + 30, bubbleY + 90);
                    } else {
                        this.ctx.fillText("I'm waiting.", bubbleX + 30, bubbleY + 70);
                    }
                } else if (this.dialogueStep === 2) {
                    // Hero Dialogue - Placeholder or specific text if provided later
                    this.ctx.font = '14px "Press Start 2P"';
                    this.ctx.fillText("...", bubbleX + 50, bubbleY + 70);
                }
            } else if (this.currentLevel === 4) {
                const currentTime = this.level4DialogueMusic.currentTime;

                // Text 1: 0s - 7s
                if (currentTime < 7) {
                    this.ctx.font = '12px "Press Start 2P"'; // Smaller font for Level 4
                    this.ctx.fillText("yennaiku Observation Home-la", bubbleX + 30, bubbleY + 40);
                    this.ctx.fillText("andha rendu pasangala konnu", bubbleX + 30, bubbleY + 70);
                    this.ctx.fillText("thonga vutingalo,", bubbleX + 30, bubbleY + 100);
                    this.ctx.fillText("annike naan sethuten.", bubbleX + 30, bubbleY + 130);
                }
                // Text 2: 7s - 11s
                else if (currentTime < 11) {
                    this.ctx.font = '12px "Press Start 2P"';
                    this.ctx.fillText("Inime enna pathi", bubbleX + 30, bubbleY + 60);
                    this.ctx.fillText("enakku kavalaye illa.", bubbleX + 30, bubbleY + 90);
                }
                // Text 3: 11s+
                else {
                    this.ctx.font = '12px "Press Start 2P"';
                    this.ctx.fillText("Indha chinna pasanga kaila", bubbleX + 30, bubbleY + 40);
                    this.ctx.fillText("pachai kuthi vittu,", bubbleX + 30, bubbleY + 70);
                    this.ctx.fillText("echai velaiki use panradhellam", bubbleX + 30, bubbleY + 100);
                    this.ctx.fillText("inime nadakkadhu.", bubbleX + 30, bubbleY + 130);
                }
            } else {
                this.ctx.font = '20px "Press Start 2P"'; // Normal font
                this.ctx.fillText("Enga yarda Bhavani", bubbleX + 30, bubbleY + 60);
                this.ctx.fillText("haaa..!", bubbleX + 30, bubbleY + 90);
            }


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
        if (this.powerUnlocked && !this.instructionDismissed) {
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
            // Death Screen
            this.ctx.textAlign = 'center';

            if (this.currentLevel > 5) {
                // Post-Boss Ending Screen
                this.ctx.fillStyle = '#000000'; // Solid Black
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

                this.ctx.fillStyle = '#FFFFFF'; // White Text
                this.ctx.font = '30px "Press Start 2P"';
                this.ctx.fillText("STORY ", this.canvas.width / 2, this.canvas.height / 2 - 40);
                this.ctx.fillText("TO BE CONTINUED...", this.canvas.width / 2, this.canvas.height / 2 + 10);

                // Optional: "Click to Restart" subtle text
                this.ctx.font = '16px "Press Start 2P"';
                this.ctx.fillStyle = '#666666';


            } else {
                // Standard Game Over
                // Transparent Black Background
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

                // "DEAD" Text - Red
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
            }

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

        // Draw Fade Overlay
        if (this.fadeOpacity > 0) {
            this.ctx.globalAlpha = this.fadeOpacity;
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.globalAlpha = 1.0; // Reset alpha
        }
    }




    private handleToggleInput() {
        if (this.toggleCooldown > 0) return;
        if (!this.powerUnlocked) {
            // Optional: Show "Locked" message
            return;
        }
        this.player.toggleCharacter();
        this.instructionDismissed = true; // Hide instruction after use
        this.leoDialogueSound.currentTime = 0;
        this.leoDialogueSound.play().catch(e => console.warn("Leo dialogue sound failed:", e));
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
            .limit(1000);

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
