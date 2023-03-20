import type { Change, Changeset } from '@riboseinc/paneron-extension-kit/types/changes';
import type { ObjectChangeset } from '@riboseinc/paneron-extension-kit/types/objects';
import type {
  InternalItemReference,
  RegisterItem,
  ChangeRequest,
  ChangeProposal,
  Amendment,
  Supersession,
} from '../../types';
import { isRegisterItem } from '../../types';
import type { Version as RegisterVersion } from '../../types/register';
import {
  State,
  type Drafted,
  type ReturnedForClarificationByManager,
  type ReturnedForClarificationByControlBody,
} from '../../types/cr';
import { crIDToCRPath, itemPathInCR, itemPathToItemRef, itemRefToItemPath } from '../itemPathUtils';


/** Takes a justification and ID, returns an object changeset. */
export function newCRObjectChangeset(
  id: string,
  justification: string,
  registerVersion: RegisterVersion,
  stakeholderGitServerUsername: string,
): ObjectChangeset {

  const timeStarted = new Date();
  const cr: Drafted = {
    id,
    timeStarted,
    timeEdited: timeStarted,
    justification,
    submittingStakeholderGitServerUsername: stakeholderGitServerUsername,
    items: {},
    state: State.DRAFT,
    registerVersion: registerVersion!.id,
  };
  const crObjectPath = crIDToCRPath(id);
  return {
    [crObjectPath]: {
      oldValue: null,
      newValue: cr,
    },
  }
}


/**
 * Returns an object changeset to update CR with new given proposal items.
 * Only applicable to CR at draft edit stage.
 */
export function updateCRObjectChangeset(
  /**
   * Change request data.
   */
  cr: Drafted | ReturnedForClarificationByManager | ReturnedForClarificationByControlBody,

  /**
   * Proposals by item path.
   * Will be merged with those already existing in `cr`.
   * If a proposal is undefined, it will be removed.
   */
  proposalItems: Record<string, ChangeProposal | null>,

  /**
   * New item data must be provided for additions and clarifications,
   * keyed by item path.
   */
  itemData: Record<string, RegisterItem<any>> = {},
): ObjectChangeset {
  const changeset: ObjectChangeset = {};
  const newItems = { ...cr.items };
  for (const [itemPath, proposal] of Object.entries(proposalItems)) {
    // Update proposals on CR
    if (proposal !== null) {
      newItems[itemPath] = proposal;
    } else if (newItems[itemPath]) {
      delete newItems[itemPath];
    }
    // Add/remove item data
    if (proposal?.type === 'addition' || proposal?.type === 'clarification') {
      const proposedItemData = itemData[itemPath];
      if (proposedItemData === null || !isRegisterItem(proposedItemData)) {
        console.error("Unable to convert proposals to object changeset: original item data is missing", itemPath);
        throw new Error("Unable to convert proposals to object changeset: original item data is missing");
      }
      changeset[itemPathInCR(itemPath, cr.id)] = {
        // When editing a draft, we don’t care
        // about overwriting proposed item data so we omit oldValue.
        newValue: proposedItemData,
      };
    } else {
      changeset[itemPathInCR(itemPath, cr.id)] = {
        // When editing a draft, we don’t care
        // about overwriting proposed item data so we omit oldValue.
        newValue: null,
      };
    }
  }
  // Update main CR data
  const crPath = crIDToCRPath(cr.id);
  changeset[crPath] = {
    oldValue: cr,
    newValue: { ...cr, items: newItems, timeEdited: new Date() },
  };
  return changeset;
}


/**
 * Given change proposals, returns applicable changes
 * to objects in the dataset.
 */
export async function proposalsToObjectChangeset(
  crID: string,
  hasSubregisters: boolean,
  proposals: ChangeRequest["proposals"],
  itemData: Record<string, RegisterItem<any> | null>,
  newItemData: Record<string, RegisterItem<any> | null>,
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
        Object.assign(cs, await proposalToObjectChangeset(crID, proposal, itemRef, itemPath, itemData, newItemData));
      } else {
        Object.assign(cs, await proposalToObjectChangeset(crID, proposal, itemRef, itemPath, itemData, newItemData));
      }
    } else {
      Object.assign(cs, await proposalToObjectChangeset(crID, proposal, itemRef, itemPath, itemData, newItemData));
    }
  }

  return cs;
}

// TODO: Refactor out the business logic of proposal approval.
/**
 * Given a change proposal, returns applicable changes
 * to objects in the dataset.
 * Core logic of approving a proposal.
 * Takes a proposal and extra options (depending on proposal type).
 * Returns a Changeset containing register items at appropriate paths.
 */
async function proposalToObjectChangeset(
  crID: string,
  proposal: ChangeProposal,
  itemRef: InternalItemReference,
  itemPath: string,
  itemData: Record<string, RegisterItem<any> | null>,
  newItemData: Record<string, RegisterItem<any> | null>,
): Promise<Changeset<Change<RegisterItem<any>>>> {
  let updatedItem: RegisterItem<any>;
  const changeset: Changeset<Change<RegisterItem<any>>> = {};

  const origItem = itemData[itemPath] ?? null;
  const newItem = newItemData[itemPathInCR(itemPath, crID)] ?? null;

  if (proposal.type !== 'addition') {
    if (origItem === null) {
      throw new Error("proposalToObjectChangeset() requires original item data for non-additions");
    }

    updatedItem = { ...origItem };

    switch (proposal.type) {
      case 'clarification':
        if (newItem === null) {
          throw new Error("proposalToObjectChangeset() requires new item data for clarifications");
        }
        //const clarification = proposal as Clarification;
        updatedItem.data = newItem.data //clarification.payload;
        break;
      case 'amendment':
        const amendment = proposal as Amendment;
        updatedItem.amendedInCR = crID;

        switch (amendment.amendmentType) {
          case 'retirement':
            updatedItem.status = 'retired';
            break;
          case 'invalidation':
            updatedItem.status = 'invalid';
            break;
          case 'supersession':
            const supersession = proposal as Supersession;
            updatedItem.status = 'superseded';
            updatedItem.supersededBy = supersession.supersedingItemIDs.map(itemID => ({
              itemID,
              classID: itemRef.classID,
              subregisterID: itemRef.subregisterID,
            }));
            for (const supersedingItemPath of updatedItem.supersededBy.map(ip => itemRefToItemPath(ip))) {
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
            break;
        }
        break;
    }
  } else {
    if (newItem === null) {
      throw new Error("proposalToObjectChangeset() requires new item data for additions");
    }
    updatedItem = {
      id: itemRef.itemID,
      data: newItem.data,
      status: 'valid',
      dateAccepted: new Date(),
    };
  }

  changeset[itemPath] = {
    oldValue: origItem,
    newValue: updatedItem,
  };

  return changeset;
}
