/**
 * 转换器工厂
 */
function _ConverterFactory(){
	Factory.call(this,Converter);
}
Util.inherits(_ConverterFactory,Factory);
Util.ext(_ConverterFactory.prototype,{
	newInstanceOf : function(type,component){
		if(!this.types[type])return null;

		var rs = new this.types[type].clazz(this.baseClass,component);
		Util.extProp(rs,this.types[type].props);

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

var ConverterFactory = new _ConverterFactory();