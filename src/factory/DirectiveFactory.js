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
	priority : function(type){
		return this.types[type].props.priority;
	},
	/**
	 * 创建一个指令实例，并把实例放入指定的域中
	 * @param  {String} type      指令类型
	 * @param  {HTMLElement} node 指令作用的元素对象
	 * @param  {Component} component 指令所在域
	 * @param  {String} attrName  完整属性名
	 * @param  {String} attrValue 指令的字面value
	 * @return {Directive}  指令实例
	 */
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

		rs.el = node,rs.__nodes = [node];
		if(node.tagName === 'TEMPLATE'){
			var c = [];
			var p = node,children = node.childNodes;
			if(node.content && node.content.nodeType===11){
				p = node.content;
				children = p.childNodes;
			}
			while(children.length){
				var child = p.removeChild(children[0]);
				if(child.nodeType===3 && child.nodeValue.trim().length<1)continue;
				
				c.push(child);
			}
			rs.__nodes = c;
		}

		if(params){
			rs.params = params;
		}
		if(filter){
			rs.filter = filter;
		}

		component.directives.push(rs);
		rs.component = component;

		if(node.tagName !== 'TEMPLATE')
			rs.__nodes[0].removeAttribute(rs.name);
		
		this._super.createCbk.call(this,rs,type);

		return rs;
	}
});

var DirectiveFactory = new _DirectiveFactory();