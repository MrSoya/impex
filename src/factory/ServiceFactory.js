/**
 * 服务工厂
 */
function _ServiceFactory(){
	Factory.call(this,Service);
}
Util.inherits(_ServiceFactory,Factory);
Util.ext(_ServiceFactory.prototype,{
	newInstanceOf : function(type){
		type = type.toLowerCase();
		if(!this.types[type])return null;

		if(this.types[type].props.$singleton){
			if(!this.types[type].singleton){
				this.types[type].singleton = new this.types[type].clazz(this.baseClass);
			}
			return this.types[type].singleton;
		}

		var rs = new this.types[type].clazz(this.baseClass);
		Util.extProp(rs,this.types[type].props);

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

		this.instances.push(rs);
		return rs;
	}
});

var ServiceFactory = new _ServiceFactory();