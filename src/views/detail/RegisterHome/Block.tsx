/** @jsx jsx */
/** @jsxFrag React.Fragment */
import React from 'react';
//import { Helmet } from 'react-helmet';
import styled from '@emotion/styled';
import { jsx } from '@emotion/react';
import {
  Menu,
  MenuItem, MenuDivider,
  type MenuItemProps, type MenuDividerProps,
  NonIdealState,
  Spinner,
} from '@blueprintjs/core';
import { CardInGrid } from '../../util';


interface HomeBlockProps<P extends Record<string, any>> {
  description: string,
  View: React.VoidFunctionComponent<P>,

  /** Props to pass the `View`. */
  props: P | null | undefined,

  /** Shown if `props` is `null`. */
  error?: string | JSX.Element,

  /** Shown beneath `View`. */
  actions?: (MenuItemProps | MenuDividerProps)[],

  /** Applies to wrapper card div. */
  className?: string,
}
export default function HomeBlock<P extends Record<string, any>>(
  { View, description, props, error, actions, className }: HomeBlockProps<P>
) {
  return (
    <HomeBlockCard
        description={description}
        className={className}>
      {props
        ? <View {...props} />
        : props === undefined
          ? <NonIdealState icon={<Spinner />} />
          : <NonIdealState icon="heart-broken" title="Failed to load" description={error} />}
      {(actions?.length ?? 0) > 0
        ? <HomeBlockActions actions={actions} />
        : null}
    </HomeBlockCard>
  );
}


export function HomeBlockActions({ actions }: { actions?: (MenuItemProps | MenuDividerProps)[] }) {
  return <HomeBlockActionMenu>
    {actions!.map((mip, idx) =>
      isMenuItemProps(mip)
        ? <MenuItem key={idx} {...(mip as MenuItemProps) } />
        : <MenuDivider key={idx} {...mip } />
    )}
  </HomeBlockActionMenu>
}


function isMenuItemProps(val: MenuItemProps | MenuDividerProps): val is MenuItemProps {
  const p = val as any;
  return p.onClick || p.disabled || p.icon || p.selected || p.active ? true : false;
}


const HomeBlockActionMenu = styled(Menu)`
  background: none !important;
  flex-shrink: 0;
`;


export const HomeBlockCard = styled(CardInGrid)`
  padding: 5px;
  display: flex; flex-flow: column nowrap;
  overflow: hidden;
  transition:
    width .5s linear,
    height .5s linear;
`;
