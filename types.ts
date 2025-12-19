export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface CardModel {
  id: string;
  suit: Suit;
  rank: Rank;
}

export type PlayerID = 'south' | 'west' | 'north' | 'east';

export interface GameState {
  deck: CardModel[];
  discardPile: CardModel[];
  hands: Record<PlayerID, CardModel[]>;
  currentTurn: PlayerID;
  activeSuit: Suit; 
  winner: PlayerID | null;
  isSuitSelectionOpen: boolean;
  gameLog: string[];
  isDealing: boolean;
  attackStack: number; // Number of 2s played consecutively (or raw card count to draw)
}