import {html, css} from 'lit';
import {customElement} from 'lit/decorators.js';
import {AIUXElement} from '@servicenow/aiux/aiux-components-core';
import './components/nyc-city-scene.js';

@customElement('x-1433234-newyork-city-page')
export default class CityPage extends AIUXElement {
  static styles = css`
    :host {
      display: block;
    }
    .frame {
      height: calc(100dvh - 10rem);
      min-height: 480px;
    }
  `;

  render() {
    return html`
      <div class="frame">
        <nyc-city-scene></nyc-city-scene>
      </div>
    `;
  }
}
