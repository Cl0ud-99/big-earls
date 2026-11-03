import * as THREE from 'three';
import { surfaceTextures as T } from './textures.js';
import { signTextures as S } from './signs.js';
import { cloneRepeat } from './lib/texutil.js';

export const M = {};

function std(opts) { return new THREE.MeshStandardMaterial(opts); }
function phys(opts) { return new THREE.MeshPhysicalMaterial(opts); }

function sign(map, { metalness = 0.05, roughness = 0.55, alpha = false, side = THREE.FrontSide, emissive = 0x000000, emissiveIntensity = 0, envMapIntensity = 0.5 } = {}) {
  const m = std({
    map, metalness, roughness, side,
    transparent: false,
    alphaTest: alpha ? 0.35 : 0,
    emissive,
    emissiveMap: emissiveIntensity > 0 ? map : null,
    emissiveIntensity,
    envMapIntensity,
  });
  if (!alpha) m.alphaTest = 0;
  return m;
}

export function buildMaterials() {
  // ---------------------------------------------------- surfaces
  M.sand = std({ map: T.sand.map, normalMap: T.sand.normalMap, roughnessMap: T.sand.roughnessMap, roughness: 1, metalness: 0, envMapIntensity: 0.28 });
  M.sand.map.repeat.set(26, 26);
  M.sand.normalMap.repeat.set(26, 26);
  M.sand.roughnessMap.repeat.set(26, 26);
  M.sand.normalScale.set(0.55, 0.55);

  M.asphalt = std({ map: T.asphalt.map, normalMap: T.asphalt.normalMap, roughnessMap: T.asphalt.roughnessMap, roughness: 1, metalness: 0.02, envMapIntensity: 0.55 });
  M.asphalt.map.repeat.set(10, 3);
  M.asphalt.normalMap.repeat.set(10, 3);
  M.asphalt.roughnessMap.repeat.set(10, 3);
  M.asphalt.normalScale.set(0.7, 0.7);

  M.concrete = std({ map: T.concrete.map, normalMap: T.concrete.normalMap, roughnessMap: T.concrete.roughnessMap, roughness: 1, metalness: 0, envMapIntensity: 0.35 });
  M.concrete.map.repeat.set(2, 2);
  M.concrete.normalMap.repeat.set(2, 2);
  M.concrete.roughnessMap.repeat.set(2, 2);

  M.stucco = phys({
    map: T.stucco.map, normalMap: T.stucco.normalMap, roughnessMap: T.stucco.roughnessMap,
    roughness: 1, metalness: 0.02, clearcoat: 0.28, clearcoatRoughness: 0.5, envMapIntensity: 0.55,
  });
  M.stucco.normalScale.set(0.8, 0.8);

  const metalOpts = {
    metalness: 0.22, clearcoat: 0.72, clearcoatRoughness: 0.22, envMapIntensity: 1.05,
  };
  M.metalCream = phys({ map: T.metalCream.map, normalMap: T.metalCream.normalMap, roughnessMap: T.metalCream.roughnessMap, ...metalOpts, roughness: 1 });
  M.metalMint = phys({ map: T.metalMint.map, normalMap: T.metalMint.normalMap, roughnessMap: T.metalMint.roughnessMap, ...metalOpts, roughness: 1 });
  M.metalTeal = phys({ map: T.metalTeal.map, normalMap: T.metalTeal.normalMap, roughnessMap: T.metalTeal.roughnessMap, ...metalOpts, roughness: 1 });
  M.metalRust = phys({ map: T.metalRust.map, normalMap: T.metalRust.normalMap, roughnessMap: T.metalRust.roughnessMap, metalness: 0.18, roughness: 1, clearcoat: 0.2, envMapIntensity: 0.7 });

  M.rust = std({ map: T.rust.map, normalMap: T.rust.normalMap, roughnessMap: T.rust.roughnessMap, roughness: 1, metalness: 0.45, envMapIntensity: 0.7 });
  M.corrugated = std({ map: T.corrugated.map, normalMap: T.corrugated.normalMap, roughnessMap: T.corrugated.roughnessMap, roughness: 1, metalness: 0.5, envMapIntensity: 0.8 });
  M.corrugated.normalScale.set(1.4, 1.4);
  M.wood = std({ map: T.wood.map, normalMap: T.wood.normalMap, roughnessMap: T.wood.roughnessMap, roughness: 1, metalness: 0, envMapIntensity: 0.25 });
  M.woodDark = std({ map: T.wood.map, normalMap: T.wood.normalMap, roughnessMap: T.wood.roughnessMap, color: 0x8a7a68, roughness: 1, metalness: 0, envMapIntensity: 0.2 });
  M.rubber = std({ map: T.rubber.map, normalMap: T.rubber.normalMap, roughnessMap: T.rubber.roughnessMap, roughness: 1, metalness: 0, envMapIntensity: 0.18 });
  M.rubber.normalScale.set(1.4, 1.4);

  // ---------------------------------------------------- metals / glass
  M.chrome = std({ color: 0xdde4e4, metalness: 1, roughness: 0.14, envMapIntensity: 1.7 });
  M.chromeRough = std({ color: 0xb9bdb8, metalness: 0.95, roughness: 0.36, envMapIntensity: 1.2 });
  M.darkMetal = std({ color: 0x3b3a37, metalness: 0.88, roughness: 0.46, envMapIntensity: 0.9 });
  M.blackMetal = std({ color: 0x1b1a19, metalness: 0.65, roughness: 0.55, envMapIntensity: 0.6 });
  M.brass = std({ color: 0xb98a45, metalness: 0.95, roughness: 0.28, envMapIntensity: 1.4 });
  M.goldPaint = std({ color: 0xd9a849, metalness: 0.6, roughness: 0.4, envMapIntensity: 0.9 });

  M.glass = phys({
    color: 0x16222a, metalness: 0.25, roughness: 0.07, transparent: true, opacity: 0.78,
    envMapIntensity: 1.55, clearcoat: 1, clearcoatRoughness: 0.04, side: THREE.DoubleSide,
    depthWrite: false,
  });
  M.glassWarm = phys({
    color: 0x2a261c, metalness: 0.1, roughness: 0.08, transparent: true, opacity: 0.55,
    envMapIntensity: 1.2, side: THREE.DoubleSide, depthWrite: false,
  });
  M.glassGreen = phys({ color: 0x2e4a2a, metalness: 0.1, roughness: 0.06, transparent: true, opacity: 0.8, envMapIntensity: 1.3, depthWrite: false });

  // ---------------------------------------------------- interior
  M.interiorDark = std({ color: 0x191817, roughness: 0.92, metalness: 0.05, envMapIntensity: 0.15 });
  M.interiorWall = std({ color: 0x5d564a, roughness: 0.85, metalness: 0, envMapIntensity: 0.2 });
  M.interiorFloor = std({ color: 0x34302a, roughness: 0.8, metalness: 0.05, envMapIntensity: 0.3 });
  M.shelfMetal = std({ color: 0x6f6a60, metalness: 0.55, roughness: 0.5, envMapIntensity: 0.5 });
  M.cardboard = std({ color: 0x9a7a52, roughness: 0.9, metalness: 0, envMapIntensity: 0.1 });
  M.plasticBlue = std({ color: 0x2b6f9a, roughness: 0.35, metalness: 0.05, envMapIntensity: 0.6 });
  M.plasticYellow = std({ color: 0xd9a52e, roughness: 0.4, metalness: 0.05, envMapIntensity: 0.5 });
  M.plasticRed = std({ color: 0xa83c2e, roughness: 0.45, metalness: 0.05, envMapIntensity: 0.5 });
  M.paintBlue = std({ color: 0x3d7b8a, roughness: 0.55, metalness: 0.1, envMapIntensity: 0.4 });
  M.paintGreen = std({ color: 0x5c7a58, roughness: 0.6, metalness: 0.05, envMapIntensity: 0.35 });
  M.paintWhite = std({ map: T.paintWhite.map, normalMap: T.paintWhite.normalMap, roughnessMap: T.paintWhite.roughnessMap, roughness: 1, metalness: 0.02, envMapIntensity: 0.3 });
  M.paintBlack = std({ color: 0x24211d, roughness: 0.55, metalness: 0.05, envMapIntensity: 0.3 });
  M.paintRed = std({ map: T.paintRed.map, normalMap: T.paintRed.normalMap, roughnessMap: T.paintRed.roughnessMap, roughness: 1, metalness: 0.08, envMapIntensity: 0.45 });
  M.paintCream = std({ map: T.paintCream.map, normalMap: T.paintCream.normalMap, roughnessMap: T.paintCream.roughnessMap, roughness: 1, metalness: 0.05, envMapIntensity: 0.4 });
  M.paintTeal = std({ color: 0x4d8787, roughness: 0.48, metalness: 0.08, envMapIntensity: 0.5 });
  M.paintYellow = std({ color: 0xc79a35, roughness: 0.55, metalness: 0.08, envMapIntensity: 0.4 });

  // ---------------------------------------------------- signage
  M.signBig = phys({
    map: S.bigEarls, transparent: false, alphaTest: 0.32, side: THREE.DoubleSide,
    metalness: 0.55, roughness: 0.46, clearcoat: 0.4, clearcoatRoughness: 0.28,
    emissive: 0x8a4a16, emissiveMap: S.bigEarls, emissiveIntensity: 0.05, envMapIntensity: 0.65,
  });
  M.signBigGlow = new THREE.MeshBasicMaterial({ map: S.bigEarls, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xffc178, opacity: 0 });
  M.signService = std({ map: S.serviceBoard, roughness: 0.72, metalness: 0, envMapIntensity: 0.2 });
  M.signService.color.setHex(0xe4d7bd);
  M.signPylon = std({ map: S.pylon, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.42, metalness: 0.18, envMapIntensity: 0.8, emissive: 0x26150a, emissiveMap: S.pylon, emissiveIntensity: 0.05 });
  M.signMedallion = std({ map: S.medallion, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.42, metalness: 0.18, envMapIntensity: 0.8, emissive: 0x2a1409, emissiveMap: S.medallion, emissiveIntensity: 0.06 });
  M.signBillboard = phys({ map: S.billboard, roughness: 0.62, metalness: 0.02, clearcoat: 0.25, clearcoatRoughness: 0.4, envMapIntensity: 0.35 });
  M.signRoute66 = std({ map: S.route66, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.05, envMapIntensity: 0.3 });
  M.signPrice = std({ map: S.priceSign, roughness: 0.6, metalness: 0.05, envMapIntensity: 0.3 });
  M.pumpFace = std({ map: S.pumpFace, roughness: 0.32, metalness: 0.15, envMapIntensity: 1.0 });
  M.pumpFacePremium = std({ map: S.pumpFacePremium, roughness: 0.32, metalness: 0.15, envMapIntensity: 1.0 });
  M.globeLabel = std({ map: S.globeLabel, roughness: 0.35, metalness: 0.1, envMapIntensity: 0.9, emissive: 0x3a1408, emissiveMap: S.globeLabel, emissiveIntensity: 0.15 });
  M.atm = std({ map: S.atm, roughness: 0.45, metalness: 0.1, envMapIntensity: 0.5 });
  M.cola = std({ map: S.cola, roughness: 0.3, metalness: 0.18, envMapIntensity: 1.1 });
  M.posterA = std({ map: S.posterA, roughness: 0.7, metalness: 0, envMapIntensity: 0.2 });
  M.posterB = std({ map: S.posterB, roughness: 0.7, metalness: 0, envMapIntensity: 0.2 });
  M.windowDecal = std({ map: S.windowDecal, transparent: true, alphaTest: 0.1, roughness: 0.5, metalness: 0, envMapIntensity: 0.2 });
  M.woodSign = std({ map: S.woodSign, roughness: 0.85, metalness: 0, envMapIntensity: 0.15 });
  M.neonOpen = new THREE.MeshBasicMaterial({ map: S.neonOpen, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, color: 0xffffff, opacity: 0.9 });
  M.neonArrow = new THREE.MeshBasicMaterial({ map: S.neonArrow, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, color: 0xffffff, opacity: 0.0 });
  M.bulb = new THREE.MeshBasicMaterial({ color: 0xffdca8, toneMapped: false });
  M.bulbGlow = new THREE.MeshBasicMaterial({ map: T.glow, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xffc178, opacity: 0.55 });

  // ---------------------------------------------------- vegetation
  M.grass = std({ map: T.grass, alphaTest: 0.32, side: THREE.DoubleSide, roughness: 0.9, metalness: 0, envMapIntensity: 0.3, color: 0xd9c89a });
  M.shrub = std({ map: T.shrub, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.9, metalness: 0, envMapIntensity: 0.3, color: 0xd9d0a8 });
  M.yucca = std({ map: T.yucca, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.75, metalness: 0, envMapIntensity: 0.35 });
  M.cactus = std({ color: 0x6c8a4a, roughness: 0.6, metalness: 0.02, envMapIntensity: 0.5 });
  M.cactusDark = std({ color: 0x4e6a38, roughness: 0.65, metalness: 0.02, envMapIntensity: 0.4 });

  // ---------------------------------------------------- fx
  M.contact = new THREE.MeshBasicMaterial({ map: T.contact, transparent: true, depthWrite: false, opacity: 0.55, color: 0x000000, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  M.puddleAlpha = T.puddleAlpha;
  M.waterNormal = T.waterNormal;
  M.waterNormalFine = T.waterNormalFine;
  M.glow = new THREE.MeshBasicMaterial({ map: T.glow, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xffddb0 });
  M.dust = T.dust;
  M.cloud = T.cloud;

  // clone sign textures for the service board's backside material? not needed
  return M;
}

export function matWithRepeat(mat, rx, ry) {
  const m = mat.clone();
  const keys = ['map', 'normalMap', 'roughnessMap', 'aoMap', 'metalnessMap', 'emissiveMap'];
  for (const k of keys) {
    if (m[k]) m[k] = cloneRepeat(m[k], rx, ry);
  }
  return m;
}
