/**
 * 工厂基类
 */
function Factory(clazz) {
	this.types = {};
	this.instances = [];

	this.baseClass = clazz;//基类
}
Factory.prototype = {
	/**
	 * 注册子类
	 */
	register : function(type,model,services){
		type = type.toLowerCase();

		//keywords check
		var ks = Object.keys(model);
		for(var i=BUILD_IN_PROPS.length;i--;){
			if(ks.indexOf(BUILD_IN_PROPS[i])>-1){
				impex.console.error('attempt to overwrite build-in property['+BUILD_IN_PROPS[i]+'] of Component['+type+']');
				return;
			}
		}

		var clazz = new Function("clazz","var args=[];for(var i=1;i<arguments.length;i++)args.push(arguments[i]);clazz.apply(this,args)");

		var props = {};
		Util.extProp(props,model);

		Util.inherits(clazz,this.baseClass);

		Util.extMethod(clazz.prototype,model);

		this.types[type] = {clazz:clazz,props:props,services:services};
	},
	/**
	 * 是否存在指定类型
	 * @return {Boolean} 
	 */
	hasTypeOf : function(type){
		return type in this.types;
	}
}