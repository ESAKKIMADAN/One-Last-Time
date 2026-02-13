import { supabase } from './supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface PlayerState {
    id: string;
    x: number;
    y: number;
    facing: number;
    animState: number; // AnimationState enum value
    hp: number;
    isAttacking: boolean;
    characterType: 'player' | 'boss'; // 'player' = 111.png, 'boss' = Boss
    roundWins: number;
}

export interface GameStateUpdate {
    players: { [key: string]: PlayerState };
    round: number;
    roundActive: boolean;
}

export class MultiplayerService {
    private channel: RealtimeChannel | null = null;
    private roomId: string = '';
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

    public async joinRoom(roomId: string, onUpdate: (state: GameStateUpdate) => void, onJoined: (count: number) => void): Promise<boolean> {
        this.roomId = roomId;
        this.onGameStateUpdate = onUpdate;
        this.onPlayerJoined = onJoined;

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

                if (this.onPlayerJoined) this.onPlayerJoined(userIds.length);

                // Determine Host (first user/lowest ID logic or just first to appear)
                // For simplicity: If I am the only one, I am Host.
                if (userIds.length === 1) {
                    this.isHost = true;
                } else {
                    // If multiple, strictly sort to decide ensuring stability
                    // But 'isHost' usually fixed on creation in better systems. 
                    // Here we'll rely on "First come" effectively.
                    // Actually, if we join and there's already someone, we are NOT host.
                    const myIndex = userIds.indexOf(this.playerId);
                    // If I am index 0, I might be host, but presence sync order isn't guaranteed sorted by arrival time accurately always.
                    // Better: The one who sends 'START_GAME' is host. 
                }

                // Identify Opponent
                this.opponentId = userIds.find(id => id !== this.playerId) || null;
            })
            .on('broadcast', { event: 'game_update' }, (payload) => {
                if (this.onGameStateUpdate) this.onGameStateUpdate(payload.payload);
            })
            .on('broadcast', { event: 'start_match' }, (payload) => {
                // Receive character assignment
                // payload: { config: { [playerId]: 'boss' | 'player' } }
                const config = payload.payload;
                if (config && config[this.playerId]) {
                    this.myCharacter = config[this.playerId];
                    console.log("Assigned Character:", this.myCharacter);
                    // Trigger game start callback in main updating logic
                }
            })
            .subscribe(async (status) => {
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
