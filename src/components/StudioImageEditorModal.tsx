import React, { useState, useEffect, useRef } from 'react';
import {
  X, Check, RotateCw, RotateCcw, FlipHorizontal, FlipVertical,
  Crop, Sliders, Sun, Sparkles, RefreshCw, Layers, Scissors,
  Circle, Square, Maximize, Eye, Move
} from 'lucide-react';
import { useModalStack } from '../hooks/useModalStack';

interface StudioImageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  originalImageUrl: string;
  onApplyEdits: (editedDataUrl: string) => void;
}

export const StudioImageEditorModal: React.FC<StudioImageEditorModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  originalImageUrl,
  onApplyEdits,
}) => {
  // Stacking z-index and body scroll lock
  const { zIndex, modalId } = useModalStack(isOpen, { onClose, id: 'studio-image-editor-modal' });

  // Active Editing Tab
  const [activeTab, setActiveTab] = useState<'crop' | 'rotate' | 'resize' | 'adjust'>('crop');

  // 1. Crop State
  const [aspectRatio, setAspectRatio] = useState<'free' | '1:1' | '4:3' | '3:4' | '16:9' | 'hoop'>('free');
  const [cropX, setCropX] = useState<number>(0); // 0 to 100 (%)
  const [cropY, setCropY] = useState<number>(0); // 0 to 100 (%)
  const [cropWidthPercent, setCropWidthPercent] = useState<number>(100); // 10 to 100 (%)
  const [cropHeightPercent, setCropHeightPercent] = useState<number>(100); // 10 to 100 (%)

  // 2. Rotate & Flip State
  const [rotationAngle, setRotationAngle] = useState<number>(0); // -180 to 180 degrees
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);

  // 3. Resize / Scale State
  const [scalePercent, setScalePercent] = useState<number>(100); // 25 to 200 (%)

  // 4. Tone & Color Adjustments State
  const [brightness, setBrightness] = useState<number>(0); // -100 to 100
  const [contrast, setContrast] = useState<number>(0); // -100 to 100
  const [saturation, setSaturation] = useState<number>(0); // -100 to 100
  const [filterMode, setFilterMode] = useState<'none' | 'grayscale' | 'sepia' | 'invert'>('none');

  // Image Dimensions Info
  const [imgNaturalWidth, setImgNaturalWidth] = useState<number>(0);
  const [imgNaturalHeight, setImgNaturalHeight] = useState<number>(0);

  // Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loadedImgRef = useRef<HTMLImageElement | null>(null);

  // Reset to initial image when opened
  useEffect(() => {
    if (isOpen && imageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;
      img.onload = () => {
        loadedImgRef.current = img;
        setImgNaturalWidth(img.naturalWidth);
        setImgNaturalHeight(img.naturalHeight);
        renderPreview();
      };
    }
  }, [isOpen, imageUrl]);

  // Adjust crop dimensions according to aspect ratio
  useEffect(() => {
    if (aspectRatio === '1:1' || aspectRatio === 'hoop') {
      setCropWidthPercent(80);
      setCropHeightPercent(80);
    } else if (aspectRatio === '4:3') {
      setCropWidthPercent(90);
      setCropHeightPercent(67.5);
    } else if (aspectRatio === '3:4') {
      setCropWidthPercent(67.5);
      setCropHeightPercent(90);
    } else if (aspectRatio === '16:9') {
      setCropWidthPercent(90);
      setCropHeightPercent(50.6);
    } else if (aspectRatio === 'free') {
      setCropWidthPercent(100);
      setCropHeightPercent(100);
      setCropX(0);
      setCropY(0);
    }
  }, [aspectRatio]);

  // Render transformed preview to canvas
  const renderPreview = () => {
    const canvas = canvasRef.current;
    const img = loadedImgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate source crop coordinates in pixels
    const srcW = (img.naturalWidth * cropWidthPercent) / 100;
    const srcH = (img.naturalHeight * cropHeightPercent) / 100;
    
    // Ensure crop doesn't bleed out of bounds
    const maxSx = img.naturalWidth - srcW;
    const maxSy = img.naturalHeight - srcH;
    const srcX = Math.min(maxSx, Math.max(0, (cropX / 100) * maxSx));
    const srcY = Math.min(maxSy, Math.max(0, (cropY / 100) * maxSy));

    // Calculate output canvas size after scaling and rotation
    const scale = scalePercent / 100;
    const isRotated90 = Math.abs(rotationAngle % 180) === 90;

    const baseOutW = Math.round(srcW * scale);
    const baseOutH = Math.round(srcH * scale);

    const outW = isRotated90 ? baseOutH : baseOutW;
    const outH = isRotated90 ? baseOutW : baseOutH;

    canvas.width = Math.max(1, outW);
    canvas.height = Math.max(1, outH);

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply CSS Filter string for brightness, contrast, saturation, filters
    let filterString = `brightness(${100 + brightness}%) contrast(${100 + contrast}%) saturate(${100 + saturation}%)`;
    if (filterMode === 'grayscale') filterString += ' grayscale(100%)';
    if (filterMode === 'sepia') filterString += ' sepia(100%)';
    if (filterMode === 'invert') filterString += ' invert(100%)';
    ctx.filter = filterString;

    // Move origin to canvas center for rotation & flip
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotationAngle * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

    // Draw the cropped portion of the image centered
    ctx.drawImage(
      img,
      srcX, srcY, srcW, srcH,
      -baseOutW / 2, -baseOutH / 2, baseOutW, baseOutH
    );

    ctx.restore();

    // If Hoop Circle crop mode is selected, apply circular mask on top
    if (aspectRatio === 'hoop') {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-in';
      ctx.beginPath();
      const radius = Math.min(canvas.width, canvas.height) / 2;
      ctx.arc(canvas.width / 2, canvas.height / 2, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  // Trigger preview re-render whenever editing controls change
  useEffect(() => {
    if (isOpen) {
      renderPreview();
    }
  }, [
    cropX, cropY, cropWidthPercent, cropHeightPercent, aspectRatio,
    rotationAngle, flipH, flipV, scalePercent,
    brightness, contrast, saturation, filterMode, isOpen
  ]);

  if (!isOpen) return null;

  // Reset all adjustments to default
  const handleResetEdits = () => {
    setAspectRatio('free');
    setCropX(0);
    setCropY(0);
    setCropWidthPercent(100);
    setCropHeightPercent(100);
    setRotationAngle(0);
    setFlipH(false);
    setFlipV(false);
    setScalePercent(100);
    setBrightness(0);
    setContrast(0);
    setSaturation(0);
    setFilterMode('none');

    // Reload original image if available
    if (originalImageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = originalImageUrl;
      img.onload = () => {
        loadedImgRef.current = img;
        setImgNaturalWidth(img.naturalWidth);
        setImgNaturalHeight(img.naturalHeight);
        renderPreview();
      };
    }
  };

  // Apply Edits to Pattern
  const handleSaveAndApply = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onApplyEdits(dataUrl);
    onClose();
  };

  return (
    <div 
      data-modal-overlay="true"
      data-modal-id={modalId}
      style={{ zIndex }}
      className="fixed inset-0 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in"
    >
      <div className="bg-[#FAF6EE] rounded-3xl max-w-5xl w-full max-h-[92vh] shadow-2xl border border-[#E8E1D2] flex flex-col overflow-hidden">
        
        {/* Editor Modal Header */}
        <div className="px-6 py-4 border-b border-[#E8E1D2] flex items-center justify-between bg-white/80 shrink-0 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#3D5239] text-white flex items-center justify-center shadow-xs">
              <Scissors className="w-5 h-5 text-[#E06C38]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#1D231E]">Studio Image Editor</h3>
                <span className="text-[10px] font-bold bg-[#3D5239] text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#E06C38]" />
                  Studio Exclusive
                </span>
              </div>
              <p className="text-xs text-[#5C685A]">Crop, rotate, scale & fine-tune image before cross-stitch pattern conversion</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-[#E5EDE2] text-[#3D5239] flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Main Body */}
        <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start overflow-y-auto flex-1 overscroll-contain">
          
          {/* Controls Navigation Tabs & Options (Left 5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Tool Category Selector Tabs */}
            <div className="grid grid-cols-4 gap-1 bg-[#EAE2D2] p-1 rounded-2xl border border-[#DCD2C0]">
              <button
                onClick={() => setActiveTab('crop')}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  activeTab === 'crop' ? 'bg-[#3D5239] text-white shadow-xs' : 'text-[#5C685A] hover:text-[#1D231E]'
                }`}
              >
                <Crop className="w-4 h-4" />
                <span>Crop</span>
              </button>
              <button
                onClick={() => setActiveTab('rotate')}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  activeTab === 'rotate' ? 'bg-[#3D5239] text-white shadow-xs' : 'text-[#5C685A] hover:text-[#1D231E]'
                }`}
              >
                <RotateCw className="w-4 h-4" />
                <span>Rotate</span>
              </button>
              <button
                onClick={() => setActiveTab('resize')}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  activeTab === 'resize' ? 'bg-[#3D5239] text-white shadow-xs' : 'text-[#5C685A] hover:text-[#1D231E]'
                }`}
              >
                <Maximize className="w-4 h-4" />
                <span>Scale</span>
              </button>
              <button
                onClick={() => setActiveTab('adjust')}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  activeTab === 'adjust' ? 'bg-[#3D5239] text-white shadow-xs' : 'text-[#5C685A] hover:text-[#1D231E]'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>Tone Shading</span>
              </button>
            </div>

            {/* TAB 1: CROP & ASPECT RATIO */}
            {activeTab === 'crop' && (
              <div className="bg-white p-4.5 rounded-2xl border border-[#E8E1D2] shadow-xs space-y-4">
                <h4 className="text-xs font-bold text-[#1D231E] flex items-center justify-between">
                  <span>Aspect Ratio Presets</span>
                  <span className="text-[10px] text-[#E06C38] uppercase font-mono">{aspectRatio}</span>
                </h4>

                {/* Aspect Ratio Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setAspectRatio('free')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      aspectRatio === 'free'
                        ? 'bg-[#E06C38] text-white border-[#E06C38]'
                        : 'bg-[#FAF6EE] text-[#3D5239] border-[#E8E1D2] hover:bg-[#E8EFE5]'
                    }`}
                  >
                    <Maximize className="w-3.5 h-3.5" />
                    <span>Free</span>
                  </button>
                  <button
                    onClick={() => setAspectRatio('1:1')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      aspectRatio === '1:1'
                        ? 'bg-[#E06C38] text-white border-[#E06C38]'
                        : 'bg-[#FAF6EE] text-[#3D5239] border-[#E8E1D2] hover:bg-[#E8EFE5]'
                    }`}
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>1:1 Square</span>
                  </button>
                  <button
                    onClick={() => setAspectRatio('hoop')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      aspectRatio === 'hoop'
                        ? 'bg-[#E06C38] text-white border-[#E06C38]'
                        : 'bg-[#FAF6EE] text-[#3D5239] border-[#E8E1D2] hover:bg-[#E8EFE5]'
                    }`}
                  >
                    <Circle className="w-3.5 h-3.5" />
                    <span>Hoop Circle</span>
                  </button>
                  <button
                    onClick={() => setAspectRatio('4:3')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      aspectRatio === '4:3'
                        ? 'bg-[#E06C38] text-white border-[#E06C38]'
                        : 'bg-[#FAF6EE] text-[#3D5239] border-[#E8E1D2] hover:bg-[#E8EFE5]'
                    }`}
                  >
                    <span>4:3 Photo</span>
                  </button>
                  <button
                    onClick={() => setAspectRatio('3:4')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      aspectRatio === '3:4'
                        ? 'bg-[#E06C38] text-white border-[#E06C38]'
                        : 'bg-[#FAF6EE] text-[#3D5239] border-[#E8E1D2] hover:bg-[#E8EFE5]'
                    }`}
                  >
                    <span>3:4 Portrait</span>
                  </button>
                  <button
                    onClick={() => setAspectRatio('16:9')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      aspectRatio === '16:9'
                        ? 'bg-[#E06C38] text-white border-[#E06C38]'
                        : 'bg-[#FAF6EE] text-[#3D5239] border-[#E8E1D2] hover:bg-[#E8EFE5]'
                    }`}
                  >
                    <span>16:9 Wide</span>
                  </button>
                </div>

                {/* Crop Position & Zoom Sliders */}
                <div className="space-y-3 pt-2 border-t border-[#F0EBE1]">
                  <div>
                    <div className="flex justify-between text-xs font-medium text-[#4A5548] mb-1">
                      <span>Horizontal Position (X)</span>
                      <span className="font-mono">{cropX}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={cropX}
                      onChange={(e) => setCropX(Number(e.target.value))}
                      className="w-full accent-[#E06C38] cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-medium text-[#4A5548] mb-1">
                      <span>Vertical Position (Y)</span>
                      <span className="font-mono">{cropY}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={cropY}
                      onChange={(e) => setCropY(Number(e.target.value))}
                      className="w-full accent-[#E06C38] cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-medium text-[#4A5548] mb-1">
                      <span>Crop Zoom Size</span>
                      <span className="font-mono">{cropWidthPercent}%</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      value={cropWidthPercent}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCropWidthPercent(val);
                        if (aspectRatio === '1:1' || aspectRatio === 'hoop') {
                          setCropHeightPercent(val);
                        } else {
                          setCropHeightPercent(val);
                        }
                      }}
                      className="w-full accent-[#E06C38] cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ROTATE & FLIP */}
            {activeTab === 'rotate' && (
              <div className="bg-white p-4.5 rounded-2xl border border-[#E8E1D2] shadow-xs space-y-4">
                <h4 className="text-xs font-bold text-[#1D231E]">Rotation & Axis Flip</h4>

                {/* Quick 90° Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setRotationAngle((prev) => (prev - 90 < -180 ? prev + 270 : prev - 90))}
                    className="py-2.5 px-3 rounded-xl bg-[#FAF6EE] hover:bg-[#E8EFE5] text-[#1D231E] border border-[#E8E1D2] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4 text-[#E06C38]" />
                    <span>Rotate Left 90°</span>
                  </button>
                  <button
                    onClick={() => setRotationAngle((prev) => (prev + 90 > 180 ? prev - 270 : prev + 90))}
                    className="py-2.5 px-3 rounded-xl bg-[#FAF6EE] hover:bg-[#E8EFE5] text-[#1D231E] border border-[#E8E1D2] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RotateCw className="w-4 h-4 text-[#E06C38]" />
                    <span>Rotate Right 90°</span>
                  </button>
                </div>

                {/* Fine Angle Slider */}
                <div>
                  <div className="flex justify-between text-xs font-medium text-[#4A5548] mb-1">
                    <span>Fine Rotation Angle</span>
                    <span className="font-mono">{rotationAngle}°</span>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={rotationAngle}
                    onChange={(e) => setRotationAngle(Number(e.target.value))}
                    className="w-full accent-[#E06C38] cursor-pointer"
                  />
                </div>

                {/* Flip Axis Buttons */}
                <div className="pt-3 border-t border-[#F0EBE1] grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setFlipH(!flipH)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      flipH ? 'bg-[#3D5239] text-white border-[#3D5239]' : 'bg-[#FAF6EE] text-[#1D231E] border-[#E8E1D2]'
                    }`}
                  >
                    <FlipHorizontal className="w-4 h-4 text-[#E06C38]" />
                    <span>Flip Horizontal</span>
                  </button>
                  <button
                    onClick={() => setFlipV(!flipV)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      flipV ? 'bg-[#3D5239] text-white border-[#3D5239]' : 'bg-[#FAF6EE] text-[#1D231E] border-[#E8E1D2]'
                    }`}
                  >
                    <FlipVertical className="w-4 h-4 text-[#E06C38]" />
                    <span>Flip Vertical</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: RESIZE / SCALE */}
            {activeTab === 'resize' && (
              <div className="bg-white p-4.5 rounded-2xl border border-[#E8E1D2] shadow-xs space-y-4">
                <h4 className="text-xs font-bold text-[#1D231E]">Resolution & Image Scale</h4>

                <div>
                  <div className="flex justify-between text-xs font-medium text-[#4A5548] mb-1">
                    <span>Scale Percentage</span>
                    <span className="font-mono font-bold text-[#E06C38]">{scalePercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="25"
                    max="200"
                    step="5"
                    value={scalePercent}
                    onChange={(e) => setScalePercent(Number(e.target.value))}
                    className="w-full accent-[#E06C38] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[#7A8877] mt-1">
                    <span>25% (Compact)</span>
                    <span>100% (Original)</span>
                    <span>200% (High Res)</span>
                  </div>
                </div>

                <div className="p-3 bg-[#FAF6EE] rounded-xl border border-[#E8E1D2] text-xs text-[#5C685A] space-y-1">
                  <div className="flex justify-between">
                    <span>Original Size:</span>
                    <span className="font-mono font-bold text-[#1D231E]">{imgNaturalWidth} × {imgNaturalHeight} px</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Target Render Size:</span>
                    <span className="font-mono font-bold text-[#E06C38]">
                      {Math.round((imgNaturalWidth * cropWidthPercent / 100) * (scalePercent / 100))} × {Math.round((imgNaturalHeight * cropHeightPercent / 100) * (scalePercent / 100))} px
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: TONE SHADING & COLOUR ADJUSTMENT */}
            {activeTab === 'adjust' && (
              <div className="bg-white p-4.5 rounded-2xl border border-[#E8E1D2] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#1D231E]">Tone Shading & Colour Adjustment</h4>
                    <p className="text-[10px] text-[#5C685A]">Adjust brightness, contrast & vibrancy for needlework</p>
                  </div>
                  {(brightness !== 0 || contrast !== 0 || saturation !== 0 || filterMode !== 'none') && (
                    <button
                      onClick={() => {
                        setBrightness(0);
                        setContrast(0);
                        setSaturation(0);
                        setFilterMode('none');
                      }}
                      className="text-[10px] text-[#E06C38] font-bold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Reset Tones</span>
                    </button>
                  )}
                </div>

                {/* Filter Mode Presets */}
                <div>
                  <label className="text-[11px] font-semibold text-[#1D231E] block mb-1.5">Quick Tone Presets</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => setFilterMode('none')}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        filterMode === 'none' ? 'bg-[#3D5239] text-white border-[#3D5239]' : 'bg-[#FAF6EE] text-[#1D231E] border-[#E8E1D2] hover:bg-[#E8EFE5]'
                      }`}
                    >
                      Normal Color
                    </button>
                    <button
                      onClick={() => setFilterMode('grayscale')}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        filterMode === 'grayscale' ? 'bg-[#3D5239] text-white border-[#3D5239]' : 'bg-[#FAF6EE] text-[#1D231E] border-[#E8E1D2] hover:bg-[#E8EFE5]'
                      }`}
                    >
                      B&W Grayscale
                    </button>
                    <button
                      onClick={() => setFilterMode('sepia')}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        filterMode === 'sepia' ? 'bg-[#3D5239] text-white border-[#3D5239]' : 'bg-[#FAF6EE] text-[#1D231E] border-[#E8E1D2] hover:bg-[#E8EFE5]'
                      }`}
                    >
                      Vintage Sepia
                    </button>
                    <button
                      onClick={() => setFilterMode('invert')}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        filterMode === 'invert' ? 'bg-[#3D5239] text-white border-[#3D5239]' : 'bg-[#FAF6EE] text-[#1D231E] border-[#E8E1D2] hover:bg-[#E8EFE5]'
                      }`}
                    >
                      Invert Colors
                    </button>
                  </div>
                </div>

                {/* Tone Shading Sliders */}
                <div className="space-y-3 pt-2 border-t border-[#F0EBE1]">
                  <div>
                    <div className="flex justify-between text-xs font-medium text-[#4A5548] mb-1">
                      <span>Brightness Adjustment</span>
                      <span className="font-mono text-[#E06C38] font-bold">{brightness > 0 ? `+${brightness}` : brightness}</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      step="2"
                      value={brightness}
                      onChange={(e) => setBrightness(Number(e.target.value))}
                      className="w-full accent-[#E06C38] cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-[#7A8877] mt-0.5">
                      <span>Darker (-100)</span>
                      <span>Default (0)</span>
                      <span>Brighter (+100)</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-medium text-[#4A5548] mb-1">
                      <span>Contrast Adjustment</span>
                      <span className="font-mono text-[#E06C38] font-bold">{contrast > 0 ? `+${contrast}` : contrast}</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      step="2"
                      value={contrast}
                      onChange={(e) => setContrast(Number(e.target.value))}
                      className="w-full accent-[#E06C38] cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-[#7A8877] mt-0.5">
                      <span>Softer (-100)</span>
                      <span>Default (0)</span>
                      <span>Higher Punch (+100)</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-medium text-[#4A5548] mb-1">
                      <span>Colour Saturation Adjustment</span>
                      <span className="font-mono text-[#E06C38] font-bold">{saturation > 0 ? `+${saturation}` : saturation}</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      step="2"
                      value={saturation}
                      onChange={(e) => setSaturation(Number(e.target.value))}
                      className="w-full accent-[#E06C38] cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-[#7A8877] mt-0.5">
                      <span>Muted (-100)</span>
                      <span>Natural (0)</span>
                      <span>Vibrant (+100)</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-[#FAF6EE] rounded-xl border border-[#E8E1D2] text-[11px] text-[#5C685A] leading-relaxed">
                  💡 <strong>Tip:</strong> Tone shading adjusts the source image pixels directly before DMC color matching, giving optimal thread hue distribution in the resulting chart.
                </div>
              </div>
            )}
          </div>

          {/* Interactive Preview Canvas (Right 7 Cols) */}
          <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-[#E8E1D2] shadow-xs flex flex-col items-center justify-between min-h-[420px]">
            <div className="w-full flex items-center justify-between mb-3 text-xs font-bold text-[#1D231E]">
              <span className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-[#E06C38]" />
                <span>Live Interactive Preview</span>
              </span>
              <button
                onClick={handleResetEdits}
                className="text-[11px] font-bold text-[#E06C38] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset All Edits</span>
              </button>
            </div>

            {/* Canvas Display Frame */}
            <div className="w-full h-80 bg-[#1D231E] rounded-2xl p-4 flex items-center justify-center overflow-hidden border border-[#DCD2C0] relative shadow-inner">
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-full object-contain rounded-lg shadow-md"
              />
            </div>

            {/* Canvas Specs Bar */}
            <div className="w-full mt-3 pt-3 border-t border-[#F0EBE1] flex items-center justify-between text-[11px] text-[#5C685A]">
              <span>Aspect: <strong className="text-[#1D231E] uppercase">{aspectRatio}</strong></span>
              <span>Rotation: <strong className="text-[#1D231E]">{rotationAngle}°</strong></span>
              <span>Scale: <strong className="text-[#1D231E]">{scalePercent}%</strong></span>
            </div>
          </div>
        </div>

        {/* Editor Modal Bottom Action Bar */}
        <div className="px-6 py-4 border-t border-[#E8E1D2] bg-white/90 sticky bottom-0 z-20 flex flex-col sm:flex-row items-center justify-between gap-3 backdrop-blur-md">
          <button
            onClick={handleResetEdits}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#DCD2C0] text-[#5C685A] hover:bg-[#FAF6EE] text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reset to Original</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-[#DCD2C0] text-[#1D231E] hover:bg-[#FAF6EE] text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAndApply}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-[#E06C38] hover:bg-[#C95B2A] text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Apply Edits to Pattern</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
