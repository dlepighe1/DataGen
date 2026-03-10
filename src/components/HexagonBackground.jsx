import React, { useEffect, useRef } from 'react';

export default function HexagonBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Grid config
    const hexSize = 45;
    const hexHeight = hexSize * 2;
    const hexWidth = Math.sqrt(3) * hexSize;
    const vertDist = hexHeight * 0.75;
    
    // We want to focus the grid on the right side
    // We will generate the mathematical grid points
    const nodes = [];
    const cols = Math.ceil(canvas.width / hexWidth) + 2;
    const rows = Math.ceil(canvas.height / vertDist) + 2;

    for (let r = -1; r < rows; r++) {
      for (let c = -1; c < cols; c++) {
        const xOffset = (r % 2 === 1) ? hexWidth / 2 : 0;
        const x = c * hexWidth + xOffset;
        const y = r * vertDist;
        
        // Emphasize right side: probability of node existing increases as X goes right
        const progressX = x / canvas.width;
        // Shift focus to the right half
        const chance = Math.pow(Math.max(0, (progressX - 0.2) * 1.25), 1.5);
        
        if (Math.random() < chance) {
          nodes.push({
            x,
            y,
            baseX: x,
            baseY: y,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            phase: Math.random() * Math.PI * 2,
            opacityMultiplier: Math.min(1, Math.random() * 0.5 + Math.pow(progressX, 2))
          });
        }
      }
    }

    const MAX_DIST = hexWidth * 1.5;

    let tick = 0;
    const draw = () => {
      tick++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Move nodes around their base position slightly
      nodes.forEach(n => {
        n.x += n.vx;
        n.y += n.vy;
        n.phase += 0.02;

        // Keep them bounded to their lattice point
        const dx = n.x - n.baseX;
        const dy = n.y - n.baseY;
        if (dx * dx + dy * dy > 400) {
          n.vx *= -1;
          n.vy *= -1;
        }
      });

      // Draw connections
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const distSq = dx * dx + dy * dy;
          
          if (distSq < MAX_DIST * MAX_DIST) {
            const dist = Math.sqrt(distSq);
            const alpha = (1 - dist / MAX_DIST) * 0.4;
            
            // Connect only if they share roughly similar X progress (prevents long horizontal stragglers)
            const combinedOpacity = (nodes[i].opacityMultiplier + nodes[j].opacityMultiplier) / 2;
            
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(56, 189, 248, ${alpha * combinedOpacity})`;
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      nodes.forEach(n => {
        const pulse = 1 + 0.5 * Math.sin(n.phase);
        
        ctx.beginPath();
        ctx.arc(n.x, n.y, 2.5 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(186, 230, 253, ${0.8 * n.opacityMultiplier})`;
        ctx.fill();
        
        ctx.shadowBlur = 10 * pulse;
        ctx.shadowColor = 'rgba(56, 189, 248, 0.8)';
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      });

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        background: 'linear-gradient(135deg, #020617 0%, #0f172a 40%, #1e1b4b 100%)',
        overflow: 'hidden',
        pointerEvents: 'none'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
      {/* Right side radial highlight */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 100% 50%, rgba(56, 189, 248, 0.08) 0%, transparent 60%)'
        }}
      />
    </div>
  );
}
