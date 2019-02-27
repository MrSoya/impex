/**
 * utils
 */
    function getForScopeFn(vnode,scope,fnExp) {
        var args = [scope];
        var forScopeStart = '',forScopeEnd = '';
        var forScopeQ = vnode._forScopeQ;
            if(forScopeQ)
                for(var i=0;i<forScopeQ.length;i++){
                    forScopeStart += 'with(arguments['+(1+i)+']){';
                    forScopeEnd += '}';
                    args.push(forScopeQ[i]);
                }
            var fn = new Function('scope',
                'with(scope){'+forScopeStart+'return '
                + fnExp +forScopeEnd+'}');
        return [fn,args];
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
        //绑定mixins
        if(opts.mixins){
            var lcQ = [];
            var fns = {};
            opts.mixins.forEach(function(mixin) {
                var lcMap = {};
                for(var k in mixin){
                    if(isFunction(mixin[k])){
                        if(LC_CO[k]){
                            lcMap[k] = mixin[k];
                        }else{
                            fns[k] = mixin[k];
                        }
                    }
                }
                if(Object.keys(lcMap).length>0)
                    lcQ.push(lcMap);
            });
            ctor.lcq = lcQ;

            for(var k in fns){//组件优先
                if(!ctor.prototype[k])
                    ctor.prototype[k] = fns[k];
            }
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
