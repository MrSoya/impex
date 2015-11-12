/**
 * DOM视图构建器
 */
var DOMViewProvider = new function(){
	var compiler = document.createElement('div');
		
	/**
	 * 构造一个视图实例
	 * @return this
	 */
	this.newInstance = function(template,target){
		compiler.innerHTML = template;
		if(!compiler.childNodes[0])return null;
		var nodes = [];
		while(compiler.childNodes.length>0){
			var tmp = compiler.removeChild(compiler.childNodes[0]);
			nodes.push(tmp);
		}

		var view = new View(nodes,null,target);

		return view;
	}

	var headEl = ['meta','title','base'];
	this.compile = function(template){
		compiler.innerHTML = template;
		if(!compiler.children[0])return null;
		var nodes = [];
		while(compiler.children.length>0){
			var tmp = compiler.removeChild(compiler.children[0]);
			var tn = tmp.nodeName.toLowerCase();
			if(headEl.indexOf(tn) > -1)continue;

			nodes.push(tmp);
			
			// return tmp;
		}
		return nodes;
	}
}