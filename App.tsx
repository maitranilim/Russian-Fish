import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RotateCcw, Trophy, Layers, AlertTriangle, User, HelpCircle, X, Menu, Volume2, VolumeX } from 'lucide-react';
import { CardModel, PlayerID, Suit } from './types';
import { createDeck, shuffleDeck, isValidMove, getSuitSymbol, getNextPlayer, getPlayerName } from './utils';
import Card from './components/Card';

const HAND_SIZE = 8; 

// --- Sound System (Procedural "Natural" Sounds) ---
const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;
let noiseBuffer: AudioBuffer | null = null;

if (audioCtx) {
    // Create a noise buffer for paper/card sounds
    const bufferSize = audioCtx.sampleRate * 2;
    noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
}

const playSound = (type: 'card' | 'draw' | 'shuffle' | 'win' | 'lose' | 'alert' | 'click' | 'jack' | 'ace' | 'two') => {
    if (!audioCtx || audioCtx.state === 'suspended') {
        audioCtx?.resume().catch(() => {});
    }
    if (!audioCtx || !noiseBuffer) return;

    const now = audioCtx.currentTime;

    const playNoise = (duration: number, filterFreq: number, gainVal: number, attack = 0.01) => {
        const src = audioCtx.createBufferSource();
        src.buffer = noiseBuffer;
        src.loop = true;
        
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(filterFreq, now);

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(gainVal, now + attack);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        src.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);

        src.start(now);
        src.stop(now + duration);
    };

    const playTone = (freq: number, type: OscillatorType, dur: number, vol: number, delay = 0) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now + delay);
        gain.gain.setValueAtTime(vol, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, now + delay + dur);
        
        osc.start(now + delay);
        osc.stop(now + delay + dur);
    };

    switch (type) {
        case 'card': // "Thwip"
            playNoise(0.1, 1200, 0.3, 0.005);
            playTone(100, 'triangle', 0.05, 0.1); // Thud
            break;
        case 'draw': // "Shhhhk"
            playNoise(0.15, 800, 0.2, 0.05);
            break;
        case 'shuffle': // "Ruffle"
            for(let i=0; i<8; i++) {
                setTimeout(() => playNoise(0.05, 1000, 0.15, 0.001), i * 30);
            }
            break;
        case 'ace': // "Whoosh" + Impact
            playNoise(0.3, 2000, 0.3, 0.05);
            playTone(600, 'sine', 0.3, 0.1);
            break;
        case 'two': // Heavy Thud
            playNoise(0.1, 500, 0.5, 0.001);
            playTone(80, 'square', 0.2, 0.3);
            break;
        case 'jack': // Magical Chime
            playNoise(0.2, 1500, 0.2, 0.01);
            [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => playTone(f, 'sine', 0.4, 0.1, i*0.05));
            break;
        case 'win': // Major Fanfare
            [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98].forEach((f, i) => playTone(f, 'triangle', 0.6, 0.1, i*0.08));
            break;
        case 'lose': // Sad
            [392.00, 369.99, 349.23, 329.63].forEach((f, i) => playTone(f, 'sawtooth', 0.6, 0.1, i*0.2));
            break;
        case 'alert': 
            playTone(880, 'sine', 0.3, 0.1);
            break;
        case 'click':
            playTone(800, 'sine', 0.03, 0.05);
            break;
    }
};

// --- Animation Types ---
interface FlyingCardData {
    id: string;
    card?: CardModel; // If defined, face up. If undefined, face down (hidden).
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    rotation: number;
}

// --- Animation Component ---
const FlyingCardRenderer: React.FC<{ data: FlyingCardData }> = ({ data }) => {
    const [style, setStyle] = useState<React.CSSProperties>({
        left: data.startX,
        top: data.startY,
        transform: `rotate(${Math.random() * 30 - 15}deg) scale(1)`,
        opacity: 1
    });

    useEffect(() => {
        requestAnimationFrame(() => {
            setStyle({
                left: data.endX,
                top: data.endY,
                transform: `rotate(${data.rotation}deg) scale(1)`,
                opacity: 1
            });
        });
    }, [data]);

    return (
        <div 
            className="fixed z-50 transition-all duration-500 ease-in-out pointer-events-none"
            style={style}
        >
            <Card card={data.card} isHidden={!data.card} />
        </div>
    );
};

