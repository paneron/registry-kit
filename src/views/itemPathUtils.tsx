import type { InternalItemReference } from '../types';


/**
 * Returns dataset-relative path to a register item,
 * given structured item reference.
 */
export function itemRefToItemPath({ subregisterID, classID, itemID }: InternalItemReference): string {
  if (subregisterID) {
    return `/subregisters/${subregisterID}/${classID}/${itemID}.yaml`;
  } else {
    return `/${classID}/${itemID}.yaml`;
  }
}

/**
 * Attempts to return a structured register item reference
 * given a dataset-relative item path.
 * If some components are missing, returns an incomplete reference.
 */
export function itemPathToItemRefLike(hasSubregisters: boolean, itemPath: string):
{ itemID?: string; classID?: string; subregisterID?: string; } {
  const pathNormalized = itemPath.trim()
    ? stripLeadingSlash(itemPath)
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
    console.error("Internal item reference cannot be constructed from given item path, got", maybeRef, itemPath, hasSubregisters);
    throw new Error("Internal item reference cannot be constructed from given item path");
  }
}

function stripLeadingSlash(aPath: string): string {
  return aPath.replace(/^\//, '');
}


export function crIDToCRPath(crID: string): string {
  return `/change-requests/${crID}.yaml`;
}

export function crPathToCRID(crPath: string): string {
  return (
    stripLeadingSlash(crPath).
    replace('change-requests/', '').
    split('/')[0].
    replace('.yaml', '')
  );
}
