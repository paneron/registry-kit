/** Basic predicate/query to get just group proposal entry points (main.yaml) */
export const CR_BASE_QUERY = 'objPath.indexOf("/proposals/") === 0 && objPath.endsWith("main.yaml")';

/** Predicate/query to get only disposed group proposals */
export const DISPOSED_CR_QUERY = 'obj.timeDisposed !== undefined && obj.timeDisposed !== null';
