import {html, css} from 'lit';
import {customElement} from 'lit/decorators.js';
import {AIUXElement} from '@servicenow/aiux/aiux-components-core';
import {i18n} from '@servicenow/aiux/aiux-services';
import '@servicenow/aiux/aiux-components-list';
import {ListDataManager} from '@servicenow/aiux/aiux-components-list';

@customElement('x-1433234-newyork-incidents-page')
export default class IncidentsPage extends AIUXElement {
  static styles = css`
    :host {
      display: contents;
    }
  `;

  static async loader(ctx) {
    const data = await ListDataManager.fetch({
      table: 'incident',
      query: ctx.query?.sysparm_query || 'active=true',
      view: ''
    }).catch(() => null);

    return {data};
  }

  render() {
    const {data} = this.loaderData || {};

    return html`
      <div class="mx-auto flex max-w-7xl flex-col gap-6 p-4 lg:p-8">
        <div class="flex flex-col gap-2">
          <div class="aiux-badge aiux-badge-primary aiux-badge-outline">
            ${i18n.getMessage('Example page')}
          </div>
          <h2 class="text-3xl font-bold tracking-tight">
            ${i18n.getMessage('Incidents')}
          </h2>
          <p class="max-w-3xl">
            ${i18n.getMessage(
              'This page uses aiux-list-connected and ListDataManager to render a ServiceNow incident list.'
            )}
          </p>
        </div>
        <section class="aiux-card border border-base-300 bg-base-100 shadow-sm">
          <div class="aiux-card-body p-6">
            <aiux-list-connected
              table="incident"
              query="active=true"
              .data=${data}
              .pageSize=${10}
              .listOptions=${{
                heading: i18n.getMessage('Active incidents'),
                selectionEnabled: false,
                selectAllEnabled: false,
                showRefreshButton: true,
                showZingSearch: true,
                showConditionBuilderButton: true,
                showEditColumnsButton: true,
                showCopyURLButton: false,
                showCount: true,
                showReadableFixedQuery: true
              }}
            ></aiux-list-connected>
          </div>
        </section>
      </div>
    `;
  }
}
