/**
 * Style & Theme Asset Management Service
 * 
 * Supports hierarchical skin & asset resolution:
 * 1. Checks requested style (e.g. 'scifi', 'cyberpunk') in `src/styles/<style>/`
 *    - Image assets: `src/styles/<style>/images/<imageName>` -> falls back to `Default/images/<imageName>`
 *    - CSS skin overrides: `src/styles/<style>/*.css` -> injected dynamically; any missing files fall back to `Default/*.css`
 * 2. Emits change events so components and observers update smoothly
 */

// Glob all image assets within src/styles/**
const styleAssetModules = import.meta.glob<string>(
  '/src/styles/**/*.{png,jpg,jpeg,svg,webp,gif}',
  { eager: true, import: 'default' }
);

// Glob all audio assets within src/styles/**
const styleSoundModules = import.meta.glob<string>(
  '/src/styles/**/*.{mp3,wav,ogg}',
  { eager: true, import: 'default' }
);

// Glob all CSS files within src/styles/** as inline raw strings
const styleCssModules = import.meta.glob<string>(
  '/src/styles/**/*.css',
  { eager: true, query: '?inline', import: 'default' }
);

interface AssetMap {
  [key: string]: string;
}

// Normalized map: "<styleName>/<category>/<fileName>" and "<styleName>/<fileName>"
const assetRegistry: AssetMap = {};

// Normalized map: soundRegistry[key] = resolvedAudioUrl
const soundRegistry: AssetMap = {};

// Normalized map: cssRegistry[styleName][fileName] = cssContent
const cssRegistry: Record<string, Record<string, string>> = {};

// Style names preserving original casing
const canonicalStyleNames = new Map<string, string>();
canonicalStyleNames.set('default', 'Default');

