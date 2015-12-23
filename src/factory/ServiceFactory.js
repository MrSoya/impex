/**
 * 服务工厂
 */
function _ServiceFactory(){
	Factory.call(this,Service);
}
Util.inherits(_ServiceFactory,Factory);
Util.ext(_ServiceFactory.prototype,{
	newInstanceOf : function(type,host){
		type = type.toLowerCase();
		if(!this.types[type])return null;

		var rs = null;
		if(this.types[type].props.$singleton){
			if(!this.types[type].singleton){
				this.types[type].singleton = new this.types[type].clazz(this.baseClass);
			}
			rs = this.types[type].singleton;
		}else{
			rs = new this.types[type].clazz(this.baseClass);
			Util.extProp(rs,this.types[type].props);
		}

		rs.$host = host;

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

var ServiceFactory = new _ServiceFactory();