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
		return this.types[type].props['$restrict'];
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
				view = new View([element]);
			}
		}
		
		var rs = new this.baseClass(view);

		var props = arguments[2];
		if(props){
			//keywords check
			var ks = Object.keys(props);
			for(var i=BUILD_IN_PROPS.length;i--;){
				if(ks.indexOf(BUILD_IN_PROPS[i])>-1){
					LOGGER.error('attempt to overwrite build-in property['+BUILD_IN_PROPS[i]+'] of Component');
					return;
				}
			}
			Util.ext(rs,props);
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
			Util.extProp(rs,this.types[type].props);
			rs.$name = type;
		}

		rs.$view = new View(null,target);
		
		if(rs.onCreate){
			//inject
			var services = null;
			if(this.types[type].services){
				services = [];
				for(var i=0;i<this.types[type].services.length;i++){
					var serv = ServiceFactory.newInstanceOf(this.types[type].services[i],rs);
					services.push(serv);
				}
			}

			services ? rs.onCreate.apply(rs,services) : rs.onCreate();
		}

		return rs;
	}
});



var ComponentFactory = new _ComponentFactory(DOMViewProvider);