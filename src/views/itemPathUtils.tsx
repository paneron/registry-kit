import { InternalItemReference } from '../types';


export function itemRefToItemPath({ subregisterID, classID, itemID }: InternalItemReference): string {
  if (subregisterID) {
    return `/subregisters/${subregisterID}/${classID}/${itemID}.yaml`;
  } else {
    return `/${classID}/${itemID}.yaml`;
  }
}

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

export function itemPathToItemID(objPath: string): string | undefined {
  const objPathComponents = objPath?.split('/');
  const selectedItemID = objPathComponents !== undefined
    ? objPathComponents[objPathComponents.length - 1].split('.')[0]
    : undefined;
  return selectedItemID;
}

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