// Populate image registry
for (const [rawPath, resolvedUrl] of Object.entries(styleAssetModules)) {
  const cleanPath = rawPath.replace(/^\/src\/styles\//i, '');
  const rawSegments = cleanPath.split('/');
  if (rawSegments.length >= 2) {
    const originalStyle = rawSegments[0];
    const styleName = originalStyle.toLowerCase();
    canonicalStyleNames.set(styleName, originalStyle);

    const fileName = rawSegments[rawSegments.length - 1].toLowerCase();
    const baseName = fileName.replace(/\.[^.]+$/, '');

    const lowerSegments = rawSegments.map(s => s.toLowerCase());
    assetRegistry[lowerSegments.join('/')] = resolvedUrl;
    assetRegistry[`${styleName}/${fileName}`] = resolvedUrl;
    assetRegistry[`${styleName}/${baseName}`] = resolvedUrl;
  }
}

// Populate sound registry
for (const [rawPath, resolvedUrl] of Object.entries(styleSoundModules)) {
  const cleanPath = rawPath.replace(/^\/src\/styles\//i, '');
  const rawSegments = cleanPath.split('/');
  if (rawSegments.length >= 2) {
    const originalStyle = rawSegments[0];
    const styleName = originalStyle.toLowerCase();
    canonicalStyleNames.set(styleName, originalStyle);

    const fileName = rawSegments[rawSegments.length - 1].toLowerCase();
    const baseName = fileName.replace(/\.[^.]+$/, '');

    const lowerSegments = rawSegments.map(s => s.toLowerCase());
    soundRegistry[lowerSegments.join('/')] = resolvedUrl;
    soundRegistry[`${styleName}/sounds/${fileName}`] = resolvedUrl;
    soundRegistry[`${styleName}/sounds/${baseName}`] = resolvedUrl;
    soundRegistry[`${styleName}/${fileName}`] = resolvedUrl;
    soundRegistry[`${styleName}/${baseName}`] = resolvedUrl;
  }
}

// Populate CSS registry
for (const [rawPath, cssContent] of Object.entries(styleCssModules)) {
  const cleanPath = rawPath.replace(/^\/src\/styles\//i, '');
  const rawSegments = cleanPath.split('/');
  if (rawSegments.length >= 2) {
    const originalStyle = rawSegments[0];
    const styleName = originalStyle.toLowerCase();
    canonicalStyleNames.set(styleName, originalStyle);

    const fileName = rawSegments[rawSegments.length - 1].toLowerCase();
    if (!cssRegistry[styleName]) {
      cssRegistry[styleName] = {};
    }
    cssRegistry[styleName][fileName] = cssContent;
  }
}

type StyleChangeListener = (newStyle: string) => void;

class StyleService {
  private currentStyle: string = 'default';
  private listeners: Set<StyleChangeListener> = new Set();

  /**
   * Set active style (e.g., 'default', 'scifi')
   */
  setActiveStyle(style: string): void {
    const normalized = (style || 'default').trim().toLowerCase();
    if (this.currentStyle === normalized && typeof document !== 'undefined' && document.getElementById('TokenPile-custom-skin-override')) {
      return;
    }

    this.currentStyle = normalized;

    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-style-theme', normalized);

      // Handle custom skin override stylesheet
      let styleTag = document.getElementById('TokenPile-custom-skin-override') as HTMLStyleElement | null;

      if (normalized === 'default') {
        if (styleTag) {
          styleTag.textContent = '';
        }
      } else {
        if (!styleTag) {
          styleTag = document.createElement('style');
          styleTag.id = 'TokenPile-custom-skin-override';
          document.head.appendChild(styleTag);
        }

        const customFiles = cssRegistry[normalized];
        if (customFiles && Object.keys(customFiles).length > 0) {
          const combined = Object.entries(customFiles)
            .map(([file, content]) => `/* [Skin Override: ${normalized}/${file}] */\n${content}`)
            .join('\n\n');
          styleTag.textContent = combined;
        } else {
          styleTag.textContent = '';
        }
      }
    }

    // Notify listeners
    this.listeners.forEach(fn => {
      try {
        fn(this.currentStyle);
      } catch (err) {
        console.error('Error in styleChangeListener:', err);
      }
    });
  }

  /**
   * Subscribe to active style changes
   */
  onStyleChange(listener: StyleChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get currently active style in lowercase
   */
  getActiveStyle(): string {
    return this.currentStyle;
  }

  /**
   * Get display name for a style
   */
  getStyleDisplayName(style: string): string {
    const key = style.toLowerCase();
    if (canonicalStyleNames.has(key)) {
      return canonicalStyleNames.get(key)!;
    }
    return style.charAt(0).toUpperCase() + style.slice(1);
  }

  /**
   * Resolve an image asset for a given style with fallback to 'default'
   * 
   * @param imageName Name of image, e.g. 'tp_victory.png' or 'tp_victory'
   * @param specificStyle Optional style override. If omitted, uses active style.
   * @returns URL of resolved asset or fallback
   */
  getImage(imageName: string, specificStyle?: string): string {
    const style = (specificStyle || this.currentStyle).trim().toLowerCase();
    const cleanName = imageName.trim().toLowerCase();
    const baseName = cleanName.replace(/\.[^.]+$/, '');
    const withExt = cleanName.includes('.') ? cleanName : `${cleanName}.png`;

    // 1. Check requested style
    const styleKeys = [
      `${style}/images/${withExt}`,
      `${style}/images/${baseName}`,
      `${style}/${withExt}`,
      `${style}/${baseName}`
    ];
    for (const key of styleKeys) {
      if (assetRegistry[key]) {
        return assetRegistry[key];
      }
    }

    // 2. Fall back to 'default' style
    if (style !== 'default') {
      const defaultKeys = [
        `default/images/${withExt}`,
        `default/images/${baseName}`,
        `default/${withExt}`,
        `default/${baseName}`
      ];
      for (const key of defaultKeys) {
        if (assetRegistry[key]) {
          return assetRegistry[key];
        }
      }
    }

    // Not found in active style or default
    return '';
  }

  /**
   * Resolve a sound asset for a given style with fallback to 'default'.
   * Returns null if no custom audio file exists (allowing caller to use procedural synth).
   * 
   * @param soundName Name of sound, e.g. 'token_clink.mp3' or 'token_clink'
   * @param specificStyle Optional style override. If omitted, uses active style.
   * @returns URL of resolved audio or null
   */
  getSound(soundName: string, specificStyle?: string): string | null {
    const style = (specificStyle || this.currentStyle).trim().toLowerCase();
    const cleanName = soundName.trim().toLowerCase();
    const baseName = cleanName.replace(/\.[^.]+$/, '');
    const withExt = cleanName.includes('.') ? cleanName : `${cleanName}.mp3`;

    // 1. Check requested style
    const styleKeys = [
      `${style}/sounds/${withExt}`,
      `${style}/sounds/${baseName}`,
      `${style}/${withExt}`,
      `${style}/${baseName}`
    ];
    for (const key of styleKeys) {
      if (soundRegistry[key]) {
        return soundRegistry[key];
      }
    }

    // 2. Fall back to 'default' style
    if (style !== 'default') {
      const defaultKeys = [
        `default/sounds/${withExt}`,
        `default/sounds/${baseName}`,
        `default/${withExt}`,
        `default/${baseName}`
      ];
      for (const key of defaultKeys) {
        if (soundRegistry[key]) {
          return soundRegistry[key];
        }
      }
    }

    // Not found in active style or default: return null to trigger procedural synthesis
    return null;
  }

  /**
   * Get all image assets available in a style (and default), useful for custom icon/avatar pickers
   */
  getSkinImages(specificStyle?: string): { name: string; url: string; style: string }[] {
    const style = (specificStyle || this.currentStyle).trim().toLowerCase();
    const results = new Map<string, { name: string; url: string; style: string }>();

    // 1. Add default images
    for (const [key, url] of Object.entries(assetRegistry)) {
      if (key.startsWith('default/')) {
        const parts = key.split('/');
        const fileName = parts[parts.length - 1];
        if (fileName.includes('.')) {
          results.set(fileName, { name: fileName, url, style: 'Default' });
        }
      }
    }

    // 2. Override with active style images
    if (style !== 'default') {
      for (const [key, url] of Object.entries(assetRegistry)) {
        if (key.startsWith(`${style}/`)) {
          const parts = key.split('/');
          const fileName = parts[parts.length - 1];
          if (fileName.includes('.')) {
            results.set(fileName, { name: fileName, url, style: this.getStyleDisplayName(style) });
          }
        }
      }
    }

    return Array.from(results.values());
  }

  /**
   * List all available styles discovered from the directory structure
   */
  getAvailableStyles(): string[] {
    const styles = new Set<string>(['default']);
    for (const key of Object.keys(assetRegistry)) {
      const s = key.split('/')[0];
      if (s) styles.add(s);
    }
    for (const key of Object.keys(soundRegistry)) {
      const s = key.split('/')[0];
      if (s) styles.add(s);
    }
    for (const s of Object.keys(cssRegistry)) {
      if (s) styles.add(s);
    }
    return Array.from(styles).sort((a, b) => {
      if (a === 'default') return -1;
      if (b === 'default') return 1;
      return a.localeCompare(b);
    });
  }

  /**
   * Inspect the asset registry (helpful for debugging)
   */
  getRegistry(): Readonly<AssetMap> {
    return { ...assetRegistry };
  }

  /**
   * Inspect the CSS registry (helpful for debugging)
   */
  getCssRegistry(): Readonly<Record<string, Record<string, string>>> {
    return { ...cssRegistry };
  }
}

export const styleService = new StyleService();
