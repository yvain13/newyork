import {html, css, nothing} from 'lit';
import {customElement} from 'lit/decorators.js';
import {AIUXElement} from '@servicenow/aiux/aiux-components-core';
import {i18n} from '@servicenow/aiux/aiux-services';
import {Scene} from 'three/src/scenes/Scene.js';
import {WebGLRenderer} from 'three/src/renderers/WebGLRenderer.js';
import {OrthographicCamera} from 'three/src/cameras/OrthographicCamera.js';
import {DirectionalLight} from 'three/src/lights/DirectionalLight.js';
import {AmbientLight} from 'three/src/lights/AmbientLight.js';
import {Color} from 'three/src/math/Color.js';
import {Vector2} from 'three/src/math/Vector2.js';
import {Vector3} from 'three/src/math/Vector3.js';
import {Raycaster} from 'three/src/core/Raycaster.js';
import {buildCity} from './city-generator.js';

// Fixed isometric camera. No rotation — only a gentle wheel zoom and the
// click-to-focus pan.
const VIEW_HALF = 46; // ortho frustum half-height at zoom 1
const CAM_AZ = Math.PI / 4;
const CAM_EL = 0.6;
const ZOOM_MIN = 0.8;
const ZOOM_MAX = 2.4;
const HOME_LOOK = new Vector3(0, 3, 0);

// Panel copy per service. Sanitation is the fully built one; the others
// reuse the same panel with different data.
const PANELS = {
  sanitation: {
    name: () => i18n.getMessage('Streets & Trash'),
    items: [
      () => i18n.getMessage('Report a missed collection'),
      () => i18n.getMessage('Request a new bin'),
      () => i18n.getMessage('Schedule a bulk pickup')
    ],
    status: () => i18n.getMessage('4 open requests on your block'),
    cta: () => i18n.getMessage('Report missed collection')
  },
  parks: {
    name: () => i18n.getMessage('Parks & Recreation'),
    items: [
      () => i18n.getMessage('Reserve a ball field'),
      () => i18n.getMessage('Report a fallen tree'),
      () => i18n.getMessage('Permit an event')
    ],
    status: () => i18n.getMessage('2 events near you this week'),
    cta: () => i18n.getMessage('Reserve a space')
  },
  courts: {
    name: () => i18n.getMessage('Courts & Records'),
    items: [
      () => i18n.getMessage('Request a certified record'),
      () => i18n.getMessage('Pay a summons'),
      () => i18n.getMessage('Jury duty check-in')
    ],
    status: () => i18n.getMessage('Records window open until 5pm'),
    cta: () => i18n.getMessage('Request a record')
  },
  transit: {
    name: () => i18n.getMessage('Subway & Streets'),
    items: [
      () => i18n.getMessage('Report a signal outage'),
      () => i18n.getMessage('Street resurfacing status'),
      () => i18n.getMessage('Apply for a curb cut')
    ],
    status: () => i18n.getMessage('Delays on 2 lines near you'),
    cta: () => i18n.getMessage('Check service status')
  },
  buildings: {
    name: () => i18n.getMessage('Permits & Inspections'),
    items: [
      () => i18n.getMessage('Apply for a work permit'),
      () => i18n.getMessage('Schedule an inspection'),
      () => i18n.getMessage('Check violation status')
    ],
    status: () => i18n.getMessage('3 inspections scheduled today'),
    cta: () => i18n.getMessage('Apply for a permit')
  }
};

@customElement('nyc-city-scene')
export default class NycCityScene extends AIUXElement {
  static properties = {
    _focused: {state: true}
  };

  static styles = css`
    :host {
      display: block;
      height: 100%;
    }
    .stage {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #232b40;
      touch-action: none;
    }
    .stage.hovering {
      cursor: pointer;
    }
    canvas {
      display: block;
      animation: reveal 1.1s ease-out;
    }
    @keyframes reveal {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    .dim {
      position: absolute;
      inset: 0;
      border: none;
      padding: 0;
      background: rgba(12, 16, 28, 0.42);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.45s ease;
    }
    .dim.on {
      opacity: 1;
      pointer-events: auto;
    }
    .panel {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: min(340px, 86vw);
      background: #171c2b;
      color: #e8e4d8;
      transform: translateX(105%);
      transition: transform 0.45s cubic-bezier(0.25, 0.9, 0.3, 1);
      padding: 28px 26px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 18px;
      font-size: 13px;
      line-height: 1.5;
    }
    .panel.open {
      transform: translateX(0);
    }
    .panel h2 {
      margin: 0;
      font-size: 22px;
      font-weight: 600;
      letter-spacing: 0.01em;
      color: #f6efdd;
    }
    .panel .kicker {
      font-size: 11px;
      color: #9aa3bd;
      margin: 0 0 -12px;
    }
    .panel ul {
      list-style: none;
      margin: 0;
      padding: 0;
      border-top: 1px solid #2a3147;
    }
    .panel li {
      padding: 11px 0;
      border-bottom: 1px solid #2a3147;
      color: #cfd4e2;
    }
    .status {
      color: #ffc46b;
      font-size: 12px;
    }
    .cta {
      margin-top: auto;
      border: none;
      background: #ffc46b;
      color: #241d0e;
      font: inherit;
      font-weight: 600;
      padding: 12px 16px;
      cursor: pointer;
    }
    .cta:hover {
      background: #ffd28a;
    }
    .close {
      position: absolute;
      top: 10px;
      right: 12px;
      border: none;
      background: none;
      color: #9aa3bd;
      font-size: 18px;
      cursor: pointer;
      padding: 6px;
    }
  `;

