import { useMemo, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment as DreiEnvironment } from '@react-three/drei';
import { Physics, RigidBody, CuboidCollider, RoundCylinderCollider, type RapierRigidBody } from '@react-three/rapier';
import type { Collider as RapierCollider } from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { DropEvent, GeneratedTokenDef, UserRosterItem, CameraAngle3D, BucketConfig, PileLayout, TokenTier } from './types/betting';
import { getActiveTierConfigs } from './TokenManager';
import { getContainerGeometry } from './utils/bucketGeometry';
import { isImageSource, isFlagEmoji, getFlagSvgUrl } from './components/IconDisplay';

// Global image cache for custom image tokens
const imageCache = new Map<string, HTMLImageElement>();

function getCoinImage(src: string, onReady?: () => void): HTMLImageElement | null {
  if (imageCache.has(src)) {
    const img = imageCache.get(src)!;
    if (img.complete && img.naturalWidth > 0) return img;
    return null;
  }
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    if (onReady) onReady();
  };
  img.src = src;
  imageCache.set(src, img);
  return null;
}

/**
 * Dimensions for each coin tier in 3D space.
 * Proportioned dynamically from configured scale3D (base: scale 0.85 -> 0.38 rad, 0.13 thk).
 */
function get3DTierDimensions(tier: TokenTier, thicknessMultiplier: number = 1.0) {
  const tiers = getActiveTierConfigs();
  const cfg = tiers.find(t => t.tier === tier);
  if (cfg) {
    const scaleRatio = cfg.scale3D / 0.85;
    const radius = 0.38 * scaleRatio;
    const thickness = 0.13 * scaleRatio * thicknessMultiplier;
    return { radius, thickness };
  }

  let radius = 0.38;
  let baseThickness = 0.14;

  switch (tier) {
    case 'colossal':
      radius = 0.98;
      baseThickness = 0.30;
      break;
    case 'legendary':
      radius = 0.76;
      baseThickness = 0.22;
      break;
    case 'mythic':
      radius = 0.65;
      baseThickness = 0.19;
      break;
    case 'platinum':
      radius = 0.56;
      baseThickness = 0.16;
      break;
    case 'gold':
      radius = 0.49;
      baseThickness = 0.15;
      break;
    case 'silver':
      radius = 0.42;
      baseThickness = 0.14;
      break;
    default: // 'base'
      radius = 0.38;
      baseThickness = 0.13;
      break;
  }

  const thickness = baseThickness * thicknessMultiplier;
  return { radius, thickness };
}

// Global caches for 3D alpha-sampled extruded tokens
const extrudedGeometryCache = new Map<string, THREE.BufferGeometry>();
const extrudedMaterialCache = new Map<string, THREE.MeshStandardMaterial>();

function getOrCreateExtrudedMaterial(def: GeneratedTokenDef): THREE.MeshStandardMaterial {
  const key = `${def.tier}_${def.metalness ?? 0.85}_${def.roughness ?? 0.2}_${def.finish ?? 'standard'}`;
  if (extrudedMaterialCache.has(key)) return extrudedMaterialCache.get(key)!;

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    metalness: Math.max(0.65, def.metalness ?? 0.85),
    roughness: Math.min(0.35, def.roughness ?? 0.2),
  });

  if (def.tier === 'colossal') {
    mat.emissive = new THREE.Color('#f43f5e');
    mat.emissiveIntensity = 0.22;
  } else if (def.tier === 'legendary') {
    mat.emissive = new THREE.Color('#f59e0b');
    mat.emissiveIntensity = 0.24;
  } else if (def.tier === 'mythic') {
    mat.emissive = new THREE.Color('#a855f7');
    mat.emissiveIntensity = 0.20;
  } else if (def.tier === 'platinum') {
    mat.emissive = new THREE.Color('#38bdf8');
    mat.emissiveIntensity = 0.18;
  } else if (def.tier === 'gold') {
    mat.emissive = new THREE.Color('#d97706');
    mat.emissiveIntensity = 0.14;
  }

  extrudedMaterialCache.set(key, mat);
  return mat;
}

/**
 * Creates or retrieves a 3D alpha-sampled extruded token geometry with a raised metallic highlight outline.
 * Supports emojis, custom local PNG/GIFs, and web images.
 */
