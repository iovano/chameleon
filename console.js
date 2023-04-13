const FlickrExtractor = require('./FlickrExtractor');
const FE = new FlickrExtractor();

function getArgs() {
  // print process.argv
  let ret = {args: [], params: {}, options: {}};
  process.argv.slice(2).forEach(function (val, index, array) {
    if (val.substring(0,1) === '-') {
      if (val.indexOf('=')) {
        let [key, value] = val.split("=");
        ret.options[key.substring(1, val.length - 1)] = value;
      } else {
        ret.options[key.substring(1, val.length - 1)] = true;
      }
    } else if (val.indexOf('=') !== -1) {
      let [key, value] = val.split("=");
      ret.params[key] = value;
    } else {
      ret.args.push(val);
    }
  });
  return ret;

}

let req = {};
let res = {};
res.json = function (data) {
  console.log(data.length+" entries, "+JSON.stringify(data).length+" bytes");
}
var argv = getArgs();
console.log(argv.args[0]);
FE[argv.args[0]](req, res);