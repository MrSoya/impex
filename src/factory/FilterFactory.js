/**
 * 过滤器工厂
 */
function _FilterFactory(){
	Factory.call(this,Filter);
}
Util.inherits(_FilterFactory,Factory);
Util.ext(_FilterFactory.prototype,{
	newInstanceOf : function(type,component){
		if(!this.types[type])return null;

		var rs = new this.types[type].clazz(this.baseClass,component);
		Util.extProp(rs,this.types[type].props);

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

var FilterFactory = new _FilterFactory();