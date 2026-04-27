import { useEffect, useRef, memo } from "react";
import "../css/Home.css";

export const CircuitBackground = memo(() => {
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

        const NODE_COUNT = 15; // Optimized
        const nodes = Array.from({ length: NODE_COUNT }, () => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            r: 2 + Math.random() * 2,
            color: ["#00b4ff", "#00e676", "#ffe600", "#ff3b5c", "#d500f9"][Math.floor(Math.random() * 5)],
            pulse: Math.random() * Math.PI * 2,
        }));

        let frame = 0;
        const draw = () => {
            frame++;
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

export default function Home({ onPlay }) {
    return (
        <div style={{
            minHeight: "100vh", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            fontFamily: "'Share Tech Mono','Courier New',monospace",
            userSelect: "none", position: "relative", overflow: "hidden",
            color: "#fff"
        }}>


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

            <div style={{ position: "relative", zIndex: 2, textAlign: "center", display: "flex", flexDirection: "column", gap: 60, alignItems: "center" }}>

                {/* Title */}
                <div>
                    <div style={{
                        fontFamily: "'Exo 2',sans-serif", fontSize: 72, fontWeight: 900,
                        letterSpacing: 12, color: "#00b4ff",
                        animation: "titleGlow 3s ease-in-out infinite",
                        lineHeight: 1,
                        textTransform: "uppercase"
                    }}>
                        ⬡ LINK FLOW ⬡
                    </div>
                    <div style={{
                        color: "#00e676", fontSize: 16, letterSpacing: 10, marginTop: 12,
                        fontFamily: "'Share Tech Mono',monospace", opacity: .9,
                    }}>
                        {/* NEURAL · CIRCUIT · PUZZLE */}
                    </div>
                </div>

                {/* Play Button */}
                <button className="play-btn" onClick={onPlay}>
                    INITIALIZE
                </button>

                {/* Footer instructions */}
                {/* <div style={{ color: "#0a3a5a", fontSize: 12, letterSpacing: 4, marginTop: 40 }}>
                    SYSTEM READY // AWAITING USER INPUT
                </div> */}
            </div>
        </div>
    );
}
