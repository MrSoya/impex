/**
 * 组件工厂用于统一管理系统内所有组件实例
 */
function _ComponentFactory(viewProvider){
	Factory.call(this,Component);

	this.viewProvider = viewProvider;
}
Util.inherits(_ComponentFactory,Factory);
Util.ext(_ComponentFactory.prototype,{
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
		this.instances.push(rs);

		var props = arguments[2];
		var svs = arguments[3];
		if(props){
			//keywords check
			for(var i=BUILD_IN_PROPS.length;i--;){
				if(BUILD_IN_PROPS[i] in props){
					impex.console.error('attempt to overwrite build-in property['+BUILD_IN_PROPS[i]+'] of Component');
					return;
				}
			}
			Util.ext(rs,props);
		}

		if(Util.isArray(svs)){
			//inject
			var services = [];
			for(var i=0;i<svs.length;i++){
				var serv = ServiceFactory.newInstanceOf(svs[i],rs);
				services.push(serv);
			}
			
			rs.onCreate && rs.onCreate.apply(rs,services);
		}else{
			rs.onCreate && rs.onCreate();
		}
		
		return rs;
	},
	/**
	 * 创建指定类型组件实例
	 */
	newInstanceOf : function(type,target){
		if(!this.types[type])return null;

		var rs = new this.types[type].clazz(this.baseClass);
		Util.extProp(rs,this.types[type].props);

		rs.$view = new View(null,target);
		rs.$name = type;
		
		this.instances.push(rs);

		//inject
		var services = null;
		if(this.types[type].services){
			services = [];
			for(var i=0;i<this.types[type].services.length;i++){
				var serv = ServiceFactory.newInstanceOf(this.types[type].services[i],rs);
				services.push(serv);
			}
		}
		rs.onCreate && rs.onCreate.apply(rs,services);

		return rs;
	}
});



var ComponentFactory = new _ComponentFactory(DOMViewProvider);