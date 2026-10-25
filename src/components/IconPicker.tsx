import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Smile,
  Folder,
  FolderPlus,
  Globe,
  Upload,
  Trash2,
  Check,
  Link2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import EmojiPicker, { EmojiStyle, Theme, type EmojiClickData } from 'emoji-picker-react';
import { storageService, type CustomIconItem } from '../services/storageService';
import { IconDisplay, isImageSource } from './IconDisplay';
import { soundEffects } from '../services/soundEffects';
import { styleService } from '../services/styleService';

export interface DisplayIconItem {
  id: string;
  name: string;
  src: string;
  folder?: string;
  type?: string;
  dateAdded?: number;
  isBuiltIn?: boolean;
}

export interface IconPickerProps {
  value: string;
  onChange: (newValue: string) => void;
  title?: string;
  className?: string;
  hideCustomUploads?: boolean; // When true, only allows emojis/symbols (hides local file uploads & web links for viewer safety)
}

// Curated Quick Picks for Fast 1-Click Stream & Racing Access
const QUICK_STREAM_PICKS = [
  '🏇', '⚡', '🔥', '🏆', '👑', '🦄', '🚀', '🏎️',
  '💎', '🎲', '🎯', '🪙', '🥊', '🎮', '🌪️', '💫',
  '🍕', '❤️', '🥇', '🥈', '🥉', '🏁', '⭐', '🦁',
  '🐉', '⚔️', '🛡️', '🧙', '🥷', '🏍️', '🍀', '🔮'
];

