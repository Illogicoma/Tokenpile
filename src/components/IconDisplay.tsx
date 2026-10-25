import React, { useState } from 'react';

/**
 * Checks whether a given string is an image source (URL, Data URL, relative path, or image file extension)
 */
export function isImageSource(src?: string): boolean {
  if (!src) return false;
  const s = src.trim().toLowerCase();
  return (
    s.startsWith('http://') ||
    s.startsWith('https://') ||
    s.startsWith('data:image/') ||
    s.startsWith('blob:') ||
    s.startsWith('/') ||
    s.startsWith('./') ||
    s.endsWith('.png') ||
    s.endsWith('.jpg') ||
    s.endsWith('.jpeg') ||
    s.endsWith('.webp') ||
    s.endsWith('.gif') ||
    s.endsWith('.svg') ||
    s.includes('.png?') ||
    s.includes('.jpg?') ||
    s.includes('.webp?') ||
    s.includes('.gif?')
  );
}

/**
 * Checks if a string is a country or regional flag emoji.
 * Country flags consist of two Regional Indicator Symbols (U+1F1E6 to U+1F1FF)
 * or subdivision flags starting with black flag (U+1F3F4).
 */
export function isFlagEmoji(str?: string): boolean {
  if (!str) return false;
  const trimmed = str.trim();
  const chars = [...trimmed];
  if (chars.length === 2) {
    const cp1 = chars[0].codePointAt(0);
    const cp2 = chars[1].codePointAt(0);
    return (
      cp1 !== undefined && cp1 >= 0x1F1E6 && cp1 <= 0x1F1FF &&
      cp2 !== undefined && cp2 >= 0x1F1E6 && cp2 <= 0x1F1FF
    );
  }
  if (chars.length > 2) {
    const firstCp = chars[0].codePointAt(0);
    if (firstCp === 0x1F3F4) return true;
  }
  return false;
}

/**
 * Returns a high-resolution vector SVG Twemoji URL for any flag emoji.
 */
export function getFlagSvgUrl(flagEmoji: string): string {
  const codePoints = [...flagEmoji.trim()]
    .map(c => c.codePointAt(0)?.toString(16))
    .filter(c => c && c !== 'fe0f')
    .join('-');
  return `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/${codePoints}.svg`;
}

export interface IconDisplayProps {
  icon?: string;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
  fallback?: string;
}

/**
 * Universal Icon / Token Display component that seamlessly handles:
 * - Unicode Emojis & Symbols
 * - World Flags (via Twemoji vector SVGs for crisp rendering on Windows/all browsers)
 * - Web Image URLs (HTTP/HTTPS)
 * - Data URLs (base64 PNG, GIF, WebP, JPG)
 * - Local relative paths (/assets/...)
 */
export const IconDisplay: React.FC<IconDisplayProps> = ({
  icon,
  className = '',
  style,
  alt = '',
  fallback = '⚡'
}) => {
  const [hasError, setHasError] = useState(false);
  const raw = icon?.trim() || fallback;

  if (isImageSource(raw) && !hasError) {
    return (
      <img
        src={raw}
        alt={alt}
        className={`app-icon-img ${className}`}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block',
          borderRadius: 'inherit',
          ...style
        }}
        onError={() => setHasError(true)}
        loading="lazy"
      />
    );
  }

  // World Flags (render Twemoji SVG so flags display everywhere, including Windows)
  if (isFlagEmoji(raw) && !hasError) {
    return (
      <img
        src={getFlagSvgUrl(raw)}
        alt={alt || raw}
        className={`app-icon-img app-icon-flag ${className}`}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block',
          borderRadius: '2px',
          ...style
        }}
        onError={() => setHasError(true)}
        loading="lazy"
      />
    );
  }

  // Unicode Emoji or fallback character
  return (
    <span
      className={`app-icon-emoji ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
        userSelect: 'none',
        ...style
      }}
    >
      {hasError ? fallback : raw}
    </span>
  );
};
