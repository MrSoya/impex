/**
 * 组件工厂用于统一管理系统内所有组件实例
 */
function _ComponentFactory(viewProvider){
	Factory.call(this,Component);

	this.viewProvider = viewProvider;
}
Util.inherits(_ComponentFactory,Factory);
Util.ext(_ComponentFactory.prototype,{
	getRestrictOf : function(type){
		return this.types[type].props['restrict'];
	},
	/**
	 * 创建指定基类实例
	 */
	newInstance : function(element){
		var view = null;
		if(arguments.length === 2){
			var tmpl = arguments[0];
			var target = arguments[1];
			view = tmpl;
			if(Util.isString(tmpl))
				view = this.viewProvider.newInstance(tmpl,target);
			else{
				view.__placeholder = view.__target = target;
			}
		}else{
			view = element;
			if(Util.isDOM(element)){
				view = new View(element,null,[element]);
			}
		}
		
		var rs = new this.baseClass(view);

		var props = arguments[2];
		if(props){
			Util.ext(rs,props);
		}

		if(rs.events){
			for(var k in rs.events){
				rs.on(k,rs.events[k]);
			}
		}
		
		return rs;
	},
	/**
	 * 创建指定类型组件实例
	 * @param  {String} type       		组件类型
	 * @param  {HTMLElement} target  	组件应用节点
	 * @param  {HTMLElement} placeholder 用于替换组件的占位符
	 * @return {Component}            
	 */
	newInstanceOf : function(type,target,placeholder){
		if(!this.types[type])return null;

		var rs = new this.types[type].clazz(this.baseClass);
		rs.name = type;
		rs.view = new View(null,target,null,placeholder);
		var data = this.types[type].data;
		if(typeof data == 'string'){
			rs.__url = data;
		}

		this._super.createCbk.call(this,rs,type);

		return rs;
	},
	initInstanceOf : function(ins){
		var type = ins.name;
		if(!this.types[type])return null;
		
		Util.ext(ins,this.types[type].props);
		var data = this.types[type].data;
		if(data){
			Util.ext(ins.data,data);
		}

		if(ins.events){
			for(var k in ins.events){
				ins.on(k,ins.events[k]);
			}
		}
	}
});

var ComponentFactory = new _ComponentFactory(DOMViewProvider);