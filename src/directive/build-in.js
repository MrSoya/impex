/**
 * 内建指令
 */
!function(impex){
    ///////////////////// 视图控制指令 /////////////////////
    /**
     * impex会忽略指令所在的视图，视图不会被impex解析
     * <br/>使用方式：<div x-ignore >{{ignore prop}}</div>
     */
    impex.directive('ignore',{
        final:true,
        priority:999
    })
    /**
     * 注册全局组件指令
     * <br/>使用方式：<x-panel x-global="xPanel" >...</x-panel>
     */
    impex.directive('global',{
        onCreate:function(){
            var k = this.value;
            if(impex.global[k]){
                LOGGER.warn('duplicate name "'+k+'" exists in global');
                return;
            }
            impex.global[k] = this.component;
        }
    })
    /**
     * 内联样式指令
     * <br/>使用方式：
     * <div x-style="{'font-size': valExp}" >...</div>
     * <div x-style="{'fontSize': valExp}" >...</div>
     * <div x-style="'color:red;font-size:20px;'" >...</div>
     * <div x-style="obj" >...</div>
     */
    .directive('style',{
        onCreate:function(){
            if(this.value.trim()[0]==='{'){
                this.value = '('+this.value+')';
            }
        },
        onUpdate:function(map){
            if(typeof map === 'string'){
                var rs = {};
                var tmp = map.split(';');
                for(var i=tmp.length;i--;){
                    var pair = tmp[i].split(':');
                    rs[pair[0]] = pair[1];
                }
                map = rs;
            }
            var style = this.el.style;
            for(var k in map){
                var n = this.filterName(k);
                var v = map[k];
                style[n] = v;
            }
        },
        filterName:function(k){
            return k.replace(/-([a-z])/img,function(a,b){
                return b.toUpperCase();
            });
        }
    })
    /**
     * 外部样式指令
     * <br/>使用方式：
     * <div x-class="'cls1 cls2 cls3 ...'" >...</div>
     * <div x-class="['cls1','cls2','cls3']" >...</div>
     * <div x-class="{cls1:boolExp,cls2:boolExp,cls3:boolExp}" >...</div>
     */
    .directive('class',{
        onCreate:function(){
            if(this.value.trim()[0]==='{'){
                this.value = '('+this.value+')';
            }
        },
        onUpdate:function(map){
            var str = '';
            if(map instanceof Array){
                map.forEach(function(cls){
                    str += ' '+ cls;
                });
            }else if(typeof map === 'string'){
                str = map;
            }else{
                for(var k in map){
                    var v = map[k];
                    if(v){
                        str += ' '+ k;
                    }
                }
            }

            if(this.lastClassStr){
                this.el.className = this.el.className.replace(this.lastClassStr,'');
            }

            this.el.className += ' '+str;
            this.lastClassStr = str;
        }
    })
    /**
     * 绑定视图事件，以参数指定事件类型，用于减少单一事件指令书写
     * <br/>使用方式1：<img x-on:load:mousedown:touchstart="hi()" x-on:dblclick="hello()">
     * <br/>使用方式2：<img :load:mousedown:touchstart="hi()" :dblclick="hello()">
     */
    .directive('on',{
        onInit:function(){
            for(var i=this.params.length;i--;){
                this.on(this.params[i],this.value);
            }
        }
    })
    /**
     * 文本指令，用于防止表达式被渲染前出现在页面上的边界符
     * <br/>使用方式1：<span x-text="msg"></span>
     */
    .directive('text',{
        onUpdate:function(rs){
            this.el.innerText = rs;
        }
    })
    /**
     * 绑定视图属性，并用表达式的值设置属性
     * <br/>使用方式：<img x-bind:src="exp">
     */
    .directive('bind',{
        onInit:function(){
            if(!this.params || this.params.length < 1){
                LOGGER.warn('at least one attribute be binded');
            }
        },
        onUpdate : function(rs){
            if(!this.params || this.params.length < 1)return;

            var filter = null;
            if(this.filter){
                filter = this.component[this.filter];
            }

            if(filter){
                var allowed = filter(rs);
                if(!Util.isUndefined(allowed) && !allowed){
                    return;
                }
            }

            for(var i=this.params.length;i--;){
                var p = this.params[i];
                this.el.setAttribute(p,rs);
            }
            
        }
    })
    /**
     * 控制视图显示指令，根据表达式计算结果控制
     * <br/>使用方式：<div x-show="exp"></div>
     */
    .directive('show',{
        onCreate:function(ts,DOMHelper){
            if(this.el.tagName === 'TEMPLATE'){
                DOMHelper.replace(this.el,this.__nodes);
            }

            var transition = this.el.getAttribute('transition');
            if(transition !== null && this.el.tagName !== 'TEMPLATE'){
                this.transition = ts.get(transition,this);
            }
            this.lastRs = true;
            this.compiled = false;
        },
        onUpdate : function(rs){
            if(this.component.__state === Component.state.unmounted)return;
            if(rs === this.lastRs)return;
            this.lastRs = rs;

            if(this.transition){
                if(rs){
                    this.transition.enter();
                }else{
                    this.transition.leave();
                }
            }else{
                this.exec(rs);
            }
        },
        enter:function(){
            this.exec(this.lastRs);
        },
        postLeave:function(){
            this.exec(this.lastRs);
        },
        exec:function(rs){
            if(rs){
                //显示
                for(var i=this.__nodes.length;i--;){
                    this.__nodes[i].style.display = '';
                }
            }else{
                // 隐藏
                for(var i=this.__nodes.length;i--;){
                    this.__nodes[i].style.display = 'none';
                }
            }
        }
    },['Transitions','DOMHelper'])
    /**
     * 效果与show相同，但是会移除视图
     * <br/>使用方式：<div x-if="exp"></div>
     */
    .directive('if',{
        final:true,
        onCreate:function(ts,DOMHelper){
            this.DOMHelper = DOMHelper;
            this.placeholder = document.createComment('-- directive [if] placeholder --');         

            var transition = this.el.getAttribute('transition');
            if(transition !== null && this.el.tagName !== 'TEMPLATE'){
                this.transition = ts.get(transition,this);
            }
            this.lastRs = false;
            this.compiled = false;
            //default false
            if(this.el.parentNode)
            this.el.parentNode.replaceChild(this.placeholder,this.el);
        },
        onUpdate : function(rs){
            if(rs && !this.compiled){
                Util.compileViewOf(this.component,this.__nodes);
                this.compiled = true;
            }
            if(this.elseD){
                this.elseD.doUpdate(!rs);
            }
            if(this.component.__state === Component.state.unmounted)return;
            if(rs === this.lastRs && !this.el.parentNode)return;
            this.lastRs = rs;

            if(this.transition){
                if(rs){
                    this.transition.enter();
                }else{
                    this.transition.leave();
                }
            }else{
                this.exec(rs);
            }
        },
        enter:function(){
            this.exec(this.lastRs);
        },
        postLeave:function(){
            this.exec(this.lastRs);
        },
        exec:function(rs){
            if(rs){
                if(this.__nodes[0].parentNode)return;
                //添加
                this.DOMHelper.replace(this.placeholder,this.__nodes);
            }else{
                if(!this.__nodes[0].parentNode)return;
                //删除
                var p = this.__nodes[0].parentNode;
                p.insertBefore(this.placeholder,this.__nodes[0]);
                this.DOMHelper.detach(this.__nodes);
            }
        }
    },['Transitions','DOMHelper'])
    /**
     * 和x-if成对出现，单独出现无效。并且只匹配前一个if
     * <br/>使用方式：<div x-if="exp"></div><div x-else></div>
     */
    .directive('else',{
        onCreate:function(ts,DOMHelper){
            this.DOMHelper = DOMHelper;
            this.placeholder = document.createComment('-- directive [else] placeholder --');

            //default false
            this.el.parentNode.replaceChild(this.placeholder,this.el);

            //find if
            var xif = this.component.directives[this.component.directives.length-2];
            if(xif.name !== 'x-if'){
                LOGGER.warn("can not find directive[x-if] to make a pair");
                return;
            }

            xif.elseD = this;

            var transition = this.el.getAttribute('transition');
            if(transition !== null && this.el.tagName !== 'TEMPLATE'){
                this.transition = ts.get(transition,this);
            }
            this.lastRs = false;
            this.compiled = false;
        },
        doUpdate : function(rs){
            if(rs && !this.compiled){
                Util.compileViewOf(this.component,this.__nodes);
                this.compiled = true;
            }
            if(this.component.__state === Component.state.unmounted)return;
            if(rs === this.lastRs && !this.el.parentNode)return;
            this.lastRs = rs;

            if(this.transition){
                if(rs){
                    this.transition.enter();
                }else{
                    this.transition.leave();
                }
            }else{
                this.exec(rs);
            }
        },
        enter:function(){
            this.exec(this.lastRs);
        },
        postLeave:function(){
            this.exec(this.lastRs);
        },
        exec:function(rs){
            if(rs){
                if(this.__nodes[0].parentNode)return;
                //添加
                this.DOMHelper.replace(this.placeholder,this.__nodes);
            }else{
                if(!this.__nodes[0].parentNode)return;
                //删除
                var p = this.__nodes[0].parentNode;
                p.insertBefore(this.placeholder,this.__nodes[0]);
                this.DOMHelper.detach(this.__nodes);
            }
        }
    },['Transitions','DOMHelper'])
    /**
     * 用于屏蔽视图初始时的表达式原始样式，需要配合class使用
     */
    .directive('cloak',{
        onCreate:function(){
            var className = this.el.getAttribute('class');
            if(!className){
                LOGGER.warn("can not find attribute[class] of element["+this.el.tagName+"] which directive[cloak] on");
                return;
            }
            className = className.replace('x-cloak','');
            
            this.__cn = className;
        },
        onActive:function(){
            updateCloakAttr(this.component,this.el,this.__cn);
            var curr = this.el.getAttribute('class').replace('x-cloak','');
            this.el.setAttribute('class',curr);
        }
    })

    ///////////////////// 模型控制指令 /////////////////////
    /**
     * 绑定模型属性，当控件修改值后，模型值也会修改
     * <br/>使用方式：<input x-model="model.prop">
     */
    .directive('model',{
        onActive:function(){
            var el = this.el;
            this.toNum = el.getAttribute('number');
            this.debounce = el.getAttribute('debounce')>>0;

            switch(el.nodeName.toLowerCase()){
                case 'textarea':
                case 'input':
                    var type = el.getAttribute('type');
                    switch(type){
                        case 'radio':
                            this.on('change',this.changeModel);
                            break;
                        case 'checkbox':
                            this.on('change',this.changeModelCheck);
                            break;
                        default:
                            var hack = document.body.onpropertychange===null?'propertychange':'input';
                            this.on(hack,this.changeModel);
                    }
                    
                    break;
                case 'select':
                    var mul = el.getAttribute('multiple');
                    if(mul !== null){
                        this.on('change',this.changeModelSelect);
                    }else{
                        this.on('change',this.changeModel);
                    }
                    
                    break;
            }
        },
        changeModelSelect : function(e){
            var t = e.target || e.srcElement;
            var val = t.value;
            var parts = [];
            for(var i=t.options.length;i--;){
                var opt = t.options[i];
                if(opt.selected){
                    parts.push(opt.value);
                }
            }            
            this.component.d(this.value,parts);
        },
        changeModelCheck : function(e){
            var t = e.target || e.srcElement;
            var val = t.value;
            var parts = this.component.d(this.value);
            if(!(parts instanceof Array)){
                parts = [parts];
            }
            if(t.checked){
                parts.push(val);
            }else{
                var i = parts.indexOf(val);
                if(i > -1){
                    parts.splice(i,1);
                }
            }
        },
        changeModel : function(e){
            if(this.debounce){
                if(this.debounceTimer){
                    clearTimeout(this.debounceTimer);
                    this.debounceTimer = null;
                }
                var that = this;
                this.debounceTimer = setTimeout(function(){
                    clearTimeout(that.debounceTimer);
                    that.debounceTimer = null;
                    
                    that.setVal(e);
                },this.debounce);
            }else{
                this.setVal(e);
            }
        },
        setVal:function(e){
            var v = (e.target || e.srcElement).value;
            if(this.toNum !== null){
                v = parseFloat(v);
            }
            this.component.d(this.value,v);
        }
    });

    function updateCloakAttr(component,node,newOrigin){
        for(var i=component.__expNodes.length;i--;){
            var expNode = component.__expNodes[i];
            if(expNode.node == node && expNode.attrName === 'class'){
                expNode.origin = newOrigin;
            }
        }

        for(var j=component.children.length;j--;){
            updateCloakAttr(component.children[j],node,newOrigin);
        }
    }
    function eachModel(){
        this.onCreate = function(DOMHelper,ts){
            this.eachExp = /^(.+?)\s+as\s+((?:[a-zA-Z0-9_$]+?\s*,)?\s*[a-zA-Z0-9_$]+?)\s*(?:=>\s*(.+?))?$/;
            this.forExp = /^\s*(\d+|[a-zA-Z_$](.+)?)\s+to\s+(\d+|[a-zA-Z_$](.+)?)\s*$/;
            this.DOMHelper = DOMHelper;
            this.expInfo = this.parseExp(this.value);
            this.cache = [];
            this.__comp = this.component;

            this.placeholder = document.createComment('-- directive [each] placeholder --');
            this.el.parentNode.replaceChild(this.placeholder,this.el);

            if(this.el.tagName !== 'TEMPLATE'){
                this.__tagName = this.el.tagName.toLowerCase();
                this.__isComp = ComponentFactory.hasTypeOf(this.__tagName);
            }

            this.subComponents = [];

            this.cacheSize = 20;

            this.step = this.el?this.el.getAttribute('step'):this.__nodes[0].getAttribute('step');

            this.over = this.el?this.el.getAttribute('over'):this.__nodes[0].getAttribute('over');

            var transition = this.el.tagName !== 'TEMPLATE'?this.el.getAttribute('transition'):this.__nodes[0].getAttribute('transition');
            if(transition !== null){
                this.trans = transition;
                this.ts = ts;
            }
        }
        this.onInit = function(){
            var that = this;
            //获取数据源
            if(this.forExp.test(this.expInfo.ds)){
                var begin = RegExp.$1,
                    end = RegExp.$3,
                    step = parseFloat(this.step);
                if(step < 0){
                    LOGGER.error('step <= 0 : '+step);
                    return;
                }
                step = step || 1;
                if(isNaN(begin)){
                    var path = begin;
                    this.component.watch(begin,function(object,name,type,newVal,oldVal){
                        if(isNaN(newVal)){
                            newVal = this.d(path);
                        }
                        var ds = getForDs(newVal>>0,end,step);
                        that.lastDS = ds;
                        that.rebuild(ds,that.expInfo.k,that.expInfo.v);
                    });
                    begin = this.component.d(begin);
                }
                if(isNaN(end)){
                    var path = end;
                    this.component.watch(end,function(object,name,type,newVal,oldVal){
                        if(isNaN(newVal)){
                            newVal = this.d(path);
                        }
                        var ds = getForDs(begin,newVal>>0,step);
                        that.lastDS = ds;
                        that.rebuild(ds,that.expInfo.k,that.expInfo.v);
                    });
                    end = this.component.d(end);
                }
                begin = parseFloat(begin);
                end = parseFloat(end);
                
                this.ds = getForDs(begin,end,step);
            }else{
                this.ds = this.component.d(this.expInfo.ds);
                this.component.watch(this.expInfo.ds,
                    function(object,name,type,newVal,oldVal,propChain,matchLevel){
                    if(!that.ds){
                        that.ds = that.__comp.d(that.expInfo.ds);
                        that.lastDS = that.ds;
                        that.build(that.ds,that.expInfo.k,that.expInfo.v);
                        return;
                    }

                    var ds = that.__comp.d(that.expInfo.ds);
                    
                    that.lastDS = ds;
                    that.rebuild(that.lastDS,that.expInfo.k,that.expInfo.v);
                });
            }

            if(this.over){
                var tmp = lexer(this.over);
                var rs = Renderer.evalExp(this.__comp,tmp);
                this.over = rs;
            }            
            
            this.lastDS = this.ds;

            //parse props
            this.__props = parseProps(this.el,this.component);

            if(this.ds)
                this.build(this.ds,this.expInfo.k,this.expInfo.v);
            //更新视图
            this.destroy();
        }
        function parseProps(el,comp){
            var props = {
                str:{},
                type:{},
                sync:{}
            };
            var ks = ['cache','over','step','transition'];
            for(var i=el.attributes.length;i--;){
                var attr = el.attributes[i];
                var k = attr.nodeName;
                if(ks.indexOf(k) > -1)continue;
                k = k.replace(/-[a-z0-9]/g,function(a){return a[1].toUpperCase()});
                
                var v = attr.nodeValue;

                if(k[0] === PROP_TYPE_PRIFX){
                    var tmp = lexer(v);
                    var rs = Renderer.evalExp(comp,tmp);
                    var n = k.substr(1);
                    
                    if(PROP_SYNC_SUFX_EXP.test(n)){
                        var keys = Object.keys(tmp.varTree);
                        var propName = n.replace(PROP_SYNC_SUFX_EXP,'');
                        props.sync[propName] = [tmp,rs,keys];
                    }else{
                        props.type[n] = rs;
                    }
                }else{
                    props.str[k] = v;
                }
            }
            return props;
        }
        function getForDs(begin,end,step){
            var dir = end - begin < 0?-1:1;
            var ds = [];
            for(var i=begin;i<=end;i+=step){
                ds.push(i);
            }
            return ds;
        }
        this.rebuild = function(ds,ki,vi){
            ds = this.doFilter(ds);

            var newSize = ds instanceof Array?ds.length:Object.keys(ds).length;
            
            var diffSize = newSize - this.subComponents.length;

            //resort
            // this.subComponents.sort(function(a,b){return a.state.$index - b.state.$index})

            var compMap = {};
            if(diffSize < 0){
                var len = diffSize*-1;
                var tmp = this.subComponents.splice(this.subComponents.length-len,len);
                if(this.cache.length < this.cacheSize){
                    for(var i=tmp.length;i--;){
                        this.cache.push(tmp[i]);
                    }
                    for(var i=this.cache.length;i--;){
                        if(this.trans && !this.cache[i].__leaving && this.cache[i].__state === Component.state.mounted){
                            this.cache[i].__leaving = true;
                            this.cache[i].transition.leave();
                        }else{
                            this.cache[i].unmount(false);
                        }
                    }
                }else{
                    for(var i=tmp.length;i--;){
                        tmp[i].destroy();
                    }
                }
            }else if(diffSize > 0){
                var restSize = diffSize;                
                while(restSize--){
                    var pair = this.createSubComp();
                    compMap[pair[0].__id] = pair;
                }
            }

            var isIntK = Util.isArray(ds)?true:false;
            var index = 0;
            var updateQ = [];
            for(var k in ds){
                if(!ds.hasOwnProperty(k))continue;
                if(isIntK && isNaN(k))continue;

                var subComp = this.subComponents[index];

                //模型
                var v = ds[k];

                //k,index,each
                if(typeof v === 'object' && v != null){
                    for(var i=v.__im__extPropChain.length;i--;){
                        if(v.__im__extPropChain[i][0] === this){
                            break;
                        }
                    }
                    v.__im__extPropChain.splice(i,1);
                    v.__im__extPropChain.push([this,vi,index]);
                }
                
                var data = subComp.state;

                data[vi] = v;
                data['$index'] = index++;
                if(ki)data[ki] = isIntK?k>>0:k;

                if(compMap[subComp.__id]){
                    updateQ.push(compMap[subComp.__id]);
                }
                
            }

            renderEach(updateQ,this,true);
        }

        this.createSubComp = function(){
            var comp = this.__comp;
            var subComp = null;
            var p = this.placeholder.parentNode;
            var placeholder = document.createComment('-- directive [each] component --');
            //视图
            var copyNodes = [];
            for(var i=this.__nodes.length;i--;){
                var c = this.__nodes[i].cloneNode(true);
                copyNodes.unshift(c);
            }
            p.insertBefore(placeholder,this.placeholder);

            //创建子组件
            if(this.__isComp){
                subComp = comp.createSubComponentOf(copyNodes[0]);
            }else{
                subComp = comp.createSubComponent(copyNodes);
            }

            this.subComponents.push(subComp);

            //bind callback first
            for(var n in this.__props.type){
                var v = this.__props.type[n];
                if(v instanceof Function){
                    subComp[n] = v.bind(this.__comp);
                }
            }

            //bind props
            for(var n in this.__props.sync){
                var prop = this.__props.sync[n];
                var tmp = prop[0];
                var rs = prop[1];
                //call onPropBind
                if(Util.isObject(rs) && subComp.onPropBind)
                    rs = subComp.onPropBind(n,rs);

                var keys = prop[2];
                //watch props
                keys.forEach(function(key){
                    if(tmp.varTree[key].isFunc)return;

                    var prop = new Prop(subComp,n,tmp.varTree[key].segments,tmp);
                    comp.__watchProps.push(prop);
                });
                subComp.state[n] = rs;
            }
            //bind state
            for(var n in this.__props.str){
                subComp.state[n] = this.__props.str[n];
            }
            for(var n in this.__props.type){
                var v = this.__props.type[n];
                if(!(v instanceof Function)){
                    //call onPropBind
                    if(Util.isObject(v) && subComp.onPropBind)
                        v = subComp.onPropBind(n,v);
                    subComp.state[n] = v;
                }
            }
            
            if(this.trans){
                var that = this;
                
                subComp.onInit = function(){
                    if(!this.transition){
                        this.transition = that.ts.get(that.trans,this);
                    }
                };
                subComp.onMount = function(){
                    this.transition.enter();
                };
                subComp.postLeave = function(){
                    this.unmount(false);
                    this.__leaving = false;
                }
            }
                
            return [subComp,placeholder];
        }
        this.doFilter = function(ds){
            if(!this.filters)return ds;
            var filters = this.filters;
            if(Object.keys(filters).length > 0 && ds){
                var rs = ds;
                if(Util.isObject(ds)){
                    rs = Util.isArray(ds)?[]:{};
                    Util.ext(rs,ds);
                }

                for(var k in filters){
                    var c = filters[k][0];
                    var params = filters[k][1];
                    var actParams = [];
                    for(var i=params.length;i--;){
                        var v = params[i];
                        if(v.varTree && v.words){
                            v = Renderer.evalExp(this.__comp,v);
                        }
                        actParams[i] = v;
                    }
                    c.value = rs;
                    rs = c.to.apply(c,actParams);
                }
                return rs;
            }
        }
        this.build = function(ds,ki,vi){
            var isIntK = Util.isArray(ds)?true:false;
            var index = 0;
            
            ds = this.doFilter(ds);
            //bind each
            if(ds.__im__extPropChain)
                ds.__im__extPropChain.push([this,vi]);

            var queue = [];

            for(var k in ds){
                if(!ds.hasOwnProperty(k))continue;
                if(isIntK && isNaN(k))continue;

                var subCompPair = this.createSubComp();
                queue.push(subCompPair);
                
                //模型
                var v = ds[k];

                //k,index,each
                if(typeof v === 'object' && v != null){
                    v.__im__extPropChain.push([this,vi,index]);
                }

                var data = subCompPair[0].state.__im__target || subCompPair[0].state;

                data[vi] = v;
                data['$index'] = index++;
                if(ki)data[ki] = isIntK?k>>0:k;
            }

            renderEach(queue,this);
        }
        function renderEach(queue,eachObj,deep){
            if(queue.length<1)return;
            setTimeout(function(){
                var list = queue.splice(0,50);
                for(var i=0;i<list.length;i++){
                    var pair = list[i];
                    var comp = pair[0];
                    var holder = pair[1];
                    if(comp.__state === Component.state.unmounted)continue;
                    //attach DOM
                    eachObj.DOMHelper.replace(holder,comp.__nodes);
                    comp.init();
                    comp.mount();

                    if(deep){
                        if(comp.__state === Component.state.mounted){
                            Renderer.recurRender(comp);
                        }
                    }
                }

                if(queue.length > 0){
                    renderEach(queue,eachObj);
                }else{
                    //complete callback
                    if(eachObj.over)
                    eachObj.over();
                }
            },0);
        }
        this.parseExp = function(exp){
            var ds,k,v;
            var that = this;
            exp.replace(this.eachExp,function(a,attrName,subAttr,filterExp){
                ds = attrName;
                var tmp = subAttr.replace(/\s/mg,'');
                var kv = tmp.split(',');
                if(kv.length>1){
                    k = kv[0];
                    v = kv[1];
                }else{
                    v = kv[0];
                }

                if(filterExp){
                    var filters = {};
                    var varMap = Scanner.parseFilters(lexer(filterExp),filters,that.parent);
                    that.filters = filters;

                    for(var i in varMap){
                        that.component.watch(i,function(){
                            if(that.lastDS)
                            that.rebuild(that.lastDS,that.expInfo.k,that.expInfo.v);
                        });
                    }
                }
                
            });
            if(!ds){
                //each语法错误
                LOGGER.error('invalid each expression : '+exp);
                return;
            }

            return {
                ds:ds,
                k:k,
                v:v
            };
        }
    };
    var each = new eachModel();
    each.final = true;
    each.priority = 998;
    /**
     * each指令用于根据数据源，动态生成列表视图。数据源可以是数组或者对象
     * <br/>使用方式：
     * <br/> &lt;li x-each="datasource as k , v"&gt;{{k}} {{v}}&lt;/li&gt;
     * <br/> &lt;li x-each="datasource as v"&gt;{{v}}&lt;/li&gt;
     * 
     * datasource可以是一个变量表达式如a.b.c，也可以是一个常量[1,2,3]
     */
    impex.directive('each',each,['DOMHelper','Transitions']);

}(impex);