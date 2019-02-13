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
    function extend(ctor,parentCtor,opts){
        ctor.prototype = Object.create(parentCtor.prototype,{_super:{value:parentCtor.prototype}});
        ctor.prototype.constructor = ctor;

        //类型属性绑定到构造函数
        ctor.props = opts.props;
        ctor.tmpl = opts.template;
        ctor.state = opts.state;
        ctor.computeState = opts.computeState;
        //函数绑定到原型
        for(var k in opts){
            if(k != 'state' && isFunction(opts[k]))
                ctor.prototype[k] = opts[k];
        }

        return ctor;
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