  constructor() {
    super();
    this._focused = null;
  }

  // All Three.js work happens client-side only — firstUpdated never runs on
  // the server, so no isServer guards are needed here.
  firstUpdated() {
    const stage = this.renderRoot.querySelector('.stage');
    this._stage = stage;

    this._scene = new Scene();
    this._scene.background = new Color(0x232b40);

    this._camera = new OrthographicCamera(-1, 1, 1, -1, 1, 1400);

    // Blue hour: one strong low key from the west, soft cool fill.
    const key = new DirectionalLight(0xffd9a8, 1.7);
    key.position.set(-90, 60, 35);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -95;
    key.shadow.camera.right = 95;
    key.shadow.camera.top = 95;
    key.shadow.camera.bottom = -95;
    key.shadow.camera.near = 10;
    key.shadow.camera.far = 350;
    key.shadow.bias = -0.001;
    this._scene.add(key);
    this._scene.add(new AmbientLight(0x8ea0cc, 1.2));

    const {group, services, animated} = buildCity();
    this._scene.add(group);
    this._services = services;
    this._animated = animated;
    this._raycastMeshes = services.flatMap(s => s.meshes);
    this._raycaster = new Raycaster();
    this._pointerNdc = new Vector2();
    this._hovered = null;

    this._renderer = new WebGLRenderer({antialias: true});
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = true;
    stage.appendChild(this._renderer.domElement);

    // Fixed iso angle; zoom and look-at chase damped targets each frame.
    this._zoom = 0.85; // page-load reveal: settle from 0.85 to 1
    this._tZoom = 1;
    this._look = HOME_LOOK.clone();
    this._tLook = HOME_LOOK.clone();

    stage.addEventListener('pointermove', this._onPointerMove);
    stage.addEventListener('click', this._onClick);
    stage.addEventListener('wheel', this._onWheel, {passive: false});
    window.addEventListener('keydown', this._onKeyDown);

    this._resizeObserver = new ResizeObserver(entries => {
      const {width, height} = entries[0].contentRect;
      if (width === 0 || height === 0) return;
      // updateStyle=true keeps the canvas CSS size equal to the container —
      // without it the canvas overflows at devicePixelRatio > 1.
      this._renderer.setSize(width, height, true);
      const aspect = width / height;
      this._camera.left = -VIEW_HALF * aspect;
      this._camera.right = VIEW_HALF * aspect;
      this._camera.top = VIEW_HALF;
      this._camera.bottom = -VIEW_HALF;
      this._camera.updateProjectionMatrix();
    });
    this._resizeObserver.observe(stage);

    let lastT = performance.now() / 1000;
    const loop = () => {
      this._raf = requestAnimationFrame(loop);
      const now = performance.now() / 1000;
      const dt = Math.min(now - lastT, 0.1);
      lastT = now;
      // Slower chase while flying to/from a building so the move feels deliberate.
      const k = this._focused || this._returning ? 0.055 : 0.09;
      this._zoom += (this._tZoom - this._zoom) * (this._focused || this._returning ? 0.05 : 0.11);
      this._look.lerp(this._tLook, k);
      if (this._returning && Math.abs(this._zoom - this._tZoom) < 0.02) this._returning = false;

      const r = 420;
      this._camera.position.set(
        this._look.x + r * Math.cos(CAM_EL) * Math.sin(CAM_AZ),
        this._look.y + r * Math.sin(CAM_EL),
        this._look.z + r * Math.cos(CAM_EL) * Math.cos(CAM_AZ)
      );
      this._camera.lookAt(this._look);
      this._camera.zoom = this._zoom;
      this._camera.updateProjectionMatrix();

      // Hover/focus lift, light-up, and label brightness.
      for (const s of this._services) {
        const active = this._hovered === s || this._focused === s.id;
        const ty = s.baseY + (active ? 0.9 : 0);
        s.root.position.y += (ty - s.root.position.y) * 0.14;
        const to = active ? 1 : 0.82;
        s.sprite.material.opacity += (to - s.sprite.material.opacity) * 0.14;
        if (active !== s._lit) {
          s._lit = active;
          s.setLit(active);
        }
      }

      // Cars driving their lanes, wrapping at the map edge.
      const R = this._animated.range;
      for (const car of this._animated.cars) {
        const p = ((car.offset + now * car.speed * car.dir) % (2 * R) + 2 * R) % (2 * R) - R;
        if (car.axis === 'x') {
          car.group.position.set(p, 0.12, car.line + car.lane);
        } else {
          car.group.position.set(car.line + car.lane, 0.12, p);
        }
      }

      // Chimney smoke: puffs rise, swell, and fade on a loop.
      for (const em of this._animated.smokes) {
        for (const puff of em.puffs) {
          puff.phase = (puff.phase + dt * 0.22) % 1;
          const q = puff.phase;
          puff.mesh.position.set(em.x + Math.sin(q * 9) * 0.3, em.y + q * 5, em.z);
          const sc = 0.6 + q * 1.6;
          puff.mesh.scale.set(sc, sc, sc);
          puff.mesh.material.opacity = 0.38 * Math.sin(Math.PI * q);
        }
      }

      this._renderer.render(this._scene, this._camera);
    };
    loop();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    cancelAnimationFrame(this._raf);
    this._resizeObserver?.disconnect();
    window.removeEventListener('keydown', this._onKeyDown);
    this._renderer?.dispose();
  }

