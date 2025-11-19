
import React, { useState, useEffect, useRef } from 'react';
import { Upload, Image as ImageIcon, Download, Settings, Wand2, Sparkles, AlertCircle, Camera, Layers, Move, RefreshCw, CheckCircle2 } from 'lucide-react';
import SettingsModal from './components/SettingsModal';
import Loader from './components/Loader';
import { AppSettings, DEFAULT_SETTINGS, GenerationMode, ImageState, ProductTransform } from './types';
import { analyzeProduct, generateScene } from './services/aimlService';

const App: React.FC = () => {
  // --- State ---
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('provision_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [imageState, setImageState] = useState<ImageState>({
    original: null,
    background: null,
    processed: null
  });

  // Editor State
  const [transform, setTransform] = useState<ProductTransform>({
    x: 0.5, // Center (0-1 relative to canvas)
    y: 0.5,
    scale: 0.5,
    rotation: 0
  });

  const [mode, setMode] = useState<GenerationMode>('auto');
  const [userPrompt, setUserPrompt] = useState('');
  const [autoPrompt, setAutoPrompt] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem('provision_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    drawCanvas();
  }, [imageState.original, imageState.background, transform]);

  // --- Canvas Logic ---
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fixed Canvas Size for rendering
    canvas.width = 1024;
    canvas.height = 1024;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Background
    if (imageState.background) {
      const bgImg = new Image();
      bgImg.src = imageState.background;
      bgImg.crossOrigin = "Anonymous";
      if (bgImg.complete) {
         // Draw cover
         const scale = Math.max(canvas.width / bgImg.width, canvas.height / bgImg.height);
         const x = (canvas.width / 2) - (bgImg.width / 2) * scale;
         const y = (canvas.height / 2) - (bgImg.height / 2) * scale;
         ctx.drawImage(bgImg, x, y, bgImg.width * scale, bgImg.height * scale);
      } else {
         bgImg.onload = () => drawCanvas();
      }
    } else {
      // Default Placeholder background
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0,0, canvas.width, canvas.height);
      
      // Grid pattern
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 1;
      for(let i=0; i<canvas.width; i+=50) {
        ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(canvas.width, i); ctx.stroke();
      }
    }

    // 2. Draw Product
    if (imageState.original) {
      const prodImg = new Image();
      prodImg.src = imageState.original;
      if (prodImg.complete) {
        const prodWidth = prodImg.width;
        const prodHeight = prodImg.height;
        
        // Calculate display size
        const baseScale = Math.min(canvas.width / prodWidth, canvas.height / prodHeight);
        const currentScale = baseScale * transform.scale;
        
        const drawW = prodWidth * currentScale;
        const drawH = prodHeight * currentScale;
        
        const drawX = (transform.x * canvas.width);
        const drawY = (transform.y * canvas.height);

        ctx.save();
        ctx.translate(drawX, drawY);
        ctx.rotate((transform.rotation * Math.PI) / 180);
        
        // Shadow
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 30;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 15;

        // Draw centered at point
        ctx.drawImage(prodImg, -drawW/2, -drawH/2, drawW, drawH);
        
        ctx.restore();
      } else {
        prodImg.onload = () => drawCanvas();
      }
    }
  };

  // --- Mouse/Touch Handlers for Dragging ---
  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    isDragging.current = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    lastMousePos.current = { x: clientX, y: clientY };
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging.current) return;
    e.preventDefault(); // Prevent scrolling on touch
    
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const deltaX = clientX - lastMousePos.current.x;
    const deltaY = clientY - lastMousePos.current.y;
    
    // Convert delta to percentage of canvas size shown on screen
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (canvasRect) {
        const scaleFactorX = deltaX / canvasRect.width;
        const scaleFactorY = deltaY / canvasRect.height;

        setTransform(prev => ({
            ...prev,
            x: Math.min(1, Math.max(0, prev.x + scaleFactorX)),
            y: Math.min(1, Math.max(0, prev.y + scaleFactorY))
        }));
    }

    lastMousePos.current = { x: clientX, y: clientY };
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  // --- Handlers ---
  const handleSettingsSave = (newSettings: AppSettings) => {
    setSettings(newSettings);
    if (error?.includes("API")) setError(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageState(prev => ({
          ...prev,
          original: event.target!.result as string,
          background: null // Reset background
        }));
        setTransform({ x: 0.5, y: 0.5, scale: 0.5, rotation: 0 }); // Reset position
        setError(null);
        setAutoPrompt('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const link = document.createElement('a');
      link.download = `provision-lifestyle-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  const generateDesign = async () => {
    if (!settings.apiKey) {
      setError("الرجاء إدخال مفتاح API في الإعدادات");
      setIsSettingsOpen(true);
      return;
    }
    if (!imageState.original) {
      setError("الرجاء رفع صورة المنتج");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let sceneDescription = userPrompt;

      if (mode === 'auto') {
        setLoadingText("جاري التفكير في مشهد مناسب (Gemini)...");
        const analysis = await analyzeProduct(imageState.original, settings);
        sceneDescription = analysis.suggestedScene;
        setAutoPrompt(`${analysis.productDescription}: ${analysis.suggestedScene}`);
      } else {
        if (!userPrompt.trim()) throw new Error("الرجاء كتابة وصف للمشهد");
      }

      setLoadingText("جاري رسم المشهد (Flux)...");
      const backgroundUrl = await generateScene(sceneDescription, settings);

      // Pre-load image to ensure it renders
      const img = new Image();
      img.src = backgroundUrl;
      await new Promise((resolve) => {
         img.onload = resolve;
         img.onerror = () => resolve(null); // Try anyway
      });

      setImageState(prev => ({ ...prev, background: backgroundUrl }));
      
    } catch (err: any) {
      console.error(err);
      let errorMessage = err.message || "حدث خطأ غير متوقع";
      if (errorMessage.includes("401")) errorMessage = "فشل الاتصال: تحقق من مفتاح API";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans">
      <header className="bg-[#1e293b] border-b border-slate-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-brand-600 p-2 rounded-lg shadow-lg shadow-brand-500/20">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-400 to-cyan-300">
              ProVision Studio
            </h1>
          </div>
          <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-full hover:bg-slate-700 text-slate-400 hover:text-brand-400 transition-all">
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Sidebar: Tools */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 1. Upload */}
            <div className="bg-[#1e293b] rounded-2xl border border-slate-700 p-5 shadow-xl">
              <h3 className="text-md font-bold mb-3 text-slate-200 flex items-center gap-2">
                <Upload className="w-4 h-4 text-brand-500" /> 1. صورة المنتج
              </h3>
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
              <div 
                onClick={() => fileInputRef.current?.click()} 
                className="border-2 border-dashed border-slate-600 rounded-xl p-4 text-center cursor-pointer hover:border-brand-500 hover:bg-slate-800 transition-all flex items-center justify-center gap-4"
              >
                {imageState.original ? (
                   <img src={imageState.original} alt="Prod" className="h-16 w-16 object-contain rounded bg-white/5" />
                ) : (
                   <ImageIcon className="w-8 h-8 text-slate-500" />
                )}
                <span className="text-sm text-slate-300 font-medium">
                  {imageState.original ? "تغيير الصورة" : "اضغط لرفع صورة (PNG)"}
                </span>
              </div>
            </div>

            {/* 2. Prompt & Generate */}
            <div className="bg-[#1e293b] rounded-2xl border border-slate-700 p-5 shadow-xl">
              <h3 className="text-md font-bold mb-3 text-slate-200 flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-purple-500" /> 2. تصميم المشهد
              </h3>

              <div className="flex bg-slate-900 p-1 rounded-lg mb-4">
                <button onClick={() => setMode('auto')} className={`flex-1 py-2 text-xs font-bold rounded transition-all ${mode === 'auto' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                   تلقائي (AI)
                </button>
                <button onClick={() => setMode('manual')} className={`flex-1 py-2 text-xs font-bold rounded transition-all ${mode === 'manual' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                   وصف يدوي
                </button>
              </div>

              {mode === 'manual' ? (
                <textarea
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder="أكتب الوصف: فتاة تحمل المنتج، طاولة قهوة، في الطبيعة..."
                  className="w-full h-24 bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-brand-500 resize-none mb-4"
                />
              ) : (
                 <div className="p-3 bg-slate-900/50 rounded border border-slate-700 mb-4">
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-yellow-500" />
                      الذكاء الاصطناعي سيقترح سيناريو "لايف ستايل" مناسب للمنتج.
                    </p>
                    {autoPrompt && <div className="mt-2 text-[10px] text-slate-500 leading-tight border-r-2 border-brand-500 pr-1">{autoPrompt}</div>}
                 </div>
              )}

              <button
                onClick={generateDesign}
                disabled={loading || !imageState.original}
                className={`w-full py-3 rounded-lg font-bold text-md flex items-center justify-center gap-2 transition-all shadow-lg
                  ${loading || !imageState.original ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 text-white'}`}
              >
                {loading ? 'جاري التصميم...' : 'توليد المشهد'}
                {!loading && <Layers className="w-4 h-4" />}
              </button>
              
              {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
            </div>

            {/* 3. Editor Controls */}
            <div className="bg-[#1e293b] rounded-2xl border border-slate-700 p-5 shadow-xl">
              <h3 className="text-md font-bold mb-4 text-slate-200 flex items-center gap-2">
                <Move className="w-4 h-4 text-green-500" /> 3. ضبط المنتج
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>الحجم (Scale)</span>
                    <span>{Math.round(transform.scale * 100)}%</span>
                  </label>
                  <input 
                    type="range" min="0.05" max="2" step="0.05"
                    value={transform.scale}
                    onChange={(e) => setTransform(prev => ({ ...prev, scale: parseFloat(e.target.value) }))}
                    className="w-full accent-brand-500"
                  />
                </div>

                <div>
                  <label className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>الدوران (Rotation)</span>
                    <span>{Math.round(transform.rotation)}°</span>
                  </label>
                  <input 
                    type="range" min="-180" max="180" step="1"
                    value={transform.rotation}
                    onChange={(e) => setTransform(prev => ({ ...prev, rotation: parseFloat(e.target.value) }))}
                    className="w-full accent-brand-500"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                   <button 
                     onClick={() => setTransform({ x: 0.5, y: 0.5, scale: 0.5, rotation: 0 })}
                     className="flex-1 py-2 text-xs bg-slate-700 hover:bg-slate-600 rounded text-slate-300 flex items-center justify-center gap-1"
                   >
                     <RefreshCw className="w-3 h-3" /> إعادة تعيين
                   </button>
                </div>
              </div>
            </div>

          </div>

          {/* Right Area: Canvas */}
          <div className="lg:col-span-8 flex flex-col h-full">
             <div className="bg-[#1e293b] border border-slate-700 rounded-t-2xl p-4 flex justify-between items-center">
                <h2 className="font-bold text-slate-200 flex items-center gap-2">
                   <CheckCircle2 className="w-5 h-5 text-brand-500" /> مساحة العمل
                </h2>
                <button onClick={handleDownload} disabled={!imageState.background} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  <Download className="w-4 h-4" /> حفظ الصورة
                </button>
             </div>
             
             <div className="flex-1 bg-slate-900 border-x border-b border-slate-700 rounded-b-2xl relative overflow-hidden flex items-center justify-center p-4 select-none">
                {loading && <Loader text={loadingText} />}
                
                {/* The Canvas */}
                <div className="relative shadow-2xl shadow-black/50" style={{ maxWidth: '100%', maxHeight: '70vh', aspectRatio: '1/1' }}>
                   <canvas 
                     ref={canvasRef}
                     onMouseDown={handlePointerDown}
                     onMouseMove={handlePointerMove}
                     onMouseUp={handlePointerUp}
                     onMouseLeave={handlePointerUp}
                     onTouchStart={handlePointerDown}
                     onTouchMove={handlePointerMove}
                     onTouchEnd={handlePointerUp}
                     className="w-full h-full object-contain cursor-move touch-none rounded-md bg-[#0f172a]"
                   />
                   
                   {!imageState.background && !imageState.original && !loading && (
                     <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 pointer-events-none">
                        <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
                        <p>ارفع صورة ثم اضغط "توليد المشهد"</p>
                     </div>
                   )}

                   {!imageState.background && imageState.original && !loading && (
                     <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                        <span className="px-3 py-1 bg-black/50 text-white text-xs rounded-full backdrop-blur-sm">
                          صورة المنتج جاهزة. قم بتوليد الخلفية للبدء.
                        </span>
                     </div>
                   )}
                </div>
             </div>
             
             <div className="mt-4 text-center text-slate-500 text-sm">
                <p>💡 تلميح: يمكنك سحب المنتج بالفأرة أو الإصبع لوضعه في المكان المناسب (مثلاً في يد الشخصية).</p>
             </div>
          </div>

        </div>
      </main>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} onSave={handleSettingsSave} />
    </div>
  );
};

export default App;
