/** @jsx jsx */
/** @jsxFrag React.Fragment */

// import React, { useMemo, useState, useEffect, useContext } from 'react';
// import { jsx, css } from '@emotion/core';
// import { MenuItem } from '@blueprintjs/core';
// import { ItemRenderer, Select } from '@blueprintjs/select';
// import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
// import { ChangeRequest } from '../types';


// interface CRItem {
//   id: string
// }
// 
// 
// const CRItemView: ItemRenderer<CRItem> = (item, { handleClick, modifiers, query }) => {
//   const { useObjectData } = useContext(DatasetContext);
//   const crObjectPath = `/change-requests/${item.id}.yaml`;
//   const crDataResp = useObjectData({ objectPaths: [crObjectPath] });
//   const crData = (crDataResp.value.data[crObjectPath] ?? null) as ChangeRequest | null;
//   if (crData) {
//     return <MenuItem
//       active={modifiers.active}
//       disabled={modifiers.disabled}
//       text={crData.justification}
//       onClick={handleClick}
//       key={item.id}
//     />;
//   }
//   return item.id;
// };
// 
// const Dropdown = Select.ofType<CRItem>();
// 
// 
// const CR_QUERY: string = `return (objPath.startsWith("/change-requests/") && objPath.endsWith('.yaml'))`,
// 
// 
// const CRMenu: React.FC<{
//   selected?: string
//   onSelect: (newID: string | undefined) => void
//   className?: string
// }> =
// function ({ selected, onSelect, className }) {
//   const { useFilteredIndex, useIndexDescription } = useContext(DatasetContext);
//   const indexReq = useFilteredIndex({ queryExpression: CR_QUERY });
//   const indexID: string = indexReq.value.indexID ?? '';
// 
//   const indexDescReq = useIndexDescription({ indexID });
//   const itemCount = indexDescReq.value.status.objectCount;
//   const indexProgress = indexDescReq.value.status.progress;
//   return (
//     <Select
//       popoverProps={{ minimal: true }}
//       itemRenderer={CRItemView}
//       onItemSelect={(item) => onSelect(item.id)}
//       items={}
//     />
//   );
// }
