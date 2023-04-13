const FlickrExtractor = require('./FlickrExtractor');
const FE = new FlickrExtractor();

function getArgs() {
  // print process.argv
  let ret = {args: [], params: {}};
  process.argv.slice(2).forEach(function (val, index, array) {
    if (val.substring(0,1) === '-') {
      if (val.indexOf('=')) {
        let [key, value] = val.split("=");
        while (key.substring(0,1) == '-') {
          key = key.substring(1);
        }
        ret.params[key] = (['false', '', '0'].indexOf(value.toLowerCase()) !== -1 ? false : (['true', '1', 'yes'].indexOf(value.toLowerCase()) !== -1 ? true : value || true));
      } else {
        ret.params[key] = true;
      }
    } else {
      ret.args.push(val);
    }
  });
  return ret;

}

let res = {};
res.json = function (data) {
  console.log(data.length+" entries, "+JSON.stringify(data).length+" bytes");
}
var argv = getArgs();
console.log(argv);
argv.args.forEach(
  async (method) => 
  {
    if (typeof FE[method] === 'function') {
      FE.setParams(argv.params);
      await FE[method]({}, res);
    } else {
      console.error('Skipping non-existent method "'+method+'".');
    }
  });