function getOrCreateExtrudedTokenGeometry(
  def: GeneratedTokenDef,
  thicknessMultiplier: number = 1.0
): THREE.BufferGeometry {
  const { radius, thickness } = get3DTierDimensions(def.tier, thicknessMultiplier);
  const key = `${def.emoji}_${def.tier}_${radius.toFixed(3)}_${thickness.toFixed(3)}`;
  if (extrudedGeometryCache.has(key)) {
    return extrudedGeometryCache.get(key)!;
  }

  const isFlag = isFlagEmoji(def.emoji);
  const isImg = isImageSource(def.emoji) || isFlag;
  const tokenImgSrc = isFlag ? getFlagSvgUrl(def.emoji) : def.emoji;
  const size = 16; // 16x16 = 256 voxel grid resolution (smooth 60fps & low memory)
  const targetSpan = radius * 2.1;
  const voxelSize = targetSpan / size;
  const rimThickness = Math.max(0.18, thickness * 1.35);
  const innerThickness = Math.max(0.12, thickness * 0.90);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    const box = new THREE.BoxGeometry(targetSpan, targetSpan, rimThickness);
    extrudedGeometryCache.set(key, box);
    return box;
  }

  ctx.clearRect(0, 0, size, size);

  if (isImg) {
    const loadedImg = getCoinImage(tokenImgSrc, () => {
      extrudedGeometryCache.delete(key);
    });
    if (loadedImg) {
      const margin = 1;
      const targetDim = size - margin * 2;
      const scale = Math.min(targetDim / loadedImg.naturalWidth, targetDim / loadedImg.naturalHeight);
      const drawW = Math.max(1, Math.round(loadedImg.naturalWidth * scale));
      const drawH = Math.max(1, Math.round(loadedImg.naturalHeight * scale));
      const drawX = Math.round((size - drawW) / 2);
      const drawY = Math.round((size - drawH) / 2);
      ctx.drawImage(loadedImg, drawX, drawY, drawW, drawH);
    } else {
      ctx.font = `${Math.round(size * 0.70)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💎', size / 2, size / 2 + 1);
    }
  } else {
    ctx.font = `${Math.round(size * 0.70)}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.emoji || '⚡', size / 2, size / 2 + 1);
  }

  let imgData: Uint8ClampedArray;
  try {
    imgData = ctx.getImageData(0, 0, size, size).data;
  } catch {
    const box = new THREE.BoxGeometry(targetSpan, targetSpan, rimThickness);
    extrudedGeometryCache.set(key, box);
    return box;
  }

  const getPixel = (px: number, py: number) => {
    const i = (py * size + px) * 4;
    return { r: imgData[i], g: imgData[i + 1], b: imgData[i + 2], a: imgData[i + 3] };
  };
  const cTL = getPixel(0, 0);
  const cTR = getPixel(size - 1, 0);
  const cBL = getPixel(0, size - 1);
  const cBR = getPixel(size - 1, size - 1);
  const isSolidBg = isImg &&
    cTL.a > 240 && cTR.a > 240 && cBL.a > 240 && cBR.a > 240 &&
    Math.abs(cTL.r - cTR.r) < 15 && Math.abs(cTL.g - cTR.g) < 15 && Math.abs(cTL.b - cTR.b) < 15 &&
    Math.abs(cTL.r - cBL.r) < 15 && Math.abs(cTL.g - cBL.g) < 15 && Math.abs(cTL.b - cBL.b) < 15;

  const isPixelSolid = (px: number, py: number) => {
    const i = (py * size + px) * 4;
    const a = imgData[i + 3];
    if (a < 35) return false;
    if (isSolidBg) {
      const dr = Math.abs(imgData[i] - cTL.r);
      const dg = Math.abs(imgData[i + 1] - cTL.g);
      const db = Math.abs(imgData[i + 2] - cTL.b);
      if (dr < 25 && dg < 25 && db < 25) return false;
    }
    return true;
  };

  const solidGrid = new Uint8Array(size * size);
  let solidCount = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (isPixelSolid(x, y)) {
        solidGrid[y * size + x] = 1;
        solidCount++;
      }
    }
  }

  if (solidCount === 0) {
    const box = new THREE.BoxGeometry(targetSpan, targetSpan, rimThickness);
    extrudedGeometryCache.set(key, box);
    return box;
  }

  // 8-neighborhood outline
  const outlineGrid = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (solidGrid[y * size + x]) continue;
      let isNeighbor = false;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
            if (solidGrid[ny * size + nx]) {
              isNeighbor = true;
              break;
            }
          }
        }
        if (isNeighbor) break;
      }
      if (isNeighbor) outlineGrid[y * size + x] = 1;
    }
  }

  // Tier highlight colors
  let tierOutlineColor = '#94a3b8';
  let tierGlowColor = '#ffffff';
  let tierShadowColor = '#475569';

  if (def.tier === 'colossal') {
    tierOutlineColor = '#f43f5e';
    tierGlowColor = '#fda4af';
    tierShadowColor = '#9f1239';
  } else if (def.tier === 'legendary') {
    tierOutlineColor = '#f59e0b';
    tierGlowColor = '#fef08a';
    tierShadowColor = '#92400e';
  } else if (def.tier === 'mythic') {
    tierOutlineColor = '#c084fc';
    tierGlowColor = '#f3e8ff';
    tierShadowColor = '#6b21a8';
  } else if (def.tier === 'platinum') {
    tierOutlineColor = '#38bdf8';
    tierGlowColor = '#e0f2fe';
    tierShadowColor = '#0369a1';
  } else if (def.tier === 'gold') {
    tierOutlineColor = '#fbbf24';
    tierGlowColor = '#fef3c7';
    tierShadowColor = '#b45309';
  } else if (def.tier === 'silver') {
    tierOutlineColor = '#e2e8f0';
    tierGlowColor = '#ffffff';
    tierShadowColor = '#64748b';
  } else {
    tierOutlineColor = def.colorTint || def.entrantColor || '#fbbf24';
    tierGlowColor = '#ffffff';
    tierShadowColor = '#475569';
  }

  const baseTint = new THREE.Color(tierOutlineColor);
  const glowTint = new THREE.Color(tierGlowColor);
  const shadowTint = new THREE.Color(tierShadowColor);

  const geometries: THREE.BufferGeometry[] = [];
  const baseInnerVoxel = new THREE.BoxGeometry(voxelSize, voxelSize, innerThickness);
  const baseOutlineVoxel = new THREE.BoxGeometry(voxelSize, voxelSize, rimThickness);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const isInner = solidGrid[y * size + x] === 1;
      const isBorder = outlineGrid[y * size + x] === 1;
      if (!isInner && !isBorder) continue;

      const voxel = (isBorder ? baseOutlineVoxel : baseInnerVoxel).clone();
      voxel.translate((x - size / 2) * voxelSize, -(y - size / 2) * voxelSize, 0);

      const count = voxel.attributes.position.count;
      const colors = new Float32Array(count * 3);

      if (isBorder) {
        const t = (x + y) / (size * 2);
        const c = new THREE.Color();
        if (t < 0.45) {
          c.copy(glowTint).lerp(baseTint, t / 0.45);
        } else {
          c.copy(baseTint).lerp(shadowTint, (t - 0.45) / 0.55);
        }
        for (let i = 0; i < count; i++) {
          colors[i * 3] = c.r;
          colors[i * 3 + 1] = c.g;
          colors[i * 3 + 2] = c.b;
        }
      } else {
        const idx = (y * size + x) * 4;
        const r = imgData[idx] / 255;
        const g = imgData[idx + 1] / 255;
        const b = imgData[idx + 2] / 255;
        for (let i = 0; i < count; i++) {
          colors[i * 3] = r;
          colors[i * 3 + 1] = g;
          colors[i * 3 + 2] = b;
        }
      }

      voxel.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometries.push(voxel);
    }
  }

  if (geometries.length === 0) {
    baseInnerVoxel.dispose();
    baseOutlineVoxel.dispose();
    const box = new THREE.BoxGeometry(targetSpan, targetSpan, rimThickness);
    extrudedGeometryCache.set(key, box);
    return box;
  }

  const merged = mergeGeometries(geometries, false);
  merged.computeVertexNormals();

  // Clean up temporary constituent voxel geometries from GPU/RAM
  baseInnerVoxel.dispose();
  baseOutlineVoxel.dispose();
  for (let i = 0; i < geometries.length; i++) {
    geometries[i].dispose();
  }

  extrudedGeometryCache.set(key, merged);
  return merged;
}

