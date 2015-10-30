/**
 * 内建指令
 */

///////////////////// 事件指令 /////////////////////
/**
 * 视图点击指令
 * <br/>使用方式：<div x-click="fn() + fx()"></div>
 */
impex.directive('click',{
    onInit : function(){
        this.on('click',this.$value);
    }
});

///////////////////// 视图控制指令 /////////////////////
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
            //添加
            this.viewManager.replace(this.$view,this.placeholder);
        }else{
            //删除
            this.viewManager.replace(this.placeholder,this.$view);
        }
    }
    
},['ViewManager']);

impex.directive('cloak',{
    onCreate:function(){
        var className = this.$view.attr('class');
        className = className.replace('x-cloak','');
        this.$view.attr('class',className);
        updateCloakAttr(this.$parent,this.$view.element,className);
    }
});

function updateCloakAttr(component,node,newOrigin){
    for(var i=component.$__expNodes.length;i--;){
        var expNode = component.$__expNodes[i];
        if(expNode.node == node && expNode.attrName == 'class'){
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
 * <br/>使用方式：<input x-bind="model.prop">
 */
impex.directive('bind',{
    onCreate : function(){
        if(this.$view.name == 'input'){
            var hack = document.body.onpropertychange===null?'propertychange':'input';
        	this.on(hack,'changeModel($event)');
        }
    },
    changeModel : function(e){
        this.$parent.data(this.$value,(e.target || e.srcElement).value);
    }
});

/**
 * each指令用于根据数据源，动态生成列表视图。数据源可以是数组或者对象
 * <br/>使用方式：
 * <br/> &lt;li x-each="datasource as k => v"&gt;{{k}} {{v}}&lt;/li&gt;
 * <br/> &lt;li x-each="datasource as v"&gt;{{v}}&lt;/li&gt;
 * 
 * datasource可以是一个变量表达式如a.b.c，也可以是一个常量[1,2,3]
 */
impex.directive('each',new function(){
	this.$final = true;
	this.$eachExp = /(.+?)\s+as\s+((?:[a-zA-Z0-9_$]+?\s*=>\s*[a-zA-Z0-9_$]+?)|(?:[a-zA-Z0-9_$]+?))$/;
	this.viewManager;
	this.placeholder = null;
	this.parent = null;
    this.onCreate = function(viewManager){
        this.viewManager = viewManager;
        this.parent = this.$parent;
        this.expInfo = this.parseExp(this.$value);
        //获取数据源
        this.ds = this.parent.data(this.expInfo.ds);
        
        this.subComponents = [];//子组件，用于快速更新each视图，提高性能
    }
    this.onInit = function(){
        this.placeholder = this.viewManager.createPlaceholder('-- directive [each] placeholder --');
        this.viewManager.insertBefore(this.placeholder,this.$view);

        this.build(this.ds,this.expInfo.k,this.expInfo.v);
        //更新视图
        this.destroy();

        var that = this;
        this.parent.watch(this.expInfo.ds,function(type,newVal,oldVal){
            that.rebuild();
        });
    }
    this.rebuild = function(){
    	var ds = this.parent.data(this.expInfo.ds);

    	//清除旧组件
    	for(var i=this.subComponents.length;i--;){
			this.subComponents[i].destroy();
		}
		this.subComponents = [];

		this.build(ds,this.expInfo.k,this.expInfo.v);
    }
    this.build = function(ds,ki,vi){
    	var parent = this.parent;
    	
        var isIntK = Util.isArray(ds)?true:false;
		for(var k in ds){
            if(!ds.hasOwnProperty(k))continue;
			var target = this.viewManager.createPlaceholder('');
			this.viewManager.insertBefore(target,this.placeholder);
			//视图
    		var copy = this.$view.clone().removeAttr('x-each');

    		//创建子组件
    		var subComp = parent.createSubComponent(copy,target);
    		this.subComponents.push(subComp);
    		
    		//模型
			subComp[vi] = ds[k];
			if(ki)subComp[ki] = isIntK?k>>0:k;
		}

		//初始化组件
		for(var i=this.subComponents.length;i--;){
			this.subComponents[i].init();
			this.subComponents[i].display();
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
			impex.console.error(exp+'解析错误，不是合法的each语法');
			return;
		}

		return {
			ds:ds,
			k:k,
			v:v
		};
	}

},['ViewManager']);