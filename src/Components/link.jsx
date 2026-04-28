import { useState, useCallback, useEffect, useRef, memo } from "react";
import { LEVELS } from "../data/levels";
import "../css/link.css";

// ─── Color definitions ────────────────────────────────────────────────────────
const COLOR_MAP = {
    red: { fill: "#e53935", bg: "#e5393522", border: "#ff6659" },
    blue: { fill: "#1e88e5", bg: "#1e88e522", border: "#6ab7ff" },
    green: { fill: "#43a047", bg: "#43a04722", border: "#76d275" },
    yellow: { fill: "#fdd835", bg: "#fdd83522", border: "#ffff6b" },
    orange: { fill: "#fb8c00", bg: "#fb8c0022", border: "#ffbd45" },
    pink: { fill: "#e91e63", bg: "#e91e6322", border: "#ff6090" },
    purple: { fill: "#8e24aa", bg: "#8e24aa22", border: "#c158dc" },
    brown: { fill: "#6d4c41", bg: "#6d4c4122", border: "#9c786c" },
    maroon: { fill: "#b71c1c", bg: "#b71c1c22", border: "#f05545" },
    teal: { fill: "#00897b", bg: "#00897b22", border: "#4ebaaa" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function posKey(r, c) { return `${r},${c}`; }
function inPath(path, r, c) { return path.some(([pr, pc]) => pr === r && pc === c); }
function isAdj([r1, c1], [r2, c2]) { return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1; }

function buildDotMap(dots) {
    const m = {};
    dots.forEach(({ color, pos }) => { m[posKey(pos[0], pos[1])] = color; });
    return m;
}
function buildPairs(dots) {
    const p = {};
    dots.forEach(({ color, pos }) => { if (!p[color]) p[color] = []; p[color].push(pos); });
    return p;
}
function isPathComplete(path, ep) {
    if (!path || path.length < 2 || !ep || ep.length < 2) return false;
    const [e1, e2] = ep, s = path[0], e = path[path.length - 1];
    return (
        ((s[0] === e1[0] && s[1] === e1[1]) || (s[0] === e2[0] && s[1] === e2[1])) &&
        ((e[0] === e1[0] && e[1] === e1[1]) || (e[0] === e2[0] && e[1] === e2[1]))
    );
}
function checkWin(paths, dots, size) {
    const pairs = buildPairs(dots);
    for (const c of Object.keys(pairs))
        if (!isPathComplete(paths[c], pairs[c])) return false;
    let used = 0;
    for (const c of Object.keys(pairs)) if (paths[c]) used += paths[c].length;
    return used === size * size;
}

// ─── Canvas renderer ──────────────────────────────────────────────────────────
// This draws EXACTLY like the video:
// - filled colored rectangles for path cells
// - large round dots for endpoints
// - subtle grid
function drawGame(canvas, g, CELL, SIZE) {
    if (!canvas || !g) return;
    const ctx = canvas.getContext("2d");
    const W = SIZE * CELL, H = SIZE * CELL;

    // Clear with semi-transparent background to let circuit show through
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(10, 15, 25, 0.75)";
    ctx.fillRect(0, 0, W, H);

    // Draw filled path cells (background tint) — like video
    for (const [color, path] of Object.entries(g.paths)) {
        if (!path || path.length === 0) continue;
        const col = COLOR_MAP[color] || { fill: "#fff", bg: "#ffffff22" };
        ctx.fillStyle = col.bg.replace("22", "44"); // slightly more visible
        for (const [r, c] of path) {
            ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
        }
    }

    // Draw grid lines (subtle cyan glow)
    ctx.strokeStyle = "rgba(0, 180, 255, 0.08)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= SIZE; i++) {
        ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(W, i * CELL); ctx.stroke();
    }

    // Draw path tubes (thick rounded line through cell centers)
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const [color, path] of Object.entries(g.paths)) {
        if (!path || path.length < 2) continue;
        const col = COLOR_MAP[color] || { fill: "#fff" };
        ctx.strokeStyle = col.fill;
        ctx.lineWidth = CELL * 0.28;
        ctx.beginPath();
        ctx.moveTo(path[0][1] * CELL + CELL / 2, path[0][0] * CELL + CELL / 2);
        for (let i = 1; i < path.length; i++)
            ctx.lineTo(path[i][1] * CELL + CELL / 2, path[i][0] * CELL + CELL / 2);
        ctx.stroke();
    }

    // Draw endpoint dots (large circles like video)
    for (const [key, color] of Object.entries(g.dotMap)) {
        const [r, c] = key.split(",").map(Number);
        const col = COLOR_MAP[color] || { fill: "#fff", border: "#fff" };
        const cx = c * CELL + CELL / 2;
        const cy = r * CELL + CELL / 2;
        const R = CELL * 0.26;

        // Outer ring
        ctx.beginPath();
        ctx.arc(cx, cy, R + 2, 0, Math.PI * 2);
        ctx.strokeStyle = col.border + "aa";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Solid filled circle
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fillStyle = col.fill;
        ctx.fill();

        // Small white specular highlight (top-left)
        ctx.beginPath();
        ctx.arc(cx - R * 0.28, cy - R * 0.28, R * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fill();
    }
}

// ─── Animated circuit background (from Home) ─────────────────────────────────
const CircuitBackground = memo(() => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d", { alpha: false });
        let raf;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener("resize", resize);

        const NODE_COUNT = 15;
        const nodes = Array.from({ length: NODE_COUNT }, () => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            r: 2 + Math.random() * 2,
            color: ["#00b4ff", "#00e676", "#ffe600", "#ff3b5c", "#d500f9"][Math.floor(Math.random() * 5)],
            pulse: Math.random() * Math.PI * 2,
        }));

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            grad.addColorStop(0, "#020812");
            grad.addColorStop(0.5, "#050f20");
            grad.addColorStop(1, "#020812");
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.strokeStyle = "rgba(0,180,255,0.05)";
            ctx.lineWidth = 1;
            const gStep = 50;
            for (let x = 0; x < canvas.width; x += gStep) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
            }
            for (let y = 0; y < canvas.height; y += gStep) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
            }

            nodes.forEach(n => {
                n.x += n.vx; n.y += n.vy; n.pulse += 0.03;
                if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
                if (n.y < 0 || n.y > canvas.height) n.vy *= -1;

                const pulse = 0.7 + 0.3 * Math.sin(n.pulse);
                ctx.beginPath(); ctx.arc(n.x, n.y, n.r * pulse, 0, Math.PI * 2);
                ctx.fillStyle = n.color; ctx.fill();
            });

            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const a = nodes[i], b = nodes[j];
                    const dist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
                    if (dist < 180) {
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(a.x, b.y);
                        ctx.lineTo(b.x, b.y);
                        ctx.strokeStyle = `rgba(0,180,255,${(1 - dist / 180) * 0.15})`;
                        ctx.stroke();
                    }
                }
            }
            raf = requestAnimationFrame(draw);
        };
        draw();
        return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
    }, []);

    return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 0 }} />;
});

