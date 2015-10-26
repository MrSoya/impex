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
		if(arguments.length == 2){
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
				view = new View(element,element.tagName.toLowerCase());
			}
		}
		
		var rs = new this.baseClass(view);
		this.instances.push(rs);

		//inject
		var services = null;
		if(this.services){
			services = [];
			for(var i=0;i<this.services.length;i++){
				var serv = ServiceFactory.newInstanceOf(this.services[i]);
				services.push(serv);
			}
		}
		rs.onCreate && rs.onCreate.apply(rs,services);
		
		return rs;
	},
	/**
	 * 创建指定类型组件实例
	 */
	newInstanceOf : function(type,target){
		if(!this.types[type])return null;

		var rs = new this.types[type].clazz(this.baseClass);
		Util.extProp(rs,this.types[type].props);

		rs.$view = new View(null,null,target);
		
		this.instances.push(rs);

		//inject
		var services = null;
		if(this.services){
			services = [];
			for(var i=0;i<this.services.length;i++){
				var serv = ServiceFactory.newInstanceOf(this.services[i]);
				services.push(serv);
			}
		}
		rs.onCreate && rs.onCreate.apply(rs,services);

		return rs;
	}
});



var ComponentFactory = new _ComponentFactory(DOMViewProvider);