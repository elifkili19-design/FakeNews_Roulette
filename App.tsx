import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GamePhase, GameState, Headline, Shell, Particle } from './types';
import { generateHeadlines } from './services/geminiService';
import { PixelArtShotgun } from './components/PixelArtShotgun';
import { HeadlineOption } from './components/HeadlineOption';
import { PixelParticles } from './components/PixelParticles';
import { Dealer } from './components/Dealer';
import { INITIAL_PLAYER_HEALTH, INITIAL_DEALER_HEALTH, MAX_HEALTH } from './constants';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    playerHealth: INITIAL_PLAYER_HEALTH,
    dealerHealth: INITIAL_DEALER_HEALTH,
    magazine: [],
    currentHeadlineSet: [],
    phase: GamePhase.INTRO,
    message: "BENVENUTO ALLA ROULETTE DELLA VERITÀ.",
    isPlayerTurn: true,
  });

  const [firing, setFiring] = useState(false);
  const [dealerDamaged, setDealerDamaged] = useState(false);
  const [playerDamaged, setPlayerDamaged] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const nextParticleId = useRef(0);
  const requestRef = useRef<number>(null);

  // Health Vignette Logic
  useEffect(() => {
    const vignette = document.getElementById('vignette');
    if (vignette) {
      if (gameState.playerHealth === 1) vignette.classList.add('vignette-active');
      else vignette.classList.remove('vignette-active');
    }
  }, [gameState.playerHealth]);

  const updateParticles = useCallback(() => {
    setParticles((prev) => 
      prev
        .map((p) => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.15,
          life: p.life - 0.02,
        }))
        .filter((p) => p.life > 0)
    );
    requestRef.current = requestAnimationFrame(updateParticles);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(updateParticles);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [updateParticles]);

  const createBurst = (x: number, y: number, count: number, colors: string[], speed = 5) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = Math.random() * speed + 2;
      newParticles.push({
        id: nextParticleId.current++,
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        size: Math.floor(Math.random() * 6) + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
      });
    }
    setParticles((prev) => [...prev, ...newParticles]);
  };

  const startRound = useCallback(async () => {
    setGameState(prev => ({ 
      ...prev, 
      phase: GamePhase.LOADING_ROUND, 
      message: "ACCESSO DATABASE NOTIZIE...",
      isPlayerTurn: true
    }));

    const headlines = await generateHeadlines();
    const count = Math.floor(Math.random() * 4) + 2;
    const livesCount = Math.ceil(count / 2);
    const shells: Shell[] = Array.from({ length: count }, (_, i) => ({
      isLive: i < livesCount,
      isKnown: false
    })).sort(() => Math.random() - 0.5);

    setGameState(prev => ({
      ...prev,
      magazine: shells,
      currentHeadlineSet: headlines,
      phase: GamePhase.CHOOSING_HEADLINE,
      message: `SCANSIONE NOTIZIE IN CORSO...`
    }));
  }, []);

  const handleHeadlineSelection = (headline: Headline) => {
    if (!headline.isTrue) {
      setGameState(prev => ({
        ...prev,
        message: "DISINFORMAZIONE IDENTIFICATA. ACCESSO AL GRILLETTO CONSENTITO.",
        phase: GamePhase.SHOOTING
      }));
    } else {
      setGameState(prev => ({
        ...prev,
        message: "ERRORE DI FILTRAGGIO! PROTOCOLLO AUTO-PUNIZIONE.",
        phase: GamePhase.SHOOTING
      }));
    }
  };

  const fire = async (target: 'player' | 'dealer', e: React.MouseEvent) => {
    if (gameState.magazine.length === 0) return;

    setFiring(true);
    const shell = gameState.magazine[0];
    const newMagazine = gameState.magazine.slice(1);

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const flashX = target === 'player' ? rect.left : rect.right;
    const flashY = rect.top + rect.height / 2;

    if (shell.isLive) {
      if (target === 'dealer') {
        setDealerDamaged(true);
        setTimeout(() => setDealerDamaged(false), 600);
      } else {
        setPlayerDamaged(true);
        setTimeout(() => setPlayerDamaged(false), 600);
      }

      createBurst(flashX, flashY, 40, ['#FFD54F', '#F44336', '#FFFFFF', '#000000'], 8);

      const playerDmg = target === 'player' ? 1 : 0;
      const dealerDmg = target === 'dealer' ? 1 : 0;
      
      setTimeout(() => setFiring(false), 600);

      setGameState(prev => {
        const nextPHealth = prev.playerHealth - playerDmg;
        const nextDHealth = prev.dealerHealth - dealerDmg;
        
        if (nextPHealth <= 0 || nextDHealth <= 0) {
          return {
            ...prev,
            playerHealth: nextPHealth,
            dealerHealth: nextDHealth,
            magazine: newMagazine,
            phase: GamePhase.GAME_OVER,
            message: nextPHealth <= 0 ? "TRASMISSIONE INTERROTTA." : "BANCO ELIMINATO."
          };
        }

        return {
          ...prev,
          playerHealth: nextPHealth,
          dealerHealth: nextDHealth,
          magazine: newMagazine,
          phase: newMagazine.length === 0 ? GamePhase.ROUND_OVER : GamePhase.CHOOSING_HEADLINE,
          message: newMagazine.length === 0 ? "BUFFER VUOTO. ATTENDERE." : "PROSSIMA SCANSIONE."
        };
      });

      if (newMagazine.length === 0 && gameState.playerHealth > 0 && gameState.dealerHealth > 0) {
        setTimeout(startRound, 2500);
      } else if (newMagazine.length > 0) {
        const headlines = await generateHeadlines();
        setGameState(prev => ({ ...prev, currentHeadlineSet: headlines }));
      }

    } else {
      createBurst(flashX, flashY, 15, ['#555555', '#FFFFFF', '#333333'], 3);
      setTimeout(() => setFiring(false), 400);
      
      setGameState(prev => ({
        ...prev,
        magazine: newMagazine,
        phase: newMagazine.length === 0 ? GamePhase.ROUND_OVER : GamePhase.CHOOSING_HEADLINE,
        message: target === 'player' ? "CLICK. SEGNALE STABILE." : "CLICK. IL BANCO È ANCORA QUI."
      }));

      if (newMagazine.length === 0) {
        setTimeout(startRound, 2500);
      } else {
        const headlines = await generateHeadlines();
        setGameState(prev => ({ ...prev, currentHeadlineSet: headlines }));
      }
    }
  };

  const renderHealth = (health: number, color: string) => (
    <div className="flex gap-3">
      {Array.from({ length: MAX_HEALTH }).map((_, i) => (
        <div 
          key={i} 
          className={`w-12 h-4 pixel-border transition-all duration-700 ${i < health ? color : 'bg-black/40 opacity-20 scale-90'}`}
        />
      ))}
    </div>
  );

  if (gameState.phase === GamePhase.INTRO) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#050512] text-white p-8">
        <div className="industrial-title-wrap mb-12">
          <h1 className="industrial-title">
            TRUTH<br/>ROULETTE
          </h1>
        </div>
        
        <button 
          onClick={startRound}
          className="px-24 py-10 bg-zinc-200 text-black pixel-border text-3xl font-bold uppercase tracking-[0.4em] active:scale-95 ui-pixel btn-industrial"
        >
          CONNETTI
        </button>

        <p className="mt-12 text-zinc-600 uppercase tracking-widest text-xs animate-pulse ui-pixel">
          AUTENTICAZIONE TERMINALE IN CORSO...
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen bg-[#050512] text-zinc-100 overflow-hidden font-mono ${playerDamaged ? 'glitch-screen' : ''}`}>
      <PixelParticles particles={particles} />

      {/* Top HUD: Status Bar */}
      <div className="flex justify-between items-start p-8 z-20">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
            <span className="text-zinc-500 uppercase tracking-[0.3em] text-sm font-bold ui-pixel">LIVE FEED // CH_9</span>
          </div>
        </div>

        <div className="text-right">
            <span className="text-zinc-600 text-xs uppercase block mb-1 ui-pixel">SIGNAL_STRENGTH</span>
            <div className="flex gap-1 justify-end items-end h-6">
               {[1,2,3,4].map(i => <div key={i} className={`w-1.5 h-${i*2} ${i < 4 ? 'bg-zinc-300' : 'bg-zinc-800'} animate-pulse`} />)}
            </div>
        </div>
      </div>

      {/* Main Table View */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <div className="w-[80vw] h-[80vw] bg-red-900/10 blur-[150px] rounded-full" />
        </div>

        <div className="z-10 w-full max-w-5xl flex flex-col items-center">
          <div className="mb-12 w-full">
            <Dealer 
              damaged={dealerDamaged} 
              lowHealth={gameState.dealerHealth === 1} 
              phase={gameState.phase} 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full px-10">
            {gameState.phase === GamePhase.CHOOSING_HEADLINE && gameState.currentHeadlineSet.map((h, i) => (
              <HeadlineOption
                key={i}
                headline={h}
                disabled={gameState.phase !== GamePhase.CHOOSING_HEADLINE}
                onClick={() => handleHeadlineSelection(h)}
              />
            ))}
          </div>
          
          {gameState.phase !== GamePhase.CHOOSING_HEADLINE && (
             <div className="mt-8 bg-black/40 p-4 pixel-border border-zinc-800 backdrop-blur-sm animate-pulse">
                <p className="text-xl uppercase tracking-widest text-zinc-300 italic ui-pixel">{gameState.message}</p>
             </div>
          )}
        </div>
      </div>

      {/* Floating Console Controls */}
      <div className="w-full z-30 flex items-end justify-between px-16 pb-12">
        <div className="flex flex-col gap-2">
          <span className="text-zinc-600 text-[10px] uppercase font-bold tracking-widest ui-pixel">INTEGRITÀ BANCO</span>
          {renderHealth(gameState.dealerHealth, 'bg-red-900')}
        </div>

        <div className="flex-1 flex justify-center items-center">
          {gameState.phase === GamePhase.SHOOTING && (
            <div className="flex gap-16 items-center">
               <button 
                onClick={(e) => fire('player', e)}
                className="group flex flex-col items-center gap-4 p-8 bg-black/40 backdrop-blur-sm pixel-border border-red-900 hover:bg-red-950/40 transition-all active:translate-y-2"
              >
                <div className="text-red-700 group-hover:text-red-500 transition-colors uppercase tracking-[0.4em] font-bold text-xs mb-2 ui-pixel">SPARA A TE STESSO</div>
                <PixelArtShotgun orientation="left" firing={firing && playerDamaged} />
              </button>

              <button 
                onClick={(e) => fire('dealer', e)}
                className="group flex flex-col items-center gap-4 p-8 bg-black/40 backdrop-blur-sm pixel-border border-zinc-700 hover:bg-zinc-900/40 transition-all active:translate-y-2"
              >
                <div className="text-zinc-500 group-hover:text-zinc-200 transition-colors uppercase tracking-[0.4em] font-bold text-xs mb-2 ui-pixel">SPARA AL TARGET</div>
                <PixelArtShotgun orientation="right" firing={firing && dealerDamaged} />
              </button>
            </div>
          )}

          {gameState.phase === GamePhase.GAME_OVER && (
            <button 
              onClick={() => window.location.reload()}
              className="px-24 py-10 bg-red-800 text-white text-4xl font-bold pixel-border hover:bg-white hover:text-black transition-all shadow-[0_0_40px_rgba(153,0,0,0.5)] ui-pixel"
            >
              RI-SINCRO
            </button>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="text-zinc-600 text-[10px] uppercase font-bold tracking-widest text-right ui-pixel">INTEGRITÀ OSPITE</span>
          {renderHealth(gameState.playerHealth, 'bg-zinc-100')}
        </div>
      </div>
    </div>
  );
};

export default App;