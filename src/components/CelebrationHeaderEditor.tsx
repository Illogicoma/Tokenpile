import React, { useRef, useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, RotateCcw, ZoomIn, Move, Check, X } from 'lucide-react';
import type { CelebrationHeaderConfig } from '../types/betting';
import { DEFAULT_CELEBRATION_HEADER_CONFIG } from '../services/storageService';
import { styleService } from '../services/styleService';
import { IconDisplay } from './IconDisplay';

interface CelebrationHeaderEditorProps {
  config: CelebrationHeaderConfig;
  onChange: (config: CelebrationHeaderConfig) => void;
  onClose?: () => void;
  previewIcon?: string;
  previewColor?: string;
  previewName?: string;
  compact?: boolean;
}

export const CelebrationHeaderEditor: React.FC<CelebrationHeaderEditorProps> = ({
  config,
  onChange,
  onClose,
  previewIcon = '🏆',
  previewColor = '#fbbf24',
  previewName = 'Winner',
  compact = false
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [activeDrag, setActiveDrag] = useState<'image' | 'icon' | null>(null);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initialImageX: number;
    initialImageY: number;
    initialIconX: number;
    initialIconY: number;
  }>({
    startX: 0,
    startY: 0,
    initialImageX: config.imagePosX,
    initialImageY: config.imagePosY,
    initialIconX: config.iconPosX,
    initialIconY: config.iconPosY,
  });

  const [urlInput, setUrlInput] = useState(config.imageUrl || '');
  const [activeTab, setActiveTab] = useState<'image' | 'icon'>('image');

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChange({
          ...config,
          imageUrl: reader.result,
        });
        setUrlInput('');
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle URL submit
  const handleUrlSubmit = () => {
    const trimmed = urlInput.trim();
    onChange({
      ...config,
      imageUrl: trimmed,
    });
  };

  // Reset to default
  const handleReset = () => {
    onChange({ ...DEFAULT_CELEBRATION_HEADER_CONFIG });
    setUrlInput('');
  };

  // Mouse wheel zoom on preview
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 5 : -5;
    const nextScale = Math.max(50, Math.min(250, config.imageScale + delta));
    onChange({
      ...config,
      imageScale: nextScale
    });
  };

  // Start dragging background
  const handleMouseDownBg = (e: React.MouseEvent) => {
    // Only drag on left click
    if (e.button !== 0) return;
    e.preventDefault();
    setActiveDrag('image');
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialImageX: config.imagePosX,
      initialImageY: config.imagePosY,
      initialIconX: config.iconPosX,
      initialIconY: config.iconPosY,
    };
  };

  // Start dragging icon
  const handleMouseDownIcon = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    setActiveDrag('icon');
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialImageX: config.imagePosX,
      initialImageY: config.imagePosY,
      initialIconX: config.iconPosX,
      initialIconY: config.iconPosY,
    };
  };

  // Window-level mousemove & mouseup for drag
  useEffect(() => {
    if (!activeDrag) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const deltaX = ((e.clientX - dragStartRef.current.startX) / rect.width) * 100;
      const deltaY = ((e.clientY - dragStartRef.current.startY) / rect.height) * 100;

      if (activeDrag === 'image') {
        const nextX = Math.round(Math.max(0, Math.min(100, dragStartRef.current.initialImageX + deltaX)));
        const nextY = Math.round(Math.max(0, Math.min(100, dragStartRef.current.initialImageY + deltaY)));
        onChange({
          ...config,
          imagePosX: nextX,
          imagePosY: nextY,
        });
      } else if (activeDrag === 'icon') {
        const nextX = parseFloat(Math.max(0, Math.min(100, dragStartRef.current.initialIconX + deltaX)).toFixed(1));
        const nextY = parseFloat(Math.max(0, Math.min(100, dragStartRef.current.initialIconY + deltaY)).toFixed(1));
        onChange({
          ...config,
          iconPosX: nextX,
          iconPosY: nextY,
        });
      }
    };

    const handleMouseUp = () => {
      setActiveDrag(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeDrag, config, onChange]);

  const effectiveBgImage = config.imageUrl || styleService.getImage('tp_victory.png');

  return (
    <div className={`celebration-header-editor-panel ${compact ? 'compact' : ''}`}>
      {/* Header bar */}
      <div className="editor-panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ImageIcon size={18} color="#fbbf24" />
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, fontFamily: "'Merge One', system-ui, sans-serif" }}>
            Customize Victory Header
          </h4>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button 
            type="button"
            className="icon-btn-ghost" 
            onClick={handleReset} 
            title="Reset to Default"
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <RotateCcw size={13} /> Reset
          </button>
          {onClose && (
            <button type="button" className="icon-btn-ghost" onClick={onClose} title="Close Editor">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Interactive Twitter-style Canvas Preview & Direct Drag Area */}
      <div className="editor-preview-container">
        <div className="editor-preview-hint">
          <Move size={12} /> Drag image or icon to reposition. Scroll to zoom.
        </div>
        <div
          ref={containerRef}
          className="editor-header-preview-box"
          onMouseDown={handleMouseDownBg}
          onWheel={handleWheel}
          style={{
            backgroundImage: `url("${effectiveBgImage}")`,
            backgroundPosition: `${config.imagePosX}% ${config.imagePosY}%`,
            backgroundSize: config.imageScale === 100 ? 'contain' : `${config.imageScale}%`,
            backgroundRepeat: 'no-repeat',
            cursor: activeDrag === 'image' ? 'grabbing' : 'grab',
          }}
        >
          {/* Draggable Medal / Victory Icon Anchor */}
          <div
            className={`editor-preview-icon-slot ${activeDrag === 'icon' ? 'dragging' : ''}`}
            onMouseDown={handleMouseDownIcon}
            style={{
              left: `${config.iconPosX}%`,
              top: `${config.iconPosY}%`,
              width: `${17.2 * (config.iconScale / 100)}%`,
              cursor: activeDrag === 'icon' ? 'grabbing' : 'move',
            }}
            title={`Drag to position ${previewName} icon`}
          >
            <div
              className="celebration-medal-token-disc"
              style={{
                boxShadow: `0 0 20px ${previewColor}cc, inset 0 0 8px rgba(0, 0, 0, 0.45)`,
              }}
            >
              <IconDisplay icon={previewIcon} fallback="🏆" />
            </div>
            <div className="editor-icon-crosshair" />
          </div>
        </div>
      </div>

      {/* Editor Controls & Sliders */}
      <div className="editor-controls-section">
        {/* Sub-tabs: Background Image vs Icon Position */}
        <div className="editor-subtabs">
          <button
            type="button"
            className={`editor-subtab-btn ${activeTab === 'image' ? 'active' : ''}`}
            onClick={() => setActiveTab('image')}
          >
            <ImageIcon size={14} /> Background Image
          </button>
          <button
            type="button"
            className={`editor-subtab-btn ${activeTab === 'icon' ? 'active' : ''}`}
            onClick={() => setActiveTab('icon')}
          >
            <Move size={14} /> Winner Icon Alignment
          </button>
        </div>

        {activeTab === 'image' && (
          <div className="editor-tab-body">
            {/* Image upload row */}
            <div className="editor-upload-row">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
              <button
                type="button"
                className="editor-btn-secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={14} /> Upload Custom Image
              </button>
              {config.imageUrl && (
                <button
                  type="button"
                  className="editor-btn-ghost"
                  onClick={() => onChange({ ...config, imageUrl: '' })}
                >
                  Use Default tp_victory.png
                </button>
              )}
            </div>

            {/* URL input */}
            <div className="editor-url-row">
              <input
                type="text"
                placeholder="Or paste image URL (https://...)"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUrlSubmit()}
                className="editor-input"
              />
              <button
                type="button"
                className="editor-btn-secondary"
                onClick={handleUrlSubmit}
                disabled={!urlInput.trim()}
              >
                <Check size={14} /> Apply
              </button>
            </div>

            {/* Image Zoom Slider */}
            <div className="editor-slider-item">
              <div className="slider-label-row">
                <span><ZoomIn size={13} /> Image Zoom</span>
                <span>{config.imageScale}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="250"
                step="2"
                value={config.imageScale}
                onChange={e => onChange({ ...config, imageScale: Number(e.target.value) })}
                className="editor-range-slider"
              />
            </div>

            {/* Image Pan X & Y Sliders */}
            <div className="editor-sliders-grid">
              <div className="editor-slider-item">
                <div className="slider-label-row">
                  <span>Pan X (Horiz)</span>
                  <span>{config.imagePosX}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={config.imagePosX}
                  onChange={e => onChange({ ...config, imagePosX: Number(e.target.value) })}
                  className="editor-range-slider"
                />
              </div>

              <div className="editor-slider-item">
                <div className="slider-label-row">
                  <span>Pan Y (Vert)</span>
                  <span>{config.imagePosY}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={config.imagePosY}
                  onChange={e => onChange({ ...config, imagePosY: Number(e.target.value) })}
                  className="editor-range-slider"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'icon' && (
          <div className="editor-tab-body">
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', color: 'var(--text-muted, #8E7D53)' }}>
              Align where the winner's medal/token appears on your header image. Drag the disc in the preview or use the fine-tune sliders below.
            </p>

            <div className="editor-sliders-grid">
              <div className="editor-slider-item">
                <div className="slider-label-row">
                  <span>Icon Position X</span>
                  <span>{config.iconPosX}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.5"
                  value={config.iconPosX}
                  onChange={e => onChange({ ...config, iconPosX: Number(e.target.value) })}
                  className="editor-range-slider"
                />
              </div>

              <div className="editor-slider-item">
                <div className="slider-label-row">
                  <span>Icon Position Y</span>
                  <span>{config.iconPosY}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.5"
                  value={config.iconPosY}
                  onChange={e => onChange({ ...config, iconPosY: Number(e.target.value) })}
                  className="editor-range-slider"
                />
              </div>
            </div>

            <div className="editor-slider-item">
              <div className="slider-label-row">
                <span>Icon Scale</span>
                <span>{config.iconScale}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="200"
                step="2"
                value={config.iconScale}
                onChange={e => onChange({ ...config, iconScale: Number(e.target.value) })}
                className="editor-range-slider"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