// --- Tutorial Component ---
const TutorialModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <HelpCircle className="text-indigo-400" /> How to Play
                </h2>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                    <X size={24} />
                </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6 text-slate-300 text-sm sm:text-base leading-relaxed scrollbar-hide">
                <section>
                    <h3 className="text-white font-bold mb-2">Objective</h3>
                    <p>Be the first player to get rid of all your cards. The game ends immediately when a player reaches 0 cards.</p>
                </section>
                
                <section>
                    <h3 className="text-white font-bold mb-2">Matching Rules</h3>
                    <p>You can play a card if it matches the <span className="text-indigo-400 font-bold">Rank</span> (Number) or <span className="text-indigo-400 font-bold">Suit</span> of the top card on the discard pile.</p>
                </section>

                <section>
                    <h3 className="text-white font-bold mb-2">Special Cards</h3>
                    <ul className="space-y-3">
                        <li className="flex gap-3">
                            <div className="font-bold text-white bg-red-900/50 border border-red-500/50 px-2 rounded w-12 text-center">2</div>
                            <div>
                                <span className="text-white font-bold">Attack (+2)</span>
                                <br/>Forces the next player to draw 2 cards. If they have a 2, they can play it to stack the attack (passing +4 to the next person!).
                            </div>
                        </li>
                        <li className="flex gap-3">
                            <div className="font-bold text-white bg-indigo-900/50 border border-indigo-500/50 px-2 rounded w-12 text-center">A</div>
                            <div>
                                <span className="text-white font-bold">Skip</span>
                                <br/>Skips the next player's turn completely.
                            </div>
                        </li>
                        <li className="flex gap-3">
                            <div className="font-bold text-slate-800 bg-yellow-400 px-2 rounded w-12 text-center">J</div>
                            <div>
                                <span className="text-white font-bold">Wildcard</span>
                                <br/>Can be played on any card. Allows you to change the active suit to whatever you want. 
                                <br/><span className="text-indigo-400 italic text-xs">Note: If Jack is your last card, you win immediately without choosing a suit!</span>
                            </div>
                        </li>
                    </ul>
                </section>

                <section>
                    <h3 className="text-white font-bold mb-2">Drawing</h3>
                    <p>If you cannot play (or choose not to), click the Deck to draw a card. If you are under attack (Stack > 0), you must draw the accumulated penalty cards unless you can defend with a 2.</p>
                </section>
            </div>
            <div className="p-6 border-t border-slate-700 bg-slate-800/30 text-center">
                <button 
                    onClick={() => { playSound('click'); onClose(); }}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                >
                    Got it, Let's Play!
                </button>
            </div>
        </div>
    </div>
);