// ─── High-Tech Trophy Icon ────────────────────────────────────────────────────
// ─── Perfect Cyber Trophy Icon ────────────────────────────────────────────────
const TrophyIcon = memo(() => {
    return (
        <div className="trophy-wrapper" style={{ width: 140, height: 140, position: "relative" }}>
            <svg viewBox="0 0 200 200" className="trophy-svg" style={{ overflow: "visible" }}>
                <defs>
                    <linearGradient id="cupGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#00e676" />
                        <stop offset="50%" stopColor="#00b4ff" />
                        <stop offset="100%" stopColor="#00e676" />
                    </linearGradient>
                    <filter id="neonGlow">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <clipPath id="cupClip">
                        <path d="M60 40 L140 40 L130 110 Q100 130 70 110 Z" />
                    </clipPath>
                </defs>

                {/* Outer Holographic Rings */}
                <g opacity="0.4">
                    <circle cx="100" cy="100" r="85" fill="none" stroke="#00b4ff" strokeWidth="1" strokeDasharray="10 5">
                        <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="20s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="100" cy="100" r="75" fill="none" stroke="#00e676" strokeWidth="0.5">
                        <animateTransform attributeName="transform" type="rotate" from="360 100 100" to="0 100 100" dur="15s" repeatCount="indefinite" />
                    </circle>
                </g>

                {/* The Cup Handles */}
                <path d="M60 55 Q40 55 45 85 Q50 100 65 95" fill="none" stroke="#00e676" strokeWidth="4" filter="url(#neonGlow)" opacity="0.8" />
                <path d="M140 55 Q160 55 155 85 Q150 100 135 95" fill="none" stroke="#00e676" strokeWidth="4" filter="url(#neonGlow)" opacity="0.8" />

                {/* The Cup Base & Stem */}
                <path d="M85 130 L115 130 L110 160 L90 160 Z" fill="#0a1a2a" stroke="#00b4ff" strokeWidth="2" />
                <path d="M70 160 L130 160 L140 175 L60 175 Z" fill="#0a1a2a" stroke="#00b4ff" strokeWidth="2" />

                {/* The Main Cup Body */}
                <path d="M60 40 L140 40 L130 110 Q100 130 70 110 Z" fill="rgba(2,8,18,0.9)" stroke="url(#cupGrad)" strokeWidth="3" filter="url(#neonGlow)">
                    <animate attributeName="stroke-width" values="2;4;2" dur="3s" repeatCount="indefinite" />
                </path>

                {/* Liquid / Flowing Energy Inside */}
                <g clipPath="url(#cupClip)">
                    <path d="M50 80 Q100 70 150 80 L150 130 L50 130 Z" fill="rgba(0,180,255,0.2)">
                        <animate attributeName="d"
                            values="M50 80 Q100 70 150 80 L150 130 L50 130 Z; M50 75 Q100 85 150 75 L150 130 L50 130 Z; M50 80 Q100 70 150 80 L150 130 L50 130 Z"
                            dur="4s" repeatCount="indefinite" />
                    </path>
                    {/* Circuit lines on cup */}
                    <path d="M80 50 V100 M120 50 V100 M60 70 H140" stroke="#00e676" strokeWidth="0.5" opacity="0.3" />
                </g>

                {/* Glowing Core Particle */}
                <circle cx="100" cy="70" r="6" fill="#fff" filter="url(#neonGlow)">
                    <animate attributeName="r" values="4;8;4" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
                </circle>

                {/* Victory Sparkles */}
                {[...Array(5)].map((_, i) => (
                    <circle key={i} r="2" fill="#fff">
                        <animate attributeName="cx" values={`${100 + (i - 2) * 30}; ${100 + (i - 2) * 35}; ${100 + (i - 2) * 30}`} dur={`${2 + i}s`} repeatCount="indefinite" />
                        <animate attributeName="cy" values={`${50 + (i % 3) * 20}; ${40 + (i % 3) * 20}; ${50 + (i % 3) * 20}`} dur={`${2 + i}s`} repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0;1;0" dur={`${2 + i}s`} repeatCount="indefinite" />
                    </circle>
                ))}
            </svg>
        </div>
    );
});


