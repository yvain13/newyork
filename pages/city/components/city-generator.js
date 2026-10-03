import {Group} from 'three/src/objects/Group.js';
import {Mesh} from 'three/src/objects/Mesh.js';
import {InstancedMesh} from 'three/src/objects/InstancedMesh.js';
import {Sprite} from 'three/src/objects/Sprite.js';
import {BoxGeometry} from 'three/src/geometries/BoxGeometry.js';
import {CylinderGeometry} from 'three/src/geometries/CylinderGeometry.js';
import {ConeGeometry} from 'three/src/geometries/ConeGeometry.js';
import {SphereGeometry} from 'three/src/geometries/SphereGeometry.js';
import {PlaneGeometry} from 'three/src/geometries/PlaneGeometry.js';
import {MeshLambertMaterial} from 'three/src/materials/MeshLambertMaterial.js';
import {MeshBasicMaterial} from 'three/src/materials/MeshBasicMaterial.js';
import {SpriteMaterial} from 'three/src/materials/SpriteMaterial.js';
import {CanvasTexture} from 'three/src/textures/CanvasTexture.js';
import {Color} from 'three/src/math/Color.js';
import {Vector3} from 'three/src/math/Vector3.js';
import {Matrix4} from 'three/src/math/Matrix4.js';
import {Quaternion} from 'three/src/math/Quaternion.js';
import {Euler} from 'three/src/math/Euler.js';

// Compact close-up neighborhood: a 4x4 grid of blocks, five of them are the
// gold service buildings, the rest low grey cottages and walk-ups.
const BLOCK = 15;
const STREET = 6;
const PITCH = BLOCK + STREET;
const COLS = 4;
const ROWS = 4;
const CITY_W = COLS * PITCH;
const CITY_D = ROWS * PITCH;

// Deterministic RNG so the city is identical every load.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Shared geometries — everything is one of these unit shapes, scaled per mesh.
const unitBox = new BoxGeometry(1, 1, 1);
const unitCyl = new CylinderGeometry(0.5, 0.5, 1, 10);
const unitCone = new ConeGeometry(0.5, 1, 8);
const unitPyramid = new ConeGeometry(0.72, 1, 4);
const unitSphere = new SphereGeometry(0.5, 8, 6);
const windowGeo = new PlaneGeometry(0.8, 1.0);

// ---------------------------------------------------------------------------
// Palette — cool blue-grey city, warm gold service buildings (Persona-style)
// ---------------------------------------------------------------------------
const fillerMats = [0.34, 0.38, 0.42, 0.46].map(l => {
  const m = new MeshLambertMaterial();
  m.color = new Color().setHSL(0.63, 0.13, l);
  return m;
});
const roofMat = new MeshLambertMaterial({color: new Color(0x2e3448)});
const goldMat = new MeshLambertMaterial({color: new Color(0xd9b95f)});
const goldDarkMat = new MeshLambertMaterial({color: new Color(0xa88b41)});
// Hover variants: same golds with an emissive push so the building lights up.
const goldHoverMat = new MeshLambertMaterial({color: new Color(0xe8cb74)});
goldHoverMat.emissive = new Color(0x6b5518);
const goldDarkHoverMat = new MeshLambertMaterial({color: new Color(0xbfa050)});
goldDarkHoverMat.emissive = new Color(0x4a3a10);
const landmarkMat = new MeshLambertMaterial({color: new Color(0x6d7690)});
const metalMat = new MeshLambertMaterial({color: new Color(0x9aa7c0)});
const crownGlowMat = new MeshBasicMaterial({color: new Color(0xd8dcec)});
const groundMat = new MeshLambertMaterial({color: new Color(0x2c3348)});
const streetMat = new MeshLambertMaterial({color: new Color(0x3d465e)});
const plinthMat = new MeshLambertMaterial({color: new Color(0x4d5776)});
const parkMat = new MeshLambertMaterial({color: new Color(0x46604b)});
const foliageMat = new MeshLambertMaterial({color: new Color(0x3c5a44)});
const woodMat = new MeshLambertMaterial({color: new Color(0x5c4a38)});
const roofKitMat = new MeshLambertMaterial({color: new Color(0x49536b)});
const steelMat = new MeshLambertMaterial({color: new Color(0x3d4459)});
const scaffoldMat = new MeshLambertMaterial({color: new Color(0x8a7c62)});
const cabMat = new MeshLambertMaterial({color: new Color(0xd9a520)});
const cabTopMat = new MeshLambertMaterial({color: new Color(0x2a3148)});
const glowMat = new MeshBasicMaterial({color: new Color(0xffc46b)});
const subwayMat = new MeshBasicMaterial({color: new Color(0x4f8f63)});
const windowMat = new MeshBasicMaterial({color: new Color(0xffffff)});

