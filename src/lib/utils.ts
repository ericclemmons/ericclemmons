import _ from 'lodash';

/**
 * Utility functions using lodash
 * This depends on the lodash package being installed
 */

export function sortByDate(items: any[]) {
  return _.sortBy(items, 'date');
}

export function groupByCategory(items: any[]) {
  return _.groupBy(items, 'category');
}

export function uniqueBy(items: any[], key: string) {
  return _.uniqBy(items, key);
}
