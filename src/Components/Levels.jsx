import React, { useState, useEffect } from 'react';
import { LEVELS } from '../data/levels';
import { CircuitBackground } from './Home';
import '../css/Levels.css';
import '../css/link.css';
import '../css/Home.css';

export default function Levels({ onSelectLevel, onBack, unlockedLevel }) {
    const [isLaptop, setIsLaptop] = useState(window.innerWidth >= 1024);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 600);
    const [currentPage, setCurrentPage] = useState(0);
    const levelsPerPage = isMobile ? 30 : 12; // 30 levels for mobile (5x6), 12 for tablet+laptop (4x3)

    useEffect(() => {
        const handleResize = () => {
            setIsLaptop(window.innerWidth >= 1024);
            setIsMobile(window.innerWidth <= 600);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const startIndex = currentPage * levelsPerPage;
    const displayLevels = LEVELS.slice(startIndex, startIndex + levelsPerPage);
    const totalPages = Math.ceil(LEVELS.length / levelsPerPage);

    const handleNext = () => {
        if (currentPage < totalPages - 1) setCurrentPage(prev => prev + 1);
    };

    const handlePrev = () => {
        if (currentPage > 0) setCurrentPage(prev => prev - 1);
    };

    return (
        <div className="levels-container image-theme">
            <CircuitBackground />
            <div className="star-pattern-bg" style={{ opacity: 0.05 }} />

            {/* Scanline overlay from Home page */}
            <div style={{
                position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",
                background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,180,255,0.02) 2px,rgba(0,180,255,0.02) 4px)",
            }} />

            {/* Corner Frames from Home page */}
            <div className="corner-frame top-left" style={{ zIndex: 1 }} />
            <div className="corner-frame bottom-right" style={{ bottom: 40, right: 40, top: 'auto', left: 'auto', transform: 'rotate(180deg)', zIndex: 1 }} />
            
            <h1 className="levels-title-image">SELECT LEVEL</h1>

            <div className={`levels-grid-image ${isLaptop ? 'laptop' : 'tablet'}`}>
                {displayLevels.map((level, i) => {
                    const actualIndex = startIndex + i;
                    const isLocked = actualIndex > unlockedLevel;
                    return (
                        <div
                            key={actualIndex}
                            className={`level-card-image ${isLocked ? 'locked' : ''}`}
                            onClick={() => !isLocked && onSelectLevel(actualIndex)}
                        >
                            {/* <div className="card-dot" /> */}
                            <div className="level-number-image">
                                {isLocked ? '🔒' : actualIndex + 1}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="pagination-image-controls">
                <button
                    className={`nav-btn-image ${currentPage === 0 ? 'disabled' : ''}`}
                    onClick={handlePrev}
                    disabled={currentPage === 0}
                >
                    <span className="arrow-left">◄</span> PREV
                </button>

                <div className="page-indicator">
                    {currentPage + 1} / {totalPages}
                </div>

                <button
                    className={`nav-btn-image ${currentPage === totalPages - 1 ? 'disabled' : ''}`}
                    onClick={handleNext}
                    disabled={currentPage === totalPages - 1}
                >
                    NEXT <span className="arrow-right">►</span>
                </button>
            </div>
        </div>
    );
}