  _pickService(e) {
    const rect = this._renderer.domElement.getBoundingClientRect();
    this._pointerNdc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    this._raycaster.setFromCamera(this._pointerNdc, this._camera);
    const hit = this._raycaster.intersectObjects(this._raycastMeshes, false)[0];
    if (!hit) return null;
    return this._services.find(s => s.meshes.includes(hit.object)) ?? null;
  }

  _focusService(s) {
    this._prevZoom = this._tZoom;
    this._focused = s.id;
    this._hovered = null;
    this._stage.classList.remove('hovering');
    // Framed view: look slightly right of the building so it sits clear of
    // the panel, and zoom in — taller buildings get a wider frame.
    const right = new Vector3(Math.cos(CAM_AZ), 0, -Math.sin(CAM_AZ));
    this._tLook = s.anchor.clone().addScaledVector(right, 7);
    this._tZoom = Math.min(2.2, 34 / (s.topY + 8) + 1.1);
  }

  _unfocus() {
    if (!this._focused) return;
    this._focused = null;
    this._returning = true;
    this._tLook = HOME_LOOK.clone();
    this._tZoom = this._prevZoom ?? 1;
  }

  _onKeyDown = e => {
    if (e.key === 'Escape') this._unfocus();
  };

  _onPointerMove = e => {
    if (this._focused) return;
    const s = this._pickService(e);
    this._hovered = s;
    this._stage.classList.toggle('hovering', !!s);
  };

  _onClick = e => {
    if (e.target !== this._renderer.domElement) return;
    const s = this._pickService(e);
    if (s && this._focused !== s.id) {
      this._focusService(s);
    } else if (!s && this._focused) {
      this._unfocus();
    }
  };

  _onWheel = e => {
    e.preventDefault();
    this._tZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, this._tZoom * Math.exp(-e.deltaY * 0.0012)));
  };

  render() {
    const p = this._focused ? PANELS[this._focused] : null;
    return html`
      <div
        class="stage"
        aria-label=${i18n.getMessage('Interactive map of New York City services')}
        role="application"
      >
        <button
          class="dim ${this._focused ? 'on' : ''}"
          tabindex=${this._focused ? '0' : '-1'}
          aria-label=${i18n.getMessage('Return to city view')}
          @click=${this._unfocus}
        ></button>
        <aside class="panel ${this._focused ? 'open' : ''}" aria-hidden=${this._focused ? 'false' : 'true'}>
          ${p
            ? html`
                <button class="close" @click=${this._unfocus} aria-label=${i18n.getMessage('Close panel')}>
                  ✕
                </button>
                <p class="kicker">${i18n.getMessage('NYC.gov Live')}</p>
                <h2>${p.name()}</h2>
                <ul>
                  ${p.items.map(item => html`<li>${item()}</li>`)}
                </ul>
                <p class="status">● ${p.status()}</p>
                <button class="cta">${p.cta()}</button>
              `
            : nothing}
        </aside>
      </div>
    `;
  }
}
