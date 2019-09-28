import * as R from 'ramda';

/*
  keysMap: {
    oldKey: newKey
  }
*/
export default R.curry((keysMap, obj) =>
  R.reduce((acc, key) => R.assoc(keysMap[key] || key, obj[key], acc), {}, R.keys(obj))
);