function box(mat, w, h, d, x, y, z, shadow = true) {
  const m = new Mesh(unitBox, mat);
  m.scale.set(w, h, d);
  m.position.set(x, y + h / 2, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

function cyl(mat, r, h, x, y, z) {
  const m = new Mesh(unitCyl, mat);
  m.scale.set(r * 2, h, r * 2);
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// ---------------------------------------------------------------------------
// Windows — instanced emissive planes collected per batch, one draw call each
// ---------------------------------------------------------------------------
const FACE_QUATS = [0, Math.PI, Math.PI / 2, -Math.PI / 2].map(a =>
  new Quaternion().setFromEuler(new Euler(0, a, 0))
);
const ONE = new Vector3(1, 1, 1);

function makeCollector() {
  return {mats: [], colors: []};
}

// Emit a chunky window grid on all four faces of a box at (cx, baseY, cz).
function addWindows(wc, rng, cx, baseY, cz, w, h, d, litFrac, bright = false) {
  const faces = [
    [cz + d / 2 + 0.04, w, 0, 0],
    [cz - d / 2 - 0.04, w, 0, 1],
    [cx + w / 2 + 0.04, d, 1, 2],
    [cx - w / 2 - 0.04, d, 1, 3]
  ];
  const rows = Math.max(1, Math.floor((h - 1.2) / 1.9));
  for (const [plane, faceW, axis, qi] of faces) {
    const cols = Math.max(1, Math.floor((faceW - 1.2) / 1.55));
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const u = (i - (cols - 1) / 2) * 1.55;
        const y = baseY + 1.15 + j * 1.9;
        const pos = axis === 0
          ? new Vector3(cx + u, y, plane)
          : new Vector3(plane, y, cz + u);
        wc.mats.push(new Matrix4().compose(pos, FACE_QUATS[qi], ONE));
        const c = new Color();
        if (rng() < litFrac) {
          c.setHSL(0.1 + rng() * 0.03, 0.88, (bright ? 0.62 : 0.55) + rng() * 0.12);
        } else {
          c.setHSL(0.62, 0.2, 0.16 + rng() * 0.05);
        }
        wc.colors.push(c);
      }
    }
  }
}

function buildWindowMesh(wc) {
  const n = wc.mats.length;
  const im = new InstancedMesh(windowGeo, windowMat, n);
  for (let i = 0; i < n; i++) {
    im.setMatrixAt(i, wc.mats[i]);
    im.setColorAt(i, wc.colors[i]);
  }
  im.instanceMatrix.needsUpdate = true;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  return im;
}

// ---------------------------------------------------------------------------
// Rooftop + street kit
// ---------------------------------------------------------------------------
function waterTower(rng, x, y, z) {
  const g = new Group();
  const legH = 1;
  const tankR = 0.7 + rng() * 0.2;
  for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    g.add(cyl(woodMat, 0.07, legH, lx * tankR * 0.6, 0, lz * tankR * 0.6));
  }
  g.add(cyl(woodMat, tankR, 1.3, 0, legH, 0));
  const cap = new Mesh(unitCone, woodMat);
  cap.scale.set(tankR * 2.2, 0.7, tankR * 2.2);
  cap.position.set(0, legH + 1.65, 0);
  cap.castShadow = true;
  g.add(cap);
  g.position.set(x, y, z);
  return g;
}

