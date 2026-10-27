import { useEffect, useRef } from 'react';
import Matter from 'matter-js';
import type { DropEvent, PileLayout, BucketConfig, GeneratedTokenDef } from '../types/betting';
import { getTierFromValue, getActiveTierConfigs } from '../TokenManager';
import { getContainerGeometry } from '../utils/bucketGeometry';
import { isImageSource, isFlagEmoji, getFlagSvgUrl } from './IconDisplay';

const { Engine, Runner, Bodies, Composite, Body, Sleeping, Events } = Matter;

const imageCache2D = new Map<string, HTMLImageElement>();

function getSpriteImage(src: string, onReady?: () => void): HTMLImageElement | null {
  if (imageCache2D.has(src)) {
    const img = imageCache2D.get(src)!;
    if (img.complete && img.naturalWidth > 0) return img;
    return null;
  }
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    if (onReady) onReady();
  };
  img.src = src;
  imageCache2D.set(src, img);
  return null;
}

interface PhysicsScene2DProps {
  dropEvent: DropEvent | null;
  pileLayout?: PileLayout;
  bucketConfig?: BucketConfig;
  onResetTrigger: number;
  condenseTrigger?: number;
  isWinnerBurst?: boolean;
  isVisible?: boolean;
  isBucketTrapdoorOpen?: boolean;
  jostleTrigger?: number;
}

interface Token2DBody extends Matter.Body {
  tokenData?: {
    userId?: string;
    outcomeId?: string;
    emoji: string;
    tier: string;
    tint: string;
    radius: number;
    value: number;
    entrantColor?: string;
  };
  spriteCanvas?: HTMLCanvasElement;
}

// Global High-Speed Offscreen Sprite Cache (Zero Font shaping / Zero allocation per frame)
const spriteCache = new Map<string, HTMLCanvasElement>();

function getTierRadius(tier: string): number {
  switch (tier) {
    case 'colossal': return 28;
    case 'legendary': return 25;
    case 'mythic': return 22;
    case 'platinum': return 19;
    case 'gold': return 16;
    case 'silver': return 14;
    default: return 12;
  }
}

