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
		Util.ext(rs,this.types[type].props);

		this._super.createCbk.call(this,rs,type);

		return rs;
	}
});

var FilterFactory = new _FilterFactory();