function tree(rng, x, z) {
  const g = new Group();
  g.add(cyl(woodMat, 0.12, 0.7, 0, 0, 0));
  const f = new Mesh(unitCone, foliageMat);
  const s = 1.5 + rng() * 0.9;
  f.scale.set(s, s * 1.6, s);
  f.position.set(0, 0.6 + s * 0.8, 0);
  f.castShadow = true;
  g.add(f);
  g.position.set(x, 0.3, z);
  return g;
}

function streetlight(x, z) {
  const g = new Group();
  g.add(cyl(steelMat, 0.07, 3, 0, 0, 0));
  g.add(box(glowMat, 0.34, 0.18, 0.34, 0, 2.95, 0, false));
  g.position.set(x, 0, z);
  return g;
}

function cab(x, z, angle) {
  const g = new Group();
  g.add(box(cabMat, 1.7, 0.5, 0.85, 0, 0, 0));
  g.add(box(cabTopMat, 0.85, 0.32, 0.8, -0.05, 0.5, 0));
  g.add(box(glowMat, 0.25, 0.12, 0.18, 0.05, 0.82, 0, false));
  g.position.set(x, 0.12, z);
  g.rotation.y = angle;
  return g;
}

// Low filler: gabled cottage or a small flat-roof walk-up, mostly dark.
function addFiller(city, wc, rng, cx, cz) {
  const mat = fillerMats[Math.floor(rng() * fillerMats.length)];
  if (rng() < 0.55) {
    const w = 3.4 + rng() * 1.2;
    const d = 3.6 + rng() * 1.2;
    const h = 2.4 + rng() * 0.8;
    city.add(box(mat, w, h, d, cx, 0.3, cz));
    const roof = new Mesh(unitPyramid, roofMat);
    roof.scale.set(w * 1.25, 1.5, d * 1.25);
    roof.rotation.y = Math.PI / 4;
    roof.position.set(cx, 0.3 + h + 0.75, cz);
    roof.castShadow = true;
    city.add(roof);
    addWindows(wc, rng, cx, 0.3, cz, w, h, d, 0.35);
  } else {
    const w = 4.5 + rng() * 1.5;
    const d = 4.5 + rng() * 1.5;
    const h = 4 + rng() * 3;
    city.add(box(mat, w, h, d, cx, 0.3, cz));
    city.add(box(roofMat, w + 0.4, 0.3, d + 0.4, cx, 0.3 + h, cz));
    addWindows(wc, rng, cx, 0.3, cz, w, h, d, 0.4);
    if (h > 5.5 && rng() < 0.5) {
      city.add(waterTower(rng, cx + (rng() - 0.5) * w * 0.4, 0.6 + h, cz + (rng() - 0.5) * d * 0.4));
    }
  }
}

