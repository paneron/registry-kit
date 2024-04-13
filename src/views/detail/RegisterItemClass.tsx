/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useMemo, memo } from 'react';
import { jsx, css } from '@emotion/react';
import {
  Card,
  NonIdealState,
  UL,
  type IconName,
} from '@blueprintjs/core';
import type { Criterion, CriteriaGroup } from '../FilterCriteria/models';
import { type ItemClassConfiguration } from '../../types';
import useItemClassConfig from '../hooks/useItemClassConfig';
import Search from '../sidebar/Search';
import { RegisterHelmet as Helmet } from '../util';
import { TabContentsWithHeader } from '../util';


const MaybeItemClass: React.VoidFunctionComponent<{ uri: string }> =
memo(function ({ uri }) {
  const itemClass = useItemClassConfig(uri);
  if (!itemClass) {
    return <NonIdealState
      icon="heart-broken"
      title="Unable to show item class"
      description={`Item class ${uri} cannot be found in item class configuration for this register`}
    />;
  }
  return <ItemClass itemClass={itemClass} />
});


const ItemClassTitle: React.FC<{ uri: string }> = function ({ uri }) {
  const itemClass = useItemClassConfig(uri);
  return <>{itemClass?.meta.title ?? uri}</>;
};


export default {
  main: MaybeItemClass,
  title: ItemClassTitle,
} as const;


const ItemClass: React.VoidFunctionComponent<{
  itemClass: ItemClassConfiguration<any>
}> = function ({ itemClass }) {

  const availableClassIDs = [itemClass.meta.id];

  const classCriteria: Criterion[] = useMemo(() => (
    availableClassIDs.map(clsID => ({
      key: 'item-class',
      query: `objPath.indexOf(\"/${clsID}/\") >= 0`,
    }))
  ), [availableClassIDs.toString()]);

  const implicitCriteria: CriteriaGroup | undefined = useMemo(() => (
    classCriteria.length > 0
      ? {
          require: 'any',
          criteria: classCriteria,
        }
      : undefined
  ), [classCriteria]);

  const classification = useMemo(() => [{
    icon: 'folder-close' as IconName,
    children: <>
      Register item class
    </>,
    tooltip: {
      icon: 'info-sign' as IconName,
      content: <UL css={css`margin: 0;`}>
        <li>Class ID: {itemClass.meta.id}</li>
      </UL>,
    },
  }], [itemClass.meta.id]);

  return (
    <TabContentsWithHeader
        title={<>{itemClass.meta.title}</>}
        classification={classification}>
      <Card css={css`flex: 1; box-shadow: none !important; position: absolute; border-radius: 0; display: flex; flex-flow: column nowrap; padding: 10px;`}>
        <p>{itemClass.meta.description ?? '(no class description available)'}</p>
        <Helmet><title>{itemClass.meta.title}</title></Helmet>
        <Search
          css={css`flex: 1;`}
          //style={{ height: '100vh', width: '50vw', minWidth: '500px', maxWidth: '90vw' }}
          availableClassIDs={availableClassIDs}
          implicitCriteria={implicitCriteria}
          stateName={`item-class-${itemClass.meta.id}-search`}
          //onOpenItem={onChooseItem ? handleOpenItem : undefined}
        />
      </Card>
    </TabContentsWithHeader>
  );
};
