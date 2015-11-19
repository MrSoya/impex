/**
 * 指令工厂
 */
function _DirectiveFactory(){
	Factory.call(this,Directive);
}
Util.inherits(_DirectiveFactory,Factory);
Util.ext(_DirectiveFactory.prototype,{
	/**
	 * 检查指定类型指令是否为终结指令
	 * @param  {string}  type 指令名
	 * @return {Boolean} 
	 */
	isFinal : function(type){
		return !!this.types[type].props.$final;
	},
	/**
	 * 获取指定类型指令的范围结束标记
	 * @param  {[type]}  type 指令名
	 * @return {string} 
	 */
	hasEndTag : function(type){
		return this.types[type].props.$endTag;
	},
	newInstanceOf : function(type,nodes,component,attrName,attrValue){
		if(!this.types[type])return null;

		var rs = new this.types[type].clazz(this.baseClass,attrName,attrValue,component);
		Util.extProp(rs,this.types[type].props);

		if(nodes[0].__impex__view){
			rs.$view = nodes[0].__impex__view;
		}else{
			rs.$view = new View(nodes);
			nodes[0].__impex__view = rs.$view;
		}
		
		//inject
		var services = null;
		if(this.types[type].services){
			services = [];
			for(var i=0;i<this.types[type].services.length;i++){
				var serv = ServiceFactory.newInstanceOf(this.types[type].services[i]);
				services.push(serv);
			}
		}
		component.add(rs);

		rs.onCreate && (services?rs.onCreate.apply(rs,services):rs.onCreate());

		this.instances.push(rs);
		return rs;
	}
});

var DirectiveFactory = new _DirectiveFactory();