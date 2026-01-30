
export interface Headline {
  text: string;
  isTrue: boolean;
}

export enum GamePhase {
  INTRO = 'INTRO',
  LOADING_ROUND = 'LOADING_ROUND',
  CHOOSING_HEADLINE = 'CHOOSING_HEADLINE',
  SHOOTING = 'SHOOTING',
  DEALER_TURN = 'DEALER_TURN',
  ROUND_OVER = 'ROUND_OVER',
  GAME_OVER = 'GAME_OVER'
}

export interface Shell {
  isLive: boolean;
  isKnown: boolean;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number; // 1 to 0
}

export interface GameState {
  playerHealth: number;
  dealerHealth: number;
  magazine: Shell[];
  currentHeadlineSet: Headline[];
  phase: GamePhase;
  message: string;
  isPlayerTurn: boolean;
}
