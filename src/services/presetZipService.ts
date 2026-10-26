import JSZip from 'jszip';
import type { SavedPreset, BetOutcome } from '../types/betting';
import { storageService, type CustomIconItem } from './storageService';

/**
 * Service to export and import race presets bundled with local icon images
 * as standalone, shareable .zip packages.
 */
export const presetZipService = {
  /**
   * Generates a .zip Blob containing preset.json and all bundled local entrant icons in /icons/
   */
  async exportPresetAsZip(preset: SavedPreset, includeLocalIcons: boolean = true): Promise<Blob> {
    const zip = new JSZip();
    const iconsFolder = zip.folder('icons');

    const exportedPreset: SavedPreset = {
      ...preset,
      outcomes: preset.outcomes.map((o) => ({ ...o })),
    };

    if (includeLocalIcons && iconsFolder) {
      exportedPreset.outcomes = await Promise.all(
        preset.outcomes.map(async (outcome, index) => {
          const outcomeCopy: BetOutcome = { ...outcome };
          const iconSrc = outcome.icon;

          // If icon is a base64 Data URL, extract as a physical file inside icons/
          if (iconSrc && iconSrc.startsWith('data:image/')) {
            try {
              const match = iconSrc.match(/^data:(image\/[a-zA-Z0-9\+\-\.]+);base64,(.+)$/);
              if (match) {
                const mimeType = match[1];
                const base64Content = match[2];

                let ext = 'png';
                if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
                else if (mimeType.includes('webp')) ext = 'webp';
                else if (mimeType.includes('svg')) ext = 'svg';
                else if (mimeType.includes('gif')) ext = 'gif';

                const safeName = (outcome.name || `runner_${outcome.number || index + 1}`)
                  .replace(/[^a-zA-Z0-9_\-]/g, '_')
                  .substring(0, 30);
                const filename = `runner_${outcome.number || index + 1}_${safeName}.${ext}`;

                // Convert base64 to binary byte array for JSZip
                const binaryString = atob(base64Content);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }

                iconsFolder.file(filename, bytes);
                // Relative path inside zip
                outcomeCopy.icon = `icons/${filename}`;
              }
            } catch (err) {
              console.warn(`Failed to package icon for outcome ${outcome.name}:`, err);
            }
          }
          return outcomeCopy;
        })
      );
    }

    // Add formatted preset.json
    zip.file('preset.json', JSON.stringify(exportedPreset, null, 2));

    // Add metadata / readme
    const readmeContent = `TokenPile Race Preset: ${preset.name}
Title: ${preset.title}
Racers: ${preset.outcomes.length}
Created: ${new Date(preset.createdAt || Date.now()).toLocaleString()}

To import this preset into TokenPile:
1. Open TokenPile in your browser.
2. Click the 'Presets' button in the top bar.
3. Click 'Import Preset (.zip)' and choose this file.
All runner configurations and custom local icons will be imported automatically!`;

    zip.file('README.txt', readmeContent);

    return await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
  },

  /**
   * Triggers a browser file download for the given Blob
   */
  downloadZip(blob: Blob, filename: string): void {
    const safeFilename = filename.endsWith('.zip') ? filename : `${filename}.zip`;
    const cleanName = safeFilename.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = cleanName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  /**
   * Unpacks a .zip (or parses a standalone .json), converts bundled icons to data URLs,
   * registers them in TokenPile's icon library under a folder, and saves the preset.
   */
  async importPresetFromZip(file: File): Promise<SavedPreset> {
    // If user selected a plain .json preset file instead of a .zip:
    if (file.name.endsWith('.json')) {
      const text = await file.text();
      const presetData = JSON.parse(text) as SavedPreset;
      presetData.id = `preset_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      presetData.createdAt = Date.now();
      storageService.savePreset(presetData);
      return presetData;
    }

    const zip = await JSZip.loadAsync(file);

    // 1. Locate preset.json (or first JSON file found)
    let presetFile = zip.file('preset.json');
    if (!presetFile) {
      const jsonFiles = zip.file(/\.json$/i);
      if (jsonFiles && jsonFiles.length > 0) {
        presetFile = jsonFiles[0];
      }
    }

    if (!presetFile) {
      throw new Error('Invalid preset archive: preset.json not found inside the ZIP.');
    }

    const presetJsonText = await presetFile.async('string');
    const presetData = JSON.parse(presetJsonText) as SavedPreset;

    // 2. Locate all image files in the zip and map them to base64 Data URLs
    const imageFiles = zip.file(/\.(png|jpe?g|webp|svg|gif)$/i);
    const iconPathMap = new Map<string, string>();
    const customIconsToSave: CustomIconItem[] = [];
    const folderName = `Preset: ${presetData.name || 'Imported'}`;

    for (const imgFile of imageFiles) {
      try {
        const ext = imgFile.name.split('.').pop()?.toLowerCase() || 'png';
        let mime = 'image/png';
        if (ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg';
        else if (ext === 'webp') mime = 'image/webp';
        else if (ext === 'svg') mime = 'image/svg+xml';
        else if (ext === 'gif') mime = 'image/gif';

        const base64 = await imgFile.async('base64');
        const dataUrl = `data:${mime};base64,${base64}`;

        const baseFileName = imgFile.name.split('/').pop() || imgFile.name;
        iconPathMap.set(imgFile.name, dataUrl);
        iconPathMap.set(baseFileName, dataUrl);
        iconPathMap.set(`icons/${baseFileName}`, dataUrl);
        iconPathMap.set(`./icons/${baseFileName}`, dataUrl);

        customIconsToSave.push({
          id: `zip_icon_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: baseFileName.replace(/\.[^/.]+$/, '').replace(/^runner_\d+_/, ''),
          src: dataUrl,
          type: 'local',
          dateAdded: Date.now(),
          folder: folderName,
        });
      } catch (err) {
        console.warn(`Failed to extract icon ${imgFile.name}:`, err);
      }
    }

    // Save extracted icons to local storage so they appear in IconPicker library
    if (customIconsToSave.length > 0) {
      storageService.saveCustomIcons(customIconsToSave);
    }

    // 3. Map outcomes back to the Data URLs
    if (presetData.outcomes && Array.isArray(presetData.outcomes)) {
      presetData.outcomes = presetData.outcomes.map((outcome) => {
        let icon = outcome.icon;
        if (icon && iconPathMap.has(icon)) {
          icon = iconPathMap.get(icon)!;
        } else if (icon) {
          const stripped = icon.replace(/^\.\//, '').replace(/^icons\//, '');
          if (iconPathMap.has(stripped)) {
            icon = iconPathMap.get(stripped)!;
          }
        }
        return {
          ...outcome,
          icon: icon || outcome.icon,
          totalBet: 0,
          bettorCount: 0,
          odds: 1.0,
          percentage: 0,
          isLocked: false,
        };
      });
    }

    // Assign fresh ID and timestamp
    presetData.id = `preset_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    presetData.createdAt = Date.now();

    storageService.savePreset(presetData);
    return presetData;
  },
};
