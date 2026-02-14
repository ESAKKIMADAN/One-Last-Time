import { supabase } from './supabaseClient';
// import { RealtimeChannel } from '@supabase/supabase-js';

export interface PlayerState {
    id: string;
    x: number;
    y: number;
    facing: number;
    animState: number; // AnimationState enum value
    hp: number;
    isAttacking: boolean;
    characterType: 'player' | 'boss'; // 'player' = 111.png, 'boss' = Boss
    isAltSkin: boolean;
    roundWins: number;
}

export interface GameStateUpdate {
    players: { [key: string]: PlayerState };
    round: number;
    roundActive: boolean;
}

export class MultiplayerService {
    private channel: any = null;
    // private roomId: string = '';
    private playerId: string = '';
    private onGameStateUpdate: ((state: GameStateUpdate) => void) | null = null;
    private onPlayerJoined: ((count: number) => void) | null = null;

    // Simple state
    public isHost: boolean = false;
    public myCharacter: 'player' | 'boss' = 'player';
    public opponentId: string | null = null;

    constructor() {
        this.playerId = Math.random().toString(36).substring(2, 9);
    }

    private onGameStart: ((role: 'player' | 'boss') => void) | null = null;

    public async joinRoom(roomId: string, onUpdate: (state: GameStateUpdate) => void, onJoined: (count: number) => void, onStart: (role: 'player' | 'boss') => void): Promise<boolean> {
        // this.roomId = roomId;
        this.onGameStateUpdate = onUpdate;
        this.onPlayerJoined = onJoined;
        this.onGameStart = onStart;

        // Cleanup existing
        if (this.channel) await this.leaveRoom();

        this.channel = supabase.channel(`room_${roomId}`, {
            config: {
                presence: {
                    key: this.playerId,
                },
                broadcast: {
                    self: false,
                }
            }
        });

        this.channel
            .on('presence', { event: 'sync' }, () => {
                const state = this.channel!.presenceState();
                const userIds = Object.keys(state);
                console.log('Presence sync:', userIds);

                // Identify Opponent
                this.opponentId = userIds.find(id => id !== this.playerId) || null;

                if (this.onPlayerJoined) this.onPlayerJoined(userIds.length);

                // Determine Host (first user/lowest ID logic or just first to appear)
                // Deterministic Host Logic: Lowest ID is Host
                // This prevents race conditions where both think they are host
                const sortedIds = [...userIds].sort();
                this.isHost = sortedIds[0] === this.playerId;
                console.log(`Am I Host? ${this.isHost} (Lowest ID: ${sortedIds[0]})`);

                // Identify Opponent - Already done above
            })
            .on('broadcast', { event: 'game_update' }, (payload: any) => {
                if (this.onGameStateUpdate) this.onGameStateUpdate(payload.payload);
            })
            .on('broadcast', { event: 'start_match' }, (payload: any) => {
                // Receive character assignment
                // payload: { config: { [playerId]: 'boss' | 'player' } }
                const config = payload.payload;
                if (config && config[this.playerId]) {
                    this.myCharacter = config[this.playerId];
                    console.log("Assigned Character:", this.myCharacter);

                    if (this.onGameStart) {
                        this.onGameStart(this.myCharacter);
                    }
                }
            })
            .subscribe(async (status: any) => {
                if (status === 'SUBSCRIBED') {
                    await this.channel!.track({
                        online_at: new Date().toISOString(),
                    });
                }
            });

        return true;
    }

    public sendUpdate(state: GameStateUpdate) {
        if (!this.channel) return;
        this.channel.send({
            type: 'broadcast',
            event: 'game_update',
            payload: state
        });
    }

    public startGame(config: any) {
        if (!this.channel) return;
        this.channel.send({
            type: 'broadcast',
            event: 'start_match',
            payload: config
        });
    }

    public async leaveRoom() {
        if (this.channel) {
            await this.channel.unsubscribe();
            this.channel = null;
        }
    }

    public getPlayerId() {
        return this.playerId;
    }
}
