import type { InternalItemReference } from '../types';


/**
 * Returns dataset-relative path to a register item,
 * given structured item reference.
 *
 * Optionally makes path include given change request contents.
 */
export function itemRefToItemPath(
  { subregisterID, classID, itemID }: InternalItemReference,
  inCRWithID?: string,
): string {
  return `${incompleteItemRefToItemPathPrefix({ subregisterID, classID }, inCRWithID)}/${itemID}.yaml`;
}


/**
 * Returns dataset-relative prefix to a register item,
 * given structured item reference without `itemID`.
 *
 * Optionally makes path include given change request contents.
 */
export function incompleteItemRefToItemPathPrefix(
  { subregisterID, classID }: Omit<InternalItemReference, 'itemID'>,
  inCRWithID?: string,
): string {
  const itemWithClass = `${classID}`;
  const fullPath = subregisterID
    ? `subregisters/${subregisterID}/${itemWithClass}`
    : itemWithClass;
  const maybeInCR = inCRWithID !== undefined
    ? `/proposals/${inCRWithID}/items/${fullPath}`
    : `/${fullPath}`;
  return maybeInCR;
}

/**
 * Attempts to return a structured register item reference
 * given a dataset-relative item path.
 * If some components are missing, returns an incomplete reference.
 */
export function itemPathToItemRefLike(hasSubregisters: boolean, itemPath: string):
{ itemID?: string; classID?: string; subregisterID?: string; } {
  const pathNormalized = itemPath.trim()
    ? stripLeadingSlash(itemPathNotInCR(itemPath))
    : undefined;
  const pathParts = pathNormalized?.split('/') ?? [];

  const subregisterID: string | undefined = hasSubregisters && pathParts.length >= 1
    ? pathParts[1]
    : undefined;

  const classID: string | undefined = hasSubregisters
    ? pathParts.length >= 3
      ? pathParts[2]
      : undefined
    : pathParts.length >= 1
      ? pathParts[0]
      : undefined;

  const itemID: string | undefined =
    (hasSubregisters && pathParts.length === 4) ||
    (!hasSubregisters && pathParts.length === 2)
      ? pathParts[pathParts.length - 1].split('.')[0]
      : undefined;

  return { subregisterID, classID, itemID };
}

/** Returns just register item ID, given dataset-relative path. */
export function itemPathToItemID(objPath: string): string | undefined {
  const objPathComponents = objPath?.split('/');
  const selectedItemID = objPathComponents !== undefined
    ? objPathComponents[objPathComponents.length - 1].split('.')[0]
    : undefined;
  return selectedItemID;
}

/**
 * Attempts to return a structured register item reference
 * given a dataset-relative item path.
 * If some components are missing, throws an Error.
 */
export function itemPathToItemRef(hasSubregisters: boolean, itemPath: string): InternalItemReference {
  const maybeRef = itemPathToItemRefLike(hasSubregisters, itemPath);
  if (maybeRef.classID && maybeRef.itemID) {
    return maybeRef as InternalItemReference;
  } else {
    console.error("Internal item reference cannot be constructed from given item path, got", maybeRef, itemPath, hasSubregisters, "from", itemPath);
    throw new Error("Internal item reference cannot be constructed from given item path");
  }
}


const CR_ITEM_PREFIX_REGEX = /^proposals\/(?<crID>\p{Hex_Digit}{8}(?:-\p{Hex_Digit}{4}){3}-\p{Hex_Digit}{12})\/items\//u;


/**
 * If given item path indicates that it is within any CR, returns respective CR ID.
 * Otherwise, returns `null`.
 */
export function getCRIDFromProposedItemPath(givenItemPath: string): string | null {
  return stripLeadingSlash(givenItemPath).match(CR_ITEM_PREFIX_REGEX)?.groups?.crID ?? null;
}


/**
 * Given an item path, returns path relative to specified CR ID
 * (even if the path is already relative to another CR ID).
 */
export function itemPathInCR(givenItemPath: string, crID: string): string {
  // Remove any CR prefix from given path
  // TODO(perf): Don’t do if prefix matches CR ID already specified?
  // TODO: Validate given path actually looks like a register item path and throw?
  const normalized = stripLeadingSlash(givenItemPath).replace(CR_ITEM_PREFIX_REGEX, '');
  return `/proposals/${crID}/items/${normalized}`;
}

/**
 * Returns given item path in register-relative form,
 * even if the path is given within proposal contents.
 */
export function itemPathNotInCR(givenItemPath: string): string {
  const normalized = stripLeadingSlash(givenItemPath).replace(CR_ITEM_PREFIX_REGEX, '');
  return `/${normalized}`;
}

function stripLeadingSlash(aPath: string): string {
  return aPath.replace(/^\//, '');
}


/** Converts a change request ID to dataset-relative path to respective main.yaml. */
export function crIDToCRPath(crID: string): string {
  return `/proposals/${crID}/main.yaml`;
}

/** Extracts change request ID from dataset-relative path to its main.yaml. */
export function crPathToCRID(crPath: string): string {
  return (
    stripLeadingSlash(crPath).
    replace('proposals/', '').
    split('/')[0]
  );
}