interface Active3DToken {
  id: string;
  userId?: string;
  outcomeId?: string;
  def: GeneratedTokenDef;
  badgeText?: string;
  position: [number, number, number];
  rotation: [number, number, number];
  velocity: [number, number, number];
  timestamp: number;
}

// --- Individual 3D Coin Item with Rapier Physics ---
// --- Individual 3D Coin Headless Physics Body (Rapier Simulation Only) ---
const Single3DToken = ({ 
  token, 
  thickness, 
  isWinnerBurst,
  isBucketTrapdoorOpen = false,
  jostleTrigger = 0,
  registerRigidBody,
  unregisterRigidBody,
}: { 
  token: Active3DToken; 
  thickness: number; 
  isWinnerBurst: boolean; 
  isBucketTrapdoorOpen?: boolean;
  jostleTrigger?: number;
  registerRigidBody: (id: string, rb: RapierRigidBody) => void;
  unregisterRigidBody: (id: string) => void;
}) => {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const colliderRef = useRef<RapierCollider>(null);

  // A token starts invisible to collision (sensor mode) if spawned in the top half (y > 0.0)
  const isSpawnedInTopHalf = token.position[1] > 0.0;
  const isCollisionEnabledRef = useRef(!isSpawnedInTopHalf);

  const { radius, thickness: baseThickness } = useMemo(() => {
    return get3DTierDimensions(token.def.tier, thickness / 0.22);
  }, [token.def.tier, thickness]);

  const rimThickness = Math.max(0.18, baseThickness * 1.35);
  const halfThickness = rimThickness / 2;

  // Settling & stabilization state tracker:
  // Detects when the token has stopped moving vertically and progressively damps micro-wiggles
  // until it is locked/frozen into a stable resting bedrock state.
  const settlingRef = useRef({
    lastY: token.position[1],
    restTimer: 0,
    isFrozen: false,
  });

  // Register rigid body into global map for InstancedMesh sync
  useEffect(() => {
    if (rigidBodyRef.current) {
      registerRigidBody(token.id, rigidBodyRef.current);
    }
    return () => {
      unregisterRigidBody(token.id);
    };
  }, [token.id]);

  // Winner burst explosion: immediately enable collision, unfreeze, wake up, and blast into air
  useEffect(() => {
    if (isWinnerBurst) {
      if (!isCollisionEnabledRef.current) {
        isCollisionEnabledRef.current = true;
        colliderRef.current?.setSensor(false);
      }
      if (rigidBodyRef.current) {
        const rb = rigidBodyRef.current;
        if (settlingRef.current.isFrozen) {
          settlingRef.current.isFrozen = false;
          rb.lockTranslations(false, true);
          rb.lockRotations(false, true);
        }
        settlingRef.current.restTimer = 0;
        rb.setLinearDamping(0.4);
        rb.setAngularDamping(0.6);
        rb.wakeUp();
        rb.applyImpulse({
          x: (Math.random() - 0.5) * 8,
          y: 14 + Math.random() * 10,
          z: (Math.random() - 0.5) * 8
        }, true);
        rb.applyTorqueImpulse({
          x: (Math.random() - 0.5) * 4,
          y: (Math.random() - 0.5) * 4,
          z: (Math.random() - 0.5) * 4
        }, true);
      }
    }
  }, [isWinnerBurst]);

  // Trapdoor opening or closing: wake up, unfreeze, and adjust translation locks
  useEffect(() => {
    if (isBucketTrapdoorOpen) {
      if (!isCollisionEnabledRef.current) {
        isCollisionEnabledRef.current = true;
        colliderRef.current?.setSensor(false);
      }
      if (rigidBodyRef.current) {
        const rb = rigidBodyRef.current;
        if (settlingRef.current.isFrozen) {
          settlingRef.current.isFrozen = false;
          rb.lockTranslations(false, true);
          rb.lockRotations(false, true);
        }
        settlingRef.current.restTimer = 0;
        rb.setLinearDamping(0.2);
        rb.setAngularDamping(0.3);
        rb.wakeUp();
        rb.applyImpulse({ x: 0, y: -0.8, z: 0 }, true);
      }
    } else {
      // Trapdoor floor closed: wake up and rejostle any surviving tokens so they settle onto the floor
      if (rigidBodyRef.current) {
        const rb = rigidBodyRef.current;
        if (settlingRef.current.isFrozen) {
          settlingRef.current.isFrozen = false;
          rb.lockTranslations(false, true);
          rb.lockRotations(false, true);
        }
        settlingRef.current.restTimer = 0;
        rb.setLinearDamping(0.2);
        rb.setAngularDamping(0.3);
        rb.wakeUp();
        rb.applyImpulse({ x: 0, y: -0.5, z: 0 }, true);
      }
    }
  }, [isBucketTrapdoorOpen]);

  // Rejostle & Trip Physics Switch Effect
  useEffect(() => {
    if (jostleTrigger && jostleTrigger > 0) {
      if (!isCollisionEnabledRef.current) {
        isCollisionEnabledRef.current = true;
        colliderRef.current?.setSensor(false);
      }
      if (rigidBodyRef.current) {
        const rb = rigidBodyRef.current;
        if (settlingRef.current.isFrozen) {
          settlingRef.current.isFrozen = false;
          rb.lockTranslations(false, true);
          rb.lockRotations(false, true);
        }
        settlingRef.current.restTimer = 0;
        rb.setLinearDamping(0.2);
        rb.setAngularDamping(0.3);
        rb.wakeUp();
        rb.applyImpulse({
          x: (Math.random() - 0.5) * 0.6,
          y: 0.8 + Math.random() * 0.8,
          z: (Math.random() - 0.5) * 0.6
        }, true);
      }
    }
  }, [jostleTrigger]);

  // Active per-frame physics stabilization, anti-stall watchdog, progressive damping, and freeze logic
  useFrame((_, delta) => {
    const rb = rigidBodyRef.current;
    if (!rb) return;

    // While celebration burst or trapdoor is active, keep tokens dynamic and never freeze in air!
    if (isWinnerBurst || isBucketTrapdoorOpen) {
      if (settlingRef.current.isFrozen && rigidBodyRef.current) {
        settlingRef.current.isFrozen = false;
        rigidBodyRef.current.lockTranslations(false, true);
        rigidBodyRef.current.lockRotations(false, true);
      }
      settlingRef.current.restTimer = 0;
      return;
    }

    if (settlingRef.current.isFrozen) return;
    if (isCollisionEnabledRef.current && rb.isSleeping()) return;

    const pos = rb.translation();

    // 1. TOP-HALF GHOST PASS-THROUGH & COLLISION ACTIVATION HALFWAY DOWN (y <= 0.0)
    if (!isCollisionEnabledRef.current) {
      if (pos.y <= 0.0) {
        if (colliderRef.current) {
          colliderRef.current.setSensor(false);
          isCollisionEnabledRef.current = true;
        }
      } else {
        if (rb.isSleeping()) {
          rb.wakeUp();
        }
        const vel = rb.linvel();
        if (vel.y > -2.0) {
          rb.applyImpulse({ x: 0, y: -1.2, z: 0 }, true);
        }
        return;
      }
    }

    // 2. MID-ZONE AUTO-WAKE (0.5 < y)
    if (pos.y > 0.5) {
      if (rb.isSleeping()) {
        rb.wakeUp();
      }
      return;
    }

    // 3. PILE ZONE (y <= 0.5): FAST EXIT IF ALREADY SLEEPING
    if (rb.isSleeping()) return;

    const vel = rb.linvel();
    const avel = rb.angvel();

    // Floor containment check
    if (pos.y < -5.4) {
      rb.setTranslation({ x: pos.x * 0.9, y: -4.6, z: pos.z * 0.9 }, true);
      rb.setLinvel({ x: 0, y: 0.1, z: 0 }, true);
      return;
    }

    // Measure vertical displacement since last frame
    const vertDelta = Math.abs(pos.y - settlingRef.current.lastY);
    settlingRef.current.lastY = pos.y;

    // Tokens can only solidify into bedrock if they are settled near the floor (floorY = -5.0)
    // pos.y < -2.2 guarantees tokens won't freeze in mid-air high above the floor
    const isVerticallyAtRest = pos.y < -2.2 && Math.abs(vel.y) < 0.25 && vertDelta < 0.04;

    if (isVerticallyAtRest) {
      settlingRef.current.restTimer += delta;
    } else {
      settlingRef.current.restTimer = Math.max(0, settlingRef.current.restTimer - delta * 2.5);
      return;
    }

    const t = settlingRef.current.restTimer;

    // Stage 1: Progressively damp horizontal wiggles & rotations
    if (t > 0.35 && t <= 0.85) {
      const factor = (t - 0.35) / 0.50;
      rb.setLinearDamping(1.5 + factor * 8.0);
      rb.setAngularDamping(2.0 + factor * 10.0);

      rb.setLinvel({
        x: vel.x * (1 - factor * 0.25),
        y: vel.y * 0.6,
        z: vel.z * (1 - factor * 0.25)
      }, true);
      rb.setAngvel({
        x: avel.x * (1 - factor * 0.30),
        y: avel.y * (1 - factor * 0.30),
        z: avel.z * (1 - factor * 0.30)
      }, true);
    }
    // Stage 2: Extinguish residual motion and sleep
    else if (t > 0.85 && t <= 1.4) {
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
      rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
      rb.setLinearDamping(12.0);
      rb.setAngularDamping(14.0);
      rb.sleep();
    }
    // Stage 3: Lock translations & rotations to create solid bedrock layer
    else if (t > 1.4) {
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
      rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
      rb.lockTranslations(true, false);
      rb.lockRotations(true, false);
      rb.sleep();
      settlingRef.current.isFrozen = true;
    }
  });

  const bevel = 0.025;
  const colHalfH = Math.max(0.04, halfThickness - bevel);
  const colRadius = Math.max(0.1, radius - bevel);

  return (
    <RigidBody
      ref={rigidBodyRef}
      colliders={false}
      canSleep={true}
      linearDamping={0.15}
      angularDamping={0.25}
      position={token.position}
      rotation={token.rotation}
      linearVelocity={token.velocity}
    >
      <RoundCylinderCollider
        ref={colliderRef}
        sensor={isSpawnedInTopHalf}
        args={[colHalfH, colRadius, bevel]}
        rotation={[Math.PI / 2, 0, 0]}
        restitution={0.06}
        friction={0.35}
      />
    </RigidBody>
  );
};