// ---------------------------------------------------------------------------
// Labels — canvas-drawn text on a sprite, always facing the camera
// ---------------------------------------------------------------------------
function makeLabel(text) {
  const font = '600 54px system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = font;
  const w = Math.ceil(probe.measureText(text).width) + 80;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  ctx.font = font;
  try {
    ctx.letterSpacing = '5px';
  } catch {
    /* older engines */
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(255, 226, 170, 0.95)';
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#f8f3e7';
  ctx.fillText(text, w / 2, 52);
  const tex = new CanvasTexture(canvas);
  const mat = new SpriteMaterial({map: tex, transparent: true, opacity: 0.85, depthTest: false});
  const s = new Sprite(mat);
  const k = 0.028;
  s.scale.set(w * k, 100 * k, 1);
  s.renderOrder = 10;
  return s;
}

// ---------------------------------------------------------------------------
// The five service buildings — warm gold, brightly lit, each silhouette
// hinting at its job. Sized for the close-up neighborhood.
// ---------------------------------------------------------------------------
function svcSanitation(g, wc, rng) {
  g.add(box(goldMat, 11, 4.2, 8, 0, 0, 0));
  for (let i = -1; i <= 1; i++) {
    g.add(box(goldDarkMat, 2.6, 3, 0.4, i * 3.6, 0, 4.1));
  }
  addWindows(wc, rng, 0, 2.6, 0, 11, 1.6, 8, 0.85, true);
  g.add(box(roofKitMat, 1, 0.6, 1.4, -3.8, 4.2, -2));
  g.add(box(cabTopMat, 3, 1.2, 1.4, 2.8, 0, 5.8));
  return 5.5;
}

function svcParks(g, wc, rng) {
  g.add(box(goldMat, 6, 4.2, 6, 0, 0, 0));
  addWindows(wc, rng, 0, 0, 0, 6, 4.2, 6, 0.8, true);
  const roof = new Mesh(unitPyramid, goldDarkMat);
  roof.scale.set(8, 2.4, 8);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 5.4;
  roof.castShadow = true;
  g.add(roof);
  return 7.5;
}

function svcCourts(g, wc, rng) {
  g.add(box(goldMat, 10, 1.1, 8, 0, 0, 0));
  g.add(box(goldMat, 8.6, 6, 6.2, 0, 1.1, -0.8));
  addWindows(wc, rng, 0, 1.1, -0.8, 8.6, 6, 6.2, 0.75, true);
  for (let i = 0; i < 6; i++) {
    g.add(box(goldMat, 0.65, 4.4, 0.65, -3.9 + i * 1.56, 1.1, 3));
  }
  g.add(box(goldMat, 10, 0.9, 1.8, 0, 5.5, 2.7));
  g.add(box(goldDarkMat, 7, 1.4, 4.8, 0, 7.1, -0.8));
  return 9.5;
}

function svcTransit(g, wc, rng) {
  g.add(box(goldMat, 7, 11, 5.4, 0, 0, -0.8));
  addWindows(wc, rng, 0, 0, -0.8, 7, 11, 5.4, 0.75, true);
  g.add(box(goldDarkMat, 2.2, 1.6, 2.8, 2.9, 0, 4));
  g.add(cyl(steelMat, 0.06, 2.4, 4.1, 0, 4));
  g.add(box(subwayMat, 0.85, 0.45, 0.14, 4.1, 2.2, 4, false));
  if (rng() < 0.8) g.add(waterTower(rng, -1.6, 11.3, -1.4));
  return 13;
}

function svcBuildings(g, wc, rng) {
  const tiers = [[10, 8.5, 7.5], [7.5, 6, 5.5], [4.6, 4.5, 3.6]];
  let y = 0;
  for (const [w, h, d] of tiers) {
    g.add(box(goldMat, w, h, d, 0, y, 0));
    addWindows(wc, rng, 0, y, 0, w, h, d, 0.7, true);
    y += h;
  }
  g.add(cyl(roofKitMat, 0.07, 4, 0, y, 0));
  const sx = 5.6;
  const sz = 4.4;
  for (const [px, pz] of [[-sx, -sz], [sx, -sz], [-sx, sz], [sx, sz], [0, -sz], [0, sz], [-sx, 0], [sx, 0]]) {
    g.add(box(scaffoldMat, 0.13, 6.5, 0.13, px, 0, pz));
  }
  for (let lvl = 1; lvl <= 2; lvl++) {
    g.add(box(scaffoldMat, sx * 2, 0.11, 0.11, 0, lvl * 2.8, -sz));
    g.add(box(scaffoldMat, sx * 2, 0.11, 0.11, 0, lvl * 2.8, sz));
    g.add(box(scaffoldMat, 0.11, 0.11, sz * 2, -sx, lvl * 2.8, 0));
    g.add(box(scaffoldMat, 0.11, 0.11, sz * 2, sx, lvl * 2.8, 0));
  }
  return y + 5;
}

// ---------------------------------------------------------------------------
// Landmarks — Empire State and Chrysler silhouettes on the back row, grey so
// the gold services still lead, but unmistakably NYC.
// ---------------------------------------------------------------------------
function landmarkEmpire(city, wc, rng, cx, cz) {
  const tiers = [[10, 6, 7], [8, 9, 5.5], [6, 8, 4.2], [4.2, 5, 3], [2.6, 2.5, 2]];
  let y = 0.3;
  for (const [w, h, d] of tiers) {
    city.add(box(landmarkMat, w, h, d, cx, y, cz));
    addWindows(wc, rng, cx, y, cz, w, h, d, 0.5);
    y += h;
  }
  city.add(cyl(metalMat, 0.16, 4.5, cx, y, cz));
  city.add(box(glowMat, 0.28, 0.28, 0.28, cx, y + 4.5, cz, false));
}

function landmarkChrysler(city, wc, rng, cx, cz) {
  city.add(box(landmarkMat, 7, 14, 5.5, cx, 0.3, cz));
  addWindows(wc, rng, cx, 0.3, cz, 7, 14, 5.5, 0.55);
  let y = 14.3;
  let r = 2.7;
  for (let i = 0; i < 5; i++) {
    const disc = cyl(i % 2 === 0 ? crownGlowMat : metalMat, r, 1.05, cx, y, cz);
    city.add(disc);
    y += 1.05;
    r *= 0.72;
  }
  city.add(cyl(metalMat, 0.09, 3.2, cx, y, cz));
}

// Chimney smoke: an emitter is a few translucent puffs the scene recycles.
function smokeEmitter(city, x, y, z) {
  const puffs = [];
  for (let i = 0; i < 3; i++) {
    const mat = new MeshBasicMaterial({color: new Color(0xaeb6cc), transparent: true, opacity: 0, depthWrite: false});
    const m = new Mesh(unitSphere, mat);
    m.position.set(x, y, z);
    city.add(m);
    puffs.push({mesh: m, phase: i / 3});
  }
  return {x, y, z, puffs};
}

// Block-grid slots (4x4) for the five services + the park.
const SERVICE_PLAN = [
  {id: 'sanitation', label: 'Streets & Trash', col: 1, row: 0, build: svcSanitation},
  {id: 'parks', label: 'Parks & Recreation', col: 0, row: 2, build: svcParks},
  {id: 'courts', label: 'Courts & Records', col: 3, row: 1, build: svcCourts},
  {id: 'transit', label: 'Subway & Streets', col: 3, row: 3, build: svcTransit},
  {id: 'buildings', label: 'Permits & Inspections', col: 2, row: 2, build: svcBuildings}
];
const PARK = {col: 0, row: 2};
const LANDMARKS = new Map([
  ['0,0', landmarkEmpire],
  ['2,0', landmarkChrysler]
]);

function blockCenter(col, row) {
  return [(col - (COLS - 1) / 2) * PITCH, (row - (ROWS - 1) / 2) * PITCH];
}

// ---------------------------------------------------------------------------
export function buildCity(seed = 7) {
  const rng = mulberry32(seed);
  const city = new Group();
  const wc = makeCollector();

  // Ground and street grid.
  const ground = new Mesh(new PlaneGeometry(CITY_W + 70, CITY_D + 70), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  city.add(ground);

  for (let c = 0; c <= COLS; c++) {
    const s = new Mesh(new PlaneGeometry(STREET - 1, CITY_D + 40), streetMat);
    s.rotation.x = -Math.PI / 2;
    s.position.set((c - COLS / 2) * PITCH, 0.02, 0);
    s.receiveShadow = true;
    city.add(s);
  }
  for (let r = 0; r <= ROWS; r++) {
    const s = new Mesh(new PlaneGeometry(CITY_W + 40, STREET - 1), streetMat);
    s.rotation.x = -Math.PI / 2;
    s.position.set(0, 0.02, (r - ROWS / 2) * PITCH);
    s.receiveShadow = true;
    city.add(s);
  }

  const serviceSlots = new Map(SERVICE_PLAN.map(s => [`${s.col},${s.row}`, s]));
  const services = [];

  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const [cx, cz] = blockCenter(c, r);
      const isPark = c === PARK.col && r === PARK.row;

      if (isPark) {
        const park = new Mesh(new PlaneGeometry(BLOCK + 2, BLOCK + 2), parkMat);
        park.rotation.x = -Math.PI / 2;
        park.position.set(cx, 0.06, cz);
        park.receiveShadow = true;
        city.add(park);
        for (let i = 0; i < 7; i++) {
          city.add(tree(rng, cx + (rng() - 0.5) * (BLOCK - 4), cz + (rng() - 0.5) * (BLOCK - 4)));
        }
      } else {
        city.add(box(plinthMat, BLOCK + 1.5, 0.3, BLOCK + 1.5, cx, 0, cz));
        if (rng() < 0.8) {
          const side = rng() < 0.5 ? 1 : -1;
          city.add(tree(rng, cx + side * (BLOCK / 2 - 0.5), cz + (rng() - 0.5) * BLOCK * 0.7));
        }
      }

      const svc = serviceSlots.get(`${c},${r}`);
      if (svc) {
        const g = new Group();
        const swc = makeCollector();
        const topY = svc.build(g, swc, rng);
        if (swc.mats.length) g.add(buildWindowMesh(swc));
        const sprite = makeLabel(svc.label);
        sprite.position.set(0, topY + 2.6, 0);
        g.add(sprite);
        g.position.set(cx, 0.3, cz);
        const meshes = [];
        const goldPairs = [];
        g.traverse(o => {
          if (o.isMesh && !o.isInstancedMesh) {
            meshes.push(o);
            if (o.material === goldMat) goldPairs.push([o, goldMat, goldHoverMat]);
            if (o.material === goldDarkMat) goldPairs.push([o, goldDarkMat, goldDarkHoverMat]);
          }
        });
        const setLit = lit => {
          for (const [m, base, hover] of goldPairs) m.material = lit ? hover : base;
        };
        services.push({id: svc.id, root: g, sprite, meshes, setLit, baseY: 0.3, anchor: new Vector3(cx, topY * 0.5, cz), topY});
        city.add(g);
      } else if (LANDMARKS.has(`${c},${r}`)) {
        LANDMARKS.get(`${c},${r}`)(city, wc, rng, cx, cz);
      } else if (!isPark) {
        // Four low filler buildings per ordinary block.
        for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          addFiller(city, wc, rng, cx + ox * BLOCK / 4.4, cz + oz * BLOCK / 4.4);
        }
      }

      if ((c + r) % 2 === 0) {
        city.add(streetlight(cx - BLOCK / 2 - 1.6, cz - BLOCK / 2 - 1.6));
      }
    }
  }

  // Trees lining the outside of the map.
  for (let i = -4; i <= 4; i++) {
    const p = i * 10 + (rng() - 0.5) * 5;
    city.add(tree(rng, -CITY_W / 2 - 6 - rng() * 5, p));
    city.add(tree(rng, CITY_W / 2 + 6 + rng() * 5, p));
    city.add(tree(rng, p, -CITY_D / 2 - 6 - rng() * 5));
    city.add(tree(rng, p, CITY_D / 2 + 6 + rng() * 5));
  }

  city.add(buildWindowMesh(wc));

  // Cabs that drive the streets — the scene animates them along their lane.
  const cars = [];
  const carDefs = [
    {axis: 'z', line: -PITCH, dir: 1, speed: 7, lane: 1.5},
    {axis: 'z', line: PITCH, dir: -1, speed: 5.5, lane: -1.5},
    {axis: 'x', line: 0, dir: 1, speed: 8, lane: 1.5},
    {axis: 'x', line: PITCH * 2, dir: -1, speed: 6, lane: -1.5}
  ];
  for (const def of carDefs) {
    const angle = def.axis === 'x' ? (def.dir > 0 ? 0 : Math.PI) : def.dir > 0 ? -Math.PI / 2 : Math.PI / 2;
    const g = cab(0, 0, angle);
    city.add(g);
    cars.push({...def, group: g, offset: rng() * 200});
  }

  // Chimney smoke: one stack on the sanitation depot, two on back blocks.
  const smokes = [];
  const [sx, sz] = blockCenter(1, 0);
  city.add(box(roofKitMat, 0.9, 2.2, 0.9, sx - 4, 4.4, sz - 2.5));
  smokes.push(smokeEmitter(city, sx - 4, 7, sz - 2.5));
  for (const [lc, lr, ox] of [[3, 0, -3], [0, 1, 2]]) {
    const [lx, lz] = blockCenter(lc, lr);
    city.add(box(roofKitMat, 1.1, 3.8, 1.1, lx + ox, 0.3, lz));
    city.add(box(roofKitMat, 1.5, 0.4, 1.5, lx + ox, 3.6, lz));
    smokes.push(smokeEmitter(city, lx + ox, 4.6, lz));
  }

  return {group: city, services, animated: {cars, smokes, range: CITY_W / 2 + 26}};
}
