/* ─────────────────────────────────────────────────────────────
   src/components/ui/ScratchCard.tsx  –  Scratch-to-reveal card
   ───────────────────────────────────────────────────────────── */
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface ScratchCardProps {
  amount: number;
  onRevealed?: () => void;
}

export default function ScratchCard({ amount, onRevealed }: ScratchCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    
    if (mq.matches) {
      // Skip scratch animation, reveal directly
      setTimeout(() => {
        setRevealed(true);
        onRevealed?.();
      }, 500);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw the gold cover
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#D4AF37');
    gradient.addColorStop(0.5, '#B8962E');
    gradient.addColorStop(1, '#D4AF37');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add text
    ctx.fillStyle = '#1c1c1f';
    ctx.font = '700 20px "Playfair Display", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✨ Scratch to Reveal ✨', canvas.width / 2, canvas.height / 2);
  }, [onRevealed, prefersReducedMotion]);

  const getPosition = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    },
    []
  );

  const scratch = useCallback(
    (x: number, y: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, 24, 0, Math.PI * 2);
      ctx.fill();

      // Check if enough has been scratched
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let transparent = 0;
      for (let i = 3; i < imageData.data.length; i += 4) {
        if (imageData.data[i] === 0) transparent++;
      }
      const percent = transparent / (imageData.data.length / 4);
      if (percent > 0.4 && !revealed) {
        setRevealed(true);
        onRevealed?.();
      }
    },
    [revealed, onRevealed]
  );

  const handleStart = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      setIsDrawing(true);
      const pos = getPosition(e);
      scratch(pos.x, pos.y);
    },
    [getPosition, scratch]
  );

  const handleMove = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (!isDrawing) return;
      e.preventDefault();
      const pos = getPosition(e);
      scratch(pos.x, pos.y);
    },
    [isDrawing, getPosition, scratch]
  );

  const handleEnd = useCallback(() => {
    setIsDrawing(false);
  }, []);

  if (prefersReducedMotion) {
    return (
      <div className="scratch-container">
        <div className="scratch-reveal">
          <p className="text-[var(--text-secondary)] text-sm mb-2">You won</p>
          <p className="amount-gold text-5xl">₹{amount}</p>
          <p className="text-[var(--gold)] text-sm mt-2 font-medium">Cashback!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="scratch-container">
      {/* Reward underneath */}
      <div className="scratch-reveal">
        <p className="text-[var(--text-secondary)] text-sm mb-2">You won</p>
        <p className="amount-gold text-5xl">₹{amount}</p>
        <p className="text-[var(--gold)] text-sm mt-2 font-medium">Cashback!</p>
      </div>
      {/* Scratchable cover */}
      <canvas
        ref={canvasRef}
        width={280}
        height={200}
        className={`absolute inset-0 z-10 cursor-pointer touch-none ${
          revealed ? 'opacity-0 pointer-events-none transition-opacity duration-500' : ''
        }`}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        aria-label="Scratch card - scratch to reveal your cashback reward"
        role="img"
      />
    </div>
  );
}