function getOrCreateTokenSprite(emoji: string, tier: string, tint: string, radius: number, badgeText?: string): HTMLCanvasElement {
  const key = `${emoji}_${tier}_${tint}_${radius}_${badgeText || ''}`;
  if (spriteCache.has(key)) {
    return spriteCache.get(key)!;
  }

  // Prevent unbounded cache growth
  if (spriteCache.size > 300) {
    const oldestKey = spriteCache.keys().next().value;
    if (oldestKey) spriteCache.delete(oldestKey);
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const padding = 8;
  const size = Math.ceil((radius + padding) * 2);
  const canvas = document.createElement('canvas');
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  const ctx = canvas.getContext('2d');

  if (!ctx) return canvas;

  ctx.scale(dpr, dpr);
  const cx = size / 2;
  const cy = size / 2;
  const fontSize = Math.round(radius * 1.55);

  // Configure Tier Color Hierarchy
  let outlineColor = '#94a3b8';
  let innerRimColor = '#64748b';
  let highlightGlow = '#f8fafc';
  let glowBlur = 3;

  if (tier === 'colossal') {
    outlineColor = '#f43f5e';
    innerRimColor = '#be123c';
    highlightGlow = '#fda4af';
    glowBlur = 7;
  } else if (tier === 'legendary') {
    outlineColor = '#f59e0b';
    innerRimColor = '#b45309';
    highlightGlow = '#fef08a';
    glowBlur = 6;
  } else if (tier === 'mythic') {
    outlineColor = '#c084fc';
    innerRimColor = '#7e22ce';
    highlightGlow = '#f3e8ff';
    glowBlur = 5;
  } else if (tier === 'platinum') {
    outlineColor = '#38bdf8';
    innerRimColor = '#0284c7';
    highlightGlow = '#e0f2fe';
    glowBlur = 4;
  } else if (tier === 'gold') {
    outlineColor = '#fbbf24';
    innerRimColor = '#d97706';
    highlightGlow = '#fef3c7';
    glowBlur = 4;
  } else if (tier === 'silver') {
    outlineColor = '#e2e8f0';
    innerRimColor = '#64748b';
    highlightGlow = '#ffffff';
    glowBlur = 3;
  } else {
    outlineColor = tint || '#cbd5e1';
    innerRimColor = 'rgba(100, 116, 139, 0.8)';
    highlightGlow = 'rgba(255, 255, 255, 0.7)';
    glowBlur = 2;
  }

  // 1. Create Shape-Hugging Mask Canvas
  // We draw the emoji in 8 radial offset directions, then use source-in to flood
  // it with the metallic tier gradient. This creates a silhouette outline that
  const isFlag = isFlagEmoji(emoji);
  const isImg = isImageSource(emoji) || isFlag;
  const effectiveSrc = isFlag ? getFlagSvgUrl(emoji) : emoji;
  const loadedImg = isImg ? getSpriteImage(effectiveSrc, () => {
    spriteCache.delete(key);
  }) : null;
  const imgDim = radius * 1.5;

  // 1. Shape-Hugging Tier Outline & Mask
  const mask = document.createElement('canvas');
  mask.width = size * dpr;
  mask.height = size * dpr;
  const mctx = mask.getContext('2d');

  if (mctx) {
    mctx.scale(dpr, dpr);
    const outlineDist = tier === 'legendary' || tier === 'colossal' ? 3.0 : tier === 'mythic' || tier === 'platinum' ? 2.5 : 2.0;
    const angles = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4, Math.PI, (5 * Math.PI) / 4, (3 * Math.PI) / 2, (7 * Math.PI) / 4];

    if (loadedImg) {
      for (const angle of angles) {
        const ox = Math.cos(angle) * outlineDist;
        const oy = Math.sin(angle) * outlineDist;
        mctx.drawImage(loadedImg, cx - imgDim / 2 + ox, cy - imgDim / 2 + oy, imgDim, imgDim);
      }
    } else if (!isImg) {
      mctx.font = `${fontSize}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
      mctx.textAlign = 'center';
      mctx.textBaseline = 'middle';
      for (const angle of angles) {
        const ox = Math.cos(angle) * outlineDist;
        const oy = Math.sin(angle) * outlineDist;
        mctx.fillText(emoji, cx + ox, cy + oy);
      }
    }

    // Cut with source-in so only the expanded emoji shape remains, tinted with the tier metallic gradient
    mctx.globalCompositeOperation = 'source-in';
    const grad = mctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, highlightGlow);
    grad.addColorStop(0.5, outlineColor);
    grad.addColorStop(1, innerRimColor);
    mctx.fillStyle = grad;
    mctx.fillRect(0, 0, size, size);

    // 2. Render Shadow & Radiant Tier Glow onto the sprite canvas
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    ctx.drawImage(mask, 0, 0, size, size);
    ctx.restore();

    ctx.save();
    ctx.shadowColor = outlineColor;
    ctx.shadowBlur = glowBlur;
    ctx.drawImage(mask, 0, 0, size, size);
    ctx.drawImage(mask, 0, 0, size, size);
    ctx.restore();
  }

  // 3. Crisp Centered Full-Color Glyph or Image on top
  if (loadedImg) {
    ctx.drawImage(loadedImg, cx - imgDim / 2, cy - imgDim / 2, imgDim, imgDim);
  } else if (!isImg) {
    ctx.font = `${fontSize}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, cx, cy);
  }

  // 4. Combined Multiplier Badge (if consolidated at bottom of pile)
  if (badgeText) {
    const badgeR = radius * 0.45;
    const bx = cx + radius * 0.55;
    const by = cy + radius * 0.55;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.beginPath();
    ctx.arc(bx, by, badgeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = highlightGlow;
    ctx.font = `700 ${Math.round(radius * 0.42)}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, bx, by + 0.5);
  }

  spriteCache.set(key, canvas);
  return canvas;
}

export const PhysicsScene2D = ({
  dropEvent,
  pileLayout = 'center',
  bucketConfig,
  onResetTrigger,
  condenseTrigger = 0,
  isWinnerBurst = false,
  isVisible = true,
  isBucketTrapdoorOpen = false,
  jostleTrigger = 0
}: PhysicsScene2DProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const floorRef = useRef<Matter.Body | null>(null);
  const wallsRef = useRef<Matter.Body[]>([]);
  const containerBoundsRef = useRef<{ x: number; y: number; width: number; height: number }>({ x: 0, y: 0, width: 280, height: 380 });
  const animFrameIdRef = useRef<number | null>(null);
  const lastProcessedEventIdRef = useRef<string | null>(null);

  // Keep latest bucketConfig in ref so collision handlers and drop logic always have latest threshold values
  const bucketConfigRef = useRef(bucketConfig);
  useEffect(() => {
    bucketConfigRef.current = bucketConfig;
  }, [bucketConfig]);

  const updateWallsRef = useRef<(() => void) | null>(null);

  // Anti-Cavitation: Target-wake resting tokens directly above removed/merged coins so they fall naturally into voids
  const wakeBodiesAbove = (removed: Token2DBody[]) => {
    const engine = engineRef.current;
    if (!engine || removed.length === 0) return;
    const world = engine.world;
    const allBodies = Composite.allBodies(world) as Token2DBody[];

    let minX = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < removed.length; i++) {
      const b = removed[i];
      const r = b.tokenData?.radius ?? 14;
      if (b.position.x - r < minX) minX = b.position.x - r;
      if (b.position.x + r > maxX) maxX = b.position.x + r;
      if (b.position.y + r > maxY) maxY = b.position.y + r;
    }

    const margin = 32;
    minX -= margin;
    maxX += margin;

    for (let i = 0; i < allBodies.length; i++) {
      const b = allBodies[i];
      if (!b.tokenData || b.isSensor) continue;

      if (b.position.x >= minX && b.position.x <= maxX && b.position.y < maxY) {
        if (b.isStatic) Body.setStatic(b, false);
        if (b.isSleeping) Sleeping.set(b, false);
        Body.setVelocity(b, {
          x: b.velocity.x * 0.5 + (Math.random() - 0.5) * 0.4,
          y: Math.max(b.velocity.y, 0.8 + Math.random() * 0.6)
        });
      }
    }
  };

  const wakeBodiesAboveRef = useRef(wakeBodiesAbove);
  wakeBodiesAboveRef.current = wakeBodiesAbove;



  // Initialize Matter.js Engine & World once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Enable sleeping and optimal solver iterations for circle tokens
    const engine = Engine.create({
      enableSleeping: true,
      positionIterations: 4,
      velocityIterations: 3,
      gravity: { x: 0, y: 1.6, scale: 0.001 }
    });
    engineRef.current = engine;

    const runner = Runner.create({
      delta: 1000 / 60
    });
    runnerRef.current = runner;
    if (isVisible) {
      Runner.run(runner, engine);
    }

    // --- REAL-TIME CONTACT FUSION (Suika / 2048 Arcade Fusion) ---
    // When two tokens from the SAME viewer collide, fuse them instantly!
    const pendingMerges: Array<{ bodyA: Token2DBody; bodyB: Token2DBody }> = [];
    const mergedThisStep = new Set<Matter.Body>();

    const handleCollisionStart = (event: Matter.IEventCollision<Matter.Engine>) => {
      const cfg = bucketConfigRef.current;
      const isAutoCombineEnabled = cfg?.enableAutoCombine ?? true;
      if (!isAutoCombineEnabled) return;

      const thresholdPerUser = cfg?.combineThresholdPerUser ?? 40;
      const maxArenaTokens = cfg?.maxArenaTokens ?? 800;

      const allBodies = Composite.allBodies(engine.world) as Token2DBody[];
      const activeTokens = allBodies.filter(b => b.tokenData?.userId);
      const totalTokenCount = activeTokens.length;

      const pairs = event.pairs;
      for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i];
        const bodyA = pair.bodyA as Token2DBody;
        const bodyB = pair.bodyB as Token2DBody;

        // Both must be active user tokens
        if (!bodyA.tokenData?.userId || !bodyB.tokenData?.userId) continue;
        // Strictly per-viewer: only tokens from the same viewer combine!
        if (bodyA.tokenData.userId !== bodyB.tokenData.userId) continue;
        // Avoid double-merging in the same physics frame
        if (mergedThisStep.has(bodyA) || mergedThisStep.has(bodyB)) continue;

        // Smart Hybrid Governor:
        // If arena is not overcrowded, check if this specific user has exceeded their threshold
        if (totalTokenCount <= maxArenaTokens) {
          const userTokenCount = activeTokens.filter(
            b => b.tokenData?.userId === bodyA.tokenData?.userId
          ).length;

          // If this viewer has NOT exceeded their personal token threshold, DO NOT FUSE!
          if (userTokenCount <= thresholdPerUser) {
            continue;
          }
        }

        const valA = bodyA.tokenData.value || 1;
        const valB = bodyB.tokenData.value || 1;
        const sumVal = valA + valB;
        const sameTier = bodyA.tokenData.tier === bodyB.tokenData.tier;
        const reachesNewTier = (valA < 100 && sumVal >= 100) ||
          (valA < 500 && sumVal >= 500) ||
          (valA < 1000 && sumVal >= 1000) ||
          (valA < 5000 && sumVal >= 5000) ||
          (valA < 10000 && sumVal >= 10000) ||
          (valA < 25000 && sumVal >= 25000);

        if (sameTier || reachesNewTier) {
          mergedThisStep.add(bodyA);
          mergedThisStep.add(bodyB);
          pendingMerges.push({ bodyA, bodyB });
        }
      }
    };

    const handleAfterUpdate = () => {
      if (pendingMerges.length === 0) return;

      const toProcess = pendingMerges.splice(0, pendingMerges.length);
      mergedThisStep.clear();

      for (const { bodyA, bodyB } of toProcess) {
        if (!engine.world) continue;
        const all = Composite.allBodies(engine.world);
        if (!all.includes(bodyA) || !all.includes(bodyB)) continue;

        const valA = bodyA.tokenData?.value || 1;
        const valB = bodyB.tokenData?.value || 1;
        const totalVal = valA + valB;

        const tierInfo = getTierFromValue(totalVal);
        const leadEmoji = bodyA.tokenData?.emoji || bodyB.tokenData?.emoji || '🪙';
        const leadUserId = bodyA.tokenData?.userId;
        const leadOutcomeId = bodyA.tokenData?.outcomeId || bodyB.tokenData?.outcomeId;
        const leadEntrantColor = bodyA.tokenData?.entrantColor || bodyB.tokenData?.entrantColor;

        const midX = (bodyA.position.x + bodyB.position.x) / 2;
        const midY = (bodyA.position.y + bodyB.position.y) / 2;

        Composite.remove(engine.world, [bodyA, bodyB]);
        wakeBodiesAboveRef.current?.([bodyA, bodyB]);

        const mergedBody = Bodies.circle(midX, midY - 2, tierInfo.radius2D, {
          restitution: 0.14,
          friction: 0.85,
          frictionAir: 0.02,
          density: 0.004,
        }) as Token2DBody;

        mergedBody.tokenData = {
          userId: leadUserId,
          outcomeId: leadOutcomeId,
          emoji: leadEmoji,
          tier: tierInfo.tier,
          tint: tierInfo.tint,
          radius: tierInfo.radius2D,
          value: totalVal,
          entrantColor: leadEntrantColor,
        };

        const badgeText = tierInfo.tier === 'base' && totalVal > 1
          ? `${Math.round(totalVal)}pt`
          : undefined;

        mergedBody.spriteCanvas = getOrCreateTokenSprite(
          leadEmoji,
          tierInfo.tier,
          tierInfo.tint,
          tierInfo.radius2D,
          badgeText
        );

        // Tactile upward arcade pop impulse
        Body.setVelocity(mergedBody, {
          x: (Math.random() - 0.5) * 1.2,
          y: -2.4 - Math.random() * 1.6,
        });

        Composite.add(engine.world, mergedBody);
      }
    };

    Events.on(engine, 'collisionStart', handleCollisionStart);
    Events.on(engine, 'afterUpdate', handleAfterUpdate);

    const updateCanvasSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Only resize canvas buffer if dimensions actually changed to avoid reallocating GPU texture
      const targetW = Math.round(w * dpr);
      const targetH = Math.round(h * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(dpr, dpr);
        }
      }

      const oldGeom = containerBoundsRef.current;
      const geom = getContainerGeometry(w, h, bucketConfigRef.current, pileLayout);
      containerBoundsRef.current = geom;

      // Recreate hopper walls
      if (wallsRef.current.length > 0) {
        Composite.remove(engine.world, wallsRef.current);
      }

      const wallThickness = 40;
      const floor = Bodies.rectangle(
        geom.x + geom.width / 2,
        geom.y + geom.height + wallThickness / 2,
        geom.width + wallThickness * 2,
        wallThickness,
        { isStatic: true, friction: 0.85, restitution: 0.15 }
      );

      const leftWall = Bodies.rectangle(
        geom.x - wallThickness / 2,
        geom.y + geom.height / 2,
        wallThickness,
        geom.height + 140,
        { isStatic: true, friction: 0.6, restitution: 0.2 }
      );

      const rightWall = Bodies.rectangle(
        geom.x + geom.width + wallThickness / 2,
        geom.y + geom.height / 2,
        wallThickness,
        geom.height + 140,
        { isStatic: true, friction: 0.6, restitution: 0.2 }
      );

      floorRef.current = floor;
      wallsRef.current = [floor, leftWall, rightWall];
      Composite.add(engine.world, wallsRef.current);

      // Reposition existing token bodies proportionally only when geometry changed substantially
      // (e.g. Window resize or preset snap), NOT on every 1-2px drag delta!
      if (oldGeom && oldGeom.width > 50 && oldGeom.height > 50) {
        const deltaX = geom.x - oldGeom.x;
        const deltaY = geom.y - oldGeom.y;
        const ratioW = geom.width / oldGeom.width;
        const ratioH = geom.height / oldGeom.height;

        if (Math.abs(deltaX) > 25 || Math.abs(deltaY) > 25 || Math.abs(ratioW - 1) > 0.15 || Math.abs(ratioH - 1) > 0.15) {
          const allBodies = Composite.allBodies(engine.world);
          for (const body of allBodies) {
            const tokenBody = body as Token2DBody;
            if (tokenBody.tokenData) {
              const relX = (body.position.x - oldGeom.x) / oldGeom.width;
              const relY = (body.position.y - oldGeom.y) / oldGeom.height;
              // Safe normalized bounds inside new hopper walls
              const clampedRelX = Math.max(0.06, Math.min(0.94, relX));
              const clampedRelY = Math.max(0.05, Math.min(0.96, relY));

              const newX = geom.x + clampedRelX * geom.width;
              const newY = geom.y + clampedRelY * geom.height;

              Body.setPosition(body, { x: newX, y: newY });
              Body.setVelocity(body, { x: 0, y: 0.1 });
              Sleeping.set(body, false);
            }
          }
        } else {
          // Subtle drag deltas: ONLY nudge tokens that would clip outside the adjusted walls
          const minX = geom.x + 18;
          const maxX = geom.x + geom.width - 18;
          const maxY = geom.y + geom.height - 14;
          const allBodies = Composite.allBodies(engine.world);
          for (const body of allBodies) {
            const tokenBody = body as Token2DBody;
            if (tokenBody.tokenData) {
              let needsNudge = false;
              let targetX = body.position.x;
              let targetY = body.position.y;
              if (targetX < minX) {
                targetX = minX;
                needsNudge = true;
              } else if (targetX > maxX) {
                targetX = maxX;
                needsNudge = true;
              }
              if (targetY > maxY) {
                targetY = maxY;
                needsNudge = true;
              }
              if (needsNudge) {
                Body.setPosition(body, { x: targetX, y: targetY });
                Sleeping.set(body, false);
              }
            }
          }
        }
      }
    };

    updateWallsRef.current = updateCanvasSize;
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      Events.off(engine, 'collisionStart', handleCollisionStart);
      Events.off(engine, 'afterUpdate', handleAfterUpdate);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (runnerRef.current) Runner.stop(runnerRef.current);
      if (engineRef.current) Composite.clear(engineRef.current.world, false);
    };
  }, []);

  // Update hopper walls whenever bucket layout or dimensions change without resetting the physics world
  useEffect(() => {
    if (updateWallsRef.current) {
      updateWallsRef.current();
    }
  }, [
    pileLayout,
    bucketConfig?.leftOffset,
    bucketConfig?.rightOffset,
    bucketConfig?.bottomMargin,
    bucketConfig?.height,
    bucketConfig?.hideWalls,
    getContainerGeometry
  ]);

  // Trapdoor Floor Opening Effect (Tokens fall through bottom when payout confirmed)
  useEffect(() => {
    const engine = engineRef.current;
    const floor = floorRef.current;
    if (!engine || !floor) return;

    if (isBucketTrapdoorOpen) {
      Composite.remove(engine.world, floor);
      // Wake up and un-static all tokens so gravity accelerates them downwards immediately
      Composite.allBodies(engine.world).forEach(b => {
        const tb = b as Token2DBody;
        if (tb.tokenData) {
          Body.setStatic(tb, false);
          Sleeping.set(tb, false);
        }
      });
    } else {
      const currentBodies = Composite.allBodies(engine.world);
      if (!currentBodies.includes(floor)) {
        Composite.add(engine.world, floor);
      }
      // Re-awaken and un-static any tokens surviving in the hopper when floor closes so they settle naturally onto the floor
      Composite.allBodies(engine.world).forEach(b => {
        const tb = b as Token2DBody;
        if (tb.tokenData) {
          Body.setStatic(tb, false);
          Sleeping.set(tb, false);
          Body.setVelocity(tb, {
            x: (Math.random() - 0.5) * 1.0,
            y: 0.5 + Math.random() * 1.0,
          });
        }
      });
    }
  }, [isBucketTrapdoorOpen]);

  // Rejostle & Trip Physics Switch Effect: Unfreeze and wake all tokens
  useEffect(() => {
    if (jostleTrigger > 0 && engineRef.current) {
      const allBodies = Composite.allBodies(engineRef.current.world);
      for (const body of allBodies) {
        const tb = body as Token2DBody;
        if (tb.tokenData) {
          Body.setStatic(tb, false);
          Sleeping.set(tb, false);
          Body.setVelocity(tb, {
            x: (Math.random() - 0.5) * 3.5,
            y: -1.5 - Math.random() * 2.0,
          });
          Body.setAngularVelocity(tb, (Math.random() - 0.5) * 0.25);
        }
      }
    }
  }, [jostleTrigger]);

  // Synchronize Runner execution with isVisible so Matter.js consumes 0% CPU when 3D is active
  useEffect(() => {
    const runner = runnerRef.current;
    const engine = engineRef.current;
    if (!runner || !engine) return;

    if (isVisible) {
      Runner.run(runner, engine);
    } else {
      Runner.stop(runner);
    }
  }, [isVisible]);

  // Ultra-Fast GPU Blit Render Loop (Runs only when isVisible is true!)
  useEffect(() => {
    if (!isVisible) {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Offscreen Static Bedrock Canvas: Bakes all resting/sleeping tokens into 1 pre-rendered bitmap
    // Reduces HTML5 canvas draw operations from 3,000+ per frame down to ~20 per frame!
    const staticCanvas = document.createElement('canvas');
    const staticCtx = staticCanvas.getContext('2d');
    let staticPileDirty = true;
    let prevSleepingCount = -1;

    const render = () => {
      if (!engineRef.current) return;

      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      const geom = containerBoundsRef.current;
      const halfwayY = geom.y + geom.height * 0.45;

      if (bucketConfig?.enableTokens === false) {
        return;
      }

      // Group bodies into static bedrock pile vs active moving tokens
      const allBodies = Composite.allBodies(engineRef.current.world);
      const activeBodies: Token2DBody[] = [];
      const sleepingBodies: Token2DBody[] = [];

      for (let i = 0; i < allBodies.length; i++) {
        const tokenBody = allBodies[i] as Token2DBody;
        if (!tokenBody.tokenData || !tokenBody.spriteCanvas) continue;

        // Top-half ghost pass-through: activate full physical collisions once halfway down
        if (tokenBody.isSensor && tokenBody.position.y >= halfwayY) {
          tokenBody.isSensor = false;
        }

        // Active settling & sleep governor: fast transition to rest for stationary tokens
        // BUT NEVER FREEZE TOKENS DURING TRAPDOOR OPENING OR WINNER CELEBRATION!
        const isExemptFromBedrock = isBucketTrapdoorOpen || isWinnerBurst;

        if (!isExemptFromBedrock) {
          if (tokenBody.speed < 0.20 && Math.abs(tokenBody.angularSpeed) < 0.08 && !tokenBody.isSleeping) {
            Sleeping.set(tokenBody, true);
          }

          // Keep tokens dynamic (sleeping only) so gravity acts naturally whenever supports underneath vanish
          if (tokenBody.isStatic) {
            Body.setStatic(tokenBody, false);
          }

          if (tokenBody.isSleeping) {
            sleepingBodies.push(tokenBody);
          } else {
            activeBodies.push(tokenBody);
          }
        } else {
          // In burst / trapdoor / win distribution mode, ensure bodies stay dynamic and active!
          if (tokenBody.isStatic) {
            Body.setStatic(tokenBody, false);
          }
          if (tokenBody.isSleeping) {
            Sleeping.set(tokenBody, false);
          }
          activeBodies.push(tokenBody);
        }
      }

      // If the count of sleeping tokens changes or a body was added/woken, re-bake the bedrock
      if (sleepingBodies.length !== prevSleepingCount) {
        prevSleepingCount = sleepingBodies.length;
        staticPileDirty = true;
      }

      if (staticPileDirty && staticCtx) {
        if (staticCanvas.width !== w || staticCanvas.height !== h) {
          staticCanvas.width = w;
          staticCanvas.height = h;
        } else {
          staticCtx.clearRect(0, 0, w, h);
        }

        for (let i = 0; i < sleepingBodies.length; i++) {
          const b = sleepingBodies[i];
          const { x, y } = b.position;
          const halfSize = b.tokenData!.radius + 8;
          staticCtx.save();
          staticCtx.translate(x, y);
          staticCtx.rotate(b.angle);
          staticCtx.drawImage(
            b.spriteCanvas!,
            -halfSize,
            -halfSize,
            halfSize * 2,
            halfSize * 2
          );
          staticCtx.restore();
        }
        staticPileDirty = false;
      }

      // 1. Blit static bedrock pile in ONE single draw call!
      if (sleepingBodies.length > 0) {
        ctx.drawImage(staticCanvas, 0, 0);
      }

      // 2. Render ONLY the few active moving tokens!
      for (let i = 0; i < activeBodies.length; i++) {
        const b = activeBodies[i];
        const { x, y } = b.position;
        const halfSize = b.tokenData!.radius + 8;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(b.angle);
        ctx.drawImage(
          b.spriteCanvas!,
          -halfSize,
          -halfSize,
          halfSize * 2,
          halfSize * 2
        );
        ctx.restore();
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, [isVisible, bucketConfig]);

  // Handle Token Drops (Persistent across view changes!)
  useEffect(() => {
    if (!isVisible || !dropEvent || !engineRef.current) return;
    if (bucketConfig?.enableTokens === false) return;
    if (lastProcessedEventIdRef.current === dropEvent.id) return;
    lastProcessedEventIdRef.current = dropEvent.id;

    const geom = containerBoundsRef.current;
    const world = engineRef.current.world;

    // Auto-merge user tokens if higher tier threshold was crossed (e.g. 99 base tokens + 1 more -> 1 silver token!)
    if (dropEvent.isTierMerge) {
      const allBodies = Composite.allBodies(world) as Token2DBody[];
      const existingUserTokens = allBodies.filter(b =>
        b.tokenData &&
        b.tokenData.userId === dropEvent.userId &&
        b.tokenData.outcomeId === dropEvent.outcomeId
      );

      const cfg = bucketConfigRef.current;
      const isAutoCombineEnabled = cfg?.enableAutoCombine ?? true;
      const thresholdPerUser = cfg?.combineThresholdPerUser ?? 12;

      // Only purge and consolidate into a single medal if auto-combining is active AND the user already has >= thresholdPerUser tokens!
      const shouldPurgeAndConsolidate = isAutoCombineEnabled && existingUserTokens.length >= thresholdPerUser;

      if (shouldPurgeAndConsolidate && existingUserTokens.length > 0) {
        let sumX = 0;
        let sumY = 0;
        for (const b of existingUserTokens) {
          sumX += b.position.x;
          sumY += b.position.y;
        }
        const spawnCenterX = sumX / existingUserTokens.length;
        const spawnCenterY = sumY / existingUserTokens.length;

        // Remove the previous lower-tier tokens from the physics world
        Composite.remove(world, existingUserTokens);

        // Rejostle & awaken all remaining bodies so tokens resting on top immediately drop down
        const remainingBodies = Composite.allBodies(world) as Token2DBody[];
        for (const b of remainingBodies) {
          if (b.tokenData) {
            if (b.isStatic) Body.setStatic(b, false);
            if (b.isSleeping) Sleeping.set(b, false);
            Body.setVelocity(b, {
              x: (Math.random() - 0.5) * 1.5,
              y: 0.5 + Math.random() * 1.5,
            });
          }
        }

        // Spawn the newly consolidated token(s) at the merge position with upward pop impulse
        let delay = 0;
        for (const group of dropEvent.tokens) {
          const { def, count } = group;
          for (let i = 0; i < count; i++) {
            setTimeout(() => {
              if (!engineRef.current) return;
              const radius = getTierRadius(def.tier);
              const spawnX = Math.max(geom.x + radius + 10, Math.min(geom.x + geom.width - radius - 10, spawnCenterX + (Math.random() - 0.5) * 16));
              const spawnY = Math.max(geom.y + 20, spawnCenterY - 12 - i * 6);

              const body = Bodies.circle(spawnX, spawnY, radius, {
                restitution: 0.14,
                friction: 0.85,
                frictionAir: 0.02,
                density: 0.004,
                angularVelocity: (Math.random() - 0.5) * 0.4,
              }) as Token2DBody;

              body.tokenData = {
                userId: dropEvent.userId,
                outcomeId: dropEvent.outcomeId,
                emoji: def.emoji,
                tier: def.tier,
                tint: def.colorTint,
                radius,
                value: def.value,
                entrantColor: def.entrantColor,
              };

              body.spriteCanvas = getOrCreateTokenSprite(def.emoji, def.tier, def.colorTint, radius);

              Body.setVelocity(body, {
                x: (Math.random() - 0.5) * 2.0,
                y: -4.0 - Math.random() * 2.0, // upward pop impulse upon consolidation
              });

              Composite.add(engineRef.current.world, body);
            }, delay);
            delay += 40;
          }
        }
        return;
      }
    }

    // Normal non-merge drop from top
    const tokensToSpawn: { def: GeneratedTokenDef; i: number }[] = [];

    for (const group of dropEvent.tokens) {
      for (let i = 0; i < group.count; i++) {
        tokensToSpawn.push({ def: group.def, i });
      }
    }

    // Successively staggered entry heights: natural waterfall cascade without setTimeout churn
    const bodiesToAdd: Token2DBody[] = [];
    const curCenterX = geom.x + geom.width / 2;

    for (let idx = 0; idx < tokensToSpawn.length; idx++) {
      const { def } = tokensToSpawn[idx];
      const radius = getTierRadius(def.tier);
      // Concentrated central drop: bell-curve distribution centered in the hopper
      const bellX = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
      const spawnX = curCenterX + bellX * (geom.width * 0.38);
      const spawnY = geom.y - 25 - (idx * 16);

      const body = Bodies.circle(spawnX, spawnY, radius, {
        isSensor: true, // Invisible to collisions in top half!
        restitution: 0.12,
        friction: 0.88,
        frictionAir: 0.02,
        density: 0.004,
        angularVelocity: (Math.random() - 0.5) * 0.3,
      }) as Token2DBody;

      body.tokenData = {
        userId: dropEvent.userId,
        outcomeId: dropEvent.outcomeId,
        emoji: def.emoji,
        tier: def.tier,
        tint: def.colorTint,
        radius,
        value: def.value,
        entrantColor: def.entrantColor,
      };

      body.spriteCanvas = getOrCreateTokenSprite(def.emoji, def.tier, def.colorTint, radius);

      Body.setVelocity(body, {
        x: (Math.random() - 0.5) * 1.0,
        y: 6.0 + Math.random() * 2.5,
      });

      bodiesToAdd.push(body);
    }

    if (bodiesToAdd.length > 0) {
      const world = engineRef.current.world;
      const maxBodies = bucketConfigRef.current?.maxArenaTokens ?? 2500;
      const allBodies = Composite.allBodies(world) as Token2DBody[];
      const tokenBodies = allBodies.filter(b => b.tokenData);
      if (tokenBodies.length + bodiesToAdd.length > maxBodies) {
        const overflow = (tokenBodies.length + bodiesToAdd.length) - maxBodies;
        // Purge oldest sleeping / static bodies first to prevent runaway physics memory
        const sleeping = tokenBodies.filter(b => b.isSleeping || b.isStatic);
        const toRemove = sleeping.slice(0, overflow);
        if (toRemove.length > 0) {
          Composite.remove(world, toRemove);
          wakeBodiesAbove(toRemove);
        }
      }
      Composite.add(world, bodiesToAdd);
    }
  }, [dropEvent, isVisible]);

  // Periodic 600ms Proximity Cascade Sweeper
  // Checks touching tokens strictly per-viewer and merges them if viewer reached threshold
  useEffect(() => {
    const interval = setInterval(() => {
      if (!engineRef.current) return;
      const cfg = bucketConfigRef.current;
      const threshold = cfg?.combineThresholdPerUser ?? 40;
      const isAutoCombine = cfg?.enableAutoCombine ?? true;
      if (!isAutoCombine) return;

      const world = engineRef.current.world;
      const allBodies = Composite.allBodies(world) as Token2DBody[];
      const tokenBodies = allBodies.filter(b => b.tokenData && b.tokenData.userId);

      if (tokenBodies.length < threshold) return;

      // Group active tokens strictly per viewer
      const userMap = new Map<string, Token2DBody[]>();
      for (const b of tokenBodies) {
        const uid = b.tokenData!.userId!;
        const list = userMap.get(uid) || [];
        list.push(b);
        userMap.set(uid, list);
      }

      for (const [, userTokens] of userMap.entries()) {
        if (userTokens.length < threshold) continue;

        // Group into touching clusters using spatial distance
        const visited = new Set<Token2DBody>();

        for (let i = 0; i < userTokens.length; i++) {
          const tA = userTokens[i];
          if (visited.has(tA)) continue;

          const cluster: Token2DBody[] = [tA];
          const rA = tA.tokenData!.radius;

          for (let j = i + 1; j < userTokens.length; j++) {
            const tB = userTokens[j];
            if (visited.has(tB)) continue;

            const rB = tB.tokenData!.radius;
            const dx = tA.position.x - tB.position.x;
            const dy = tA.position.y - tB.position.y;
            const distSq = dx * dx + dy * dy;
            const touchThreshold = rA + rB + 10;

            if (distSq <= touchThreshold * touchThreshold) {
              cluster.push(tB);
              visited.add(tB);
              if (cluster.length >= 4) break;
            }
          }

          if (cluster.length >= 2) {
            visited.add(tA);
            const leadTier = cluster[0].tokenData!.tier;
            let totalVal = 0;
            for (const c of cluster) totalVal += (c.tokenData?.value || 1);

            const tierInfo = getTierFromValue(totalVal);
            const shouldMerge = (tierInfo.tier !== leadTier) || (cluster.length >= 2);

            if (shouldMerge) {
              let avgX = 0;
              let avgY = 0;
              for (const c of cluster) {
                avgX += c.position.x;
                avgY += c.position.y;
              }
              avgX /= cluster.length;
              avgY /= cluster.length;

              const leadEmoji = cluster[0].tokenData?.emoji || '🪙';
              const leadOutcomeId = cluster[0].tokenData?.outcomeId;
              const leadEntrantColor = cluster[0].tokenData?.entrantColor;
              const leadUserId = cluster[0].tokenData?.userId;

              Composite.remove(world, cluster);
              wakeBodiesAbove(cluster);

              const mergedBody = Bodies.circle(avgX, avgY - 2, tierInfo.radius2D, {
                restitution: 0.14,
                friction: 0.85,
                frictionAir: 0.02,
                density: 0.004,
              }) as Token2DBody;

              mergedBody.tokenData = {
                userId: leadUserId,
                outcomeId: leadOutcomeId,
                emoji: leadEmoji,
                tier: tierInfo.tier,
                tint: tierInfo.tint,
                radius: tierInfo.radius2D,
                value: totalVal,
                entrantColor: leadEntrantColor,
              };

              const badgeText = tierInfo.tier === 'base' && totalVal > 1
                ? `${Math.round(totalVal)}pt`
                : (cluster.length > 2 ? `${cluster.length}x` : undefined);

              mergedBody.spriteCanvas = getOrCreateTokenSprite(
                leadEmoji,
                tierInfo.tier,
                tierInfo.tint,
                tierInfo.radius2D,
                badgeText
              );

              Body.setVelocity(mergedBody, { x: (Math.random() - 0.5) * 0.8, y: -1.2 });
              Composite.add(world, mergedBody);
            }
          }
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Periodic Anti-Cavitation Settle Governor (Runs every 1000ms)
  // Rapidly scans resting tokens using column bins (<0.05ms) and gently wakes any ungrounded floating tokens
  useEffect(() => {
    const interval = setInterval(() => {
      const engine = engineRef.current;
      if (!engine || !isVisible) return;
      if (isBucketTrapdoorOpen || isWinnerBurst) return;

      const geom = containerBoundsRef.current;
      const floorY = geom.y + geom.height;
      const world = engine.world;
      const allBodies = Composite.allBodies(world) as Token2DBody[];
      const tokenBodies = allBodies.filter(b => b.tokenData && !b.isSensor);

      if (tokenBodies.length < 5) return;

      const numCols = 24;
      const colWidth = Math.max(1, geom.width / numCols);
      const columns: Token2DBody[][] = Array.from({ length: numCols }, () => []);

      for (let i = 0; i < tokenBodies.length; i++) {
        const b = tokenBodies[i];
        const colIdx = Math.max(0, Math.min(numCols - 1, Math.floor((b.position.x - geom.x) / colWidth)));
        columns[colIdx].push(b);
      }

      for (let c = 0; c < numCols; c++) {
        const col = columns[c];
        for (let i = 0; i < col.length; i++) {
          const b = col[i];
          if (!b.isSleeping) continue;

          const r = b.tokenData!.radius;
          const bottomY = b.position.y + r;

          // Resting directly on floor -> grounded
          if (bottomY >= floorY - 14) continue;

          let hasSupport = false;
          const minCol = Math.max(0, c - 1);
          const maxCol = Math.min(numCols - 1, c + 1);

          for (let adj = minCol; adj <= maxCol && !hasSupport; adj++) {
            const adjCol = columns[adj];
            for (let j = 0; j < adjCol.length; j++) {
              const other = adjCol[j];
              if (other === b) continue;
              const otherR = other.tokenData!.radius;
              const dy = other.position.y - b.position.y;
              if (dy > 0 && dy < (r + otherR) * 1.35) {
                const dx = Math.abs(other.position.x - b.position.x);
                if (dx < (r + otherR) * 0.95) {
                  hasSupport = true;
                  break;
                }
              }
            }
          }

          if (!hasSupport) {
            if (b.isStatic) Body.setStatic(b, false);
            Sleeping.set(b, false);
            Body.setVelocity(b, {
              x: (Math.random() - 0.5) * 0.25,
              y: 1.0 + Math.random() * 0.5
            });
          }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, isBucketTrapdoorOpen, isWinnerBurst]);

  // Clear tokens when tokens are disabled entirely
  useEffect(() => {
    if (bucketConfig?.enableTokens === false && engineRef.current) {
      const allBodies = Composite.allBodies(engineRef.current.world);
      const tokenBodies = allBodies.filter(b => !wallsRef.current.includes(b));
      if (tokenBodies.length > 0) {
        Composite.remove(engineRef.current.world, tokenBodies);
      }
    }
  }, [bucketConfig?.enableTokens]);

  // Instant 1-Click "Condense Pile" for 2D arena
  useEffect(() => {
    if (condenseTrigger === 0 || !engineRef.current) return;
    const world = engineRef.current.world;
    const allBodies = Composite.allBodies(world) as Token2DBody[];
    const tokenBodies = allBodies.filter(b => b.tokenData && b.tokenData.userId);

    if (tokenBodies.length === 0) return;

    // Group strictly per viewer
    const userMap = new Map<string, Token2DBody[]>();
    for (const b of tokenBodies) {
      const uid = b.tokenData!.userId!;
      const list = userMap.get(uid) || [];
      list.push(b);
      userMap.set(uid, list);
    }

    const geom = containerBoundsRef.current;

    for (const [, userTokens] of userMap.entries()) {
      if (userTokens.length <= 1 && userTokens[0].tokenData?.tier !== 'base') continue;

      let sumX = 0;
      let sumY = 0;
      let totalVal = 0;
      for (const t of userTokens) {
        sumX += t.position.x;
        sumY += t.position.y;
        totalVal += (t.tokenData?.value || 1);
      }
      const avgX = Math.max(geom.x + 30, Math.min(geom.x + geom.width - 30, sumX / userTokens.length));
      const avgY = Math.max(geom.y + 40, Math.min(geom.y + geom.height - 30, sumY / userTokens.length));

      const leadEmoji = userTokens[0].tokenData?.emoji || '🪙';
      const leadUserId = userTokens[0].tokenData?.userId;
      const leadOutcomeId = userTokens[0].tokenData?.outcomeId;
      const leadEntrantColor = userTokens[0].tokenData?.entrantColor;

      Composite.remove(world, userTokens);

      let remaining = totalVal;
      let spawnIndex = 0;

      for (const cfg of getActiveTierConfigs()) {
        if (remaining >= cfg.value) {
          const count = Math.floor(remaining / cfg.value);
          const actualCount = Math.min(count, 5);
          const perTokenVal = (count * cfg.value) / actualCount;

          for (let i = 0; i < actualCount; i++) {
            const radius = cfg.radius2D;
            const spawnX = avgX + (Math.random() - 0.5) * 20;
            const spawnY = avgY - 10 - (spawnIndex * 8);

            const body = Bodies.circle(spawnX, spawnY, radius, {
              restitution: 0.14,
              friction: 0.85,
              frictionAir: 0.02,
              density: 0.004,
            }) as Token2DBody;

            body.tokenData = {
              userId: leadUserId,
              outcomeId: leadOutcomeId,
              emoji: leadEmoji,
              tier: cfg.tier,
              tint: cfg.tint,
              radius,
              value: perTokenVal,
              entrantColor: leadEntrantColor,
            };

            body.spriteCanvas = getOrCreateTokenSprite(
              leadEmoji,
              cfg.tier,
              cfg.tint,
              radius
            );

            Body.setVelocity(body, {
              x: (Math.random() - 0.5) * 2.0,
              y: -3.5 - Math.random() * 2.0,
            });

            Composite.add(world, body);
            spawnIndex++;
          }

          remaining -= count * cfg.value;
        }
      }

      if (remaining > 0) {
        const radius = 12;
        const body = Bodies.circle(avgX, avgY - 10 - spawnIndex * 8, radius, {
          restitution: 0.14,
          friction: 0.85,
          frictionAir: 0.02,
          density: 0.004,
        }) as Token2DBody;

        body.tokenData = {
          userId: leadUserId,
          outcomeId: leadOutcomeId,
          emoji: leadEmoji,
          tier: 'base',
          tint: '#94a3b8',
          radius,
          value: remaining,
          entrantColor: leadEntrantColor,
        };

        body.spriteCanvas = getOrCreateTokenSprite(
          leadEmoji,
          'base',
          '#94a3b8',
          radius,
          `${Math.round(remaining)}pt`
        );

        Body.setVelocity(body, {
          x: (Math.random() - 0.5) * 1.5,
          y: -3.0,
        });

        Composite.add(world, body);
      }
    }

    // Rejostle & awaken all remaining bodies after condense pile
    const allRemaining = Composite.allBodies(world) as Token2DBody[];
    for (const b of allRemaining) {
      if (b.tokenData) {
        if (b.isStatic) Body.setStatic(b, false);
        if (b.isSleeping) Sleeping.set(b, false);
        Body.setVelocity(b, {
          x: (Math.random() - 0.5) * 1.0,
          y: 0.5 + Math.random() * 1.0,
        });
      }
    }
  }, [condenseTrigger]);

  // Reset Arena Tokens
  useEffect(() => {
    if (onResetTrigger > 0 && engineRef.current) {
      const allBodies = Composite.allBodies(engineRef.current.world);
      const tokenBodies = allBodies.filter(b => (b as Token2DBody).tokenData);
      Composite.remove(engineRef.current.world, tokenBodies);
    }
  }, [onResetTrigger]);

  // Winner Burst Celebration
  useEffect(() => {
    if (isWinnerBurst && engineRef.current) {
      const allBodies = Composite.allBodies(engineRef.current.world);
      for (const body of allBodies) {
        const tb = body as Token2DBody;
        if (tb.tokenData) {
          Body.setStatic(tb, false);
          Sleeping.set(tb, false);
          Body.setVelocity(tb, {
            x: (Math.random() - 0.5) * 16,
            y: -14 - Math.random() * 12,
          });
          Body.setAngularVelocity(tb, (Math.random() - 0.5) * 0.4);
        }
      }
    }
  }, [isWinnerBurst]);

  return (
    <canvas
      ref={canvasRef}
      className="canvas-container canvas-2d"
      style={{
        pointerEvents: 'none',
        zIndex: 10,
        display: isVisible ? 'block' : 'none'
      }}
    />
  );
};
