/**
 * utils
 */
    function ext(from,to){
        var keys = Object.keys(from);
        for (var i=keys.length;i--;) {
            var k = keys[i];
            to[k] = from[k];
        }
    }
    function isObject(obj){
        return typeof(obj) === 'object' && obj !== null;
    }
    function isArray(obj){
        return Array.isArray(obj);
    }
    function isString(obj){
        return typeof obj === 'string';
    }
    function isUndefined(obj){
        return obj === undefined;
    }
    function isFunction(obj){
        return obj instanceof Function;
    }
