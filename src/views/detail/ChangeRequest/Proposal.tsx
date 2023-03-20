// /** @jsx jsx */
// /** @jsxFrag React.Fragment */
// 
// 
// import React from 'react';
// 
// import { jsx, css } from '@emotion/react';
// 
// import {
//   FormGroup,
//   InputGroup,
//   NonIdealState,
//   HTMLSelect,
//   H4,
// } from '@blueprintjs/core';
// 
// import useItemClassConfig from '../../hooks/useItemClassConfig';
// 
// import type {
//   ChangeProposal,
//   Payload,
//   InternalItemReference,
// } from '../../../types';
// 
// import { PROPOSAL_TYPES } from '../../../types';
// 
// 
// const ProposalDetails: React.FC<{
//   itemRef: InternalItemReference
//   proposal: ChangeProposal
// 
//   existingItemData?: Payload
// 
//   onAccept?: (itemID: string, clsID: string) => void
//   onChange?: (val: ChangeProposal) => void
//   onDelete?: () => void
// }> = function ({
//   itemRef,
//   proposal,
//   onChange,
//   existingItemData,
// }) {
//   const { value: classConfig } = useItemClassConfig(itemRef.classID ?? 'NONEXISTENT_CLASS_ID');
//   const itemClass = classConfig;
// 
//   let itemView: JSX.Element;
//   let proposalProperties: JSX.Element | null;
// 
//   if (proposal.type === 'amendment') {
//     proposalProperties = (
//       <FormGroup inline label="Supersede with:">
//         <InputGroup
//           value={proposal.amendmentType === 'supersession' ? proposal.supersedingItemID : ''}
//           disabled={!onChange}
//           placeholder="Item ID"
//           onChange={onChange
//             ? (evt: React.FormEvent<HTMLInputElement>) => {
//                 if (!onChange) { return; }
//                 const itemID = evt.currentTarget.value;
//                 if (itemID.trim() === '') {
//                   const newVal = update(proposal, { $unset: ['supersedingItemID'] });
//                   onChange({ ...newVal, amendmentType: 'retirement' });
//                 } else {
//                   onChange({ ...proposal, amendmentType: 'supersession', supersedingItemID: itemID });
//                 }
//               }
//             : undefined}/>
//       </FormGroup>
//     );
//   } else {
//     proposalProperties = null;
//   }
// 
//   const itemData: Payload | undefined = proposal.type === 'addition'
//     ? proposal.payload
//     : existingItemData;
// 
//   if (itemData === undefined || !itemClass) {
//     itemView = <NonIdealState icon="heart-broken" title="Unable to display this item" />;
//   } else if (onChange && proposal.type !== 'amendment') {
//     const EditView = itemClass.views.editView;// as ItemEditView<any>;
//     itemView = <EditView
//       itemRef={itemRef}
//       itemData={itemData}
//       onChange={onChange
//         ? (payload) => onChange ? onChange({ ...proposal, payload }) : void 0
//         : undefined} />;
//   } else {
//     const DetailView = itemClass.views.detailView ?? itemClass!.views.editView;// as ItemDetailView<any>;
//     itemView = <DetailView
//       itemRef={itemRef}
//       itemData={itemData} />;
//   }
// 
//   const canChangeProposalType = proposal.type !== 'addition';
// 
//   function handleTypeChange(type: string) {
//     const pt = type as typeof PROPOSAL_TYPES[number];
// 
//     if (PROPOSAL_TYPES.indexOf(pt) < 0) { return; }
//     if (!onChange || !canChangeProposalType || pt === 'addition' || existingItemData === undefined) { return; }
// 
//     if (pt === 'amendment') {
//       onChange(update(proposal, {
//         type: { $set: pt },
//         amendmentType: { $set: 'retirement' },
//         $unset: ['payload'],
//       }));
//     } else {
//       onChange(update(proposal, {
//         type: { $set: pt },
//         payload: existingItemData,
//       }));
//     }
//   }
// 
//   return (
//     <div css={css`flex: 1; display: flex; flex-flow: column nowrap;`}>
//       <div css={css`flex-shrink: 0; display: flex; flex-flow: row nowrap; align-items: center; margin-bottom: 1rem;`}>
//         <HTMLSelect
//           options={PROPOSAL_TYPES.map(pt => ({ value: pt, label: pt }))}
//           //iconProps={{ icon: PROPOSAL_ICON[proposal.type] }}
//           value={proposal.type}
//           disabled={!onChange || !canChangeProposalType || existingItemData === undefined}
//           onChange={(onChange && canChangeProposalType && existingItemData !== undefined)
//             ? (evt) => handleTypeChange(evt.currentTarget.value)
//             : undefined} />
//         &ensp;
//         of a
//         &ensp;
//         <H4 css={css`margin: 0;`}>{classConfig?.meta.title ?? 'unknown class'}</H4>
//         {proposalProperties}
//       </div>
// 
//       <div css={css`flex: 1; overflow-y: auto;`}>
//         {itemView}
//       </div>
//     </div>
//   );
// };
// 
// export default ProposalDetails;
