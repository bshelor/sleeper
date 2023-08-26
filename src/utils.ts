/**
 * Pick properties from a Record.
 * @param record
 * @param fields to pick from record
 */
export const pick = (record: Record<string, any>, fields: string[]) => {
  return fields.reduce((acc: Record<string, any>, key: string) => {
    if (record[key]) { acc[key] = record[key]; }
    return acc;
  }, {});
}

/**
 * Replace nulls in record values.
 * @param record 
 * @returns
 */
export const replaceNulls = (record: Record<string, boolean | number | string | object | null>) => {
  return Object.keys(record).reduce((acc: Record<string, boolean | number | string | object>, key: string) => {
    acc[key] = record[key] || '';
    return acc;
  }, {});
}

type RecordNode = {
  data: Record<string, Record<string, any>>,
  fields: string[],
  conditions: Record<string, string | boolean | number>
};

/**
 * Merge two objects
 * @param left
 * @param right
 * @returns merged object
 */
export function mergeRecords(left: RecordNode, right: RecordNode) {
  const { data: leftData, fields: leftFields, conditions: leftConditions } = left;
  const { data: rightData, fields: rightFields, conditions: rightConditions } = right;
  return Object.keys(leftData).reduce((merged: Record<string, Record<string, any>>, key: string) => {
    const leftGood = Object.keys(leftConditions).reduce((acc: boolean, cKey: string) => {
      if (leftData[key][cKey] && leftData[key][cKey] === leftConditions[cKey]) {
        return true;
      }
      return false;
    }, true);
    const rightGood = Object.keys(rightConditions).reduce((acc: boolean, cKey: string) => {
      if (rightData[key][cKey] && rightData[key][cKey] === rightConditions[cKey]) {
        return true;
      }
      return false;
    }, true);

    if (leftGood && rightGood) {
      const mergeObj = {
        ...(leftData[key] && pick(leftData[key], leftFields)),
        ...(rightData[key] && pick(rightData[key], rightFields))
      };
      merged[key] = replaceNulls(mergeObj);
      return merged;
    }
    return merged;
  }, {});
}

/**
 * Convert JSON object array to csv string
 * @param array 
 * @returns csv string
 */
export const toCsv = (array: Record<string, any>[]): string => {
  let csvString = '';

  /* headers */
  Object.keys(array[0]).forEach(k => {
    csvString += `,${k}`
  });
  csvString += '\n';

  array.forEach(e => {
    Object.keys(e).forEach(k => {
      csvString += `,${e[k]}`;
    });
    csvString += '\n';
  });

  return csvString;
}

export const flatten = (record: Record<string, Record<string, unknown>>): Record<string, unknown>[] => {
  return Object.keys(record).reduce((finalArr, k: string) => {
    finalArr.push(record[k]);
    return finalArr;
  }, [] as Record<string, unknown>[]);
}
