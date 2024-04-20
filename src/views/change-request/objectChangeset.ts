import type { Change, Changeset } from '@riboseinc/paneron-extension-kit/types/changes';
import type { ObjectDataset, ObjectChangeset } from '@riboseinc/paneron-extension-kit/types/objects';
import type {
  ProposalSet,
  ChangeProposal,
  Amendment,
  Supersession,
} from '../../proposals/types';
import type {
  InternalItemReference,
  RegisterItem,
  ItemClassConfigurationSet,
} from '../../types';
import { isRegisterItem } from '../../types';
import type { Version as RegisterVersion } from '../../types/register';
import {
  State,
  type Drafted,
  type ReturnedForClarificationByManager,
  type ReturnedForClarificationByControlBody,
  ImportableCR,
} from '../../proposals/types';
import {
  crIDToCRPath,
  itemPathInCR,
  itemPathToItemRef,
  itemRefToItemPath,
} from '../itemPathUtils';


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
 * Returns an object changeset given an importable proposal,
 * item class definitions for register to import it to,
 * and a function to fetch register item data.
 *
 * Throws an error if importable proposal data isn’t compatible
 * with item class definitions or existing register data.
 */
export async function importedProposalToCRObjectChangeset(
  importableCR: ImportableCR,
  /** Available item classes per register configuration. */
  itemClasses: ItemClassConfigurationSet,
  /** VCS username of the person performing the import. */
  importingStakeholderGitServerUsername: string,
  getObjectData: (opts: { objectPaths: string[] }) => Promise<{ data: ObjectDataset }>,
  resolvePredicates?: (predicates: Set<string>) => Promise<ResolvedPredicates>,
  //findObjects: (predicate: string) => Promise<any[]>,
): Promise<[changeset: ObjectChangeset, id: string]> {
  const proposalDraft: Drafted = importableCR.proposalDraft;
  proposalDraft.submittingStakeholderGitServerUsername = importingStakeholderGitServerUsername;
  const crID = proposalDraft.id;
  const crPath = crIDToCRPath(crID);

  const itemPaths = Object.keys(proposalDraft.items);
  const proposals = Object.values(proposalDraft.items);

  for (const itemPath of itemPaths) {
    const itemRef = itemPathToItemRef(false, itemPath);
    if (!itemClasses[itemRef.classID]) {
      throw new Error(`Imported proposal contains item(s) of unknown class ${itemRef.classID}`);
    }
  }

  if (proposals.find(prop => prop.type !== 'addition')) {
    throw new Error("Only addition proposals can be imported at this time");
  }

  const existingItems = (await getObjectData({ objectPaths: itemPaths })).data;
  if (Object.values(existingItems).find(v => v !== null)) {
    throw new Error("Register already contains item(s) in this proposal");
  }

  const changeset: ObjectChangeset = {
    [crPath]: {
      oldValue: null,
      newValue: proposalDraft,
    },
  };

  for (const [itemPath, itemPayload] of Object.entries(importableCR.itemPayloads ?? {})) {
    if (itemPaths.indexOf(itemPath) < 0) {
      throw new Error(`No proposal found for item at ${itemPath}, but item data is given`);
    }
    if (!isRegisterItem(itemPayload)) {
      throw new Error(`Invalid register item data at ${itemPath}`);
    }
    const predicates = collectPredicates(itemPayload);
    if (predicates.size < 1) {
      changeset[itemPathInCR(itemPath, crID)] = {
        oldValue: null,
        newValue: itemPayload,
      };
    } else {
      if (!resolvePredicates) {
        throw new Error("Cannot resolve some predicates in imported proposal");
      }
      changeset[itemPathInCR(itemPath, crID)] = {
        oldValue: null,
        newValue: replacePredicates(itemPayload, await resolvePredicates(predicates)),
      };
    }
  }

  return [changeset, crID];
}


/**
 * When importable CR wants to link to preexisting register items,
 * and it does not know their exact UUIDs but knows some other properties,
 * it can provide this structure in place of a reference.
 *
 * `resolvePredicates()` will resolve any such placeholders to item UUIDs
 * at import time.
 *
 * `mode` should specify whether the predicate should be replaced with
 * only a UUID string ('id', used when classID is already known)
 * or full `InternalItemReference` instance ('generic').
 */
export interface Predicate {
  __isPredicate: true
  /**
   * Predicate expression to resolve.
   * Example: `data.identifier && parseInt(data.identifier, 10) === 123`.
   */
  predicate: string
  // TODO: Specify different subtypes for generic and ID?
  mode: 'generic' | 'id'
}


function isPredicate(val: any): val is Predicate {
  return val && val.__isPredicate === true;
}

/** Maps found predicates to resolved item references. */
type ResolvedPredicates = Record<string, InternalItemReference>;

/**
 * Resolves any properties that should reference register item UUIDs,
 * but have predicates instead, using a map of found predicates
 * and item references they already were resolved to.
 */
function replacePredicates<T>(
  value: T,
  resolvedPredicates: Readonly<ResolvedPredicates>,
): T /*extends Predicate ? (string | InternalItemReference) : WithPredicatesResolved<T>*/ {
  // NOTE: Return types are cast because https://github.com/microsoft/TypeScript/issues/33912.
  if (isPredicate(value)) {
    const ref = resolvedPredicates[value.predicate];
    if (!ref) {
      throw new Error(`Could not resolve predicate “${value.predicate}”`);
    }
    if (value.mode === 'generic') {
      return ref as unknown as T;
    } else {
      return ref.itemID as unknown as T;
    }
  } else if (value && typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.map((v: any) => replacePredicates(v, resolvedPredicates)) as any;
    } else {
      // Assume plain non-array object.
      for (const [key, v] of Object.entries(value)) {
        value[key as keyof typeof value] = replacePredicates(v, resolvedPredicates);
      }
      return value as any;
    }
  } else {
    return value as any;
  }
}

function collectPredicates(
  /**
   * Imported register item data with possibly some predicates
   * instead of related item references.
   */
  value: unknown | unknown[],

  /** Cache for recursive calls, don’t supply. */
  _cache?: Set<string>,
): Set<string> {
  const collected = _cache ?? new Set<string>();

  if (isPredicate(value)) {
    collected.add(value.predicate);
  } else if (value && typeof value === 'object') {
    if (Array.isArray(value)) {
      for (const item in value) {
        collectPredicates(item, collected);
      }
      value.map((v: any) => collectPredicates(v, collected));
    } else {
      // Assume plain non-array object.
      for (const v of Object.values(value)) {
        collectPredicates(v, collected);
      }
    }
  }

  return collected;
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
  proposals: ProposalSet,
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


// Helper

