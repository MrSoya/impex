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
		return !!this.types[type].props.final;
	},
	/**
	 * 获取指定类型指令的范围结束标记
	 * @param  {[type]}  type 指令名
	 * @return {string} 
	 */
	hasEndTag : function(type){
		return this.types[type].props.endTag;
	},
	priority : function(type){
		return this.types[type].props.priority;
	},
	newInstanceOf : function(type,node,component,attrName,attrValue){
		if(!this.types[type])return null;

		var params = null;
		var filter = null;
		var i = attrName.indexOf(CMD_PARAM_DELIMITER);
		if(i > -1){
			params = attrName.substr(i+1);
			var fi = params.indexOf(CMD_FILTER_DELIMITER);
			if(fi > -1){
				filter = params.substr(fi+1);
				params = params.substring(0,fi);
			}

			params = params.split(CMD_PARAM_DELIMITER);
		}

		var rs = new this.types[type].clazz(this.baseClass,attrName,attrValue,component);
		Util.ext(rs,this.types[type].props);

		if(node.__impex__view){
			rs.view = node.__impex__view;
		}else{
			var el = node,nodes = [node];
			if(Util.isArray(node)){
				nodes = node;
				el = node.length>1?null:node[0];
			}
			rs.view = new View(el,null,nodes);
			node.__impex__view = rs.view;
		}

		if(params){
			rs.params = params;
		}
		if(filter){
			rs.filter = filter;
		}

		rs.view.__comp = rs;

		component.add(rs);

		if(rs.view){
			rs.view.__nodes[0].removeAttribute(rs.name);
			if(rs.endTag){
                var lastNode = rs.view.__nodes[rs.view.__nodes.length-1];
                lastNode.removeAttribute(CMD_PREFIX+rs.endTag);
            }
		}

		if(rs.events){
			for(var k in rs.events){
				rs.on(k,rs.events[k]);
			}
		}
		
		this._super.createCbk.call(this,rs,type);

		return rs;
	}
});

var DirectiveFactory = new _DirectiveFactory();