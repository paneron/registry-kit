/** @jsx jsx */
/** @jsxFrag React.Fragment */

//import React from 'react';
import { jsx, css } from '@emotion/react';
import { Icon } from '@blueprintjs/core';

import type { SuperSidebarConfig } from '@riboseinc/paneron-extension-kit/widgets/TabbedWorkspace/types';
import HelpTooltip from '@riboseinc/paneron-extension-kit/widgets/HelpTooltip';

import Browse from './Browse';
import Search from './Search';
import { PendingChangeRequestsBlock, ChangeRequestHistoryBlock } from './Registration';
import { ExportOptions, ImportOptions } from './ExportImport';
//import Browse from './Browse';
import ItemClassTree from '../../item-classes/Tree';


export const sidebarIDs = [
  'Browse',
  'Registration',
  'Export',
] as const;

export type SidebarID = typeof sidebarIDs[number];

export const sidebarConfig: SuperSidebarConfig<typeof sidebarIDs> = {
  Browse: {
    icon: () => <Icon icon="list" />,
    title: "Register items",
    blocks: [{
      key: 'browse',
      title: <div css={css`display: flex; justify-content: space-between`}>
        Preset searches
        <HelpTooltip content="Browse register items by pre-made categories" />
      </div>,
      content: <ItemClassTree />,
      nonCollapsible: false,
      // These have to have height specified due to absolute positioning.
      height: 400,
    }, {
      key: 'search',
      title: "New search",
      content: <Search css={css`position: absolute; inset: 0;`} />,
      nonCollapsible: false,
      height: 400,
    }],
  },
  Registration: {
    icon: () => <Icon icon="lightbulb" />,
    title: "Proposals",
    blocks: [{
      key: 'pending-crs',
      title: <div css={css`display: flex; justify-content: space-between`}>
        Pending proposals
        <HelpTooltip content="Proposals pending decision. If a register item is selected, only proposals affecting that item are shown." />
      </div>,
      content: <PendingChangeRequestsBlock />,
      height: 300,
    }, {
      key: 'cr-history',
      title: <div css={css`display: flex; justify-content: space-between`}>
        History
        <HelpTooltip content="Resolved proposals. If a register item is selected, only proposals affecting that item are shown." />
      </div>,
      content: <ChangeRequestHistoryBlock />,
      height: 300,
    }],
  },
  Export: {
    icon: () => <Icon icon="changes" />,
    title: "Import and export options",
    blocks: [{
      key: 'export',
      title: "Export options",
      content: <ExportOptions />,
      nonCollapsible: true,
    }, {
      key: 'import',
      title: "Import options",
      content: <ImportOptions />,
      nonCollapsible: false,
      collapsedByDefault: true,
    }],
  },
};
