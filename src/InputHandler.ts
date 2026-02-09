export class InputHandler {
    private keys: { [key: string]: boolean } = {};

    constructor() {
        window.addEventListener('keydown', (e) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;
            this.keys[e.code] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        this.setupTouchControls();
    }

    private setupTouchControls() {
        const bindButton = (id: string, code: string) => {
            const btn = document.getElementById(id);
            if (!btn) return;

            const start = (e: Event) => {
                e.preventDefault();
                this.keys[code] = true;
            };

            const end = (e: Event) => {
                e.preventDefault();
                this.keys[code] = false;
            };

            // Touch events
            btn.addEventListener('touchstart', start, { passive: false });
            btn.addEventListener('touchend', end, { passive: false });

            // Mouse events for testing on desktop
            btn.addEventListener('mousedown', start);
            btn.addEventListener('mouseup', end);
            btn.addEventListener('mouseleave', end);
        };

        bindButton('btn-up', 'ArrowUp');
        bindButton('btn-down', 'ArrowDown');
        bindButton('btn-left', 'ArrowLeft');
        bindButton('btn-right', 'ArrowRight');
        bindButton('btn-shoot', 'KeyF');
        bindButton('btn-jump', 'Space');
    }

    public isDown(code: string): boolean {
        return !!this.keys[code];
    }
}