// ─── Win confetti ─────────────────────────────────────────────────────────────
const WinConfetti = memo(() => {
    const items = useRef(Array.from({ length: 48 }, (_, i) => ({
        left: Math.random() * 100,
        w: 7 + Math.random() * 7, h: 7 + Math.random() * 7,
        color: Object.values(COLOR_MAP)[i % 10].fill,
        round: Math.random() > 0.4,
        dur: 2.2 + Math.random() * 2.5,
        delay: Math.random() * 4,
    }))).current;
    return <>{items.map((it, i) => (
        <div key={i} style={{
            position: "absolute", top: "-10%", left: `${it.left}%`,
            width: it.w, height: it.h, background: it.color,
            borderRadius: it.round ? "50%" : 2,
            animation: `confetti ${it.dur}s -${it.delay}s linear infinite`,
            willChange: "transform",
        }} />
    ))}</>;
});

// ─── Main Game ────────────────────────────────────────────────────────────────
export default function LinkGame({ onHome, initialLevel = 0, onWin }) {
    const [levelIdx, setLevelIdx] = useState(initialLevel);
    const level = LEVELS[levelIdx];
    const SIZE = level.size;

    // Responsive cell size
    const [CELL, setCell] = useState(60);
    useEffect(() => {
        const calc = () => {
            const maxW = Math.min(window.innerWidth - 32, 480);
            const maxH = window.innerHeight - 200;
            setCell(Math.max(36, Math.floor(Math.min(maxW, maxH) / SIZE)));
        };
        calc();
        window.addEventListener("resize", calc);
        return () => window.removeEventListener("resize", calc);
    }, [SIZE]);

    // All game state in one ref — ZERO React re-renders during drawing
    const gRef = useRef(null);
    const canvasRef = useRef(null);
    const overlayRef = useRef(null);
    const CELL_r = useRef(CELL);
    const SIZE_r = useRef(SIZE);
    CELL_r.current = CELL;
    SIZE_r.current = SIZE;
    const isDown = useRef(false);

    // React state only for UI stats + win
    const [stats, setStats] = useState({ flows: 0, total: 0, moves: 0, pipe: 0 });
    const [won, setWon] = useState(false);
    const [celebration, setCelebration] = useState(false);
    const [transitionClass, setTransitionClass] = useState("");

    // ── Init ─────────────────────────────────────────────────────────────────
    const initGame = useCallback(() => {
        const dotMap = buildDotMap(level.dots);
        const pairs = buildPairs(level.dots);
        gRef.current = { paths: {}, drawing: null, dotMap, pairs, won: false, moves: 0 };
        setStats({ flows: 0, total: Object.keys(pairs).length, moves: 0, pipe: 0 });
        setWon(false);
        setCelebration(false);
        setTimeout(() => drawGame(canvasRef.current, gRef.current, CELL_r.current, SIZE_r.current), 0);
    }, [level]);

    useEffect(() => { initGame(); }, [initGame]);

    // ── Redraw + stats update ────────────────────────────────────────────────
    const redraw = useCallback(() => {
        const g = gRef.current;
        if (!g) return;
        const CELL = CELL_r.current, SIZE = SIZE_r.current;
        drawGame(canvasRef.current, g, CELL, SIZE);

        // Compute stats
        const { pairs } = g;
        const flows = Object.keys(pairs).filter(c => isPathComplete(g.paths[c], pairs[c])).length;
        const used = new Set();
        Object.values(g.paths).forEach(p => p && p.forEach(([r, c]) => used.add(posKey(r, c))));
        const pipe = Math.round(used.size / (SIZE * SIZE) * 100);
        setStats({ flows, total: Object.keys(pairs).length, moves: g.moves, pipe });
    }, []);

    useEffect(() => { if (gRef.current) redraw(); }, [redraw, CELL]);

    // ── Drawing logic ─────────────────────────────────────────────────────────
    const startDraw = useCallback((r, c) => {
        const g = gRef.current;
        if (!g || g.won) return;
        const { dotMap, paths } = g;
        const dotColor = dotMap[posKey(r, c)];
        let cellColor = null;
        for (const [col, path] of Object.entries(paths))
            if (inPath(path, r, c)) { cellColor = col; break; }

        if (dotColor) {
            const np = { ...paths, [dotColor]: [[r, c]] };
            // Clear other paths at this dot
            for (const col of Object.keys(np))
                if (col !== dotColor && inPath(np[col] || [], r, c)) {
                    const p = np[col], ci = p.findIndex(([pr, pc]) => pr === r && pc === c);
                    np[col] = ci >= 0 ? p.slice(0, ci) : [];
                }
            g.paths = np; g.drawing = dotColor; g.moves++;
            redraw();
        } else if (cellColor) {
            const path = paths[cellColor] || [];
            const idx = path.findIndex(([pr, pc]) => pr === r && pc === c);
            g.paths = { ...paths, [cellColor]: idx >= 0 ? path.slice(0, idx + 1) : [...path] };
            g.drawing = cellColor;
            redraw();
        }
    }, [redraw]);

    const continueDraw = useCallback((r, c) => {
        const g = gRef.current;
        if (!g || !g.drawing || g.won) return;
        const { drawing: color, paths, dotMap } = g;
        const path = paths[color] || [];
        if (!path.length) return;
        const last = path[path.length - 1];
        if (last[0] === r && last[1] === c) return;

        // Backtrack
        if (path.length >= 2) {
            const prev = path[path.length - 2];
            if (prev[0] === r && prev[1] === c) {
                g.paths = { ...paths, [color]: path.slice(0, -1) };
                redraw(); return;
            }
        }

        // Interpolate for fast drag
        const dr = r - last[0], dc = c - last[1];
        if (Math.abs(dr) + Math.abs(dc) > 1) {
            if (dr === 0 || dc === 0) {
                const steps = Math.max(Math.abs(dr), Math.abs(dc));
                const sr = Math.sign(dr), sc = Math.sign(dc);
                let cr = last[0], cc = last[1];
                const added = [];
                for (let i = 1; i <= steps; i++) {
                    const nr = cr + sr, nc = cc + sc;
                    if (dotMap[posKey(nr, nc)] && dotMap[posKey(nr, nc)] !== color) break;
                    if (inPath(path, nr, nc)) break;
                    added.push([nr, nc]); cr = nr; cc = nc;
                }
                if (added.length > 0) {
                    const np = { ...paths, [color]: [...path, ...added] };
                    for (const [pr, pc] of added)
                        for (const col of Object.keys(np))
                            if (col !== color && inPath(np[col] || [], pr, pc)) {
                                const p = np[col], ci = p.findIndex(([r2, c2]) => r2 === pr && c2 === pc);
                                np[col] = ci >= 0 ? p.slice(0, ci) : [];
                            }
                    g.paths = np;
                    const lp = added[added.length - 1];
                    if (dotMap[posKey(lp[0], lp[1])] === color) g.drawing = null;
                    redraw();
                    if (checkWin(np, level.dots, SIZE_r.current)) {
                        g.won = true; setWon(true);
                        setTimeout(() => setCelebration(true), 300);
                    }
                    return;
                }
            }
            return;
        }

        if (!isAdj(last, [r, c]) || inPath(path, r, c)) return;
        const dotColor = dotMap[posKey(r, c)];
        if (dotColor && dotColor !== color) return;

        const np = { ...paths };
        for (const col of Object.keys(np))
            if (col !== color && inPath(np[col] || [], r, c)) {
                const p = np[col], ci = p.findIndex(([pr, pc]) => pr === r && pc === c);
                np[col] = ci >= 0 ? p.slice(0, ci) : [];
            }
        np[color] = [...path, [r, c]];
        if (dotColor === color) g.drawing = null;
        g.paths = np;
        redraw();

        if (checkWin(np, level.dots, SIZE_r.current)) {
            g.won = true; setWon(true);
            setTimeout(() => setCelebration(true), 300);
        }
    }, [level, levelIdx, onWin, redraw]);

    const endDraw = useCallback(() => {
        if (gRef.current) gRef.current.drawing = null;
        isDown.current = false;
    }, []);

    // ── getCellAt ─────────────────────────────────────────────────────────────
    const getCellAt = useCallback((clientX, clientY) => {
        const el = overlayRef.current;
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const c = Math.floor((clientX - rect.left) / CELL_r.current);
        const r = Math.floor((clientY - rect.top) / CELL_r.current);
        const sz = SIZE_r.current;
        if (r < 0 || r >= sz || c < 0 || c >= sz) return null;
        return [r, c];
    }, []);

    // ── Touch (passive:false via useEffect) ───────────────────────────────────
    useEffect(() => {
        const el = overlayRef.current;
        if (!el) return;
        const onTS = e => { e.preventDefault(); const t = e.touches[0]; const cell = getCellAt(t.clientX, t.clientY); if (cell) { isDown.current = true; startDraw(cell[0], cell[1]); } };
        const onTM = e => { e.preventDefault(); const t = e.touches[0]; const cell = getCellAt(t.clientX, t.clientY); if (cell) continueDraw(cell[0], cell[1]); };
        const onTE = () => endDraw();
        el.addEventListener("touchstart", onTS, { passive: false });
        el.addEventListener("touchmove", onTM, { passive: false });
        el.addEventListener("touchend", onTE, { passive: false });
        return () => { el.removeEventListener("touchstart", onTS); el.removeEventListener("touchmove", onTM); el.removeEventListener("touchend", onTE); };
    }, [getCellAt, startDraw, continueDraw, endDraw]);

    // ── Mouse ────────────────────────────────────────────────────────────────
    const onMD = useCallback(e => { isDown.current = true; const cell = getCellAt(e.clientX, e.clientY); if (cell) startDraw(cell[0], cell[1]); }, [getCellAt, startDraw]);
    const onMM = useCallback(e => { if (!isDown.current) return; const cell = getCellAt(e.clientX, e.clientY); if (cell) continueDraw(cell[0], cell[1]); }, [getCellAt, continueDraw]);
    const onMU = useCallback(() => endDraw(), [endDraw]);
    const onML = useCallback(() => endDraw(), [endDraw]);

    const gridPx = SIZE * CELL;

    return (
        <div style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            <CircuitBackground />

            {/* Scanline overlay */}
            <div style={{
                position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",
                background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 4px)",
            }} />
            <div style={{
                position: "fixed", top: 0, left: 0, right: 0, height: "3px", zIndex: 1, pointerEvents: "none",
                background: "linear-gradient(90deg,transparent,rgba(0,180,255,0.15),transparent)",
                animation: "scanline 6s linear infinite",
            }} />

            {/* Content layer */}
            <div className={transitionClass} style={{ position: "relative", zIndex: 1, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 16px", boxSizing: "border-box" }}>

                {/* Top bar — back + level + reset */}
                <div style={{ width: "100%", maxWidth: gridPx + 16, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <button onClick={onHome} style={btnStyle("#555")}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5" /><polyline points="12 19 5 12 12 5" />
                        </svg>
                    </button>

                    <span style={{ color: "#00b4ff", fontSize: 18, fontWeight: 900, letterSpacing: 4, fontFamily: "'Exo 2', sans-serif", textTransform: "uppercase", textShadow: "0 0 10px rgba(0,180,255,0.4)" }}>
                        level {levelIdx + 1}
                    </span>

                    <button onClick={initGame} style={btnStyle("#555")}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 4 23 10 17 10" />
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                        </svg>
                    </button>
                </div>

                {/* Stats bar — Optimized width and background matching */}
                <div style={{
                    width: "100%",
                    maxWidth: gridPx * 0.9,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                    padding: "8px 16px",
                    boxSizing: "border-box",
                    background: "rgba(0,180,255,0.05)",
                    borderRadius: 10,
                    border: "1px solid #1a3a4a",
                    backdropFilter: "blur(4px)"
                }}>
                    <StatItem label="flows" value={`${stats.flows}/${stats.total}`} />
                    <div style={{ width: 1, height: 24, background: "#1a3a4a" }} />
                    <StatItem label="moves" value={stats.moves} />
                    <div style={{ width: 1, height: 24, background: "#1a3a4a" }} />
                    <StatItem label="pipe" value={`${stats.pipe}%`} />
                </div>

                <div style={{
                    position: "relative",
                    borderRadius: 12,
                    overflow: "hidden",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid #1a3a4a",
                    boxShadow: "0 0 40px rgba(0,0,0,0.6), inset 0 0 20px rgba(0,180,255,0.05)",
                    lineHeight: 0,
                }}>
                    {/* Canvas — renders everything */}
                    <canvas ref={canvasRef} width={gridPx} height={gridPx} style={{ display: "block" }} />

                    {/* Invisible touch/mouse overlay */}
                    <div
                        ref={overlayRef}
                        style={{
                            position: "absolute", inset: 0,
                            cursor: "crosshair",
                            userSelect: "none",
                            WebkitUserSelect: "none",
                            touchAction: "none",
                        }}
                        onMouseDown={onMD}
                        onMouseMove={onMM}
                        onMouseUp={onMU}
                        onMouseLeave={onML}
                    />
                </div>

                {/* Level nav */}
                {/* <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                    {levelIdx > 0 && (
                        <button onClick={() => setLevelIdx(i => i - 1)} style={btnStyle("#1e88e5")}>
                            ← prev
                        </button>
                    )}
                    {levelIdx < LEVELS.length - 1 && (
                        <button onClick={() => setLevelIdx(i => i + 1)} style={btnStyle("#43a047")}>
                            next →
                        </button>
                    )}
                </div> */}
            </div>

            {/* Unique Tech Win Overlay */}
            {celebration && (
                <div className="win-overlay" style={{ background: "rgba(2,8,18,0.94)" }}>
                    <WinConfetti />

                    <div className="win-dialog" style={{
                        textAlign: "center",
                        padding: "48px 56px",
                        position: "relative",
                        zIndex: 2
                    }}>

                        <div className="win-ring" style={{ width: 160, height: 160, marginBottom: 32 }}>
                            <TrophyIcon />
                        </div>

                        <div style={{ position: "relative", zIndex: 2 }}>
                            <div style={{
                                color: "#00e676",
                                fontSize: 11,
                                letterSpacing: 5,
                                fontWeight: 700,
                                marginBottom: 12,
                                textTransform: "uppercase",
                                fontFamily: "'Share Tech Mono', monospace"
                            }}>
                                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#00e676", marginRight: 8, verticalAlign: "middle" }}>
                                    <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" />
                                </span>
                                {/* System Synchronized */}
                            </div>

                            <div className="win-title" style={{ fontSize: 48, letterSpacing: 10, color: "#fff", textShadow: "0 0 30px rgba(0,180,255,0.4)" }}>SOLVED</div>

                            <div style={{ display: "flex", justifyContent: "center", gap: 32, margin: "24px 0 40px" }}>
                                <div style={{ textAlign: "left" }}>
                                    <div style={{ color: "#2a6a7a", fontSize: 9, letterSpacing: 2, textTransform: "uppercase" }}>Complexity</div>
                                    <div style={{ color: "#00b4ff", fontSize: 20, fontWeight: 700, fontFamily: "'Exo 2', sans-serif" }}>{stats.total} Flows</div>
                                </div>
                                <div style={{ width: 1, height: 35, background: "rgba(255,255,255,0.1)" }} />
                                <div style={{ textAlign: "left" }}>
                                    <div style={{ color: "#2a6a7a", fontSize: 9, letterSpacing: 2, textTransform: "uppercase" }}>Optimization</div>
                                    <div style={{ color: "#00b4ff", fontSize: 20, fontWeight: 700, fontFamily: "'Exo 2', sans-serif" }}>{stats.moves} Steps</div>
                                </div>
                            </div>

                            <div className="win-actions" style={{ marginTop: 0 }}>
                                <button onClick={() => { setCelebration(false); initGame(); }} className="win-btn reset" style={{
                                    background: "rgba(255,59,92,0.1)", border: "1px solid #ff3b5c",
                                    color: "#ff3b5c", padding: "14px 32px", borderRadius: 10,
                                    cursor: "pointer", fontFamily: "'Exo 2', sans-serif", fontWeight: 700,
                                    letterSpacing: 3, fontSize: 13, textTransform: "uppercase"
                                }}>
                                    ↺ Restart
                                </button>
                                <button onClick={() => {
                                    if (onWin) onWin(levelIdx); // This unlocks the next level ONLY when clicking this button
                                    setCelebration(false);
                                    setTransitionClass("level-flip-exit");
                                    setTimeout(() => {
                                        setLevelIdx(i => i < LEVELS.length - 1 ? i + 1 : 0);
                                        setTransitionClass("level-flip-enter");
                                        setTimeout(() => setTransitionClass(""), 400);
                                    }, 400);
                                }} className="win-btn next" style={{
                                    background: "rgba(0,230,118,0.1)", border: "1px solid #00e676",
                                    color: "#00e676", padding: "14px 32px", borderRadius: 10,
                                    cursor: "pointer", fontFamily: "'Exo 2', sans-serif", fontWeight: 700,
                                    letterSpacing: 3, fontSize: 13, textTransform: "uppercase"
                                }}>
                                    Next ⟶
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

// ─── Small helpers ────────────────────────────────────────────────────────────
function StatItem({ label, value }) {
    return (
        <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ color: "#2a6a7a", fontSize: 9, fontFamily: "'Share Tech Mono', monospace", textTransform: "uppercase", letterSpacing: 2, marginBottom: 2 }}>{label}</div>
            <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, fontFamily: "'Exo 2', sans-serif" }}>{value}</div>
        </div>
    );
}

function btnStyle(color) {
    return {
        background: "rgba(255,255,255,0.07)",
        border: `1px solid ${color}66`,
        color: "#ccc",
        padding: "8px 14px",
        borderRadius: 8,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 4,
        fontSize: 13,
        fontFamily: "sans-serif",
        transition: "background 0.15s",
    };
}