export const IconPicker: React.FC<IconPickerProps> = ({
  value,
  onChange,
  className = '',
  hideCustomUploads = false
}) => {
  const [activeTab, setActiveTab] = useState<'emoji' | 'local' | 'url'>(() => {
    if (hideCustomUploads) return 'emoji';
    if (isImageSource(value)) {
      return value.startsWith('http') ? 'url' : 'local';
    }
    return 'emoji';
  });

  // --- Tab 1: Emoji State ---
  const [customEmojiInput, setCustomEmojiInput] = useState('');
  const [isEmojiPickerReady, setIsEmojiPickerReady] = useState(false);
  const [emojiStyle, setEmojiStyle] = useState<EmojiStyle>(() => {
    try {
      const saved = localStorage.getItem('anytoken_emoji_style');
      return saved === 'twitter' ? EmojiStyle.TWITTER : EmojiStyle.NATIVE;
    } catch {
      return EmojiStyle.NATIVE;
    }
  });

  useEffect(() => {
    if (activeTab === 'emoji' && !isEmojiPickerReady) {
      const timer = setTimeout(() => {
        setIsEmojiPickerReady(true);
      }, 70);
      return () => clearTimeout(timer);
    }
  }, [activeTab, isEmojiPickerReady]);

  const handleToggleEmojiStyle = () => {
    const nextStyle = emojiStyle === EmojiStyle.NATIVE ? EmojiStyle.TWITTER : EmojiStyle.NATIVE;
    setEmojiStyle(nextStyle);
    try {
      localStorage.setItem('anytoken_emoji_style', nextStyle === EmojiStyle.TWITTER ? 'twitter' : 'native');
    } catch { }
  };

  // --- Tab 2: Local Folders & Asset Packs State ---
  const [customIcons, setCustomIcons] = useState<CustomIconItem[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Built-in Theme Skin Graphics
  const [themeImages, setThemeImages] = useState<DisplayIconItem[]>(() => {
    return styleService.getSkinImages().map(img => ({
      id: `theme-asset-${img.style}-${img.name}`,
      name: img.name,
      src: img.url,
      folder: `Skin: ${img.style}`,
      isBuiltIn: true
    }));
  });

  useEffect(() => {
    return styleService.onStyleChange(() => {
      setThemeImages(
        styleService.getSkinImages().map(img => ({
          id: `theme-asset-${img.style}-${img.name}`,
          name: img.name,
          src: img.url,
          folder: `Skin: ${img.style}`,
          isBuiltIn: true
        }))
      );
    });
  }, []);

  const combinedIcons = useMemo<DisplayIconItem[]>(() => {
    return [...themeImages, ...customIcons];
  }, [themeImages, customIcons]);

  // --- Tab 3: Web Link State ---
  const [urlInput, setUrlInput] = useState('');
  const [urlPreviewStatus, setUrlPreviewStatus] = useState<'idle' | 'loading' | 'valid' | 'invalid'>('idle');
  const [savedUrls, setSavedUrls] = useState<string[]>([]);

  // Load custom icons & saved web links from persistent storage
  useEffect(() => {
    setCustomIcons(storageService.getCustomIcons());
    setSavedUrls(storageService.getSavedWebLinks());
  }, []);

  // Compute unique folders
  const folderNames = useMemo(() => {
    const set = new Set<string>();
    combinedIcons.forEach(item => {
      set.add(item.folder || 'Default Folder');
    });
    return Array.from(set);
  }, [combinedIcons]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onChange(emojiData.emoji);
    soundEffects.playTokenClink();
  };

  // Handle Custom Emoji / Direct Image Input Submit
  const handleCustomEmojiSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = customEmojiInput.trim();
    if (clean) {
      if (hideCustomUploads && isImageSource(clean)) {
        // Disallow arbitrary image URLs or data URLs when hideCustomUploads is enabled
        setCustomEmojiInput('');
        return;
      }
      onChange(clean);
      if (isImageSource(clean) && clean.startsWith('http')) {
        storageService.saveWebLink(clean);
        setSavedUrls(storageService.getSavedWebLinks());
      }
      soundEffects.playTokenClink();
      setCustomEmojiInput('');
    }
  };

  // --- Scan & Populate Local Folder Images ---
  const processFileEntries = async (entries: { file: File; folderName: string }[]) => {
    const valid = entries.filter(({ file }) => {
      const ext = file.name.toLowerCase();
      return (
        file.type.startsWith('image/') ||
        ext.endsWith('.png') ||
        ext.endsWith('.jpg') ||
        ext.endsWith('.jpeg') ||
        ext.endsWith('.webp') ||
        ext.endsWith('.gif') ||
        ext.endsWith('.svg')
      );
    });
    if (valid.length === 0) return;

    setIsProcessing(true);
    setProcessingStatus(`Scanning folder for images (${valid.length} found)...`);

    try {
      const readPromises = valid.map(({ file, folderName }) => {
        return new Promise<CustomIconItem | null>((resolve) => {
          const isSvg = file.type.includes('svg') || file.name.toLowerCase().endsWith('.svg');
          const isGif = file.type.includes('gif') || file.name.toLowerCase().endsWith('.gif');
          const cleanName = file.name.replace(/\.[^/.]+$/, '');
          const id = `icon_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

          const reader = new FileReader();
          reader.onload = (e) => {
            const raw = e.target?.result as string;
            if (!raw) return resolve(null);

            if (isSvg || isGif) {
              resolve({
                id,
                name: cleanName,
                src: raw,
                type: 'local',
                dateAdded: Date.now(),
                folder: folderName
              });
              return;
            }

            // High-performance canvas thumbnail: 128x128 max for ultra-lightweight persistence
            const img = new Image();
            img.onload = () => {
              const maxDim = 128;
              let w = img.width;
              let h = img.height;
              if (w > maxDim || h > maxDim) {
                if (w > h) {
                  h = Math.round((h * maxDim) / w);
                  w = maxDim;
                } else {
                  w = Math.round((w * maxDim) / h);
                  h = maxDim;
                }
              }
              const canvas = document.createElement('canvas');
              canvas.width = Math.max(1, w);
              canvas.height = Math.max(1, h);
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0, w, h);
                const thumb = canvas.toDataURL(file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.85);
                resolve({
                  id,
                  name: cleanName,
                  src: thumb,
                  type: 'local',
                  dateAdded: Date.now(),
                  folder: folderName
                });
              } else {
                resolve({
                  id,
                  name: cleanName,
                  src: raw,
                  type: 'local',
                  dateAdded: Date.now(),
                  folder: folderName
                });
              }
            };
            img.onerror = () => resolve(null);
            img.src = raw;
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        });
      });

      const results = await Promise.all(readPromises);
      const itemsToAdd = results.filter((item): item is CustomIconItem => item !== null);

      if (itemsToAdd.length > 0) {
        storageService.saveCustomIcons(itemsToAdd);
        const updated = storageService.getCustomIcons();
        setCustomIcons(updated);

        // Switch to the newly added folder
        const firstFolder = itemsToAdd[0].folder;
        if (firstFolder) {
          setSelectedFolder(firstFolder);
        }

        if (itemsToAdd.length === 1) {
          onChange(itemsToAdd[0].src);
        }
        soundEffects.playTokenClink();
      }
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      const fileList: { file: File; folderName: string }[] = [];
      const queue: { entry: any; folder: string }[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const entry = (item as any).webkitGetAsEntry ? (item as any).webkitGetAsEntry() : null;
          if (entry) {
            queue.push({ entry, folder: entry.name });
          } else {
            const file = item.getAsFile();
            if (file) fileList.push({ file, folderName: 'Imported Files' });
          }
        }
      }

      if (queue.length > 0) {
        const readEntriesRecursively = async (entry: any, folderName: string) => {
          if (entry.isFile) {
            return new Promise<void>((resolve) => {
              entry.file((file: File) => {
                fileList.push({ file, folderName });
                resolve();
              }, () => resolve());
            });
          } else if (entry.isDirectory) {
            return new Promise<void>((resolve) => {
              const dirReader = entry.createReader();
              dirReader.readEntries(async (entries: any[]) => {
                for (const child of entries) {
                  await readEntriesRecursively(child, entry.name || folderName);
                }
                resolve();
              }, () => resolve());
            });
          }
        };

        for (const item of queue) {
          await readEntriesRecursively(item.entry, item.folder);
        }

        if (fileList.length > 0) {
          processFileEntries(fileList);
          return;
        }
      }
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const entries = Array.from(e.dataTransfer.files).map(file => ({
        file,
        folderName: 'Dropped Folder'
      }));
      processFileEntries(entries);
    }
  };

  const handleDeleteCustomIcon = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (id.startsWith('theme-asset-')) return;
    storageService.deleteCustomIcon(id);
    setCustomIcons(storageService.getCustomIcons());
    soundEffects.playTokenClink();
  };

  const handleDeleteFolder = (folderName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (folderName.startsWith('Skin:')) return;
    if (window.confirm(`Delete all icons in folder "${folderName}"?`)) {
      storageService.deleteFolder(folderName);
      setCustomIcons(storageService.getCustomIcons());
      if (selectedFolder === folderName) setSelectedFolder('all');
      soundEffects.playTokenClink();
    }
  };



  // --- Test & Apply Web URL ---
  useEffect(() => {
    if (!urlInput.trim()) {
      setUrlPreviewStatus('idle');
      return;
    }

    setUrlPreviewStatus('loading');
    const testImg = new Image();
    testImg.onload = () => setUrlPreviewStatus('valid');
    testImg.onerror = () => setUrlPreviewStatus('invalid');
    testImg.src = urlInput.trim();
  }, [urlInput]);

  const handleApplyUrl = (urlToApply: string) => {
    const cleanUrl = urlToApply.trim();
    if (!cleanUrl) return;

    onChange(cleanUrl);
    storageService.saveWebLink(cleanUrl);
    setSavedUrls(storageService.getSavedWebLinks());
    soundEffects.playTokenClink();
  };

  const handleDeleteSavedUrl = (urlToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    storageService.deleteWebLink(urlToDelete);
    setSavedUrls(storageService.getSavedWebLinks());
  };

  return (
    <div className={`icon-picker-container ${className}`}>
      {/* 1. Header Tabs: Emojis | Local Files | Web Link (Hidden in viewer mode) */}
      {!hideCustomUploads && (
        <div className="icon-picker-tab-bar">
          <button
            type="button"
            className={`icon-picker-tab-btn ${activeTab === 'emoji' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('emoji')}
          >
            <Smile size={13} />
            <span>Emojis</span>
          </button>

          <button
            type="button"
            className={`icon-picker-tab-btn ${activeTab === 'local' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('local')}
          >
            <Folder size={13} />
            <span>Local Files</span>
            {customIcons.length > 0 && <span className="tab-badge-pill">{customIcons.length}</span>}
          </button>

          <button
            type="button"
            className={`icon-picker-tab-btn ${activeTab === 'url' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('url')}
          >
            <Globe size={13} />
            <span>Web Link</span>
          </button>
        </div>
      )}

      {/* =========================================================================
          TAB 1: EMOJIS & SYMBOLS (UNIVERSAL EMOJI PICKER + WORLD FLAGS)
          ========================================================================= */}
      {activeTab === 'emoji' && (
        <div className="icon-picker-tab-content emoji-tab-content">
          {/* Custom Emoji / Text / Direct Image URL Input */}
          <div className="icon-custom-direct-row">
            <div className="icon-custom-direct-form" style={{ width: '100%' }}>
              <input
                type="text"
                placeholder={hideCustomUploads ? "Type or paste any emoji or symbol..." : "Type or paste any emoji, symbol, or image URL..."}
                value={customEmojiInput}
                onChange={(e) => setCustomEmojiInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCustomEmojiSubmit();
                  }
                }}
                className="cyber-input icon-direct-input"
                style={{ flex: 1 }}
                title={hideCustomUploads ? "Type or paste any emoji or symbol" : "Type or paste any custom emoji, world flag, character or image URL"}
              />
              <button
                type="button"
                onClick={() => handleCustomEmojiSubmit()}
                className="cyber-btn-secondary mini-btn"
              >
                Set
              </button>
            </div>
          </div>

          {/* Quick Stream & Racing Favorites */}
          <div className="icon-quick-picks-bar">
            <span className="quick-picks-label">Quick Picks:</span>
            <div className="quick-picks-scroll">
              {QUICK_STREAM_PICKS.map((em, idx) => (
                <button
                  key={`quick-${em}-${idx}`}
                  type="button"
                  className={`icon-tile-btn quick-tile ${value === em ? 'is-selected' : ''}`}
                  onClick={() => {
                    onChange(em);
                    soundEffects.playTokenClink();
                  }}
                  title={em}
                >
                  <IconDisplay icon={em} className="icon-tile-emoji" />
                  {value === em && <Check size={10} className="icon-tile-check" />}
                </button>
              ))}
            </div>
          </div>

          {/* Universal Emoji Picker with All Categories & World Flags */}
          <div className="icon-picker-full-library-wrap">
            {/* Header controls: Emoji Style toggle (Native vs Twemoji) */}
            <div className="emoji-library-toolbar">
              <span className="library-toolbar-label">
                {emojiStyle === EmojiStyle.NATIVE ? '⚡ Native Emojis (Instant)' : '🌐 Twemoji Web Graphics'}
              </span>
              <button
                type="button"
                className="emoji-style-toggle-btn"
                onClick={handleToggleEmojiStyle}
                title={emojiStyle === EmojiStyle.NATIVE
                  ? "Currently using Fast Native emojis. Click to switch to Twemoji Web graphics."
                  : "Currently using Twemoji Web graphics. Click to switch to Instant Native emojis."
                }
              >
                {emojiStyle === EmojiStyle.NATIVE ? 'Switch to Twemoji' : 'Switch to Native (Faster)'}
              </button>
            </div>

            {!isEmojiPickerReady ? (
              <div className="emoji-picker-placeholder">
                <div className="emoji-skeleton-search" />
                <div className="emoji-skeleton-categories">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="emoji-skeleton-cat-pill" />
                  ))}
                </div>
                <div className="emoji-skeleton-grid">
                  {Array.from({ length: 32 }).map((_, i) => (
                    <div key={i} className="emoji-skeleton-cell" />
                  ))}
                </div>
                <div className="emoji-spinner-overlay">
                  <Loader2 size={22} className="spin-slow" color="#d97706" />
                  <span className="emoji-spinnerText">Forging Emoji Library...</span>
                </div>
              </div>
            ) : (
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                emojiStyle={emojiStyle}
                theme={Theme.LIGHT}
                width="100%"
                height={290}
                lazyLoadEmojis={true}
                searchPlaceHolder="Search emojis & flags (e.g. horse, flag, star, fire)..."
                previewConfig={{ showPreview: false }}
              />
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: LOCAL FILES & FOLDERS
          ========================================================================= */}
      {activeTab === 'local' && (
        <div className="icon-picker-tab-content local-tab-content">
          {/* Hidden File & Folder Inputs */}
          <input
            ref={folderInputRef}
            type="file"
            // @ts-ignore - webkitdirectory standard
            webkitdirectory=""
            directory=""
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                const entries = Array.from(e.target.files).map(file => {
                  const relPath = file.webkitRelativePath || '';
                  const folderName = relPath.includes('/') ? relPath.split('/')[0] : 'Imported Folder';
                  return { file, folderName };
                });
                processFileEntries(entries);
                e.target.value = '';
              }
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp,.gif,.svg"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                const entries = Array.from(e.target.files).map(file => ({
                  file,
                  folderName: 'Custom Images'
                }));
                processFileEntries(entries);
                e.target.value = '';
              }
            }}
          />

          {/* Top Folder Action Toolbar */}
          <div className="folder-action-toolbar">
            <button
              type="button"
              className="cyber-btn-primary mini-btn"
              onClick={() => folderInputRef.current?.click()}
              title="Add a local folder from your computer to populate images"
            >
              <FolderPlus size={14} /> Add Local Folder
            </button>
            <button
              type="button"
              className="cyber-btn-ghost mini-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Add individual image files"
            >
              <Upload size={13} /> Add Files
            </button>
            {folderNames.length > 0 && (
              <span className="folder-toolbar-hint">
                {folderNames.length} folder{folderNames.length !== 1 ? 's' : ''} &bull; {combinedIcons.length} icon{combinedIcons.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Clean Drag-and-Drop Dropzone */}
          <div
            className={`icon-dropzone ${isDragging ? 'is-dragging' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => folderInputRef.current?.click()}
            title="Click or drop a local folder here"
          >
            <div className="dropzone-text">
              {isProcessing ? (
                <strong>{processingStatus}</strong>
              ) : (
                <>
                  <Folder size={17} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                  <strong>Click or Drop</strong> a local folder here to populate with images
                </>
              )}
            </div>
            <div className="dropzone-sub">
              Folders with 50+ images will automatically populate the custom image fields below!
            </div>
          </div>

          {/* Folder List Filter Chips */}
          {folderNames.length > 0 && (
            <div className="folder-filter-bar">
              <button
                type="button"
                className={`category-chip ${selectedFolder === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedFolder('all')}
              >
                All Folders ({combinedIcons.length})
              </button>
              {folderNames.map(fName => {
                const count = combinedIcons.filter(i => (i.folder || 'Default Folder') === fName).length;
                return (
                  <button
                    key={fName}
                    type="button"
                    className={`category-chip ${selectedFolder === fName ? 'active' : ''}`}
                    onClick={() => setSelectedFolder(fName)}
                  >
                    📁 {fName} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Custom Icons Library (Grouped by Folder) */}
          <div className="local-library-section">
            {combinedIcons.length === 0 ? (
              <div className="icon-empty-library">
                <p>No custom images added yet. Click &ldquo;Add Local Folder&rdquo; above to import a folder with up to 50+ icons at once!</p>
              </div>
            ) : (
              (selectedFolder === 'all' ? folderNames : [selectedFolder]).map(fName => {
                const itemsInFolder = combinedIcons.filter(i => (i.folder || 'Default Folder') === fName);
                if (itemsInFolder.length === 0) return null;

                const isThemeFolder = fName.startsWith('Skin:');

                return (
                  <div key={fName} className="local-folder-group">
                    <div className="folder-group-header">
                      <span className="folder-group-title">
                        📁 {fName} <span className="folder-count-badge">({itemsInFolder.length})</span>
                      </span>
                      {!isThemeFolder && (
                        <button
                          type="button"
                          className="folder-delete-btn"
                          onClick={(e) => handleDeleteFolder(fName, e)}
                          title={`Remove all ${itemsInFolder.length} icons in "${fName}"`}
                        >
                          <Trash2 size={10} /> Delete Folder
                        </button>
                      )}
                    </div>

                    <div className="icon-tiles-grid local-grid">
                      {itemsInFolder.map(item => (
                        <div
                          key={item.id}
                          className={`icon-tile-btn local-tile ${value === item.src ? 'is-selected' : ''}`}
                          onClick={() => {
                            onChange(item.src);
                            soundEffects.playTokenClink();
                          }}
                          title={item.name}
                        >
                          <IconDisplay icon={item.src} className="icon-tile-thumb" />
                          {!item.isBuiltIn && (
                            <button
                              type="button"
                              className="icon-tile-delete-btn"
                              onClick={(e) => handleDeleteCustomIcon(item.id, e)}
                              title={`Delete ${item.name}`}
                            >
                              <Trash2 size={9} />
                            </button>
                          )}
                          {value === item.src && <Check size={10} className="icon-tile-check" />}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: WEB LINK (HOSTED URL)
          ========================================================================= */}
      {activeTab === 'url' && (
        <div className="icon-picker-tab-content">
          <div className="url-input-block">
            <label className="url-field-label">Direct Hosted Image URL (PNG, GIF, WebP, JPG)</label>
            <div className="url-input-row">
              <Link2 size={13} className="url-input-icon" />
              <input
                type="url"
                placeholder="https://example.com/mascot.png"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="cyber-input url-input-field"
              />
              <button
                type="button"
                className="cyber-btn-primary mini-btn"
                disabled={urlPreviewStatus !== 'valid'}
                onClick={() => handleApplyUrl(urlInput)}
              >
                Apply URL
              </button>
            </div>

            {/* Live URL Validation Feedback */}
            {urlInput.trim() && (
              <div className="url-preview-card">
                {urlPreviewStatus === 'loading' && (
                  <div className="url-status-msg text-muted">
                    Testing image connection...
                  </div>
                )}
                {urlPreviewStatus === 'valid' && (
                  <div className="url-valid-row">
                    <div className="url-preview-thumb">
                      <img src={urlInput.trim()} alt="" />
                    </div>
                    <div className="url-valid-info">
                      <span className="status-badge-success"><Check size={10} /> Valid Image</span>
                      <span className="url-domain-hint">Click &ldquo;Apply URL&rdquo; to use as icon</span>
                    </div>
                  </div>
                )}
                {urlPreviewStatus === 'invalid' && (
                  <div className="url-status-msg text-danger">
                    <AlertCircle size={12} /> Unable to load image. Ensure link points directly to a valid image file.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Saved / Recent Web Links */}
          <div className="local-library-section" style={{ marginTop: '0.85rem' }}>
            <div className="category-section-header">
              <span>Saved Web Links ({savedUrls.length})</span>
            </div>

            {savedUrls.length === 0 ? (
              <div className="icon-empty-library">
                <p>No web links saved yet. Paste an image URL above and click Apply to save it here for quick access!</p>
              </div>
            ) : (
              <div className="icon-tiles-grid local-grid">
                {savedUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className={`icon-tile-btn local-tile ${value === url ? 'is-selected' : ''}`}
                    onClick={() => handleApplyUrl(url)}
                    title={url}
                  >
                    <IconDisplay icon={url} className="icon-tile-thumb" />
                    <button
                      type="button"
                      className="icon-tile-delete-btn"
                      onClick={(e) => handleDeleteSavedUrl(url, e)}
                      title="Remove saved link"
                    >
                      <Trash2 size={9} />
                    </button>
                    {value === url && <Check size={10} className="icon-tile-check" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          4. Current Selection Bottom Footer
          ========================================================================= */}
      <div className="icon-picker-footer-bar">
        <div className="current-selection-preview">
          <span className="footer-label">Selected:</span>
          <div className="selection-preview-box">
            <IconDisplay icon={value || '⚡'} className="selection-thumb" />
          </div>
        </div>

        <div className="footer-hint">
          {isImageSource(value) ? '🖼️ Custom Image' : '✨ Standard Emoji'}
        </div>
      </div>
    </div>
  );
};
