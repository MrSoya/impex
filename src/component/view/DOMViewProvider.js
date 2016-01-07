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
		if(template === ''){
			return new View(null,target,[document.createTextNode('')]);
		}
		compiler.innerHTML = template;
		if(!compiler.childNodes[0])return null;
		var nodes = [];
		while(compiler.childNodes.length>0){
			var tmp = compiler.removeChild(compiler.childNodes[0]);
			nodes.push(tmp);
		}

		var view = new View(null,target,nodes);

		return view;
	}

	this.compile = function(template){
		compiler.innerHTML = template;

		var nodes = [];
		while(compiler.childNodes.length>0){
			var tmp = compiler.removeChild(compiler.childNodes[0]);
			var tn = tmp.nodeName.toLowerCase();

			nodes.push(tmp);
		}
		return nodes;
	}
}