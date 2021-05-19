import { Change, Changeset } from '@riboseinc/paneron-extension-kit/types/changes';
import { ObjectChangeset } from '@riboseinc/paneron-extension-kit/types/objects';
import {
  InternalItemReference,
  RegisterItem,
  ChangeRequest,
  ChangeProposal,
  Addition,
  Amendment,
  Clarification,
  Supersession,
  ItemClassConfiguration,
} from '../../types';
import { itemPathToItemRef, itemRefToItemPath } from '../itemPathUtils';


export async function proposalsToObjectChangeset(
  crID: string,
  hasSubregisters: boolean,
  proposals: ChangeRequest["proposals"],
  itemData: Record<string, RegisterItem<any>>,
): Promise<ObjectChangeset> {
  const cs: ObjectChangeset = {};

  for (const [itemPath, proposal] of Object.entries(proposals)) {
    //const originalItem: RegisterItem<any> | undefined = (itemData[itemPath] ?? undefined);
    const itemRef = itemPathToItemRef(hasSubregisters, itemPath);

    if (proposal.type !== 'addition') {
      if (itemData[itemPath] === undefined) {
        console.error("Unable to convert proposals to object changeset: original item data is missing", itemPath);
        throw new Error("Unable to convert proposals to object changeset: original item data is missing");
      }
      if (proposal.type === 'amendment' && proposal.amendmentType === 'supersession') {
        Object.assign(cs, await proposalToObjectChangeset(crID, proposal, itemRef, itemPath, itemData));
      } else {
        Object.assign(cs, await proposalToObjectChangeset(crID, proposal, itemRef, itemPath, itemData));
      }
    } else {
      Object.assign(cs, await proposalToObjectChangeset(crID, proposal, itemRef, itemPath, itemData));
    }
  }

  return cs;
}

// TODO: Refactor out the business logic of proposal approval.
/* Core logic of approving a proposal.
   Takes a proposal and extra options (depending on proposal type).
   Returns a register item.
*/
async function proposalToObjectChangeset(
  crID: string,
  proposal: ChangeProposal,
  itemRef: InternalItemReference,
  itemPath: string,
  itemData: Record<string, RegisterItem<any>>,
): Promise<Changeset<Change<RegisterItem<any>>>> {
  let newItem: RegisterItem<any>;
  const changeset: Changeset<Change<RegisterItem<any>>> = {};

  const origItem = itemData[itemPath] ?? null;

  if (proposal.type !== 'addition') {
    if (origItem === null) {
      throw new Error("proposalToObjectChangeset() requires originalItem for non-additions");
    }
    newItem = { ...origItem };

    if (proposal.type === 'clarification') {
      const clarification = proposal as Clarification;
      newItem.data = clarification.payload;
    }
    if (proposal.type === 'amendment') {
      const amendment = proposal as Amendment;
      newItem.amendedInCR = crID;

      if (amendment.amendmentType === 'retirement') {
        newItem.status = 'retired';

      } else if (amendment.amendmentType === 'supersession') {
        const supersession = proposal as Supersession;
        newItem.status = 'superseded';
        newItem.supersededBy = supersession.supersedingItemIDs.map(itemID => ({
          itemID,
          classID: itemRef.classID,
          subregisterID: itemRef.subregisterID,
        }));

        for (const supersedingItemPath of newItem.supersededBy.map(itemRefToItemPath)) {
          const supersedingItemData = itemData[supersedingItemPath];
          if (supersedingItemData) {
            changeset[supersedingItemPath] = {
              oldValue: supersedingItemData,
              newValue: {
                ...supersedingItemData,
                supersedes: [ ...(supersedingItemData.supersedes ?? []), itemRef ],
              },
            };
          }
        }
      }
    }
  } else {
    const addition = proposal as Addition;
    newItem = {
      id: itemRef.itemID,
      data: addition.payload,
      status: 'valid',
      dateAccepted: new Date(),
    };
  }

  changeset[itemPath] = {
    oldValue: origItem,
    newValue: newItem,
  };

  return changeset;
}


export async function makeAdditionProposal<P extends Record<string, any> = any>
(idMaker: () => Promise<string>, itemClass: ItemClassConfiguration<P>, data?: P, subregisterID?: string):
Promise<[itemRef: InternalItemReference, proposal: Addition]> {
  const itemRef = {
    classID: itemClass.meta.id,
    subregisterID,
    itemID: await idMaker(),
  };
  return [itemRef, {
    type: 'addition',
    payload: data ?? itemClass.defaults ?? {},
  }];
};
