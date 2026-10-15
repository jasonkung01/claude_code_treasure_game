import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Button } from './components/ui/button';
import AuthPanel from './components/AuthPanel';
import ScoreHistory from './components/ScoreHistory';
import { api, type User, type ScoreHistory as ScoreHistoryData } from './lib/api';
import closedChest from './assets/treasure_closed.png';
import treasureChest from './assets/treasure_opened.png';
import skeletonChest from './assets/treasure_opened_skeleton.png';
import chestOpenSound from './audios/chest_open.mp3';
import evilLaughSound from './audios/chest_open_with_evil_laugh.mp3';
import keyCursor from './assets/key.png';

interface Box {
  id: number;
  isOpen: boolean;
  hasTreasure: boolean;
}

type Phase = 'loading' | 'auth' | 'playing';

export default function App() {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [score, setScore] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);
  const [phase, setPhase] = useState<Phase>('loading');
  // null means guest mode: the game runs but nothing is saved
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<ScoreHistoryData | null>(null);
  const [historyError, setHistoryError] = useState('');
  const [saveError, setSaveError] = useState('');
  // Prevents saving the same finished game twice
  const savedRef = useRef(false);

  const initializeGame = () => {
    // Randomly assign treasure to one box
    const treasureBoxIndex = Math.floor(Math.random() * 3);
    const newBoxes: Box[] = Array.from({ length: 3 }, (_, index) => ({
      id: index,
      isOpen: false,
      hasTreasure: index === treasureBoxIndex,
    }));
    
    setBoxes(newBoxes);
    setScore(0);
    setGameEnded(false);
  };

  const loadHistory = () => {
    api.myScores()
      .then(data => {
        setHistory(data);
        setHistoryError('');
      })
      .catch(() => setHistoryError('無法載入分數紀錄'));
  };

  // Starts a fresh game for a logged-in user, or for a guest when u is null
  const enterGame = (u: User | null) => {
    setUser(u);
    setHistory(null);
    setHistoryError('');
    setSaveError('');
    savedRef.current = false;
    initializeGame();
    setPhase('playing');
    if (u) loadHistory();
  };

  // Check for an existing session on mount; without one, start as a guest
  useEffect(() => {
    initializeGame();
    api.me()
      .then(me => enterGame(me))
      .catch(() => enterGame(null));
  }, []);

  // Save the score once per finished game, and only for logged-in users
  useEffect(() => {
    if (!gameEnded || !user || savedRef.current) return;
    savedRef.current = true;

    const treasureFound = boxes.some(box => box.isOpen && box.hasTreasure);
    api.saveScore(score, treasureFound)
      .then(() => {
        setSaveError('');
        loadHistory();
      })
      .catch(() => setSaveError('分數儲存失敗，請稍後再試'));
  }, [gameEnded]);

  // After logout, return to a fresh guest game instead of the auth screen
  const logout = async () => {
    await api.logout().catch(() => {});
    enterGame(null);
  };

  const openBox = (boxId: number) => {
    if (gameEnded) return;

    const target = boxes.find(box => box.id === boxId);
    if (!target || target.isOpen) return;

    // Treasure plays the normal chest sound; skeleton plays the evil laugh
    const sound = target.hasTreasure ? chestOpenSound : evilLaughSound;
    new Audio(sound).play().catch(() => {});

    setBoxes(prevBoxes => {
      const updatedBoxes = prevBoxes.map(box => {
        if (box.id === boxId && !box.isOpen) {
          const newScore = box.hasTreasure ? score + 150 : score - 50;
          setScore(newScore);
          return { ...box, isOpen: true };
        }
        return box;
      });
      
      // Check if treasure is found or all boxes are opened
      const treasureFound = updatedBoxes.some(box => box.isOpen && box.hasTreasure);
      const allOpened = updatedBoxes.every(box => box.isOpen);
      if (treasureFound || allOpened) {
        setGameEnded(true);
      }
      
      return updatedBoxes;
    });
  };

  const resetGame = () => {
    savedRef.current = false;
    setSaveError('');
    initializeGame();
  };

  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 flex items-center justify-center text-amber-800">
        載入中...
      </div>
    );
  }

  if (phase === 'auth') {
    return <AuthPanel onAuthenticated={enterGame} onGuest={() => enterGame(null)} />;
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 flex flex-col items-center justify-center p-8">
      <div className="absolute top-4 right-4 flex items-center gap-4 text-sm text-amber-900">
        {user ? (
          <>
            <span>👤 {user.username}</span>
            <button type="button" className="underline" onClick={logout}>登出</button>
          </>
        ) : (
          <>
            <span>訪客模式（不記錄分數）</span>
            <button type="button" className="underline" onClick={() => setPhase('auth')}>登入 / 註冊</button>
          </>
        )}
      </div>

      <div className="text-center mb-8">
        <h1 className="text-4xl mb-4 text-amber-900">🏴‍☠️ Treasure Hunt Game 🏴‍☠️</h1>
        <p className="text-amber-800 mb-4">
          Click on the treasure chests to discover what's inside!
        </p>
        <p className="text-amber-700 text-sm">
          💰 Treasure: +$150 | 💀 Skeleton: -$50
        </p>
      </div>

      <div className="mb-8">
        <div className="text-2xl text-center p-4 bg-amber-200/80 backdrop-blur-sm rounded-lg shadow-lg border-2 border-amber-400">
          <span className="text-amber-900">Current Score: </span>
          <span className={`${score >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${score}
          </span>
          {gameEnded && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              className={`block mt-2 text-lg ${
                score > 0 ? 'text-green-600' : score === 0 ? 'text-amber-700' : 'text-red-600'
              }`}
            >
              {score > 0 ? 'You Win! 🎉' : score === 0 ? 'Tie! 🤝' : 'You Lose! 💀'}
            </motion.div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {boxes.map((box) => (
              <motion.div
                key={box.id}
                className="flex flex-col items-center"
                style={{ cursor: `url(${keyCursor}) 16 16, pointer` }}
                whileHover={{ scale: box.isOpen ? 1 : 1.05 }}
                whileTap={{ scale: box.isOpen ? 1 : 0.95 }}
                onClick={() => openBox(box.id)}
              >
                <motion.div
                  initial={{ rotateY: 0 }}
                  animate={{ 
                    rotateY: box.isOpen ? 180 : 0,
                    scale: box.isOpen ? 1.1 : 1
                  }}
                  transition={{ 
                    duration: 0.6,
                    ease: "easeInOut"
                  }}
                  className="relative"
                >
                  <img
                    src={box.isOpen 
                      ? (box.hasTreasure ? treasureChest : skeletonChest)
                      : closedChest
                    }
                    alt={box.isOpen 
                      ? (box.hasTreasure ? "Treasure!" : "Skeleton!")
                      : "Treasure Chest"
                    }
                    className="w-48 h-48 object-contain drop-shadow-lg"
                  />
                  
                  {box.isOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                      className="absolute -top-8 left-1/2 transform -translate-x-1/2"
                    >
                      {box.hasTreasure ? (
                        <div className="text-2xl animate-bounce">✨💰✨</div>
                      ) : (
                        <div className="text-2xl animate-pulse">💀👻💀</div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
                
                <div className="mt-4 text-center">
                  {box.isOpen ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4, duration: 0.3 }}
                      className={`text-lg p-2 rounded-lg ${
                        box.hasTreasure 
                          ? 'bg-green-100 text-green-800 border border-green-300' 
                          : 'bg-red-100 text-red-800 border border-red-300'
                      }`}
                    >
                      {box.hasTreasure ? '+$150' : '-$50'}
                    </motion.div>
                  ) : (
                    <div className="text-amber-700 p-2">
                      Click to open!
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
      </div>

      {gameEnded && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <div className="mb-4 p-6 bg-amber-200/80 backdrop-blur-sm rounded-xl shadow-lg border-2 border-amber-400">
                <h2 className="text-2xl mb-2 text-amber-900">Game Over!</h2>
                <p className="text-lg text-amber-800">
                  Final Score: <span className={`${score >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${score}
                  </span>
                </p>
                <p className="text-sm text-amber-600 mt-2">
                  {boxes.some(box => box.isOpen && box.hasTreasure) 
                    ? 'Treasure found! Well done, treasure hunter! 🎉' 
                    : 'No treasure found this time! Better luck next time! 💀'}
                </p>
                {!user && (
                  <p className="text-sm text-amber-700 mt-2">訪客模式，本局不會記錄分數</p>
                )}
                {saveError && <p className="text-sm text-red-600 mt-2">{saveError}</p>}
              </div>

              <Button
                onClick={resetGame}
                className="text-lg px-8 py-4 bg-amber-600 hover:bg-amber-700 text-white"
              >
                Play Again
              </Button>
            </motion.div>
          )}

      {user && (
        <div className="mt-4">
          <ScoreHistory history={history} error={historyError} />
        </div>
      )}
    </div>
  );
}
