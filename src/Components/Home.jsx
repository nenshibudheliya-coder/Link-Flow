import { useEffect, useRef, memo } from "react";
import "../css/Home.css";

export const CircuitBackground = memo(() => {
    const canvasRef = useRef(null);
    const mouse = useRef({ x: -1000, y: -1000 });

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

        const handleMouseMove = (e) => {
            mouse.current = { x: e.clientX, y: e.clientY };
        };
        window.addEventListener("mousemove", handleMouseMove);

        const NODE_COUNT = 24;
        const nodes = Array.from({ length: NODE_COUNT }, () => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            r: 1 + Math.random() * 2,
            color: ["#00b4ff", "#00e676", "#ffe600", "#ff3b5c", "#d500f9"][Math.floor(Math.random() * 5)],
            pulse: Math.random() * Math.PI * 2,
        }));

        const draw = () => {
            ctx.fillStyle = "#020812";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Subtle Grid
            ctx.strokeStyle = "rgba(0,180,255,0.03)";
            ctx.lineWidth = 1;
            for (let x = 0; x < canvas.width; x += 60) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
            }
            for (let y = 0; y < canvas.height; y += 60) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
            }

            nodes.forEach(n => {
                // Mouse interaction
                const dx = n.x - mouse.current.x;
                const dy = n.y - mouse.current.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 150) {
                    const angle = Math.atan2(dy, dx);
                    const force = (150 - dist) * 0.005;
                    n.vx += Math.cos(angle) * force;
                    n.vy += Math.sin(angle) * force;
                }

                n.x += n.vx; n.y += n.vy;
                n.vx *= 0.98; n.vy *= 0.98; // Friction
                n.vx += (Math.random() - 0.5) * 0.02;
                n.vy += (Math.random() - 0.5) * 0.02;

                n.pulse += 0.02;
                if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
                if (n.y < 0 || n.y > canvas.height) n.vy *= -1;

                const pulse = 0.8 + 0.2 * Math.sin(n.pulse);
                ctx.beginPath(); ctx.arc(n.x, n.y, n.r * pulse, 0, Math.PI * 2);
                ctx.fillStyle = n.color;
                ctx.shadowBlur = 10;
                ctx.shadowColor = n.color;
                ctx.fill();
                ctx.shadowBlur = 0;
            });

            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const a = nodes[i], b = nodes[j];
                    const dist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
                    if (dist < 220) {
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        if (i % 2 === 0) {
                            ctx.lineTo(a.x, b.y);
                        } else {
                            ctx.lineTo(b.x, a.y);
                        }
                        ctx.lineTo(b.x, b.y);
                        ctx.strokeStyle = `rgba(0,180,255,${(1 - dist / 220) * 0.12})`;
                        ctx.stroke();
                    }
                }
            }

            raf = requestAnimationFrame(draw);
        };
        draw();
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("resize", resize);
            window.removeEventListener("mousemove", handleMouseMove);
        };
    }, []);

    return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 0 }} />;
});

export default function Home({ onPlay }) {
    return (
        <div style={{
            minHeight: "100vh", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            fontFamily: "'Share Tech Mono', monospace",
            userSelect: "none", position: "relative", overflow: "hidden",
            color: "#fff", background: "#020812"
        }}>

            <CircuitBackground />

            {/* Corner Frames */}
            {/* <div className="corner-frame top-left" />
            <div className="corner-frame bottom-right" style={{ bottom: 40, right: 40, top: 'auto', left: 'auto', transform: 'rotate(180deg)' }} /> */}

            {/* Decorative Side Bars */}
            {/* <div style={{ position: 'fixed', left: 40, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {[1, 2, 3].map(i => <div key={i} style={{ width: 2, height: 40, background: 'rgba(0,180,255,0.2)' }} />)}
            </div>
            <div style={{ position: 'fixed', right: 40, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {[1, 2, 3].map(i => <div key={i} style={{ width: 2, height: 40, background: 'rgba(0,180,255,0.2)' }} />)}
            </div> */}

            {/* Scanline overlay */}
            <div style={{
                position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",
                background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,180,255,0.02) 2px,rgba(0,180,255,0.02) 4px)",
            }} />

            <div className="home-content" style={{ position: "relative", zIndex: 2, textAlign: "center", display: "flex", flexDirection: "column", gap: "max(40px, 8vh)", alignItems: "center", width: '90%', maxWidth: '1200px' }}>

                {/* Title Section */}
                <div className="title-container">
                    <div className="glitch-title">LINK FLOW</div>
                    <h1 className="main-title">LINK FLOW</h1>

                    {/* <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 15, marginTop: 15, width: '100%'
                    }}>
                        <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, #00e676)' }} />
                        <div style={{
                            color: "#00e676", fontSize: "clamp(10px, 1.5vw, 14px)", letterSpacing: "clamp(4px, 1vw, 8px)",
                            fontFamily: "'Share Tech Mono', monospace", opacity: .8,
                            textTransform: 'uppercase', whiteSpace: 'nowrap'
                        }}>
                            Neural Circuit Sync
                        </div>
                        <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, #00e676, transparent)' }} />
                    </div> */}
                </div>

                {/* Play Button Container */}
                <div style={{ position: 'relative', padding: '10px' }}>
                    {/* <div className="frame-decor" style={{ inset: -10, borderLeft: 'none', borderRight: 'none' }} /> */}
                    <button className="play-btn" onClick={onPlay}>
                        START
                    </button>
                    {/* <div className="frame-decor" style={{ inset: -10, borderTop: 'none', borderBottom: 'none' }} /> */}
                </div>

                {/* Status Indicator */}
                {/* <div style={{
                    display: 'flex', alignItems: 'center', gap: 15,
                    color: "rgba(0, 180, 255, 0.4)", fontSize: "clamp(8px, 1vw, 10px)", letterSpacing: 2
                }}>
                    <span>CORE_STATUS: OK</span>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#00e676', boxShadow: '0 0 10px #00e676' }} />
                    <span>ENCRYPTION: ACTIVE</span>
                </div> */}
            </div>

            {/* Version Tag */}
            {/* <div style={{ 
                position: 'fixed', bottom: "max(20px, 4vh)", left: '50%', transform: 'translateX(-50%)',
                fontSize: 10, letterSpacing: 4, color: 'rgba(0,180,255,0.3)', width: '100%', textAlign: 'center'
            }}>
                V2.0.4 // HYPER-LINK ENGINE
            </div> */}
        </div>
    );
}
