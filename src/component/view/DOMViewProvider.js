/**
 * DOM视图构建器
 */
var DOMViewProvider = new function(){
	/**
	 * 构造一个视图实例
	 * @return this
	 */
	this.newInstance = function(template,target){
		var compiler = document.createElement('div');
		compiler.innerHTML = template;
		if(!compiler.children[0])return null;
		var tmp = compiler.removeChild(compiler.children[0]);

		var view = new View(tmp,tmp.tagName.toLowerCase(),target);

		return view;
	}
}