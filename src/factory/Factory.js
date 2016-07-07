/**
 * 工厂基类
 */
function Factory(clazz) {
	this.types = {};

	this.baseClass = clazz;//基类
};
Factory.prototype = {
	/**
	 * 注册子类
	 */
	register : function(type,param,services){
		type = type.toLowerCase();

		var clazz = new Function("clazz","var args=[];for(var i=1;i<arguments.length;i++)args.push(arguments[i]);clazz.apply(this,args)");

		var props = {};
		Util.ext(props,param);

		Util.inherits(clazz,this.baseClass);

		if(param.methods){
			for(var k in param.methods){
				clazz.prototype[METHOD_PREFIX + k] = param.methods[k];
			}
		}

		this.types[type] = {clazz:clazz,props:props,services:services};
	},
	/**
	 * 是否存在指定类型
	 * @return {Boolean} 
	 */
	hasTypeOf : function(type){
		return type in this.types;
	},
	//子类调用
	createCbk : function(comp,type){
		if(comp.onCreate){
			//inject
			var services = null;
			if(this.types[type].services){
				services = [];
				for(var i=0;i<this.types[type].services.length;i++){
					var serv = ServiceFactory.newInstanceOf(this.types[type].services[i],comp);
					services.push(serv);
				}
			}
			
			services ? comp.onCreate.apply(comp,services) : comp.onCreate();
		}
	}
}