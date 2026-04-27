import { useState } from 'react'
import Link from './Components/link.jsx'
import Home from './Components/Home.jsx'
import Levels from './Components/Levels.jsx'
import './App.css'

function App() {
  const [view, setView] = useState('home'); // 'home', 'levels', 'game'
  const [selectedLevel, setSelectedLevel] = useState(0);
  const [unlockedLevel, setUnlockedLevel] = useState(() => {
    return parseInt(localStorage.getItem('unlockedLevel') || '0');
  });

  const handleWin = (levelIdx) => {
    if (levelIdx === unlockedLevel) {
      const nextLevel = levelIdx + 1;
      setUnlockedLevel(nextLevel);
      localStorage.setItem('unlockedLevel', nextLevel.toString());
    }
  };

  return (
    <>
      {view === 'home' && <Home onPlay={() => setView('levels')} />}
      {view === 'levels' && (
        <Levels
          unlockedLevel={unlockedLevel}
          onSelectLevel={(idx) => { setSelectedLevel(idx); setView('game'); }}
          onBack={() => setView('home')}
        />
      )}
      {view === 'game' && (
        <Link
          initialLevel={selectedLevel}
          onHome={() => setView('levels')}
          onWin={handleWin}
        />
      )}
    </>
  )
}
export default App