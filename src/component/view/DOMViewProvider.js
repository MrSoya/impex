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

	this.compile = function(template,target){
		var nodes = [];
		if(!target.insertAdjacentHTML){
			var span = document.createElement('span');
			span.style.display = 'none';
			target.parentNode.insertBefore(span,target);
			target.parentNode.removeChild(target);
			target = span;
		}
		target.insertAdjacentHTML('beforebegin', '<!-- c -->');
		var start = target.previousSibling;
		target.insertAdjacentHTML('afterend', '<!-- c -->');
		var end = target.nextSibling;
		target.insertAdjacentHTML('afterend', template);

		target.parentNode.removeChild(target);

		var next = start.nextSibling;
		while(next !== end){
			if(next.nodeType === 3){
				var v = next.nodeValue.replace(/\s/mg,'');
				if(v === ''){
					next = next.nextSibling;
					continue;
				}
			}
			nodes.push(next);
			next = next.nextSibling;
		}
		start.parentNode.removeChild(start);
		end.parentNode.removeChild(end);

		return nodes;
	}
}