/**
 * DOM助手
 */
var DOMHelper = new function(){
	this.singleton = true;
	var compiler = document.createElement('div');

	this.compile = function(template){
		var nodes = [];
		compiler.innerHTML = template;

		while(compiler.childNodes.length>0){
			var tmp = compiler.removeChild(compiler.childNodes[0]);
			nodes.push(tmp);
		}

		return nodes;
	}

	this.detach = function(nodes){
		var p = nodes[0].parentNode;
		if(p){
			for(var i=nodes.length;i--;){
				nodes[i].parentNode && p.removeChild(nodes[i]);
			}
		}
	}

	this.attach = function(target,nodes){
		var fragment = null;
		if(nodes.length > 1){
			fragment = document.createDocumentFragment();
			for(var i=0;i<nodes.length;i++){
				fragment.appendChild(nodes[i]);
			}
		}else{
			fragment = nodes[0];
		}
		
		target.appendChild(fragment);
		fragment = null;
	}

	this.replace = function(target,nodes){
		var fragment = null;
		if(nodes.length > 1){
			fragment = document.createDocumentFragment();
			for(var i=0;i<nodes.length;i++){
				fragment.appendChild(nodes[i]);
			}
		}else{
			fragment = nodes[0];
		}
		
		target.parentNode.replaceChild(fragment,target);
		fragment = null;
	}

	this.insertBefore = function(nodes,target){
		var p = target.parentNode;
		var fragment = nodes[0];
		if(nodes.length > 1){
			fragment = document.createDocumentFragment();
			for(var i=0;i<nodes.length;i++){
				fragment.appendChild(nodes[i]);
			}
		}
		if(p)
		p.insertBefore(fragment,target);
	}
}