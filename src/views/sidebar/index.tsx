/** @jsx jsx */
/** @jsxFrag React.Fragment */

//import React from 'react';
import update from 'immutability-helper';
import { jsx, css } from '@emotion/react';
import { Icon } from '@blueprintjs/core';

import type { SuperSidebarConfig } from '@riboseinc/paneron-extension-kit/widgets/TabbedWorkspace/types';
import HelpTooltip from '@riboseinc/paneron-extension-kit/widgets/HelpTooltip';

//import Browse from './Browse';
import ItemClassTree from '../../item-classes/Tree';
//import Search from './Search';
import { ChangeRequestHistoryBlock } from './Registration';
import ActionableCRTree from '../../proposals/actionableGroups/Tree';
//import { ExportOptions, ImportOptions } from './ExportImport';


export const sidebarIDs = [
  'Browse',
  //'Registration',
  //'Export',
] as const;

export type SidebarID = typeof sidebarIDs[number];

export const sidebarConfig: SuperSidebarConfig<typeof sidebarIDs> = {
  Browse: {
    icon: () => <Icon icon="list" />,
    title: "Browse",
    blocks: [{
      key: 'browse',
      title: <div css={css`display: flex; justify-content: space-between`}>
        Item classes
        <HelpTooltip content="Browse register items by pre-made categories" />
      </div>,
      content: <ItemClassTree />,
      nonCollapsible: false,
      // These have to have height specified due to absolute positioning.
      height: 400,
    //}, {
    //  key: 'search',
    //  title: "New search",
    //  content: <Search css={css`position: absolute; inset: 0;`} />,
    //  nonCollapsible: false,
    //  height: 400,
    }, {
      key: 'proposal-history',
      title: "Proposal history",
      content: <ChangeRequestHistoryBlock />,
      nonCollapsible: false,
      height: 200,
    }],
  },
  // Registration: {
  //   icon: () => <Icon icon="lightbulb" />,
  //   title: "Proposals",
  //   blocks: [{
  //     key: 'pending-crs',
  //     title: <div css={css`display: flex; justify-content: space-between`}>
  //       Pending proposals
  //       <HelpTooltip content="Proposals pending decision. If a register item is selected, only proposals affecting that item are shown." />
  //     </div>,
  //     content: <PendingChangeRequestsBlock />,
  //     height: 300,
  //   }, {
  //     key: 'cr-history',
  //     title: <div css={css`display: flex; justify-content: space-between`}>
  //       History
  //       <HelpTooltip content="Resolved proposals. If a register item is selected, only proposals affecting that item are shown." />
  //     </div>,
  //     content: <ChangeRequestHistoryBlock />,
  //     height: 300,
  //   }],
  // },
  // Export: {
  //   icon: () => <Icon icon="changes" />,
  //   title: "Import and export options",
  //   blocks: [{
  //     key: 'export',
  //     title: "Export options",
  //     content: <ExportOptions />,
  //     nonCollapsible: true,
  //   }, {
  //     key: 'import',
  //     title: "Import options",
  //     content: <ImportOptions />,
  //     nonCollapsible: false,
  //     collapsedByDefault: true,
  //   }],
  // },
};

export const sidebarConfigForStakeholder: SuperSidebarConfig<typeof sidebarIDs> = update(
  sidebarConfig, {
    Browse: {
      blocks: {
        $splice: [[0, 0, {
          key: 'proposals',
          title: "Pending proposals",
          content: <ActionableCRTree />,
          nonCollapsible: false,
          height: 200,
        }]]
      }
    }
  });
