import {readFileSync} from 'fs';
import YAML from 'yaml';

const LOADERS = [
  {
    regex: /\.json$/,
    load: (path) => JSON.parse(readFileSync(path)),
  },
  {
    regex: /\.ya?ml$/,
    load: (path) => YAML.parse(readFileSync(path).toString()),
  }
];

const loadFile = (path) => {
  const loader = LOADERS.find(({regex}) => regex.test(path));

  if (!loader) {
    throw Error(`Invalid file type, only .json and .yml are supported: ${path}`);
  }

  return loader.load(path);
};

export default loadFile;
