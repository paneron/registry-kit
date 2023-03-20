import { Base as BaseCR } from '../types/cr';
import { itemPathInCR } from './itemPathUtils';


// TODO: Should it be three path components? Probably four
const REGISTER_ITEM_QUERY = `
  objPath.startsWith("/subregisters/") || (
    objPath.split("/").length === 3 &&
    !objPath.startsWith("/proposals/")
  )
`;


/**
 * Returns a query that matches given register item object path
 * depending on how it appears in given change request.
 *
 * For additions, object path would be full in-proposal path
 * (the item doesn’t exist in the register “normally”), so we want to match that.
 * For clarifications, object path we want to match is normal
 */
function getItemInCRQuery(cr: BaseCR): string {
  //const affectedItemPathsQuoted: string[] = Object.entries(withCR.items).
  //  filter(([, proposal]) => proposal.type === 'clarification' || proposal.type === 'addition').
  //  map(([itemPath, proposal]) => proposal.type === 'clarification' ? `"${itemPath}"` : `/proposals/${withCR.id}/items/${itemPath}`);
  const affectedItemPathsQuoted: string[] = Object.entries(cr.items).
    filter(([, proposal]) => proposal.type !== 'amendment').
    map(([itemPath, ]) => `"${itemPathInCR(itemPath, cr.id)}"`);
  return `[${affectedItemPathsQuoted.join(',')}].indexOf(objPath) >= 0`;
}


/**
 * Returns a query criteria for use with filtered indexes
 * by combining given `queryExpression` with base query that matches only
 * objects corresponding to register items.
 *
 * `withCR` should be set to active CR, and would make the query
 * additionally match clarified/added register items that did not yet make it
 * into the register proper.
 */
export function getRegisterItemQuery(queryExpression: string, withCR?: BaseCR): string {
  const baseQuery = withCR
    ? `(${getItemInCRQuery(withCR)}) || (${REGISTER_ITEM_QUERY})`
    : REGISTER_ITEM_QUERY;
  // console.debug("CR QUERY", baseQuery);

  return `return (${baseQuery}) && (${queryExpression.trim()})`;
}
