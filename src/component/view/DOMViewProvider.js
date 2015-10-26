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
		if(!compiler.children[0])return null;
		var tmp = compiler.removeChild(compiler.children[0]);

		var view = new View(tmp,tmp.tagName.toLowerCase(),target);

		return view;
	}

	var headEl = ['meta','title','base'];
	this.compile = function(template){
		compiler.innerHTML = template;
		if(!compiler.children[0])return null;
		while(compiler.children.length>0){
			var tmp = compiler.removeChild(compiler.children[0]);
			var tn = tmp.tagName.toLowerCase();
			if(headEl.indexOf(tn) > -1)continue;
			
			return tmp;
		}
		
	}
}