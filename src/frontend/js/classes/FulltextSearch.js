export default class FulltextSearch {
    static matchAgainst(query, data, rules = undefined) {

        function recursiveMatch(query, data, matches = 0, score = 0) {
            function isObject(item) {
                return item instanceof Object || typeof item == 'object';
            }
            function isArray(item) {
                return Array.isArray(item);
            }    
            function isString(item) {
                return item instanceof String || typeof item == 'string';
            }
            if (isObject(data)) {
                for (let [key, value] of Object.entries(data)) {
                    [matches, score] = recursiveMatch(query, value, matches, score);                                        
                }    
            } else if (isArray(data)) {
                for (let i = 0; i < data.length; i++) {
                    [matches, score] = recursiveMatch(query, data[i], matches, score);                                        
                }
            } else if (isString(data)) {
                matches += data.split(query).length - 1;
            }

            return [matches, score];
        }
        return recursiveMatch(query, data);
    }
}