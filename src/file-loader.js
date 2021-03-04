const {readFileSync} = require('fs');
const YAML = require('yaml');

const LOADERS = [
  {
    regex: /\.json$/,
    load: (path) => JSON.parse(readFileSync(path)),
  },
  {
    regex: /\.ya?ml$/,
    load: (path) => YAML.parse(readFileSync(path).toString()),
  },
  {
    regex: /.*/,
    load: (path) => {throw Error(`Invalid file type, only .json and .yml are supported: ${path}`);},
  }
];

const loadFile = (path) => LOADERS.find(({regex}) => regex.test(path)).load(path);

module.exports = loadFile;
