import React, { useState, useRef, useCallback, useEffect } from 'react';
import { NodeData, Connection, Position } from './types.ts';
import Node from './components/Node.tsx';
import { generateVariation, generateSeed } from './services/geminiService.ts';
import { INITIAL_PROMPT, INITIAL_IMAGE } from './constants.tsx';
import Header from './components/Header.tsx';
import ZoomControls from './components/ZoomControls.tsx';
import Toolbar from './components/Toolbar.tsx';
import Lightbox from './components/Lightbox.tsx';
import CustomPromptModal from './components/CustomPromptModal.tsx';
import ApiKeyModal from './components/ApiKeyModal.tsx';
import CameraViewModal from './components/CameraViewModal.tsx';
import DirectorControlModal from './components/DirectorControlModal.tsx';
import AngleToolModal from './components/AngleToolModal.tsx';

const App: React.FC = () => {
  // --- State ---
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  // Viewport State
  const [pan, setPan] = useState<Position>({ x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 200 });
  const [scale, setScale] = useState(1);
  
  // Interaction State
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  
  // Refs for synchronous drag tracking
  const lastMousePos = useRef<Position>({ x: 0, y: 0 });
  
  // Robust Pinch-Zoom State
  const gestureStore = useRef<{
      startDist: number;
      startScale: number;
      startPan: Position;
      startMid: Position;
  } | null>(null);

  const rAF = useRef<number | null>(null);
  
  // Lightbox State
  const [lightboxNodeId, setLightboxNodeId] = useState<string | null>(null);

  // API & Modal State
  const [apiKey, setApiKey] = useState<string | undefined>(process.env.API_KEY || localStorage.getItem('GEMINI_API_KEY') || undefined);
  const [showKeyModal, setShowKeyModal] = useState(false);
  
  // Custom prompt state
  const [customPromptOpen, setCustomPromptOpen] = useState(false);
  const [customPromptText, setCustomPromptText] = useState("");
  const [pendingBranchId, setPendingBranchId] = useState<string | null>(null);
  const [pendingIntent, setPendingIntent] = useState<string | null>(null);

  // Camera View State
  const [cameraViewNodeId, setCameraViewNodeId] = useState<string | null>(null);

  // Director Mode State
  const [directorNodeId, setDirectorNodeId] = useState<string | null>(null);

  // Angle Tool State
  const [angleModalNodeId, setAngleModalNodeId] = useState<string | null>(null);

  // Reference Upload State
  const [pendingRefAction, setPendingRefAction] = useState<{ nodeId: string, intent: string } | null>(null);
  
  // Seed Generation State
  const [isRegeneratingSeed, setIsRegeneratingSeed] = useState(false);

  // File input refs
  const fileInputRef = useRef<HTMLInputElement>(null); 
  const referenceInputRef = useRef<HTMLInputElement>(null); 

  // --- Initialization ---
  useEffect(() => {
    // Initial Seed Node
    const seedId = 'seed-1';
    setNodes([
      {
        id: seedId,
        parentId: null,
        type: 'seed',
        imageUrl: INITIAL_IMAGE,
        prompt: INITIAL_PROMPT,
        label: 'SEED FRAME',
        position: { x: 0, y: 0 },
      },
    ]);
    
    // Smart Mobile Scrolling Logic
    const handleTouchMoveGlobal = (e: TouchEvent) => {
        const target = e.target as HTMLElement;
        const isScrollable = target.closest('.overflow-y-auto') || target.closest('.overflow-auto');
        if (isScrollable) return; 
        
        // Prevent default only if we are interacting with the canvas
        if (target.tagName === 'DIV' || target.tagName === 'SVG') {
            e.preventDefault();
        }
    };

    document.body.addEventListener('touchmove', handleTouchMoveGlobal, { passive: false });
    return () => document.body.removeEventListener('touchmove', handleTouchMoveGlobal);
  }, []);

  const handleSaveApiKey = (key: string) => {
      setApiKey(key);
      localStorage.setItem('GEMINI_API_KEY', key);
  };

  // --- Helpers ---
  
  const getRootNodeImage = useCallback((startNodeId: string, allNodes: NodeData[]): string | undefined => {
    let current = allNodes.find(n => n.id === startNodeId);
    let depth = 0;
    const MAX_DEPTH = 20;

    while (current && current.parentId && depth < MAX_DEPTH) {
      if (current.type === 'seed') return current.imageUrl;
      const parent = allNodes.find(n => n.id === current?.parentId);
      if (!parent) break;
      current = parent;
      depth++;
    }
    if (current && current.type === 'seed') return current.imageUrl;
    return undefined;
  }, []);

  const getBranchHistory = useCallback((startNodeId: string, allNodes: NodeData[]): string => {
    const chain: NodeData[] = [];
    let current = allNodes.find(n => n.id === startNodeId);
    let depth = 0;
    const MAX_DEPTH = 25;

    while (current && depth < MAX_DEPTH) {
      chain.push(current);
      if (current.type === 'seed' || !current.parentId) break;
      const parent = allNodes.find(n => n.id === current?.parentId);
      current = parent;
      depth++;
    }

    const chronological = chain.reverse();
    return chronological.map((node, index) => {
        if (node.type === 'seed') return `[START] ROOT SEED: "${node.prompt}"`;
        return `[STEP ${index}] Action: ${node.meta?.intent || 'Variation'} -> "${node.prompt}"`;
    }).join('\n');
  }, []);

  // --- Canvas Interaction ---
  
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    e.preventDefault(); 

    const zoomSensitivity = -0.001; 
    const delta = e.deltaY * zoomSensitivity;
    const newScale = Math.min(Math.max(0.1, scale + delta), 5);

    const mouseX = e.clientX;
    const mouseY = e.clientY;

    const newPanX = mouseX - (mouseX - pan.x) * (newScale / scale);
    const newPanY = mouseY - (mouseY - pan.y) * (newScale / scale);

    setScale(newScale);
    setPan({ x: newPanX, y: newPanY });
  }, [scale, pan]);

  const zoomCanvas = (delta: number) => {
      const newScale = Math.min(Math.max(0.1, scale + delta), 5);
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      
      const newPanX = centerX - (centerX - pan.x) * (newScale / scale);
      const newPanY = centerY - (centerY - pan.y) * (newScale / scale);

      setScale(newScale);
      setPan({ x: newPanX, y: newPanY });
  }

  const resetCanvas = () => {
     setScale(1);
     setPan({ x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 200 });
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
        setIsDraggingCanvas(true);
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleNodeDown = (e: React.MouseEvent | React.TouchEvent, id: string) => {
    e.stopPropagation();
    setSelectedNodeId(id);
    setDraggingNodeId(id);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    lastMousePos.current = { x: clientX, y: clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const clientX = e.clientX;
    const clientY = e.clientY;
    if (rAF.current) return;
    rAF.current = requestAnimationFrame(() => {
        handleDragMove(clientX, clientY);
        rAF.current = null;
    });
  };

  const handleMouseUp = () => {
    setIsDraggingCanvas(false);
    setDraggingNodeId(null);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
     if (e.touches.length === 1) {
        setIsDraggingCanvas(true);
        lastMousePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
     } else if (e.touches.length === 2) {
        setIsDraggingCanvas(false); 
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
        const midX = (touch1.clientX + touch2.clientX) / 2;
        const midY = (touch1.clientY + touch2.clientY) / 2;
        gestureStore.current = { startDist: dist, startScale: scale, startPan: { ...pan }, startMid: { x: midX, y: midY } };
     }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
       const clientX = e.touches[0].clientX;
       const clientY = e.touches[0].clientY;
       if (rAF.current) return;
       rAF.current = requestAnimationFrame(() => {
           handleDragMove(clientX, clientY);
           rAF.current = null;
       });
    } else if (e.touches.length === 2 && gestureStore.current) {
       const touch1 = e.touches[0];
       const touch2 = e.touches[1];
       const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
       const midX = (touch1.clientX + touch2.clientX) / 2;
       const midY = (touch1.clientY + touch2.clientY) / 2;
       const { startDist, startScale, startPan, startMid } = gestureStore.current;
       if (startDist > 0) {
           const scaleFactor = dist / startDist;
           const newScale = Math.min(Math.max(0.1, startScale * scaleFactor), 5);
           const effectiveFactor = newScale / startScale;
           const newPanX = midX - (startMid.x - startPan.x) * effectiveFactor;
           const newPanY = midY - (startMid.y - startPan.y) * effectiveFactor;
           setScale(newScale);
           setPan({ x: newPanX, y: newPanY });
       }
    }
  };

  const handleTouchEnd = () => {
    setIsDraggingCanvas(false);
    setDraggingNodeId(null);
    gestureStore.current = null;
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    const dx = clientX - lastMousePos.current.x;
    const dy = clientY - lastMousePos.current.y;
    lastMousePos.current = { x: clientX, y: clientY };
    if (dx === 0 && dy === 0) return;
    if (draggingNodeId) {
        setNodes(prev => prev.map(n => {
            if (n.id === draggingNodeId) {
                return { ...n, position: { x: n.position.x + (dx / scale), y: n.position.y + (dy / scale) } };
            }
            return n;
        }));
    } else if (isDraggingCanvas) {
        setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    }
  };

  // --- Node Operations ---

  const handleDeleteNode = () => {
    if (!selectedNodeId) return;
    const nodesToDelete = new Set<string>();
    const stack = [selectedNodeId];
    while(stack.length > 0) {
        const current = stack.pop();
        if(current) {
            nodesToDelete.add(current);
            const children = nodes.filter(n => n.parentId === current);
            children.forEach(child => stack.push(child.id));
        }
    }
    setNodes(prev => prev.filter(n => !nodesToDelete.has(n.id)));
    setConnections(prev => prev.filter(c => !nodesToDelete.has(c.from) && !nodesToDelete.has(c.to)));
    setSelectedNodeId(null);
  };

  const handleExportImage = () => {
     if (!selectedNodeId) return;
     const node = nodes.find(n => n.id === selectedNodeId);
     if (node && node.imageUrl) {
         const link = document.createElement('a');
         link.href = node.imageUrl;
         link.download = `flora-${node.label.toLowerCase()}-${Date.now()}.jpg`;
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);
     }
  };

  const handlePromoteToSeed = (id: string) => {
      setNodes(prev => prev.map(n => n.id === id ? { ...n, type: 'seed', label: 'SEED FRAME' } : n));
  };

  const retryGeneration = async (id: string) => {
      const node = nodes.find(n => n.id === id);
      if (!node) return;
      if (node.type === 'seed') {
          await handleGenerateSeed(node.prompt);
          return;
      }
      const parentId = node.parentId;
      if (!parentId) return;
      const intent = node.meta?.intent || 'variation';
      setNodes(prev => prev.map(n => n.id === id ? { ...n, loading: true, label: intent.toUpperCase() } : n));
      const parentNode = nodes.find(n => n.id === parentId);
      if (!parentNode) return;
      const rootImage = getRootNodeImage(parentId, nodes);
      const historyContext = getBranchHistory(parentId, nodes);
      try {
        const resultImage = await generateVariation(parentNode.imageUrl, intent, node.prompt, undefined, rootImage, historyContext, apiKey);
        setNodes(prev => prev.map(n => n.id === id ? { ...n, imageUrl: resultImage, loading: false } : n));
      } catch (err) {
         setNodes(prev => prev.map(n => n.id === id ? { ...n, loading: false, label: 'ERROR' } : n));
      }
  }

  const createBranch = async (
    parentId: string, 
    intent: string, 
    customText: string = "", 
    referenceImage?: string,
    overrideSourceImage?: string,
    yOffsetMultiplier: number = 0,
    totalCount: number = 1 // Total children being spawned in this batch
  ) => {
    const parentNode = nodes.find(n => n.id === parentId);
    if (!parentNode) return;

    const X_SPACING = 320;
    const Y_SPACING = 400;
    
    const newX = parentNode.position.x + X_SPACING;
    
    // Improved stacking logic for multiple spawns
    // Center the group of new nodes vertically relative to the parent
    const groupHeight = (totalCount - 1) * Y_SPACING;
    const startY = parentNode.position.y - (groupHeight / 2);
    const newY = startY + (yOffsetMultiplier * Y_SPACING);
    
    const newId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    let displayPrompt = customText;
    let label = intent.toUpperCase();

    if (!displayPrompt) {
        if (intent === 'random pose') displayPrompt = "Dynamic Random Pose";
        else if (intent === 'swap-clothing') displayPrompt = "Clothing Swap (Reference)";
        else if (intent === 'style-transfer') displayPrompt = "Style Transfer (Reference)";
        else if (intent === 'camera-view') displayPrompt = "Detail View / Reframed Composition";
        else displayPrompt = `Variation: ${intent} of ${parentNode.label}`;
    }

    if (intent === 'camera-view') label = 'CAMERA VIEW';
    if (intent === 'director-mode') label = 'DIRECTOR';

    const newNode: NodeData = {
      id: newId,
      parentId: parentId,
      type: 'variation',
      imageUrl: '', 
      prompt: displayPrompt,
      label: label,
      position: { x: newX, y: newY }, 
      loading: true,
      meta: { intent }
    };

    setNodes(prev => [...prev, newNode]);
    setConnections(prev => [...prev, { id: `c-${newId}`, from: parentId, to: newId }]);

    try {
      let instruction = customText || `Apply ${intent} style/transformation`;
      if (intent === 'camera-view') instruction = "Strictly preserve this cropping. Enhance resolution and details.";
      const rootImage = getRootNodeImage(parentId, nodes);
      const historyContext = getBranchHistory(parentId, nodes);
      const sourceImage = overrideSourceImage || parentNode.imageUrl;
      const resultImage = await generateVariation(sourceImage, intent, instruction, referenceImage, rootImage, historyContext, apiKey);
      setNodes(prev => prev.map(n => n.id === newId ? { ...n, imageUrl: resultImage, loading: false } : n));
    } catch (err) {
      setNodes(prev => prev.map(n => n.id === newId ? { ...n, loading: false, label: 'ERROR' } : n));
    }
  };

  const handleBranch = (id: string, intent: string) => {
    if (intent === 'custom') {
      setPendingBranchId(id);
      setPendingIntent(intent);
      setCustomPromptOpen(true);
    } else if (intent === 'swap-clothing' || intent === 'style-transfer') {
      setPendingRefAction({ nodeId: id, intent });
      if (referenceInputRef.current) {
          referenceInputRef.current.value = ""; 
          referenceInputRef.current.click();
      }
    } else if (intent === 'camera-view') {
      setCameraViewNodeId(id);
    } else if (intent === 'director-mode') {
      setDirectorNodeId(id);
    } else if (intent === 'angle') {
      setAngleModalNodeId(id);
    } else {
      createBranch(id, intent);
    }
  };

  const handleAngleToolGenerate = (count: number) => {
      if (!angleModalNodeId) return;
      
      const angleStyles = [
          "Cinematic Low-Angle Heroic Shot, looking up at the subject to emphasize presence.",
          "Dramatic Bird's Eye View, perfectly top-down symmetrical composition.",
          "Tilted Dutch Angle (15 degrees), establishing stylistic tension and fashion edge.",
          "Extreme High-Angle Shot, looking down from above for a sophisticated editorial perspective.",
          "Low-level Worm's Eye View, shot from ground-level looking up towers of fabric.",
          "Three-quarter cinematic profile shot, emphasizing depth and silhouette.",
          "Over-the-shoulder depth shot focusing on the relationship with the background.",
          "Close-up Macro shot focusing purely on fabric texture and light interaction."
      ];

      // Shuffle and pick
      const selectedStyles = [...angleStyles].sort(() => 0.5 - Math.random()).slice(0, count);

      selectedStyles.forEach((style, index) => {
          createBranch(angleModalNodeId, 'angle', style, undefined, undefined, index, count);
      });

      setAngleModalNodeId(null);
  };

  const handleCameraCapture = (croppedBase64: string) => {
      if (cameraViewNodeId) {
          createBranch(cameraViewNodeId, 'camera-view', '', undefined, croppedBase64);
          setCameraViewNodeId(null);
      }
  };

  const handleDirectorSubmit = (prompt: string, summary: string) => {
      if (directorNodeId) {
          createBranch(directorNodeId, 'director-mode', prompt);
          setDirectorNodeId(null);
      }
  };

  const handleReferenceUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && pendingRefAction) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const base64 = reader.result as string;
              createBranch(pendingRefAction.nodeId, pendingRefAction.intent, "", base64);
              setPendingRefAction(null); 
          };
          reader.readAsDataURL(file);
      } else {
          setPendingRefAction(null);
      }
  };

  const handleCustomSubmit = () => {
    if (isRegeneratingSeed) {
        handleGenerateSeed(customPromptText);
        setCustomPromptOpen(false);
        setCustomPromptText("");
        setIsRegeneratingSeed(false);
    } else if (pendingBranchId && pendingIntent) {
        createBranch(pendingBranchId, pendingIntent, customPromptText);
        setCustomPromptOpen(false);
        setCustomPromptText("");
        setPendingBranchId(null);
        setPendingIntent(null);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setNodes(prev => prev.map(n => n.type === 'seed' ? { ...n, imageUrl: base64, prompt: "User Uploaded Reference" } : n));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateSeed = async (promptOverride?: string) => {
      const seedNode = nodes.find(n => n.type === 'seed');
      if (!seedNode) return;
      if (seedNode.prompt === "User Uploaded Reference" && !promptOverride) {
          setCustomPromptText(INITIAL_PROMPT); 
          setIsRegeneratingSeed(true);
          setCustomPromptOpen(true);
          return;
      }
      setNodes(prev => prev.map(n => n.type === 'seed' ? { ...n, loading: true, label: 'GENERATING...' } : n));
      try {
          const prompt = promptOverride || seedNode.prompt;
          const resultImage = await generateSeed(prompt, apiKey);
          setNodes(prev => prev.map(n => n.type === 'seed' ? { ...n, imageUrl: resultImage, loading: false, label: 'SEED FRAME', prompt: prompt } : n));
      } catch (err) {
          setNodes(prev => prev.map(n => n.type === 'seed' ? { ...n, loading: false, label: 'ERROR' } : n));
      }
  };

  // --- Render Helpers ---

  const getEdgePath = (source: Position, target: Position) => {
    const deltaX = target.x - source.x;
    const c1 = { x: source.x + deltaX * 0.5, y: source.y };
    const c2 = { x: target.x - deltaX * 0.5, y: target.y };
    return `M ${source.x + 256} ${source.y + 100} C ${c1.x + 256} ${c1.y + 100}, ${c2.x} ${c2.y + 100}, ${target.x} ${target.y + 100}`;
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const lightboxNode = nodes.find(n => n.id === lightboxNodeId);
  const cameraViewNode = nodes.find(n => n.id === cameraViewNodeId);
  const hasApiKey = true; 

  return (
    <div 
      className="w-screen h-screen bg-zinc-950 text-zinc-200 overflow-hidden relative cursor-crosshair selection:bg-lime-500/30 touch-none select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: `radial-gradient(circle, #ffffff 1px, transparent 1px)`, backgroundSize: `${32 * scale}px ${32 * scale}px`, transform: `translate(${pan.x % (32 * scale)}px, ${pan.y % (32 * scale)}px)` }} />

      <input type="file" ref={referenceInputRef} onChange={handleReferenceUpload} className="hidden" accept="image/*" />

      <div className="absolute inset-0 w-full h-full transform-gpu will-change-transform" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: '0 0' }} >
        <svg className="absolute top-0 left-0 overflow-visible pointer-events-none w-full h-full z-0">
          {connections.map(conn => {
             const fromNode = nodes.find(n => n.id === conn.from);
             const toNode = nodes.find(n => n.id === conn.to);
             if (!fromNode || !toNode) return null;
             return ( <path key={conn.id} d={getEdgePath(fromNode.position, toNode.position)} fill="none" stroke="#3f3f46" strokeWidth="2" className="opacity-50" /> );
          })}
        </svg>

        {nodes.map(node => (
          <div key={node.id} className="node-container absolute top-0 left-0">
             <Node data={node} selected={selectedNodeId === node.id} onNodeDown={handleNodeDown} onBranch={handleBranch} onPromoteToSeed={handlePromoteToSeed} onRegenerate={retryGeneration} onView={(id) => setLightboxNodeId(id)} />
          </div>
        ))}
      </div>

      <Header hasApiKey={hasApiKey} />
      <ZoomControls onZoomIn={() => zoomCanvas(0.2)} onZoomOut={() => zoomCanvas(-0.2)} onReset={resetCanvas} />
      <Toolbar fileInputRef={fileInputRef} onFileUpload={handleFileUpload} onGenerateSeed={() => handleGenerateSeed()} onDirectorMode={() => selectedNodeId && setDirectorNodeId(selectedNodeId)} onExport={handleExportImage} onDelete={handleDeleteNode} onOpenKeyModal={() => setShowKeyModal(true)} selectedNode={selectedNode} hasApiKey={hasApiKey} />

      <Lightbox node={lightboxNode || null} onClose={() => setLightboxNodeId(null)} />
      <CameraViewModal isOpen={!!cameraViewNodeId} imageUrl={cameraViewNode?.imageUrl || ''} onClose={() => setCameraViewNodeId(null)} onCapture={handleCameraCapture} />
      <DirectorControlModal isOpen={!!directorNodeId} onClose={() => setDirectorNodeId(null)} onSubmit={handleDirectorSubmit} />
      <AngleToolModal isOpen={!!angleModalNodeId} onClose={() => setAngleModalNodeId(null)} onGenerate={handleAngleToolGenerate} />
      <CustomPromptModal isOpen={customPromptOpen} value={customPromptText} onChange={setCustomPromptText} onSubmit={handleCustomSubmit} onCancel={() => { setCustomPromptOpen(false); setIsRegeneratingSeed(false); }} />
      <ApiKeyModal isOpen={showKeyModal} hasApiKey={!!apiKey} onClose={() => setShowKeyModal(false)} onSave={handleSaveApiKey} />
    </div>
  );
};

export default App;