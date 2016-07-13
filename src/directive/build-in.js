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
                this.view.on(this.params[i],this.value);
            }
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
        observe : function(rs){
            if(!this.params || this.params.length < 1)return;

            var filter = null;
            if(this.filter){
                filter = this.m(this.filter);
            }

            if(filter){
                var allowed = filter(rs);
                if(!Util.isUndefined(allowed) && !allowed){
                    return;
                }
            }

            for(var i=this.params.length;i--;){
                var p = this.params[i];
                this.view.attr(p,rs);
            }
            
        }
    })
    /**
     * 控制视图显示指令，根据表达式计算结果控制
     * <br/>使用方式：<div x-show="exp"></div>
     */
    .directive('show',{
        onCreate:function(ts){
            var transition = this.view.attr('transition');
            if(transition !== null){
                this.transition = ts.get(transition,this);
            }
            this.lastRs = false;
            this.exec(false);
        },
        observe : function(rs){
            if(this.parent.__state === Component.state.suspend)return;
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
        leave:function(){
            this.exec(this.lastRs);
        },
        exec:function(rs){
            if(rs){
                //显示
                this.view.show();
            }else{
                // 隐藏
                this.view.hide();
            }
        }
    },['Transitions'])
    /**
     * x-show的范围版本
     */
    .directive('show-start',{
        endTag : 'show-end',
        onCreate:function(){
            //更新视图
            this.__init();
            this.display();
        },
        observe : function(rs){
            if(this.parent.__state === Component.state.suspend)return;
            var nodes = this.view.__nodes;
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
        onCreate:function(viewManager,ts){
            this.viewManager = viewManager;
            this.placeholder = viewManager.createPlaceholder('-- directive [if] placeholder --');

            var transition = this.view.attr('transition');
            if(transition !== null){
                this.transition = ts.get(transition,this);
            }
            this.lastRs = false;
            this.exec(false);
        },
        observe : function(rs){
            if(this.parent.__state === Component.state.suspend)return;
            if(rs === this.lastRs && !this.view.el.parentNode)return;
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
        leave:function(){
            this.exec(this.lastRs);
        },
        exec:function(rs){
            if(rs){
                if(this.view.el.parentNode)return;
                //添加
                this.viewManager.replace(this.view,this.placeholder);
            }else{
                if(!this.view.el.parentNode)return;
                //删除
                this.viewManager.replace(this.placeholder,this.view);
            }
        }
    },['ViewManager','Transitions'])
    /**
     * x-if的范围版本
     * <br/>使用方式：<div x-if-start="exp"></div>...<div x-if-end></div>
     */
    .directive('if-start',{
        endTag : 'if-end',
        onCreate:function(viewManager){
            this.viewManager = viewManager;
            this.placeholder = viewManager.createPlaceholder('-- directive [if] placeholder --');

            //更新视图
            this.__init();
            this.display();
        },
        observe : function(rs){
            if(this.parent.__state === Component.state.suspend)return;
            if(rs){
                if(this.view.__nodes[0].parentNode)return;
                //添加
                this.viewManager.replace(this.view,this.placeholder);
            }else{
                if(!this.view.__nodes[0].parentNode)return;
                //删除
                this.viewManager.replace(this.placeholder,this.view);
            }
        }
    },['ViewManager'])
    /**
     * 用于屏蔽视图初始时的表达式原始样式，需要配合class使用
     */
    .directive('cloak',{
        onCreate:function(){
            var className = this.view.attr('class');
            if(!className){
                LOGGER.warn("can not find attribute[class] of element["+this.view.name+"] which directive[cloak] on");
                return;
            }
            className = className.replace('x-cloak','');
            
            var that = this;
            setTimeout(function(){
                updateCloakAttr(that.parent,that.view.el,className);
                var curr = that.view.attr('class').replace('x-cloak','');
                that.view.attr('class',curr);
            },0);
        }
    })

    ///////////////////// 模型控制指令 /////////////////////
    /**
     * 绑定模型属性，当控件修改值后，模型值也会修改
     * <br/>使用方式：<input x-model="model.prop">
     */
    .directive('model',{
        onCreate:function(){
            var el = this.view.el;
            this.toNum = el.getAttribute('number');
            this.debounce = el.getAttribute('debounce')>>0;

            switch(el.nodeName.toLowerCase()){
                case 'textarea':
                case 'input':
                    var type = this.view.attr('type');
                    switch(type){
                        case 'radio':
                            this.view.on('click','changeModel($event)');
                            break;
                        case 'checkbox':
                            this.view.on('click','changeModelCheck($event)');
                            break;
                        default:
                            var hack = document.body.onpropertychange===null?'propertychange':'input';
                            this.view.on(hack,'changeModel($event)');
                    }
                    
                    break;
                case 'select':
                    var mul = el.getAttribute('multiple');
                    if(mul !== null){
                        this.view.on('change','changeModelSelect($event)');
                    }else{
                        this.view.on('change','changeModel($event)');
                    }
                    
                    break;
            }
        },
        methods:{
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
                this.parent.d(this.value,parts);
            },
            changeModelCheck : function(e){
                var t = e.target || e.srcElement;
                var val = t.value;
                var parts = this.parent.d(this.value);
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
                this.parent.d(this.value,parts);
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
        },
        setVal:function(e){
            var v = (e.target || e.srcElement).value;
            if(this.toNum !== null){
                v = parseFloat(v);
            }
            this.parent.d(this.value,v);
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
        this.onCreate = function(viewManager,ts){
            this.eachExp = /^(.+?)\s+as\s+((?:[a-zA-Z0-9_$]+?\s*,)?\s*[a-zA-Z0-9_$]+?)\s*(?:=>\s*(.+?))?$/;
            this.forExp = /^\s*(\d+|[a-zA-Z_$].+?)\s+to\s+(\d+|[a-zA-Z_$].+?)\s*$/;
            this.viewManager = viewManager;
            this.expInfo = this.parseExp(this.value);
            this.parentComp = this.parent;
            this.__view = this.view;
            this.cache = [];

            if(this.view.el){
                this.cacheable = this.view.attr('cache')==='false'?false:true;
            }else{
                this.cacheable = this.view.__nodes[0].getAttribute('cache')==='false'?false:true;
            }

            this.subComponents = [];//子组件，用于快速更新each视图，提高性能

            this.cacheSize = 20;

            this.step = this.view.el?this.view.attr('step'):this.view.__nodes[0].getAttribute('step');

            var transition = this.view.el?this.view.attr('transition'):this.view.__nodes[0].getAttribute('transition');
            if(transition !== null){
                this.trans = transition;
                this.ts = ts;
            }
        }
        this.onInit = function(){
            if(this.__state === Component.state.inited)return;
            var that = this;
            //获取数据源
            if(this.forExp.test(this.expInfo.ds)){
                var begin = RegExp.$1,
                    end = RegExp.$2,
                    step = parseFloat(this.step);
                if(step < 0){
                    LOGGER.error('step <=0 : '+step);
                    return;
                }
                step = step || 1;
                if(isNaN(begin)){
                    this.parent.watch(begin,function(object,name,type,newVal,oldVal){
                        var ds = getForDs(newVal>>0,end,step);
                        that.lastDS = ds;
                        that.rebuild(ds,that.expInfo.k,that.expInfo.v);
                    });
                    begin = this.parent.d(begin);
                }
                if(isNaN(end)){
                    this.parent.watch(end,function(object,name,type,newVal,oldVal){
                        var ds = getForDs(begin,newVal>>0,step);
                        that.lastDS = ds;
                        that.rebuild(ds,that.expInfo.k,that.expInfo.v);
                    });
                    end = this.parent.d(end);
                }
                begin = parseFloat(begin);
                end = parseFloat(end);
                
                this.ds = getForDs(begin,end,step);
            }else{
                this.ds = this.parent.d(this.expInfo.ds);
                this.parentComp.watch(this.expInfo.ds,function(object,name,type,newVal){
                    if(!that.ds){
                        that.ds = that.parentComp.d(that.expInfo.ds);
                        that.lastDS = that.ds;
                        that.build(that.ds,that.expInfo.k,that.expInfo.v);
                        return;
                    }

                    that.lastDS = Util.isArray(newVal)?newVal:object;
                    that.rebuild(that.lastDS,that.expInfo.k,that.expInfo.v);
                });
            }
            
            this.lastDS = this.ds;
            
            this.placeholder = this.viewManager.createPlaceholder('-- directive [each] placeholder --');
            this.viewManager.insertBefore(this.placeholder,this.view);
            if(this.ds)
                this.build(this.ds,this.expInfo.k,this.expInfo.v);
            //更新视图
            this.destroy();
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
                        this.viewManager.insertBefore(tmp[i].view,this.placeholder);
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
                if(k.indexOf('$__')===0)continue;

                var subComp = this.subComponents[index];

                //模型
                var v = ds[k];
                if(ds[k] && ds[k].$__impex__origin){
                    v = ds[k].$__impex__origin;

                    ds[k].$__impex__origin = null;
                    delete ds[k].$__impex__origin;
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
                

                subComp.data[vi] = v;
                subComp.data['$index'] = index++;
                if(ki)subComp.data[ki] = isIntK?k>>0:k;

                subComp.init();
                var isSuspend = subComp.__state === "suspend"?true:false;
                subComp.display();
                isSuspend &&　Builder.build(subComp);
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
            var parent = this.parentComp;
            var target = this.viewManager.createPlaceholder('');
            this.viewManager.insertBefore(target,this.placeholder);
            //视图
            var copy = this.__view.clone();
            //创建子组件
            var subComp = parent.createSubComponent(copy,target);
            this.subComponents.push(subComp);
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
                subComp.leave = function(){
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
                    var r = ref ===false ? false : !obj.$__impex__origin;
                    for(var i=ks.length;i--;){
                        var k = ks[i],
                            v = obj[k];
                        if(k.indexOf('$__impex__')===0)continue;
                        rs[k] = typeof obj[k]==='object'? clone(obj[k],r): obj[k];
                    }
                }

                if(ref !== false && !rs.$__impex__origin)
                    rs.$__impex__origin = obj;
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
                            v = Renderer.evalExp(this.parentComp,v);
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
                if(ds[k] && ds[k].$__impex__origin){
                    v = ds[k].$__impex__origin;

                    ds[k].$__impex__origin = null;
                    delete ds[k].$__impex__origin;
                }

                //k,index,each
                if(typeof v === 'object'){
                    v.__im__extPropChain.push([this,vi,index]);
                }

                subComp.data[vi] = v;
                subComp.data['$index'] = index++;
                if(ki)subComp.data[ki] = isIntK?k>>0:k;
            }

            //初始化组件
            for(var i=this.subComponents.length;i--;){
                this.subComponents[i].init();
                this.subComponents[i].display();
            }
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
                        that.parent.watch(i,function(){
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
    impex.directive('each',each,['ViewManager','Transitions']);


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
    impex.directive('each-start',eachStart,['ViewManager']);
}(impex);