/**
 * 内建指令
 */
!function(impex){
    ///////////////////// 视图控制指令 /////////////////////
    /**
     * 绑定视图属性，并用表达式的值设置属性
     * <br/>使用方式：<img x-bind:src="exp">
     */
    impex.directive('bind',{
        onInit:function(){
            if(!this.$params || this.$params.length < 1){
                impex.console.warn('at least one attribute be binded');
            }
        },
        observe : function(rs){
            if(!this.$params || this.$params.length < 1)return;

            var filter = null;
            if(this.$filter){
                var owner = this.closest(this.$filter);
                if(owner){
                    filter = owner[this.$filter];
                }
            }

            if(filter){
                var allowed = filter(rs);
                if(!Util.isUndefined(allowed) && !allowed){
                    return;
                }
            }

            for(var i=this.$params.length;i--;){
                var p = this.$params[i];
                this.$view.attr(p,rs);
            }
            
        }
    });
    /**
     * 控制视图显示指令，根据表达式计算结果控制
     * <br/>使用方式：<div x-show="exp"></div>
     */
    impex.directive('show',{
        observe : function(rs){
            if(rs){
                //显示
                this.$view.show();
            }else{
                // 隐藏
                this.$view.hide();
            }
        }
    });
    /**
     * x-show的范围版本
     */
    impex.directive('show-start',{
        $endTag : 'show-end',
        onCreate : function(){
            this.$view.removeAttr('x-show-start');

            //更新视图
            this.__init();
            this.display();
        },
        observe : function(rs){
            if(rs){
                //显示
                this.$view.show();
            }else{
                // 隐藏
                this.$view.hide();
            }
        }
    });

    /**
     * 效果与show相同，但是会移除视图
     * <br/>使用方式：<div x-if="exp"></div>
     */
    impex.directive('if',new function(){
        this.placeholder = null;
        this.viewManager;
        this.onCreate = function(viewManager){
            this.viewManager = viewManager;
            this.placeholder = viewManager.createPlaceholder('-- directive [if] placeholder --');
        }
        this.observe = function(rs){
            if(rs){
                if(this.$view.elements[0].parentNode)return;
                //添加
                this.viewManager.replace(this.$view,this.placeholder);
            }else{
                if(!this.$view.elements[0].parentNode)return;
                //删除
                this.viewManager.replace(this.placeholder,this.$view);
            }
        }
    },['ViewManager']);

    /**
     * x-if的范围版本
     * <br/>使用方式：<div x-if-start="exp"></div>...<div x-if-end></div>
     */
    impex.directive('if-start',{
        $endTag : 'if-end',
        onCreate : function(viewManager){
            this.viewManager = viewManager;
            this.placeholder = viewManager.createPlaceholder('-- directive [if] placeholder --');
            this.$view.removeAttr('x-if-start');

            //更新视图
            this.__init();
            this.display();
        },
        observe : function(rs){
            if(rs){
                if(this.$view.elements[0].parentNode)return;
                //添加
                this.viewManager.replace(this.$view,this.placeholder);
            }else{
                if(!this.$view.elements[0].parentNode)return;
                //删除
                this.viewManager.replace(this.placeholder,this.$view);
            }
        }
    },['ViewManager']);

    /**
     * 用于屏蔽视图初始时的表达式原始样式，需要配合class使用
     */
    impex.directive('cloak',{
        onCreate:function(){
            var className = this.$view.attr('class');
            if(!className){
                impex.console.warn("can not find attribute[class] of element["+this.$view.name+"] which directive[cloak] on");
                return;
            }
            className = className.replace('x-cloak','');
            this.$view.attr('class',className);
            updateCloakAttr(this.$parent,this.$view.elements[0],className);
        }
    });

    function updateCloakAttr(component,node,newOrigin){
        for(var i=component.$__expNodes.length;i--;){
            var expNode = component.$__expNodes[i];
            if(expNode.node == node && expNode.attrName === 'class'){
                expNode.origin = newOrigin;
            }
        }

        for(var j=component.$__components.length;j--;){
            updateCloakAttr(component.$__components[j],node,newOrigin);
        }
    }


    ///////////////////// 模型控制指令 /////////////////////
    /**
     * 绑定模型属性，当控件修改值后，模型值也会修改
     * <br/>使用方式：<input x-model="model.prop">
     */
    impex.directive('model',{
        onCreate : function(){
            switch(this.$view.elements[0].nodeName.toLowerCase()){
                case 'textarea':
                case 'input':
                    var type = this.$view.attr('type');
                    switch(type){
                        case 'radio':
                            this.on('click','changeModel($event)');
                            break;
                        case 'checkbox':
                            this.on('click','changeModelCheck($event)');
                            break;
                        default:
                            var hack = document.body.onpropertychange===null?'propertychange':'input';
                            this.on(hack,'changeModel($event)');
                    }
                    
                    break;
                case 'select':
                    this.on('change','changeModel($event)');
                    break;
            }
        },
        changeModelCheck : function(e){
            var t = e.target || e.srcElement;
            var val = t.value;
            var mVal = this.$parent.data(this.$value);
            var parts = mVal.split(',');
            if(t.checked){
                parts.push(val);
            }else{
                var i = parts.indexOf(val);
                if(i > -1){
                    parts.splice(i,1);
                }
            }
            this.$parent.data(this.$value,parts.join(',').replace(/^,/,''));
        },
        changeModel : function(e){
            this.$parent.data(this.$value,(e.target || e.srcElement).value);
        }
    });

    function eachModel(){
        this.onCreate = function(viewManager){
            this.$eachExp = /(.+?)\s+as\s+((?:[a-zA-Z0-9_$]+?\s*=>\s*[a-zA-Z0-9_$]+?)|(?:[a-zA-Z0-9_$]+?))$/;
            this.$viewManager = viewManager;
            this.$expInfo = this.parseExp(this.$value);
            this.$parentComp = this.$parent;
            this.$__view = this.$view;
            this.$cache = [];
            
            this.$subComponents = [];//子组件，用于快速更新each视图，提高性能

            this.$cacheSize = 20;
        }
        this.onInit = function(){
            if(this.$__state === Component.state.inited)return;
            //获取数据源
            this.$ds = this.$parent.data(this.$expInfo.ds);
            
            this.$placeholder = this.$viewManager.createPlaceholder('-- directive [each] placeholder --');
            this.$viewManager.insertBefore(this.$placeholder,this.$view);

            this.build(this.$ds,this.$expInfo.k,this.$expInfo.v);
            //更新视图
            this.destroy();

            var that = this;
            this.$parentComp.watch(this.$expInfo.ds,function(type,newVal,oldVal){

                var newKeysSize = 0;
                var oldKeysSize = 0;

                for(var k in newVal){
                    if(!newVal.hasOwnProperty(k) || k.indexOf('$')===0)continue;
                    newKeysSize++;
                }
                if(newKeysSize === 0){
                    oldKeysSize = that.$subComponents.length;
                }else{
                    for(var k in oldVal){
                        if(!oldVal.hasOwnProperty(k) || k.indexOf('$')===0)continue;
                        oldKeysSize++;
                    }
                }
                
                that.rebuild(newVal,newKeysSize - oldKeysSize,that.$expInfo.k,that.$expInfo.v);
            });
        }
        this.rebuild = function(ds,diffSize,ki,vi){
            if(diffSize < 0){
                var tmp = this.$subComponents.splice(0,diffSize*-1);
                if(this.$cache.length < this.$cacheSize){
                    for(var i=tmp.length;i--;){
                        this.$cache.push(tmp[i]);
                    }
                    for(var i=this.$cache.length;i--;){
                        this.$cache[i].suspend(false);
                    }
                }else{
                    for(var i=tmp.length;i--;){
                        tmp[i].destroy();
                    }
                }
            }else if(diffSize > 0){
                var tmp = this.$cache.splice(0,diffSize);
                for(var i=0;i<tmp.length;i++){
                    this.$subComponents.push(tmp[i]);
                    this.$viewManager.insertBefore(tmp[i].$view,this.$placeholder);
                }
                var restSize = diffSize - tmp.length;
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

                var subComp = this.$subComponents[index];
                //模型
                subComp[vi] = ds[k];
                subComp['$index'] = index++;
                if(ki)subComp[ki] = isIntK?k>>0:k;

                subComp.init();
                subComp.display();
            }
        }
        this.createSubComp = function(){
            var parent = this.$parentComp;
            var target = this.$viewManager.createPlaceholder('');
            this.$viewManager.insertBefore(target,this.$placeholder);
            //视图
            var copy = this.$__view.clone().removeAttr(this.$name);
            //创建子组件
            var subComp = parent.createSubComponent(copy,target);
            this.$subComponents.push(subComp);
            return subComp;
        }
        this.build = function(ds,ki,vi){            
            var isIntK = Util.isArray(ds)?true:false;
            var index = 0;
            for(var k in ds){
                if(!ds.hasOwnProperty(k))continue;
                if(isIntK && isNaN(k))continue;
                if(k.indexOf('$__')===0)continue;

                var subComp = this.createSubComp();
                
                //模型
                subComp[vi] = ds[k];
                subComp['$index'] = index++;
                if(ki)subComp[ki] = isIntK?k>>0:k;
            }

            //初始化组件
            for(var i=this.$subComponents.length;i--;){
                this.$subComponents[i].init();
                this.$subComponents[i].display();
            }
        }
        this.parseExp = function(exp){
            var ds,k,v;
            exp.replace(this.$eachExp,function(a,attrName,subAttr){
                ds = attrName;
                var tmp = subAttr.replace(/\s/mg,'');
                var kv = tmp.split('=>');
                if(kv.length>1){
                    k = kv[0];
                    v = kv[1];
                }else{
                    v = kv[0];
                }
                
            });
            if(!ds){
                //each语法错误
                impex.console.error('invalid each expression : '+exp);
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
    each.$final = true;
    /**
     * each指令用于根据数据源，动态生成列表视图。数据源可以是数组或者对象
     * <br/>使用方式：
     * <br/> &lt;li x-each="datasource as k => v"&gt;{{k}} {{v}}&lt;/li&gt;
     * <br/> &lt;li x-each="datasource as v"&gt;{{v}}&lt;/li&gt;
     * 
     * datasource可以是一个变量表达式如a.b.c，也可以是一个常量[1,2,3]
     */
    impex.directive('each',each,['ViewManager']);


    var eachStart = new eachModel();
    eachStart.$endTag = 'each-end';
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