const App: React.FC = () => {
  // --- State ---
  const [deck, setDeck] = useState<CardModel[]>([]);
  const [discardPile, setDiscardPile] = useState<CardModel[]>([]);
  
  const [hands, setHands] = useState<Record<PlayerID, CardModel[]>>({
    south: [], west: [], north: [], east: []
  });

  const [currentTurn, setCurrentTurn] = useState<PlayerID>('south');
  const [activeSuit, setActiveSuit] = useState<Suit>('spades');
  const [winner, setWinner] = useState<PlayerID | null>(null);
  const [isSuitSelectionOpen, setIsSuitSelectionOpen] = useState(false);
  const [gameLog, setGameLog] = useState<string[]>([]);
  const [announcement, setAnnouncement] = useState<{msg: string, id: number} | null>(null);
  const [isDealing, setIsDealing] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [flyingCards, setFlyingCards] = useState<FlyingCardData[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Tutorial State
  const [showTutorial, setShowTutorial] = useState(false);
  
  // Track consecutive 2s. This is the NUMBER OF CARDS TO DRAW (e.g., 2, 4, 6)
  const [attackStack, setAttackStack] = useState<number>(0);

  // Refs for positioning
  const deckRef = useRef<HTMLDivElement>(null);
  const discardRef = useRef<HTMLDivElement>(null);
  const handRefs = useRef<Record<PlayerID, HTMLDivElement | null>>({
      south: null, west: null, north: null, east: null
  });
  const logContainerRef = useRef<HTMLDivElement>(null);

  // --- Helpers ---
  const addLog = (msg: string) => {
    setGameLog(prev => {
      const newLog = [...prev, msg];
      if (newLog.length > 50) newLog.shift();
      return newLog;
    });
  };

  const showAnnouncement = (msg: string) => {
      setAnnouncement({ msg, id: Date.now() });
      setTimeout(() => setAnnouncement(prev => prev?.msg === msg ? null : prev), 3000);
  };

  // --- Animation Helpers ---
  const triggerTransferAnimation = (
      startRect: DOMRect, 
      endRect: DOMRect, 
      card: CardModel | undefined,
      finalRotation: number = 0
  ): Promise<void> => {
      const id = Math.random().toString();
      const fly: FlyingCardData = {
          id,
          card,
          startX: startRect.left,
          startY: startRect.top,
          endX: endRect.left,
          endY: endRect.top,
          rotation: finalRotation
      };
      
      setFlyingCards(prev => [...prev, fly]);
      
      return new Promise(resolve => {
          setTimeout(() => {
              setFlyingCards(prev => prev.filter(c => c.id !== id));
              resolve();
          }, 500);
      });
  };

  const getHandRect = (pid: PlayerID): DOMRect | null => {
      return handRefs.current[pid]?.getBoundingClientRect() || null;
  };

  // --- Deck Management ---
  const reshuffleDiscard = (currentDiscard: CardModel[]) => {
    if (currentDiscard.length <= 1) return null;
    const topCard = currentDiscard[currentDiscard.length - 1];
    const rest = currentDiscard.slice(0, currentDiscard.length - 1);
    const newDeck = shuffleDeck(rest);
    addLog("Deck reshuffled from discard pile.");
    return { newDeck, topCard };
  };

  const drawCardForPlayerLogic = (currentDeck: CardModel[], currentDiscard: CardModel[]) => {
    let d = [...currentDeck];
    let dp = [...currentDiscard];
    let reshuffled = false;
    
    if (d.length === 0) {
      const res = reshuffleDiscard(dp);
      if (!res) { 
        return { card: null, newDeck: d, newDiscard: dp, reshuffled: false };
      }
      d = res.newDeck;
      dp = [res.topCard];
      reshuffled = true;
    }

    if (d.length === 0) return { card: null, newDeck: d, newDiscard: dp, reshuffled };

    const card = d.pop()!;
    return { card, newDeck: d, newDiscard: dp, reshuffled };
  };

  // --- Game Loop / Initialization ---
  
  const startDeal = () => {
    playSound('shuffle');
    setWinner(null);
    setGameLog([]);
    setAnnouncement(null);
    setIsDealing(true);
    setHands({ south: [], west: [], north: [], east: [] });
    setAttackStack(0);
    
    const fullDeck = shuffleDeck(createDeck());
    setDeck(fullDeck);
    setDiscardPile([]); 
    
    let dealIndex = 0;
    const totalCardsToDeal = HAND_SIZE * 4;
    
    const dealInterval = setInterval(() => {
      if (dealIndex >= totalCardsToDeal) {
        clearInterval(dealInterval);
        finishDealing(fullDeck);
        return;
      }

      const players: PlayerID[] = ['south', 'west', 'north', 'east'];
      const targetPlayer = players[dealIndex % 4];

      setDeck(prev => {
        const newDeck = [...prev];
        const card = newDeck.pop();
        if (card) {
          setHands(prevHands => ({
            ...prevHands,
            [targetPlayer]: [...prevHands[targetPlayer], card]
          }));
        }
        return newDeck;
      });

      // Sound effect for dealing (every few cards to not overwhelm)
      if (dealIndex % 4 === 0) playSound('draw');

      dealIndex++;
    }, 40);
  };

  const finishDealing = (remainingDeck: CardModel[]) => {
    setDeck(currentDeck => {
      const finalDeck = [...currentDeck];
      const startCard = finalDeck.pop();
      
      if (startCard) {
        setDiscardPile([startCard]);
        setActiveSuit(startCard.suit);
        
        // Initial Card Rule Check
        let initialAttack = 0;
        if (startCard.rank === '2') {
            initialAttack = 2;
            addLog(`Game starts with a 2! First player must play 2 or draw 2.`);
        } else {
            addLog(`Game Started. Top card: ${startCard.rank} of ${startCard.suit}`);
        }
        setAttackStack(initialAttack);
      }
      
      setIsDealing(false);
      setCurrentTurn('south');
      playSound('alert'); // Game start alert
      return finalDeck;
    });
  };

  useEffect(() => {
    startDeal();
    
    // Check local storage for tutorial
    const hasSeenTutorial = localStorage.getItem('russian-fish-tutorial-seen');
    if (!hasSeenTutorial) {
        setShowTutorial(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCloseTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('russian-fish-tutorial-seen', 'true');
  };

  const handleOpenTutorial = () => {
    playSound('click');
    setShowTutorial(true);
  };

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [gameLog, isMenuOpen]);

  useEffect(() => {
    if (isDealing) return;
    Object.entries(hands).forEach(([pid, hand]) => {
      if (hand.length === 0 && discardPile.length > 0) {
        setWinner(pid as PlayerID);
      }
    });
  }, [hands, discardPile, isDealing]);


  // --- Logic Methods ---

  const advanceTurn = (playedCard: CardModel | null, currentPlayer: PlayerID) => {
    let next = getNextPlayer(currentPlayer);
    let skip = false;

    if (playedCard) {
      if (playedCard.rank === 'A') {
        addLog(`${getPlayerName(currentPlayer)} played Ace! Next player skipped.`);
        showAnnouncement(`${getPlayerName(currentPlayer)} played Ace! Skipped.`);
        playSound('ace');
        next = getNextPlayer(currentPlayer, true); 
        skip = true;
      } else if (playedCard.rank === '2') {
        setAttackStack(prev => prev + 2);
        showAnnouncement(`${getPlayerName(currentPlayer)} attacked with +2!`);
        playSound('two');
      } else if (playedCard.rank !== 'J') {
         // Standard play sound already handled, but if not special, nothing extra
      }
    }

    setCurrentTurn(next);
    
    // Play alert if it becomes player's turn
    if (next === 'south') {
        // Debounce alert if multiple sounds playing
        setTimeout(() => playSound('alert'), 800);
    }
  };

  const executePlay = (card: CardModel, pid: PlayerID) => {
    
    // 1. Calculate new hand
    const newHand = hands[pid].filter(c => c.id !== card.id);

    // 2. Update State
    setHands(prev => ({
      ...prev,
      [pid]: newHand
    }));

    setDiscardPile(prev => [...prev, card]);

    // 3. WIN CONDITION CHECK: If hand is empty, WIN IMMEDIATELY.
    if (newHand.length === 0) {
        setWinner(pid);
        playSound('card'); // Final card sound
        setTimeout(() => playSound(pid === 'south' ? 'win' : 'lose'), 500);
        return; 
    }

    playSound('card');

    // 4. Normal Logic (if not won yet)
    if (card.rank === 'J') {
      playSound('jack');
      // Jack Logic
      if (pid === 'south') {
        showAnnouncement("You played Jack! Choose a suit.");
        setIsSuitSelectionOpen(true);
      } else {
        // AI chooses suit
        const suitsInHand: Record<Suit, number> = { hearts: 0, diamonds: 0, clubs: 0, spades: 0 };
        newHand.forEach(c => suitsInHand[c.suit]++);
        
        let bestSuit: Suit = 'hearts'; // Default
        let max = -1;
        (Object.keys(suitsInHand) as Suit[]).forEach(s => {
          if (suitsInHand[s] > max) { max = suitsInHand[s]; bestSuit = s; }
        });
        
        setActiveSuit(bestSuit);
        addLog(`${getPlayerName(pid)} played Jack and chose ${bestSuit}.`);
        showAnnouncement(`${getPlayerName(pid)} chose ${getSuitSymbol(bestSuit)}`);
        advanceTurn(card, pid);
      }
    } else {
      // Normal Logic
      setActiveSuit(card.suit);
      addLog(`${getPlayerName(pid)} played ${card.rank} of ${card.suit}.`);
      advanceTurn(card, pid);
    }
  };

  // --- Interaction & Animation Handlers ---

  const handleCardClick = async (card: CardModel, e: React.MouseEvent<HTMLDivElement>) => {
    if (currentTurn !== 'south' || winner || isSuitSelectionOpen || isAnimating || showTutorial || isMenuOpen) return;
    
    const topCard = discardPile[discardPile.length - 1];
    if (topCard && isValidMove(card, topCard, activeSuit, attackStack)) {
        setIsAnimating(true);
        const startRect = e.currentTarget.getBoundingClientRect();
        const endRect = discardRef.current?.getBoundingClientRect();

        if (endRect) {
            await triggerTransferAnimation(startRect, endRect, card, Math.random() * 20 - 10);
        }
        
        executePlay(card, 'south');
        setIsAnimating(false);
    }
  };

  const performDraw = async (pid: PlayerID, count: number) => {
      setIsAnimating(true);
      playSound('draw');
      
      let currentD = deck;
      let currentDP = discardPile;
      let drawnCards: CardModel[] = [];
      let didReshuffle = false;

      // Draw 'count' times
      for(let i=0; i<count; i++) {
        const res = drawCardForPlayerLogic(currentD, currentDP);
        currentD = res.newDeck;
        if (res.reshuffled) {
            didReshuffle = true;
            currentDP = res.newDiscard;
        }
        if (res.card) {
            drawnCards.push(res.card);
        } else {
            break; // Empty deck
        }
      }

      if (drawnCards.length > 0) {
        const deckRect = deckRef.current?.getBoundingClientRect();
        const handRect = getHandRect(pid);
        if (deckRect && handRect) {
             const targetRect = {
                left: handRect.left + handRect.width/2 - 30,
                top: handRect.top + handRect.height/2 - 40,
                width: 60, height: 80, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => {}
             } as DOMRect;
             
             await triggerTransferAnimation(deckRect, targetRect, pid === 'south' ? drawnCards[0] : undefined, 0);
        }
      }

      // Commit State
      if (didReshuffle) setDiscardPile(currentDP);
      setDeck(currentD);
      setHands(h => ({ ...h, [pid]: [...h[pid], ...drawnCards] }));
      
      if (attackStack > 0) {
          addLog(`${getPlayerName(pid)} drew ${drawnCards.length} cards (Attack Penalty).`);
          setAttackStack(0);
      } else {
          addLog(`${getPlayerName(pid)} drew a card.`);
      }

      advanceTurn(null, pid);
      setIsAnimating(false);
  };

  const handleDeckClick = async () => {
    if (currentTurn !== 'south' || winner || isSuitSelectionOpen || isAnimating || showTutorial || isMenuOpen) return;
    
    // If under attack, must draw full stack. If normal, draw 1.
    const drawCount = attackStack > 0 ? attackStack : 1;
    await performDraw('south', drawCount);
  };

  const handleSuitSelect = (suit: Suit) => {
    playSound('click');
    setActiveSuit(suit);
    setIsSuitSelectionOpen(false);
    addLog(`You changed suit to ${suit}.`);
    showAnnouncement(`You chose ${getSuitSymbol(suit)}`);
    advanceTurn({ rank: 'J', suit } as CardModel, 'south');
  };

  // --- AI Turn Logic ---
  useEffect(() => {
    if (currentTurn === 'south' || winner || isDealing || isAnimating || showTutorial) return;

    const performAITurn = async () => {
      await new Promise(r => setTimeout(r, 800));

      const pid = currentTurn;
      const hand = hands[pid];
      const topCard = discardPile[discardPile.length - 1];
      
      if (!topCard) return;

      const validMoves = hand.filter(c => isValidMove(c, topCard, activeSuit, attackStack));

      if (validMoves.length > 0) {
        let choice: CardModel | undefined;

        if (attackStack > 0) {
            choice = validMoves[0]; // Any 2 works
        } else {
            const nonJacks = validMoves.filter(c => c.rank !== 'J');
            if (nonJacks.length > 0) {
                 choice = nonJacks.find(c => c.suit === activeSuit);
                 if (!choice) choice = nonJacks.find(c => c.rank === topCard.rank);
                 if (!choice) choice = nonJacks[0];
            } else {
                choice = validMoves[0];
            }
        }
        
        if (!choice) choice = validMoves[0];

        setIsAnimating(true);
        const handRect = getHandRect(pid);
        const discardRect = discardRef.current?.getBoundingClientRect();
        
        if (handRect && discardRect) {
            const startRect = {
                left: handRect.left + handRect.width/2 - 30,
                top: handRect.top + handRect.height/2 - 40,
                width: 60, height: 80, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => {}
            } as DOMRect;
            await triggerTransferAnimation(startRect, discardRect, choice, Math.random() * 20 - 10);
        }
        
        executePlay(choice, pid);
        setIsAnimating(false);

      } else {
        const drawCount = attackStack > 0 ? attackStack : 1;
        await performDraw(pid, drawCount);
      }
    };

    performAITurn();

  }, [currentTurn, winner, isDealing, activeSuit, attackStack, showTutorial]);

  // --- Rendering ---
  const topDiscard = discardPile[discardPile.length - 1];
  const isSouthTurn = currentTurn === 'south' && !winner && !isDealing && !isSuitSelectionOpen && !isAnimating && !showTutorial && !isMenuOpen;

  return (
    <div className="min-h-screen bg-slate-900 overflow-hidden flex flex-col font-sans select-none relative">
      
      {/* Flying Cards Overlay */}
      {flyingCards.map(fc => <FlyingCardRenderer key={fc.id} data={fc} />)}

      {/* Top Bar */}
      <div className="absolute top-4 left-4 z-20 flex gap-4 items-center">
        <button onClick={() => { playSound('click'); startDeal(); }} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 text-slate-200 shadow-lg" title="Restart Game">
            <RotateCcw size={20} />
        </button>
        <div className="flex flex-col text-slate-300 text-sm">
            <span className="font-bold flex gap-1"><Layers size={16}/> Russian Fish</span>
            <span className="text-xs opacity-70">Target: 0 Cards</span>
        </div>
        <button onClick={handleOpenTutorial} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 text-slate-200 shadow-lg ml-2" title="How to Play">
            <HelpCircle size={20} />
        </button>
        {/* Attack Indicator */}
        {attackStack > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-900/80 border border-red-500 rounded-lg text-red-200 animate-pulse ml-2">
                <AlertTriangle size={16} />
                <span className="text-xs font-bold">Attack Stack: {attackStack}</span>
            </div>
        )}
      </div>

      {/* Top Right Menu Button */}
      <div className="absolute top-4 right-4 z-50">
        <button 
            onClick={() => { playSound('click'); setIsMenuOpen(true); }} 
            className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 text-slate-200 shadow-lg border border-slate-700"
        >
            <Menu size={20} />
        </button>
      </div>

      {/* Announcement Banner */}
      {announcement && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-in fade-in zoom-in duration-300">
            <div className="bg-slate-800/90 backdrop-blur-md border border-indigo-500/50 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3">
                <div className="bg-indigo-600 rounded-full p-1 animate-pulse"><Volume2 size={16}/></div>
                <span className="font-bold text-lg">{announcement.msg}</span>
            </div>
        </div>
      )}

      {/* Last Move Toast (Top Right) */}
      {!isMenuOpen && gameLog.length > 0 && (
          <div className="absolute top-16 right-4 z-30 flex flex-col items-end pointer-events-none animate-in fade-in slide-in-from-right-4">
              <div className="bg-slate-900/90 border-r-4 border-indigo-500 pl-4 pr-3 py-2 rounded-l-md shadow-xl backdrop-blur-md max-w-[200px] sm:max-w-xs text-right">
                  <p className="text-xs sm:text-sm text-slate-300 font-medium leading-tight">
                      {gameLog[gameLog.length - 1]}
                  </p>
              </div>
          </div>
      )}

      {/* Game Log Sidebar/Modal */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => { playSound('click'); setIsMenuOpen(false); }}>
            <div 
                className="absolute top-0 right-0 h-full w-80 max-w-[80vw] bg-slate-900 border-l border-slate-700 shadow-2xl p-5 flex flex-col animate-in slide-in-from-right duration-300" 
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Layers size={18} className="text-indigo-400"/> Game Log
                    </h2>
                    <button onClick={() => { playSound('click'); setIsMenuOpen(false); }} className="text-slate-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-700">
                    {gameLog.map((log, i) => (
                        <div key={i} className="text-xs sm:text-sm text-slate-400 border-l-2 border-indigo-900/50 pl-3 py-1 font-mono">
                            <span className="text-slate-600 mr-2 text-[10px]">{i+1}.</span>
                            {log}
                        </div>
                    ))}
                    <div ref={logContainerRef} />
                </div>
            </div>
        </div>
      )}

      {/* Main Board Area */}
      <div className="flex-1 relative w-full h-full max-w-5xl mx-auto my-auto z-10">
          
          {/* NORTH (AI) */}
          <div ref={el => { handRefs.current['north'] = el }} className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
             <div className={`mb-2 px-3 py-1 rounded-full text-xs font-bold transition-colors border ${currentTurn === 'north' ? 'bg-indigo-900 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                 North ({hands.north.length})
             </div>
             <div className="flex -space-x-8">
                {hands.north.map((c, i) => (
                    <Card key={c.id} isHidden className="origin-top" />
                ))}
             </div>
          </div>

          {/* WEST (AI) */}
          <div ref={el => { handRefs.current['west'] = el }} className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-row items-center">
             <div className="flex flex-col -space-y-12 w-24 sm:w-28 items-center">
                {hands.west.map((c, i) => (
                    <Card key={c.id} isHidden className="origin-center" />
                ))}
             </div>
             <div className={`ml-4 -rotate-90 px-3 py-1 whitespace-nowrap rounded-full text-xs font-bold transition-colors border ${currentTurn === 'west' ? 'bg-indigo-900 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                 West ({hands.west.length})
             </div>
          </div>

          {/* EAST (AI) */}
          <div ref={el => { handRefs.current['east'] = el }} className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-row-reverse items-center">
             <div className="flex flex-col -space-y-12 w-24 sm:w-28 items-center">
                {hands.east.map((c, i) => (
                    <Card key={c.id} isHidden className="origin-center" />
                ))}
             </div>
             <div className={`mr-4 rotate-90 px-3 py-1 whitespace-nowrap rounded-full text-xs font-bold transition-colors border ${currentTurn === 'east' ? 'bg-indigo-900 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                 East ({hands.east.length})
             </div>
          </div>

          {/* CENTER TABLE - Moved Up to prevent overlap */}
          <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-16 items-center z-30">
             
             {/* Deck */}
             <div 
                ref={deckRef}
                className={`
                    relative group transition-all duration-200
                    ${isSouthTurn ? 'cursor-pointer hover:scale-105 hover:shadow-emerald-500/20' : ''}
                `}
                onClick={handleDeckClick}
             >
                <div className="absolute top-0 left-0 w-20 h-28 sm:w-24 sm:h-36 bg-slate-700 rounded-lg border-2 border-slate-600"></div>
                <div className="absolute top-0.5 left-0.5 w-20 h-28 sm:w-24 sm:h-36 bg-slate-700 rounded-lg border-2 border-slate-600"></div>
                {/* Visual stack effect for deck */}
                <div className="absolute top-1 left-1 w-20 h-28 sm:w-24 sm:h-36 bg-slate-700 rounded-lg border-2 border-slate-600"></div>
                <Card isHidden className={`shadow-2xl ${isSouthTurn ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900' : ''}`} />
                
                {/* Draw Tooltip - Positioned Lower */}
                {isSouthTurn && (
                    <div className={`
                        absolute -bottom-10 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full whitespace-nowrap z-50 font-bold shadow-xl border text-xs pointer-events-none
                        ${attackStack > 0 ? 'bg-red-600 border-red-400 text-white animate-bounce' : 'bg-emerald-600 border-emerald-400 text-white animate-pulse'}
                    `}>
                        {attackStack > 0 ? `Draw ${attackStack}!` : 'Draw Card'}
                    </div>
                )}
             </div>

             {/* Discard */}
             <div ref={discardRef} className="relative">
                {topDiscard && <Card card={topDiscard} className="shadow-2xl z-10" disabled />}
                {!topDiscard && <div className="w-20 h-28 sm:w-24 sm:h-36 border-2 border-dashed border-slate-700 rounded-lg flex items-center justify-center text-slate-700 text-xs">Discard</div>}
                
                {/* Active Suit Marker */}
                {topDiscard && (
                    <div className="absolute -right-14 top-0 flex flex-col items-center gap-1 animate-in fade-in slide-in-from-left-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-2xl bg-slate-800 border border-slate-600 shadow-lg ${['hearts','diamonds'].includes(activeSuit) ? 'text-red-500' : 'text-slate-200'}`}>
                            {getSuitSymbol(activeSuit)}
                        </div>
                    </div>
                )}

                {/* Inline Suit Selection (Replaces full screen overlay) */}
                {isSuitSelectionOpen && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 flex gap-2 z-50 bg-slate-800/90 p-2 rounded-xl border border-slate-600 shadow-2xl animate-in slide-in-from-top-4 fade-in">
                        {(['hearts', 'diamonds', 'clubs', 'spades'] as Suit[]).map(suit => (
                        <button
                            key={suit}
                            onClick={() => handleSuitSelect(suit)}
                            className={`
                            w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-slate-700 hover:bg-slate-600 border border-slate-500 transition-all hover:scale-110 active:scale-95
                            ${(suit === 'hearts' || suit === 'diamonds') ? 'text-red-500' : 'text-slate-200'}
                            `}
                        >
                            {getSuitSymbol(suit)}
                        </button>
                        ))}
                    </div>
                )}
             </div>
          </div>

          {/* SOUTH (Player) */}
          <div ref={el => { handRefs.current['south'] = el }} className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center w-full px-4 z-40">
              
              <div className="flex justify-center -space-x-8 sm:-space-x-10 hover:space-x-0 transition-all duration-300 ease-out h-32 sm:h-40 items-end mb-4">
                  {hands.south.map((card, i) => {
                      const playable = topDiscard && isSouthTurn && isValidMove(card, topDiscard, activeSuit, attackStack);
                      const offset = i - (hands.south.length - 1) / 2;
                      const rotation = offset * 3; // Slight fan effect
                      const yOffset = Math.abs(offset) * 5; // Arch effect

                      return (
                        <div 
                            key={card.id}
                            className="transition-all duration-300 hover:z-20 hover:-translate-y-8 origin-bottom"
                            style={{ 
                                transform: `translateY(${yOffset}px) rotate(${rotation}deg)`,
                                zIndex: i 
                            }}
                        >
                            <Card 
                                card={card} 
                                isPlayable={playable}
                                onClick={(e) => handleCardClick(card, e)}
                                disabled={!playable}
                            />
                        </div>
                      );
                  })}
              </div>

              {/* Player Info Bar (Bottom) */}
              <div className={`
                px-6 py-2 rounded-t-xl text-sm font-bold transition-all border-t border-x flex items-center gap-3 backdrop-blur-md
                ${currentTurn === 'south' ? 'bg-emerald-900/80 border-emerald-500 text-white shadow-[0_0_30px_rgba(16,185,129,0.2)]' : 'bg-slate-800/80 border-slate-700 text-slate-400'}
              `}>
                  <User size={16} />
                  <span>You</span>
                  <div className="h-4 w-[1px] bg-white/20"></div>
                  <span className="opacity-80 font-normal">{hands.south.length} Cards</span>
                  {currentTurn === 'south' && <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse ml-2"/>}
              </div>

          </div>

      </div>

      {/* Tutorial Overlay */}
      {showTutorial && <TutorialModal onClose={handleCloseTutorial} />}

      {winner && (
        <div className="absolute inset-0 z-50 bg-slate-900/95 flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
          <Trophy className={`w-20 h-20 mb-6 ${winner === 'south' ? 'text-yellow-400' : 'text-slate-600'}`} />
          <h2 className="text-5xl font-bold text-white mb-2 tracking-tight">
            {winner === 'south' ? 'Victory!' : 'Defeat'}
          </h2>
          <p className="text-xl text-slate-400 mb-8">
            {winner === 'south' ? 'You cleared your hand!' : `${getPlayerName(winner)} won the game.`}
          </p>
          <button
            onClick={() => { playSound('click'); startDeal(); }}
            className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold text-lg shadow-xl shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
          >
            Play Again
          </button>
        </div>
      )}

    </div>
  );
};

export default App;