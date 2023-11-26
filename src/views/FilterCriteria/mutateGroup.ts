import { CriteriaGroup, Criterion } from './models';


type TreeMutation<T> =
  { action: 'delete'; idx: number; } |
  { action: 'insert'; item: T; } |
  { action: 'edit'; idx: number; item: T; };


/**
 * Mutates given criteria tree in place.
 * If `path` is empty, guarantees to return a list with at least one item.
 * (There’s only one top-level element.)
 */
export default function mutateGroup(
  criteria: (CriteriaGroup | Criterion)[],

  /**
   * Parent node path in reverse (top-level index coming last).
   * Empty path would indicate top-level (which is single and cannot be deleted).
   */
  path: number[],

  mutation: TreeMutation<CriteriaGroup | Criterion>,
) {

  if (path.length < 1 && mutation.action === 'edit') {
    (criteria[0] as CriteriaGroup).require = (mutation.item as CriteriaGroup).require;
  }
  for (const [curIdx, c] of criteria.entries()) {
    if (curIdx === path[path.length - 1]) {
      path.pop();

      let cg: CriteriaGroup;
      if (c.hasOwnProperty('criteria')) {
        // This item is a group, let’s go in and delete descendants
        cg = c as CriteriaGroup;
      } else {
        // This item is a predicate string, can’t go in and delete descendants
        throw new Error(`Cannot enter item: not a group at path ${path.join('/')}/${curIdx}: ${c}`);
      }

      if (path.length > 0) {
        mutateGroup(cg.criteria, path, mutation);
      } else {
        if (mutation.action === 'delete') {
          cg.criteria.splice(mutation.idx, 1);
        } else if (mutation.action === 'insert') {
          cg.criteria.push(mutation.item);
        } else if (mutation.action === 'edit') {
          if (cg.criteria[mutation.idx] === undefined && mutation.idx === cg.criteria.length) {
            if (mutation.item.hasOwnProperty('require')) {
              console.error(cg.criteria, mutation);
              throw new Error("Won’t auto-insert new group");
            }
            // It may be that a new item is being appended
            cg.criteria.push(mutation.item);
          }
          const isGroup = cg.criteria[mutation.idx].hasOwnProperty('require');
          if (isGroup) {
            // If it’s a group, only change the predicate operator to preserve nested items:
            (cg.criteria[mutation.idx] as CriteriaGroup).require =
              (mutation.item as CriteriaGroup).require;
          } else {
            cg.criteria[mutation.idx] = mutation.item;
          }
        }
      }
    }
  }
}
