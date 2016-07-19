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
				view.__target = target;
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

		if(rs.methods){
			for(var k in rs.methods){
				if(rs.methods[k] instanceof Function)
					rs[METHOD_PREFIX + k] = rs.methods[k].bind(rs);
			}
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
	 */
	newInstanceOf : function(type,target){
		if(!this.types[type])return null;

		var rs = null;
		var cache = im_compCache[type];
		if(CACHEABLE && cache && cache.length>0){
			rs = cache.pop();
		}else{
			rs = new this.types[type].clazz(this.baseClass);
			Util.ext(rs,this.types[type].props);
			var data = this.types[type].data;
			if(data){
				Util.ext(rs.data,data);
			}
			rs.name = type;
		}

		rs.view = new View(null,target);

		if(rs.events){
			for(var k in rs.events){
				rs.on(k,rs.events[k]);
			}
		}

		this._super.createCbk.call(this,rs,type);

		return rs;
	}
});

var ComponentFactory = new _ComponentFactory(DOMViewProvider);