// --- GPU Instanced Mesh Group (Renders 1000s of tokens in 1 draw call per unique token geometry) ---
interface InstancedTokenGroupProps {
  tokens: Active3DToken[];
  def: GeneratedTokenDef;
  thickness: number;
  rigidBodiesMapRef: React.MutableRefObject<Map<string, RapierRigidBody>>;
}

const InstancedTokenGroup = ({
  tokens,
  def,
  thickness,
  rigidBodiesMapRef,
}: InstancedTokenGroupProps) => {
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const isFlag = isFlagEmoji(def.emoji);
  const isImg = isImageSource(def.emoji) || isFlag;
  const tokenImgSrc = isFlag ? getFlagSvgUrl(def.emoji) : def.emoji;
  const [imgLoaded, setImgLoaded] = useState(() => !isImg || (imageCache.has(tokenImgSrc) && imageCache.get(tokenImgSrc)!.complete));

  useEffect(() => {
    if (!isImg || imgLoaded) return;
    getCoinImage(tokenImgSrc, () => {
      setImgLoaded(true);
    });
  }, [isImg, tokenImgSrc, imgLoaded]);

  const geometry = useMemo(() => {
    return getOrCreateExtrudedTokenGeometry(def, thickness / 0.22);
  }, [def, thickness, imgLoaded]);

  const material = useMemo(() => {
    return getOrCreateExtrudedMaterial(def);
  }, [def]);

  const tempObj = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  // Initialize instanceColor buffer attribute on mount
  useEffect(() => {
    const mesh = instancedMeshRef.current;
    if (mesh && !mesh.instanceColor) {
      mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(2000 * 3), 3);
    }
  }, []);

  const lastSleepingMapRef = useRef<Map<string, boolean>>(new Map());

  useFrame(() => {
    const mesh = instancedMeshRef.current;
    if (!mesh) return;
    const count = tokens.length;
    const isCountChanged = mesh.count !== count;
    let anyNeedsUpdate = isCountChanged;

    for (let i = 0; i < count; i++) {
      const token = tokens[i];
      const rb = rigidBodiesMapRef.current.get(token.id);
      if (rb) {
        const isSleeping = rb.isSleeping();
        const wasSleeping = lastSleepingMapRef.current.get(token.id);

        // If body was already sleeping and its matrix was previously uploaded, skip expensive WASM queries!
        if (isSleeping && wasSleeping === true && !isCountChanged) {
          continue;
        }

        lastSleepingMapRef.current.set(token.id, isSleeping);

        const pos = rb.translation();
        const rot = rb.rotation();
        tempObj.position.set(pos.x, pos.y, pos.z);
        tempObj.quaternion.set(rot.x, rot.y, rot.z, rot.w);
        tempObj.updateMatrix();
        mesh.setMatrixAt(i, tempObj.matrix);

        // Set color only on initialization or count change
        if (isCountChanged || wasSleeping === undefined) {
          const tint = token.def.colorTint || token.def.entrantColor || '#fbbf24';
          tempColor.set(tint);
          mesh.setColorAt(i, tempColor);
        }

        anyNeedsUpdate = true;
      } else {
        tempObj.position.set(token.position[0], token.position[1], token.position[2]);
        tempObj.rotation.set(token.rotation[0], token.rotation[1], token.rotation[2]);
        tempObj.updateMatrix();
        mesh.setMatrixAt(i, tempObj.matrix);
        tempColor.set(token.def.colorTint || token.def.entrantColor || '#fbbf24');
        mesh.setColorAt(i, tempColor);
        anyNeedsUpdate = true;
      }
    }

    if (isCountChanged) {
      mesh.count = count;
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    }

    if (anyNeedsUpdate) {
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <instancedMesh
      ref={instancedMeshRef}
      args={[geometry, material, 2000]}
      castShadow
      receiveShadow
    />
  );
};

// --- Manager grouping active tokens by geometry/tier and rendering them via InstancedMesh ---
const InstancedTokensManager = ({
  tokens,
  thickness,
  rigidBodiesMapRef,
}: {
  tokens: Active3DToken[];
  thickness: number;
  rigidBodiesMapRef: React.MutableRefObject<Map<string, RapierRigidBody>>;
}) => {
  const groups = useMemo(() => {
    const map = new Map<string, { def: GeneratedTokenDef; tokens: Active3DToken[] }>();
    for (const t of tokens) {
      const key = `${t.def.emoji}_${t.def.tier}`;
      let group = map.get(key);
      if (!group) {
        group = { def: t.def, tokens: [] };
        map.set(key, group);
      }
      group.tokens.push(t);
    }
    return Array.from(map.values());
  }, [tokens]);

  return (
    <group>
      {groups.map((g) => (
        <InstancedTokenGroup
          key={`${g.def.emoji}_${g.def.tier}`}
          tokens={g.tokens}
          def={g.def}
          thickness={thickness}
          rigidBodiesMapRef={rigidBodiesMapRef}
        />
      ))}
    </group>
  );
};

// --- Scene Setup ---
export interface PhysicsSceneProps {
  dropEvent: DropEvent | null;
  thickness: number;
  pileOffset: { x: number; y: number };
  users: UserRosterItem[];
  isWinnerBurst?: boolean;
  onResetTrigger?: number;
  condenseTrigger?: number;
  cameraAngle?: CameraAngle3D;
  isVisible?: boolean;
  bucketConfig?: BucketConfig;
  pileLayout?: PileLayout;
  isBucketTrapdoorOpen?: boolean;
  jostleTrigger?: number;
}

export const PhysicsScene = ({ 
  dropEvent, 
  thickness, 
  pileOffset,
  isWinnerBurst = false,
  onResetTrigger = 0,
  condenseTrigger = 0,
  cameraAngle = 'perspective',
  isVisible = true,
  bucketConfig,
  pileLayout,
  isBucketTrapdoorOpen = false,
  jostleTrigger = 0
}: PhysicsSceneProps) => {
  const [tokens, setTokens] = useState<Active3DToken[]>([]);
  const [prevResetTrigger, setPrevResetTrigger] = useState(onResetTrigger);
  const lastProcessedEventIdRef = useRef<string | null>(null);

  // Rigid bodies registry for high-performance GPU InstancedMesh transform synchronization
  const rigidBodiesMapRef = useRef<Map<string, RapierRigidBody>>(new Map());

  const registerRigidBody = (id: string, rb: RapierRigidBody) => {
    rigidBodiesMapRef.current.set(id, rb);
  };

  const unregisterRigidBody = (id: string) => {
    rigidBodiesMapRef.current.delete(id);
  };

  // Track window dimensions to compute exact container geometry
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Compute container bounds based on 1080p reference broadcast canvas (OBS Standard)
  const geom = useMemo(() => {
    return getContainerGeometry(windowSize.width, windowSize.height, bucketConfig, pileLayout);
  }, [windowSize, bucketConfig, pileLayout]);

  // Compute 3D physics arena dimensions strictly proportional to container aspect ratio
  const aspect = geom.width / Math.max(1, geom.height);
  const arenaHeight3D = 10.0;
  const arenaWidth3D = useMemo(() => {
    return arenaHeight3D * aspect;
  }, [aspect]);
  const arenaDepth3D = useMemo(() => {
    return Math.max(5.5, Math.min(8.0, arenaWidth3D * 0.65));
  }, [arenaWidth3D]);

  // Clear on reset
  if (onResetTrigger !== prevResetTrigger) {
    setPrevResetTrigger(onResetTrigger);
    if (tokens.length > 0) {
      setTokens([]);
    }
  }

  // Staggered drop spawning into 3D world across the FULL bucket bounds
  useEffect(() => {
    if (!isVisible || !dropEvent) return;
    if (bucketConfig?.enableTokens === false) return;
    if (lastProcessedEventIdRef.current === dropEvent.id) return;
    lastProcessedEventIdRef.current = dropEvent.id;

    // If auto-tier merge, remove old lower-tier tokens only if combining is enabled and viewer exceeds threshold
    if (dropEvent.isTierMerge) {
      const threshold = bucketConfig?.combineThresholdPerUser ?? 50;
      const isAutoCombine = bucketConfig?.enableAutoCombine ?? true;
      const existingCount = tokens.filter(t => t.userId === dropEvent.userId && t.outcomeId === dropEvent.outcomeId).length;
      if (isAutoCombine && existingCount >= threshold) {
        queueMicrotask(() => {
          setTokens(prev => prev.filter(t => !(t.userId === dropEvent.userId && t.outcomeId === dropEvent.outcomeId)));
        });
      }
    }

    const maxAllowedTokens = bucketConfig?.maxArenaTokens ?? 800;
    const tokensToSpawn: Active3DToken[] = [];

    // Safe wall clearances: token radius is up to 0.76 (Colossal).
    // Ensuring center is at least 1.15 units from any wall guarantees >0.35 units of clearance.
    const maxRadius = 0.76;
    const spawnHalfW = Math.max(0.3, (arenaWidth3D / 2) - (maxRadius + 0.35));
    const spawnHalfD = Math.max(0.2, (arenaDepth3D / 2) - (maxRadius + 0.35));

    let idx = 0;
    for (const group of dropEvent.tokens) {
      const { def, count } = group;
      for (let i = 0; i < count; i++) {
        // Concentrated central drop: bell curve distribution clustering tightly around the center
        // so incoming coins pile up naturally into an authentic, peaked mountain mound from the center
        const bellRandomX = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; // [-1, 1], bell curve
        const bellRandomZ = (Math.random() + Math.random() - 1.0); // [-1, 1], triangular distribution
        const posX = pileOffset.x + bellRandomX * (spawnHalfW * 0.38);
        const posZ = pileOffset.y + bellRandomZ * (spawnHalfD * 0.40);

        // Entry height staggered by index: creates a natural, successive waterfall cascade
        // without requiring multiple setTimeout timers or triggering 40-60 React re-renders per second!
        const posY = 3.8 + idx * 0.16 + (Math.random() - 0.5) * 0.05;

        tokensToSpawn.push({
          id: `${dropEvent.id}_${def.id}_${i}_${Math.random()}`,
          userId: dropEvent.userId,
          outcomeId: dropEvent.outcomeId,
          def,
          position: [posX, posY, posZ],
          rotation: [
            (Math.random() - 0.5) * 0.7,
            (Math.random() - 0.5) * 0.7,
            Math.random() * Math.PI * 2
          ],
          velocity: [
            (Math.random() - 0.5) * 0.5,
            -8.5 - Math.random() * 2.0,
            (Math.random() - 0.5) * 0.5
          ],
          timestamp: Date.now()
        });
        idx++;
      }
    }

    // Single batched state update: 1 single React re-render per drop event!
    setTokens(prev => {
      const combined = [...prev, ...tokensToSpawn];
      return combined.length > maxAllowedTokens ? combined.slice(combined.length - maxAllowedTokens) : combined;
    });
  }, [dropEvent, pileOffset, arenaWidth3D, arenaDepth3D, bucketConfig, isVisible]);

  // Trip physics switch on all rigid bodies when jostleTrigger fires
  useEffect(() => {
    if (jostleTrigger && jostleTrigger > 0) {
      rigidBodiesMapRef.current.forEach((rb) => {
        rb.lockTranslations(false, true);
        rb.lockRotations(false, true);
        rb.setLinearDamping(0.2);
        rb.setAngularDamping(0.3);
        rb.wakeUp();
        rb.applyImpulse({
          x: (Math.random() - 0.5) * 0.6,
          y: 0.8 + Math.random() * 0.8,
          z: (Math.random() - 0.5) * 0.6
        }, true);
      });
    }
  }, [jostleTrigger]);

  // Instant 1-Click "Condense Pile" for 3D tokens
  useEffect(() => {
    if (condenseTrigger === 0) return;

    // Wake up and unlock translations on all remaining 3D bodies
    rigidBodiesMapRef.current.forEach((rb) => {
      rb.lockTranslations(false, true);
      rb.lockRotations(false, true);
      rb.setLinearDamping(0.2);
      rb.setAngularDamping(0.3);
      rb.wakeUp();
      rb.applyImpulse({
        x: (Math.random() - 0.5) * 0.3,
        y: -0.6,
        z: (Math.random() - 0.5) * 0.3
      }, true);
    });

    queueMicrotask(() => {
      setTokens(prev => {
        if (prev.length === 0) return prev;

        const userMap = new Map<string, Active3DToken[]>();
        for (const t of prev) {
          const uid = t.userId || 'anon';
          const list = userMap.get(uid) || [];
          list.push(t);
          userMap.set(uid, list);
        }

        const condensed: Active3DToken[] = [];

        for (const [, userTokens] of userMap.entries()) {
          if (userTokens.length <= 1 && userTokens[0].def.tier !== 'base') {
            condensed.push(...userTokens);
            continue;
          }

          let totalVal = 0;
          let sumX = 0;
          let sumY = 0;
          let sumZ = 0;
          for (const t of userTokens) {
            totalVal += (t.def.value || 1);
            sumX += t.position[0];
            sumY += t.position[1];
            sumZ += t.position[2];
          }
          const avgX = sumX / userTokens.length;
          const avgY = Math.max(-4.2, sumY / userTokens.length);
          const avgZ = sumZ / userTokens.length;

          const lead = userTokens[0];
          let remaining = totalVal;
          let spawnIndex = 0;

          for (const cfg of getActiveTierConfigs()) {
            if (remaining >= cfg.value) {
              const count = Math.floor(remaining / cfg.value);
              const actualCount = Math.min(count, 4);
              const perTokenVal = (count * cfg.value) / actualCount;

              for (let i = 0; i < actualCount; i++) {
                condensed.push({
                  id: `condensed_3d_${lead.userId}_${cfg.tier}_${spawnIndex}_${Date.now()}_${Math.random()}`,
                  userId: lead.userId,
                  outcomeId: lead.outcomeId,
                  def: {
                    ...lead.def,
                    tier: cfg.tier,
                    value: perTokenVal,
                    colorTint: cfg.tint,
                  },
                  position: [
                    avgX + (Math.random() - 0.5) * 1.2,
                    avgY + 0.8 + spawnIndex * 0.6,
                    avgZ + (Math.random() - 0.5) * 1.2,
                  ],
                  rotation: [
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                  ],
                  velocity: [
                    (Math.random() - 0.5) * 1.2,
                    2.2 + Math.random() * 1.5,
                    (Math.random() - 0.5) * 1.2,
                  ],
                  timestamp: Date.now(),
                });
                spawnIndex++;
              }
              remaining -= count * cfg.value;
            }
          }

          if (remaining > 0) {
            condensed.push({
              id: `condensed_3d_${lead.userId}_base_${Date.now()}_${Math.random()}`,
              userId: lead.userId,
              outcomeId: lead.outcomeId,
              def: {
                ...lead.def,
                tier: 'base',
                value: remaining,
                colorTint: '#94a3b8',
              },
              badgeText: remaining > 1 ? `${Math.round(remaining)}pt` : undefined,
              position: [avgX, avgY + 0.8, avgZ],
              rotation: [0, 0, 0],
              velocity: [0, 1.8, 0],
              timestamp: Date.now(),
            });
          }
        }

        return condensed;
      });
    });
  }, [condenseTrigger]);

  // Periodic automatic 3D token consolidation (governed by combineThresholdPerUser & enableAutoCombine)
  useEffect(() => {
    const interval = setInterval(() => {
      setTokens(prev => {
        const isAutoCombine = bucketConfig?.enableAutoCombine ?? true;
        const threshold = bucketConfig?.combineThresholdPerUser ?? 12;
        if (!isAutoCombine || prev.length < 12) return prev;

        const userMap = new Map<string, Active3DToken[]>();
        for (const t of prev) {
          const uid = t.userId || 'anon';
          const list = userMap.get(uid) || [];
          list.push(t);
          userMap.set(uid, list);
        }

        let didMerge = false;
        const newTokens: Active3DToken[] = [];

        for (const [, userTokens] of userMap.entries()) {
          // Respect viewer threshold: do not combine if user has not reached their threshold
          if (userTokens.length < threshold) {
            newTokens.push(...userTokens);
            continue;
          }

          const baseTokens = userTokens.filter(t => t.def.tier === 'base');
          if (baseTokens.length >= 4 && !didMerge) {
            didMerge = true;
            const cluster = baseTokens.slice(0, 4);
            const remainingForUser = userTokens.filter(t => !cluster.includes(t));
            let totalClusterVal = 0;
            let sumX = 0, sumY = 0, sumZ = 0;
            for (const c of cluster) {
              totalClusterVal += (c.def.value || 1);
              sumX += c.position[0];
              sumY += c.position[1];
              sumZ += c.position[2];
            }
            const lead = cluster[0];
            const mergedToken: Active3DToken = {
              id: `auto_3d_${lead.userId}_silver_${Date.now()}_${Math.random()}`,
              userId: lead.userId,
              outcomeId: lead.outcomeId,
              def: {
                ...lead.def,
                tier: 'silver',
                value: Math.max(100, totalClusterVal),
                colorTint: '#e2e8f0',
              },
              position: [sumX / 4, Math.max(-4.2, sumY / 4) + 0.5, sumZ / 4],
              rotation: [0, 0, 0],
              velocity: [0, 1.5, 0],
              timestamp: Date.now(),
            };
            newTokens.push(...remainingForUser, mergedToken);
          } else {
            newTokens.push(...userTokens);
          }
        }

        if (didMerge) {
          // Trip physics switch on all remaining rigid bodies so tokens resting on top immediately drop
          rigidBodiesMapRef.current.forEach(rb => {
            rb.lockTranslations(false, true);
            rb.lockRotations(false, true);
            rb.setLinearDamping(0.2);
            rb.setAngularDamping(0.3);
            rb.wakeUp();
            rb.applyImpulse({
              x: (Math.random() - 0.5) * 0.3,
              y: -0.6,
              z: (Math.random() - 0.5) * 0.3
            }, true);
          });
        }

        return didMerge ? newTokens : prev;
      });
    }, 600);

    return () => clearInterval(interval);
  }, [bucketConfig]);

  // Clear tokens when tokens are disabled entirely
  useEffect(() => {
    if (bucketConfig?.enableTokens === false) {
      setTokens([]);
    }
  }, [bucketConfig?.enableTokens]);

  return (
    <div 
      className="canvas-container canvas-3d"
      style={{ 
        position: 'absolute',
        left: `${geom.x}px`,
        top: `${geom.y}px`,
        width: `${geom.width}px`,
        height: `${geom.height}px`,
        overflow: 'hidden',
        borderRadius: '12px',
        opacity: isVisible ? 1 : 0, 
        pointerEvents: isVisible ? 'auto' : 'none', 
        visibility: isVisible ? 'visible' : 'hidden',
        transition: 'opacity 0.15s ease',
        zIndex: 10,
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
        backdropFilter: 'none',
      }}
    >

      {/* Three.js 3D WebGL Canvas strictly inside the calibrated bucket bounds */}
      <Canvas 
        frameloop={isVisible ? 'always' : 'never'}
        camera={{ position: [0, 0.5, 17.5], fov: 36 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        style={{ width: '100%', height: '100%' }}
      >
        <DreiEnvironment preset="city" />
        <DynamicCamera 
          pileOffset={pileOffset} 
          cameraAngle={cameraAngle} 
          tokensCount={tokens.length}
          aspect={aspect}
        />
        
        <ambientLight intensity={1.3} />
        <directionalLight position={[12, 22, 16]} intensity={1.6} castShadow />
        <pointLight position={[-10, 15, -10]} intensity={0.8} color="#818cf8" />
        <pointLight position={[10, 15, 10]} intensity={0.8} color="#f472b6" />
        
        <Physics gravity={[0, -32, 0]} timeStep="vary" interpolate={true} paused={!isVisible}>
          <PhysicsArena 
            pileOffset={pileOffset} 
            arenaWidth={arenaWidth3D}
            arenaDepth={arenaDepth3D}
            isBucketTrapdoorOpen={isBucketTrapdoorOpen}
          />
          
          {tokens.map((token) => (
            <Single3DToken 
              key={token.id} 
              token={token} 
              thickness={thickness} 
              isWinnerBurst={isWinnerBurst} 
              isBucketTrapdoorOpen={isBucketTrapdoorOpen}
              jostleTrigger={jostleTrigger}
              registerRigidBody={registerRigidBody}
              unregisterRigidBody={unregisterRigidBody}
            />
          ))}

          <InstancedTokensManager
            tokens={tokens}
            thickness={thickness}
            rigidBodiesMapRef={rigidBodiesMapRef}
          />
        </Physics>
      </Canvas>
    </div>
  );
};

// --- Dynamic Camera Logic: Calibrated to Frame the Entire Bucket Bounds ---
const DynamicCamera = ({ 
  pileOffset,
  cameraAngle,
  tokensCount,
  aspect
}: { 
  pileOffset: { x: number; y: number };
  cameraAngle: CameraAngle3D;
  tokensCount: number;
  aspect: number;
}) => {
  const lookAtRef = useRef(new THREE.Vector3(0, -0.1, 0));

  useFrame((state, delta) => {
    // Pile factor scales gently with token count:
    const pileFactor = Math.min(1.0, Math.sqrt(tokensCount) / Math.sqrt(70));

    const arenaH = 10.0;
    const vFovRad = (36 * Math.PI) / 180;
    const baseDist = (arenaH * 1.14) / (2 * Math.tan(vFovRad / 2)); // ≈ 17.5
    const halfW = (arenaH * aspect) / 2;

    let targetX = pileOffset.x;
    let targetY = 0.5 + pileFactor * 0.4;
    let targetZ = baseDist + pileFactor * 1.2;
    let lookX = pileOffset.x;
    let lookY = -0.1 + pileFactor * 0.3;
    let lookZ = pileOffset.y;

    if (cameraAngle === 'side-profile') {
      targetX = pileOffset.x + Math.max(7.5, halfW * 1.35);
      targetY = 1.0 + pileFactor * 0.6;
      targetZ = baseDist * 0.75 + pileFactor * 1.2;
      lookX = pileOffset.x;
      lookY = -0.2 + pileFactor * 0.3;
      lookZ = pileOffset.y;
    } else if (cameraAngle === 'top-down') {
      targetX = pileOffset.x;
      targetY = baseDist * 0.95 + pileFactor * 1.5;
      targetZ = pileOffset.y + 0.4;
      lookX = pileOffset.x;
      lookY = -0.5;
      lookZ = pileOffset.y;
    } else if (cameraAngle === 'corner-isometric') {
      const isoDist = baseDist * 0.85 + pileFactor * 1.2;
      targetX = pileOffset.x + isoDist * 0.72;
      targetY = isoDist * 0.62;
      targetZ = pileOffset.y + isoDist * 0.75;
      lookX = pileOffset.x;
      lookY = -0.3;
      lookZ = pileOffset.y;
    }

    const lerpSpeed = Math.min(1, 1 - Math.exp(-4.0 * delta));
    state.camera.position.x += (targetX - state.camera.position.x) * lerpSpeed;
    state.camera.position.y += (targetY - state.camera.position.y) * lerpSpeed;
    state.camera.position.z += (targetZ - state.camera.position.z) * lerpSpeed;

    lookAtRef.current.x += (lookX - lookAtRef.current.x) * lerpSpeed;
    lookAtRef.current.y += (lookY - lookAtRef.current.y) * lerpSpeed;
    lookAtRef.current.z += (lookZ - lookAtRef.current.z) * lerpSpeed;

    state.camera.lookAt(lookAtRef.current.x, lookAtRef.current.y, lookAtRef.current.z);
  });

  return null;
};

// --- Environment Arena & Bounds: Conformed to Calibrated Bucket Dimensions ---
const PhysicsArena = ({ 
  pileOffset,
  arenaWidth,
  arenaDepth,
  isBucketTrapdoorOpen = false
}: { 
  pileOffset: { x: number; y: number };
  arenaWidth: number;
  arenaDepth: number;
  isBucketTrapdoorOpen?: boolean;
}) => {
  const halfW = arenaWidth / 2;
  const halfD = arenaDepth / 2;
  const floorY = -5.0;
  const wallHeight = 24;

  return (
    <group position={[pileOffset.x, 0, pileOffset.y]}>
      {/* Flat Floor Collider (collapsible when trapdoor opens) */}
      {!isBucketTrapdoorOpen && (
        <RigidBody type="fixed" position={[0, floorY - 0.25, 0]}>
          <CuboidCollider args={[halfW + 2, 0.25, halfD + 2]} friction={0.92} restitution={0.04} />
        </RigidBody>
      )}

      {/* Safety Catch Net below floor */}
      <RigidBody type="fixed" position={[0, isBucketTrapdoorOpen ? -40 : -14, 0]}>
        <CuboidCollider args={[halfW * 3, 1.5, halfD * 3]} friction={0.9} restitution={0.05} />
      </RigidBody>
      


      {/* Left Wall Collider - Slick zero-friction chute */}
      <RigidBody type="fixed" position={[-halfW - 0.25, 5, 0]}>
        <CuboidCollider args={[0.25, wallHeight / 2, halfD + 1]} friction={0.02} restitution={0.05} />
      </RigidBody>

      {/* Right Wall Collider - Slick zero-friction chute */}
      <RigidBody type="fixed" position={[halfW + 0.25, 5, 0]}>
        <CuboidCollider args={[0.25, wallHeight / 2, halfD + 1]} friction={0.02} restitution={0.05} />
      </RigidBody>

      {/* Back Wall Collider - Slick zero-friction chute */}
      <RigidBody type="fixed" position={[0, 5, -halfD - 0.25]}>
        <CuboidCollider args={[halfW + 1, wallHeight / 2, 0.25]} friction={0.02} restitution={0.05} />
      </RigidBody>

      {/* Front Transparent Glass Wall Collider - Slick zero-friction chute */}
      <RigidBody type="fixed" position={[0, 5, halfD + 0.25]}>
        <CuboidCollider args={[halfW + 1, wallHeight / 2, 0.25]} friction={0.02} restitution={0.05} />
      </RigidBody>
    </group>
  );
};
