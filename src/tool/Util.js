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

    function loadError(){
        var name = requirements[this.url].name;
        error(name,XERROR.COMPONENT.LOADERROR,'can not fetch remote data of : '+this.url);
    }
    function loadTimeout(){
        var name = requirements[this.url].name;
        error(name,XERROR.COMPONENT.LOADTIMEOUT,'load timeout : '+this.url);
    }
    function onload(){
        if(this.status===0 || //native
        ((this.status >= 200 && this.status <300) || this.status === 304) ){
            var txt = this.responseText;
            var obj = requirements[this.url];
            var cbks = obj.cbks;
            var name = obj.name;

            txt.match(/<\s*template[^<>]*>([\s\S]*)<\s*\/\s*template\s*>/img)[0];
            var tmpl = RegExp.$1;
            
            assert(!tmpl,name,XERROR.COMPONENT.TEMPLATETAG,'can not find tag <template> in component file');

            var css = '';
            tmpl = tmpl.replace(/<\s*style[^<>]*>([\s\S]*?)<\s*\/\s*style\s*>/img,function(a,b){
                css += b;
                return '';
            });

            txt.match(/<\s*script[^<>]*>([\s\S]*?)<\s*\/\s*script\s*>/img)[0];
            var modelStr = RegExp.$1;
            
            var model = new Function('return ('+modelStr+')')();
            model = model();
            model.template = tmpl.trim();
            
            var url = this.url;
            cbks.forEach(function(cbk){
                cbk(model,css.trim());
            });
            requirements[this.url] = null;
        }
    }

    var requirements = {};
    function loadComponent(name,url,cbk,timeout){
        if(!requirements[url]){
            requirements[url] = {name:name,cbks:[]};
            requirements[url].cbks.push(cbk);
        }else{
            requirements[url].cbks.push(cbk);
            return;
        }        

        var xhr = new XMLHttpRequest();
        xhr.open('get',url,true);
        xhr.timeout = timeout || 5000;
        xhr.ontimeout = loadTimeout;
        xhr.onerror = loadError;
        if(xhr.onload === null){
            xhr.onload = onload;
        }else{
            xhr.onreadystatechange = onload;
        }
        xhr.url = url;
        xhr.send(null);
    }