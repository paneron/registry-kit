/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React from 'react';
import { jsx, css } from '@emotion/react';
import { Button, ButtonGroup, ButtonProps, IconName } from '@blueprintjs/core';
import styled from '@emotion/styled';
import Search from './Search';
import ChangeRequests from './ChangeRequests';
import Register from './Register';
import Registration from './Registration';
import Export from './Export';


const SIDEBAR_IDS = [
  'Search',
  'ChangeRequests',
  'Register',
  'Registration',
  'Export',
] as const;

type SidebarID = typeof SIDEBAR_IDS[number];

interface SidebarConfig {
  icon: IconName
  title: JSX.Element | string
  description?: string
  panel: JSX.Element
}

const sidebars: Record<SidebarID, SidebarConfig> = {
  Search: {
    icon: 'search',
    title: "Search",
    panel: <Search />,
  },
  ChangeRequests: {
    icon: 'changes',
    title: "Change requests",
    panel: <ChangeRequests />,
  },
  Register: {
    icon: 'list',
    title: "Register",
    panel: <Register />,
  },
  Registration: {
    icon: 'take-action',
    title: "Registration",
    panel: <Registration />,
  },
  Export: {
    icon: 'export',
    title: "Export",
    panel: <Export />,
  },
};

interface SuperSidebarProps {
  selectedSidebarID: string
  onSelectSidebar?: (id: string) => void 
  className?: string
}
const SuperSidebar: React.FC<SuperSidebarProps> =
function ({ selectedSidebarID, onSelectSidebar, className }) {
  return (
    <ButtonGroup className={className} css={css``}>
      {SIDEBAR_IDS.map(sid =>
        <SidebarButton
          icon={sidebars[sid].icon}
          text={sidebars[sid].title}
          active={selectedSidebarID === sid}
          onClick={onSelectSidebar ? () => onSelectSidebar(sid) : undefined}
          disabled={!onSelectSidebar}
        />
      )}
    </ButtonGroup>
  );
};

export default SuperSidebar;

const StyledSidebarButton = styled(Button)`
  border-radius: 0;
`;

const SidebarButton: React.FC<ButtonProps> = function (props) {
  return <StyledSidebarButton minimal large {...props} />;
};
