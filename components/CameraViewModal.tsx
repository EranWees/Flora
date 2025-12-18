import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, Square, RectangleHorizontal, RectangleVertical, Maximize, Check } from 'lucide-react';

interface CameraViewModalProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
  onCapture: (croppedImageBase64: string) => void;
}

type AspectRatio = 'free' | '1:1' | '4:3' | '16:9';

const CameraViewModal: React.FC<CameraViewModalProps> = ({ isOpen, imageUrl, onClose, onCapture }) => {
  const [aspect, setAspect] = useState<AspectRatio>('free');
  const [crop, setCrop] = useState({ x: 10, y: 10, w: 80, h: 80 }); // Percentages
  const [isDragging, setIsDragging] = useState(false);
  const [dragHandle, setDragHandle] = useState<string | null>(null); // 'move', 'nw', 'ne', 'sw', 'se'
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Reset crop when image changes or modal opens
  useEffect(() => {
    if (isOpen) {
        setCrop({ x: 10, y: 10, w: 80, h: 80 });
        setAspect('free');
    }
  }, [isOpen, imageUrl]);

  // Enforce aspect ratio when selected
  useEffect(() => {
    if (aspect === 'free' || !imageRef.current) return;
    
    const img = imageRef.current;
    const imgRatio = img.width / img.height;
    
    let targetRatio = 1;
    if (aspect === '4:3') targetRatio = 4/3;
    if (aspect === '16:9') targetRatio = 16/9;

    // Calculate new height based on current width to match ratio
    // We work in percentages, so we need to convert ratio relative to image dimensions
    // w% / h% = (targetRatio) / (imgRatio)
    
    // New h% = w% * (imgRatio / targetRatio)
    let newH = crop.w * (imgRatio / targetRatio);
    
    if (crop.y + newH > 100) {
        // If height overflows, scale width instead
        // New w% = h% * (targetRatio / imgRatio)
        newH = 100 - crop.y; // Max available height
        const newW = newH * (targetRatio / imgRatio);
        setCrop(prev => ({ ...prev, w: newW, h: newH }));
    } else {
        setCrop(prev => ({ ...prev, h: newH }));
    }

  }, [aspect]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
    setDragHandle(handle);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    lastMousePos.current = { x: clientX, y: clientY };
  };

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging || !containerRef.current || !imageRef.current) return;

    const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;

    const rect = containerRef.current.getBoundingClientRect();
    const deltaXPx = clientX - lastMousePos.current.x;
    const deltaYPx = clientY - lastMousePos.current.y;
    
    // Convert px delta to percentage delta
    const deltaX = (deltaXPx / rect.width) * 100;
    const deltaY = (deltaYPx / rect.height) * 100;

    lastMousePos.current = { x: clientX, y: clientY };

    setCrop(prev => {
        let { x, y, w, h } = prev;

        if (dragHandle === 'move') {
            x = Math.min(Math.max(0, x + deltaX), 100 - w);
            y = Math.min(Math.max(0, y + deltaY), 100 - h);
        } else {
            // Resize logic
            // Handle aspect ratio constraints during resize is complex, 
            // for "Senior" implementation let's do free resize for 'free' and simplified locked resize for others
            
            if (dragHandle?.includes('e')) {
                w = Math.min(Math.max(5, w + deltaX), 100 - x);
            }
            if (dragHandle?.includes('s')) {
                h = Math.min(Math.max(5, h + deltaY), 100 - y);
            }
            if (dragHandle?.includes('w')) {
                const maxDelta = w - 5;
                const effectiveDelta = Math.min(deltaX, maxDelta);
                // Prevent moving left past 0
                if (x + effectiveDelta < 0) {
                     // clamp
                } else {
                    x += effectiveDelta;
                    w -= effectiveDelta;
                }
            }
            if (dragHandle?.includes('n')) {
                 const maxDelta = h - 5;
                 const effectiveDelta = Math.min(deltaY, maxDelta);
                 if (y + effectiveDelta < 0) {
                     // clamp
                 } else {
                     y += effectiveDelta;
                     h -= effectiveDelta;
                 }
            }

            // Apply Aspect Ratio Constraint roughly
            if (aspect !== 'free') {
                const img = imageRef.current!;
                const imgRatio = img.width / img.height;
                let targetRatio = 1;
                if (aspect === '4:3') targetRatio = 4/3;
                if (aspect === '16:9') targetRatio = 16/9;

                // Priority to Width change if handle is E/W, Height if N/S. 
                // If corner, standard logic.
                // Simplified: recalculate H based on W
                h = w * (imgRatio / targetRatio);
            }
        }

        return { x, y, w, h };
    });

  }, [isDragging, dragHandle, aspect]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragHandle(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchmove', handleMouseMove, { passive: false });
        window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleMouseMove);
        window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleCapture = () => {
      if (!imageRef.current) return;
      
      const img = imageRef.current;
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;

      // Calculate actual pixel coordinates
      const sx = (crop.x / 100) * naturalWidth;
      const sy = (crop.y / 100) * naturalHeight;
      const sw = (crop.w / 100) * naturalWidth;
      const sh = (crop.h / 100) * naturalHeight;

      const canvas = document.createElement('canvas');
      
      // We want to upscale/normalize the crop to a good size for generation
      // Let's aim for at least 1024px on the longest side to ensure Gemini gets detail
      const MAX_DIM = 1024;
      let outW = sw;
      let outH = sh;
      
      if (sw > sh) {
          outW = MAX_DIM;
          outH = sh * (MAX_DIM / sw);
      } else {
          outH = MAX_DIM;
          outW = sw * (MAX_DIM / sh);
      }

      canvas.width = outW;
      canvas.height = outH;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // High quality smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);

      const base64 = canvas.toDataURL('image/jpeg', 0.92);
      onCapture(base64);
      onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-zinc-950/90 backdrop-blur-md animate-in fade-in duration-200">
        
        {/* Toolbar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 bg-gradient-to-b from-black/50 to-transparent">
            <h2 className="text-white font-bold flex items-center gap-2">
                <Camera size={20} className="text-lime-400" />
                CAMERA VIEW
            </h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white">
                <X size={24} />
            </button>
        </div>

        {/* Editor Area */}
        <div className="relative w-full h-full p-8 flex items-center justify-center overflow-hidden select-none touch-none">
            <div 
                ref={containerRef}
                className="relative shadow-2xl" 
                style={{ maxHeight: '80vh', maxWidth: '90vw' }}
            >
                <img 
                    ref={imageRef}
                    src={imageUrl} 
                    alt="Crop Source" 
                    className="max-h-[80vh] max-w-[90vw] object-contain block pointer-events-none select-none"
                    draggable={false}
                />
                
                {/* Overlay / Dimmer */}
                <div className="absolute inset-0 bg-black/50 pointer-events-none"></div>

                {/* Crop Box */}
                <div 
                    className="absolute border-2 border-lime-400 cursor-move group"
                    style={{
                        left: `${crop.x}%`,
                        top: `${crop.y}%`,
                        width: `${crop.w}%`,
                        height: `${crop.h}%`,
                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)', // The visual cutout
                    }}
                    onMouseDown={(e) => handleMouseDown(e, 'move')}
                    onTouchStart={(e) => handleMouseDown(e, 'move')}
                >
                    {/* Grid of Thirds */}
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-30">
                        <div className="border-r border-b border-white/50"></div>
                        <div className="border-r border-b border-white/50"></div>
                        <div className="border-b border-white/50"></div>
                        <div className="border-r border-b border-white/50"></div>
                        <div className="border-r border-b border-white/50"></div>
                        <div className="border-b border-white/50"></div>
                        <div className="border-r border-white/50"></div>
                        <div className="border-r border-white/50"></div>
                        <div></div>
                    </div>

                    {/* Handles */}
                    {['nw', 'ne', 'sw', 'se'].map((pos) => (
                        <div 
                            key={pos}
                            className={`absolute w-4 h-4 bg-lime-400 border-2 border-white rounded-full z-10 hover:scale-125 transition-transform 
                                ${pos === 'nw' ? '-top-2 -left-2 cursor-nw-resize' : ''}
                                ${pos === 'ne' ? '-top-2 -right-2 cursor-ne-resize' : ''}
                                ${pos === 'sw' ? '-bottom-2 -left-2 cursor-sw-resize' : ''}
                                ${pos === 'se' ? '-bottom-2 -right-2 cursor-se-resize' : ''}
                            `}
                            onMouseDown={(e) => handleMouseDown(e, pos)}
                            onTouchStart={(e) => handleMouseDown(e, pos)}
                        />
                    ))}
                    
                    {/* Dimensions label */}
                    <div className="absolute -top-6 left-0 bg-lime-500 text-black text-[10px] font-bold px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                         {aspect === 'free' ? 'FREE' : aspect}
                    </div>
                </div>
            </div>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-8 flex flex-col items-center gap-4 z-50 w-full px-4 pointer-events-none">
            
            {/* Aspect Ratio Toggles */}
            <div className="flex gap-2 p-1 bg-black/60 backdrop-blur rounded-full pointer-events-auto border border-zinc-800">
                <button 
                    onClick={() => setAspect('free')}
                    className={`p-2 rounded-full transition-colors ${aspect === 'free' ? 'bg-lime-500 text-black' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                    title="Freeform"
                >
                    <Maximize size={16} />
                </button>
                <button 
                    onClick={() => setAspect('1:1')}
                    className={`p-2 rounded-full transition-colors ${aspect === '1:1' ? 'bg-lime-500 text-black' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                    title="Square 1:1"
                >
                    <Square size={16} />
                </button>
                <button 
                    onClick={() => setAspect('4:3')}
                    className={`p-2 rounded-full transition-colors ${aspect === '4:3' ? 'bg-lime-500 text-black' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                    title="Landscape 4:3"
                >
                    <RectangleHorizontal size={16} />
                </button>
                <button 
                    onClick={() => setAspect('16:9')}
                    className={`p-2 rounded-full transition-colors ${aspect === '16:9' ? 'bg-lime-500 text-black' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                    title="Wide 16:9"
                >
                    <RectangleVertical size={16} className="rotate-90" />
                </button>
            </div>

            {/* Capture Button */}
            <button 
                onClick={handleCapture}
                className="pointer-events-auto bg-lime-500 hover:bg-lime-400 text-black font-bold py-3 px-8 rounded-full shadow-lg shadow-lime-900/50 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
            >
                <Camera size={20} />
                <span>SNAP & GENERATE</span>
            </button>
        </div>

    </div>
  );
};

export default CameraViewModal;