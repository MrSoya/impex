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
        return obj instanceof Array;
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

    var awaitQ = {},
        timeoutTimer = {},
        loadingTimer = {},
        errors = {};
    //if loader resolved then it can't be rejected and vice versa
    function loadComp(comp) {
        var name = comp.name;
        var setting = comp.__loadSetting;
        var q = awaitQ[name];
        //removeIf(production)
        // if(q && q.indexOf(comp)>-1){
        //     console.error('lib error',comp);
        // }
        //endRemoveIf(production)
        if(!q){
            q = awaitQ[name] = [comp];
            timeoutTimer[name] = setTimeout(function(argument) {
                assert(false,name,XERROR.COMPONENT.LOADTIMEOUT,'load timeout : '+name);
                reject.call(comp,'timeout');
            },setting.timeout);
            setting.loader(resolve.bind(comp),reject.bind(comp));
            //show loaing after delay
            if(setting.onLoading){
                loadingTimer[name] = setTimeout(function(argument) {
                    var loading = isFunction(setting.onLoading)?setting.onLoading():setting.onLoading;
            
                    COMP_MAP[name] = {template:'<section>'+loading+'</section>',state:{}};
                    renderCompOf(name,COMP_MAP[name]);
                },setting.delay);
            }
        }else{
            q.push(comp);
        }
        setting.loading = true;
    }
    function reject(errorMsg){
        if(!awaitQ[this.name])return;
        errors[this.name] = errorMsg;
        var error = isFunction(this.__loadSetting.onError)?this.__loadSetting.onError(errorMsg):this.__loadSetting.onError;
        error = error || errorMsg;
        COMP_MAP[this.name] = {template:'<section>'+error+'</section>',state:{}};
        renderCompOf(this.name,COMP_MAP[this.name]);
    }
    function resolve(compStr){
        if(errors[this.name])return;

        var rs = compStr.match(/<\s*template[^<>]*>([\s\S]*)<\s*\/\s*template\s*>/img);
        var tmpl = RegExp.$1;
        //removeIf(production)
        assert(tmpl && rs,name,XERROR.COMPONENT.TEMPLATETAG,'can not find tag <template> in component file "'+this.name+'"');
        //endRemoveIf(production)
        var css = '';
        tmpl = tmpl.replace(/<\s*style[^<>]*>([\s\S]*?)<\s*\/\s*style\s*>/img,function(a,b){
            css += b;
            return '';
        });

        rs = compStr.match(/<\s*script[^<>]*>([\s\S]*?)<\s*\/\s*script\s*>/img);
        var modelStr = rs?RegExp.$1:'function(){return{};}';
        
        var model = new Function('return ('+modelStr+')')();
        model = model();
        model.template = tmpl.trim();
        COMP_MAP[this.name] = model;
         //css
        bindScopeStyle(this.name,css.trim());

        renderCompOf(this.name,model,true);
    }
    function renderCompOf(name,model,clearAwait) {
        clearTimeout(timeoutTimer[name]);
        clearTimeout(loadingTimer[name]);

        var q = awaitQ[name];
        for(var i=q.length;i--;){
            var comp = q[i];

            ext(model,comp);
            if(isFunction(model.state)){
                comp.state = model.state.call(comp);
            }else if(model.state){
                comp.state = {};
                ext(model.state,comp.state);
            }

            comp.onCreate && comp.onCreate();

            //同步父组件变量
            bindProps(comp,comp.parent,comp.attributes);

            if(clearAwait)comp.__loadSetting = null;

            preCompile(comp.template,comp);
            compileComponent(comp);
            mountComponent(comp,comp.parent?comp.parent.vnode:null);
        }//end for    
        
        if(clearAwait)awaitQ[name] = null;    
    }