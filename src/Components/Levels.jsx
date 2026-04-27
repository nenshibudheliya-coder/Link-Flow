import React from 'react';
import { LEVELS } from '../data/levels';
import { CircuitBackground } from './Home';
import '../css/Levels.css';
import '../css/link.css';

export default function Levels({ onSelectLevel, onBack, unlockedLevel }) {
    return (
        <div className="levels-container">
            {/* Background elements inherited from link.css and Home.jsx for consistency */}
            <CircuitBackground />
            <div className="scanline-bg" />
            <div className="scanline-anim" />

            {/* <button className="back-btn" onClick={onBack}>
                ⟵ BACK
            </button> */}

            <h1 className="levels-title">SELECT LEVEL</h1>
            <div className="levels-grid">
                {LEVELS.map((level, i) => {
                    const isLocked = i > unlockedLevel;
                    return (
                        <div
                            key={i}
                            className={`level-card ${isLocked ? 'locked' : ''}`}
                            onClick={() => !isLocked && onSelectLevel(i)}
                        >
                            <div className="level-number">
                                {isLocked ? '🔒' : i + 1}
                            </div>
                            {/* <div className="level-size">{level.size}x{level.size}</div> */}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
