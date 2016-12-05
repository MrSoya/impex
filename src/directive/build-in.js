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
        final:true
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
                this.attr(p,rs);
            }
            
        }
    })
    /**
     * 控制视图显示指令，根据表达式计算结果控制
     * <br/>使用方式：<div x-show="exp"></div>
     */
    .directive('show',{
        onCreate:function(ts){
            var transition = this.attr('transition');
            if(transition !== null){
                this.transition = ts.get(transition,this);
            }
            this.lastRs = false;
            this.exec(false);
        },
        onUpdate : function(rs){
            if(this.component.__state === Component.state.suspend)return;
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
                this.show();
            }else{
                // 隐藏
                this.hide();
            }
        }
    },['Transitions'])
    /**
     * x-show的范围版本
     */
    .directive('show-start',{
        endTag : 'show-end',
        onInit:function(){
            //更新视图
            Scanner.scan(this.__nodes,this.component);
        },
        onUpdate : function(rs){
            if(this.component.__state === Component.state.suspend)return;
            var nodes = this.__nodes;
            if(rs){
                //显示
                for(var i=nodes.length;i--;){
                    if(nodes[i].style)nodes[i].style.display = '';
                }
            }else{
                // 隐藏
                for(var i=nodes.length;i--;){
                    if(nodes[i].style)nodes[i].style.display = 'none';
                }
            }
        }
    })
    /**
     * 效果与show相同，但是会移除视图
     * <br/>使用方式：<div x-if="exp"></div>
     */
    .directive('if',{
        onCreate:function(ts){
            this.placeholder = document.createComment('-- directive [if] placeholder --');

            var transition = this.attr('transition');
            if(transition !== null){
                this.transition = ts.get(transition,this);
            }
            this.lastRs = false;
            this.exec(false);
        },
        onUpdate : function(rs){
            if(this.elseD){
                this.elseD.doUpdate(!rs);
            }
            if(this.component.__state === Component.state.suspend)return;
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
                if(this.el.parentNode)return;
                //添加
                this.placeholder.parentNode.replaceChild(this.el,this.placeholder);
            }else{
                if(!this.el.parentNode)return;
                //删除
                this.el.parentNode.replaceChild(this.placeholder,this.el);
            }
        }
    },['Transitions'])
    /**
     * 和x-if成对出现，单独出现无效。并且只匹配前一个if
     * <br/>使用方式：<div x-if="exp"></div><div x-else></div>
     */
    .directive('else',{
        onCreate:function(ts){
            this.placeholder = document.createComment('-- directive [else] placeholder --');

            //find if
            var xif = this.component.directives[this.component.directives.length-2];
            if(xif.name !== 'x-if'){
                LOGGER.warn("can not find directive[x-if] to make a pair");
                return;
            }

            xif.elseD = this;

            var transition = this.attr('transition');
            if(transition !== null){
                this.transition = ts.get(transition,this);
            }
            this.lastRs = true;
            this.exec(true);
        },
        doUpdate : function(rs){
            if(this.component.__state === Component.state.suspend)return;
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
                if(this.el.parentNode)return;
                //添加
                this.placeholder.parentNode.replaceChild(this.el,this.placeholder);
            }else{
                if(!this.el.parentNode)return;
                //删除
                this.el.parentNode.replaceChild(this.placeholder,this.el);
            }
        }
    },['Transitions'])
    /**
     * x-if的范围版本
     * <br/>使用方式：<div x-if-start="exp"></div>...<div x-if-end></div>
     */
    .directive('if-start',{
        endTag : 'if-end',
        onCreate:function(DOMHelper){
            this.DOMHelper = DOMHelper;
            this.placeholder = document.createComment('-- directive [if] placeholder --');
        },
        onInit:function(){
            Scanner.scan(this.__nodes,this.component);
        },
        onUpdate : function(rs){
            if(this.component.__state === Component.state.suspend)return;
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
    },['DOMHelper'])
    /**
     * 用于屏蔽视图初始时的表达式原始样式，需要配合class使用
     */
    .directive('cloak',{
        onCreate:function(){
            var className = this.attr('class');
            if(!className){
                LOGGER.warn("can not find attribute[class] of element["+this.el.tagName+"] which directive[cloak] on");
                return;
            }
            className = className.replace('x-cloak','');
            
            this.__cn = className;
        },
        onActive:function(){
            updateCloakAttr(this.component,this.el,this.__cn);
            var curr = this.attr('class').replace('x-cloak','');
            this.attr('class',curr);
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
                    var type = this.attr('type');
                    switch(type){
                        case 'radio':
                            this.on('click',null,this.changeModel.bind(this));
                            break;
                        case 'checkbox':
                            this.on('click',null,this.changeModelCheck.bind(this));
                            break;
                        default:
                            var hack = document.body.onpropertychange===null?'propertychange':'input';
                            this.on(hack,null,this.changeModel.bind(this));
                    }
                    
                    break;
                case 'select':
                    var mul = el.getAttribute('multiple');
                    if(mul !== null){
                        this.on('change',null,this.changeModelSelect.bind(this));
                    }else{
                        this.on('change',null,this.changeModel.bind(this));
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
            this.component.d(this.value,parts);
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
            this.fragment = document.createDocumentFragment();
            this.expInfo = this.parseExp(this.value);
            // this.__view = this.view;
            this.cache = [];
            this.__comp = this.component;

            if(this.el){
                this.__tagName = this.el.tagName.toLowerCase();
                this.__isComp = ComponentFactory.hasTypeOf(this.__tagName);
                this.cacheable = this.attr('cache')==='false'?false:true;
            }else{
                this.cacheable = this.__nodes[0].getAttribute('cache')==='false'?false:true;
            }

            this.subComponents = [];//子组件，用于快速更新each视图，提高性能

            this.cacheSize = 20;

            this.step = this.el?this.attr('step'):this.__nodes[0].getAttribute('step');

            this.over = this.el?this.attr('over'):this.__nodes[0].getAttribute('over');

            var transition = this.el?this.attr('transition'):this.__nodes[0].getAttribute('transition');
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
                    this.component.watch(begin,function(object,name,type,newVal,oldVal){
                        var ds = getForDs(newVal>>0,end,step);
                        that.lastDS = ds;
                        that.rebuild(ds,that.expInfo.k,that.expInfo.v);
                    });
                    begin = this.component.d(begin);
                }
                if(isNaN(end)){
                    this.component.watch(end,function(object,name,type,newVal,oldVal){
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
                this.component.watch(this.expInfo.ds,function(object,name,type,newVal){
                    if(!that.ds){
                        that.ds = that.component.d(that.expInfo.ds);
                        that.lastDS = that.ds;
                        that.build(that.ds,that.expInfo.k,that.expInfo.v);
                        return;
                    }

                    that.lastDS = Util.isArray(newVal)?newVal:object;
                    that.rebuild(that.lastDS,that.expInfo.k,that.expInfo.v);
                });
            }

            if(this.over){
                var tmp = lexer(this.over);
                var rs = Renderer.evalExp(this.__comp,tmp);
                this.over = rs;
            }            
            
            this.lastDS = this.ds;
            
            this.placeholder = document.createComment('-- directive [each] placeholder --');
            this.DOMHelper.insertBefore([this.placeholder],this.__nodes[0]);

            this.fragmentPlaceholder = document.createComment('-- fragment placeholder --');
            
            this.fragment.appendChild(this.fragmentPlaceholder);

            //parse props
            this.__props = parseProps(this.__nodes,this.component);

            if(this.ds)
                this.build(this.ds,this.expInfo.k,this.expInfo.v);
            //更新视图
            this.destroy();
        }
        function parseProps(nodes,comp){
            var props = {
                str:{},
                type:{},
                sync:{}
            };
            var ks = ['cache','over','step','transition'];
            var el = nodes[0];
            for(var i=el.attributes.length;i--;){
                var attr = el.attributes[i];
                var k = attr.nodeName;
                if(ks.indexOf(k) > -1)continue;

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
                        props.type[n] = Util.immutable(rs);
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
            
            var diffSize = ds.length - this.subComponents.length;

            if(diffSize < 0){
                var tmp = this.subComponents.splice(0,diffSize*-1);
                if(this.cache.length < this.cacheSize){
                    for(var i=tmp.length;i--;){
                        this.cache.push(tmp[i]);
                    }
                    for(var i=this.cache.length;i--;){
                        if(this.trans && !this.cache[i].__leaving && this.cache[i].__state === 'displayed'){
                            this.cache[i].__leaving = true;
                            this.cache[i].transition.leave();
                        }else{
                            this.cache[i].suspend(false);
                        }
                    }
                }else{
                    for(var i=tmp.length;i--;){
                        tmp[i].destroy();
                    }
                }
            }else if(diffSize > 0){
                var restSize = diffSize;
                if(this.cacheable){
                    var tmp = this.cache.splice(0,diffSize);
                    for(var i=0;i<tmp.length;i++){
                        this.subComponents.push(tmp[i]);
                        this.DOMHelper.insertBefore(tmp[i].__nodes,this.placeholder);
                    }
                    var restSize = diffSize - tmp.length;
                }
                
                while(restSize--){
                    this.createSubComp();
                }
            }

            var isIntK = Util.isArray(ds)?true:false;
            var index = 0;
            for(var k in ds){
                if(!ds.hasOwnProperty(k))continue;
                if(isIntK && isNaN(k))continue;

                var subComp = this.subComponents[index];

                //模型
                var v = ds[k];
                if(ds[k] && ds[k].__im__origin){
                    v = ds[k].__im__origin;

                    ds[k].__im__origin = null;
                    delete ds[k].__im__origin;
                }

                //k,index,each
                if(typeof v === 'object'){
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

                // var isSuspend = subComp.__state === "suspend"?true:false;
                if(subComp.__state === Component.state.created){
                    subComp.init();
                }
                subComp.display();
                if(subComp.__state === "displayed"){
                    Renderer.recurRender(subComp);
                }
                
                
                onDisplay(subComp);
            }
        }
        function onDisplay(comp){
            for(var i=0;i<comp.children.length;i++){
                var sub = comp.children[i];
                if(sub.onDisplay)
                    sub.onDisplay();
                if(sub.children.length > 0){
                    onDisplay(sub);
                }
            }
        }
        this.createSubComp = function(){
            var comp = this.__comp;
            var subComp = null;            
            //视图
            var copyNodes = [];
            for(var i=this.__nodes.length;i--;){
                var c = this.__nodes[i].cloneNode(true);
                copyNodes.unshift(c);
            }

            //创建子组件
            if(this.__isComp){
                this.DOMHelper.insertBefore(copyNodes,this.placeholder);
                subComp = comp.createSubComponentOf(copyNodes[0]);
            }else{
                this.DOMHelper.insertBefore(copyNodes,this.placeholder);
                subComp = comp.createSubComponent(copyNodes);
            }
            subComp.suspend(true);
            this.subComponents.push(subComp);

            //bind props
            for(var n in this.__props.sync){
                var prop = this.__props.sync[n];
                var tmp = prop[0];
                var rs = prop[1];
                var keys = prop[2];
                //watch props
                keys.forEach(function(key){
                    if(tmp.varTree[key].isFunc)return;

                    var prop = new Prop(subComp,n,tmp.varTree[key].segments,tmp,rs);
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
                if(v instanceof Function){
                    subComp[n] = v;
                }else{
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
                subComp.onDisplay = function(){
                    this.transition.enter();
                };
                subComp.postLeave = function(){
                    this.suspend(false);
                    this.__leaving = false;
                }
            }
                
            return subComp;
        }
        function clone(obj,ref){
            if(obj === null)return null;
            var rs = obj;
            if(obj instanceof Array){
                rs = obj.concat();
                for(var i=rs.length;i--;){
                    rs[i] = clone(rs[i],ref);
                }
            }else if(Util.isObject(obj)){
                rs = {};
                var ks = Object.keys(obj);
                if(ks.length>0){
                    var r = ref ===false ? false : !obj.__im__origin;
                    for(var i=ks.length;i--;){
                        var k = ks[i],
                            v = obj[k];
                        if(k.indexOf('__im__')===0)continue;
                        rs[k] = typeof obj[k]==='object'? clone(obj[k],r): obj[k];
                    }
                }

                if(ref !== false && !rs.__im__origin)
                    rs.__im__origin = obj;
            }
            return rs;
        }
        this.doFilter = function(rs){
            if(!this.filters)return rs;
            var filters = this.filters;
            if(Object.keys(filters).length > 0){
                if(rs && Util.isObject(rs)){
                    rs = clone(rs);
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

            for(var k in ds){
                if(!ds.hasOwnProperty(k))continue;
                if(isIntK && isNaN(k))continue;

                var subComp = this.createSubComp();
                
                //模型
                var v = ds[k];
                if(ds[k] && ds[k].__im__origin){
                    v = ds[k].__im__origin;

                    ds[k].__im__origin = null;
                    delete ds[k].__im__origin;
                }

                //k,index,each
                if(typeof v === 'object'){
                    v.__im__extPropChain.push([this,vi,index]);
                }

                var data = subComp.state.__im__target || subComp.state;

                data[vi] = v;
                data['$index'] = index++;
                if(ki)data[ki] = isIntK?k>>0:k;
            }

            //初始化组件
            for(var i=this.subComponents.length;i--;){
                this.subComponents[i].init();
                this.subComponents[i].__state = Component.state.displayed;
            }

            var queue = this.subComponents.concat();
            renderEach(queue,this);
        }
        function renderEach(queue,eachObj){
            setTimeout(function(){
                var list = queue.splice(0,50);
                for(var i=0;i<list.length;i++){
                    if(list[i].__state === Component.state.suspend)continue;
                    list[i].__state = Component.state.inited;
                    list[i].display();
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
        this.over = function(){
            alert('sdfdsf')
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
    each.priority = 999;
    /**
     * each指令用于根据数据源，动态生成列表视图。数据源可以是数组或者对象
     * <br/>使用方式：
     * <br/> &lt;li x-each="datasource as k , v"&gt;{{k}} {{v}}&lt;/li&gt;
     * <br/> &lt;li x-each="datasource as v"&gt;{{v}}&lt;/li&gt;
     * 
     * datasource可以是一个变量表达式如a.b.c，也可以是一个常量[1,2,3]
     */
    impex.directive('each',each,['DOMHelper','Transitions']);


    var eachStart = new eachModel();
    eachStart.endTag = 'each-end';
    eachStart.priority = 999;
    /**
     * each-start/end指令类似each，但是可以循环范围内的所有节点。数据源可以是数组或者对象
     * <br/>使用方式：
     * <br/> &lt;a x-each-start="datasource as k => v"&gt;{{k}} {{v}}&lt;/a&gt;
     * <br/> &lt;b x-each-end&gt;{{v}}&lt;/b&gt;
     * 
     * datasource可以是一个变量表达式如a.b.c，也可以是一个常量[1,2,3]
     */
    impex.directive('each-start',eachStart,['DOMHelper']);
}(impex);