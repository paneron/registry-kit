/** @jsx jsx */
/** @jsxFrag React.Fragment */
import React from 'react';
//import { Helmet } from 'react-helmet';
import { jsx, css } from '@emotion/react';
import { Menu, MenuItem, type MenuItemProps, NonIdealState, Spinner } from '@blueprintjs/core';
import { CardInGrid } from '../../util';


interface HomeBlockProps<P extends Record<string, any>> {
  description: string,
  View: React.VoidFunctionComponent<P>,

  /** Props to pass the `View`. */
  props: P | null | undefined,

  /** Shown if `props` is `null`. */
  error?: string | JSX.Element,

  /** Shown beneath `View`. */
  actions?: MenuItemProps[],

  /** Applies to wrapper card div. */
  className?: string,
}
export default function HomeBlock<P extends Record<string, any>>(
  { View, description, props, error, actions, className }: HomeBlockProps<P>
) {
  return (
    <CardInGrid
        css={css`
          padding: 5px;
          display: flex; flex-flow: column nowrap;
          overflow: hidden;
          transition:
            width .5s linear,
            height .5s linear;
        `}
        description={description}
        className={className}>
      {props
        ? <View {...props} />
        : props === undefined
          ? <NonIdealState icon={<Spinner />} />
          : <NonIdealState icon="heart-broken" title="Failed to load" description={error} />}
      {(actions?.length ?? 0) > 0
        ? <Menu css={css`background: none !important; flex-shrink: 0;`}>
            {actions!.map((mip, idx) => <MenuItem key={idx} {...mip }/>)}
          </Menu>
        : null}
    </CardInGrid>
  );
}
