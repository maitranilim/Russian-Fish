import { CardModel, Rank, Suit, PlayerID } from './types';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const createDeck = (): CardModel[] => {
  const deck: CardModel[] = [];
  let idCounter = 0;
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `card-${idCounter++}`,
        suit,
        rank,
      });
    }
  }
  return deck;
};

export const shuffleDeck = (deck: CardModel[]): CardModel[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

export const getSuitSymbol = (suit: Suit): string => {
  switch (suit) {
    case 'hearts': return '♥';
    case 'diamonds': return '♦';
    case 'clubs': return '♣';
    case 'spades': return '♠';
  }
};

export const isValidMove = (
  card: CardModel, 
  topCard: CardModel | undefined, 
  activeSuit: Suit, 
  attackStack: number
): boolean => {
  if (!topCard) return false;

  // 1. Attack Scenario: If there is an active attack stack (2s played), you MUST play a 2.
  if (attackStack > 0) {
    return card.rank === '2';
  }

  // 2. Normal Scenario
  
  // Jack is always a wildcard and can be played on anything (unless under attack, covered above).
  if (card.rank === 'J') return true;

  // If the top card was a Jack (or suit changed), we must follow the active suit.
  // Exception: If you have the same rank as the top card, you can play it to switch suits?
  // Rule: "No player can change suite except from discarding same number card from different suite."
  // This implies standard matching rules apply: Match Rank OR Match Suit.
  // The 'activeSuit' variable tracks the effective suit (changed by J or naturally by card).
  
  if (card.suit === activeSuit) return true;
  if (card.rank === topCard.rank) return true;

  return false;
};

export const getNextPlayer = (current: PlayerID, skip: boolean = false): PlayerID => {
  const order: PlayerID[] = ['south', 'west', 'north', 'east'];
  let idx = order.indexOf(current);
  
  // Standard move is 1 step clockwise (South -> West -> North -> East) which is index + 1
  // If skip is true (Ace), we move 2 steps
  const steps = skip ? 2 : 1;
  
  return order[(idx + steps) % 4];
};

export const getPlayerName = (id: PlayerID): string => {
  switch(id) {
    case 'south': return 'You';
    case 'west': return 'West AI';
    case 'north': return 'North AI';
    case 'east': return 'East AI';
  }
};