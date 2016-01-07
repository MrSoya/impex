/**
 * 提供视图操作
 */
var ViewManager = new function (){
	this.$singleton = true;
    /**
     * 替换视图，会把目标视图更新为新视图
     * <br/>在DOM中表现为更新元素
     * @param  {View} newView 新视图
     * @param  {View} targetView 目标视图
     */
	this.replace = function(newView,targetView){
		var targetV = targetView.__nodes[0],
			newV = newView.__nodes[0],
			p = targetView.__nodes[0].parentNode;
		var fragment = newV;
		if(newView.__nodes.length > 1){
			fragment = document.createDocumentFragment();
			for(var i=0;i<newView.__nodes.length;i++){
				fragment.appendChild(newView.__nodes[i]);
			}
		}
		if(targetView.__nodes.length > 1){
			p.insertBefore(fragment,targetV);
			
			for(var i=targetView.__nodes.length;i--;){
				p.removeChild(targetView.__nodes[i]);
			}
		}else{
			p.replaceChild(fragment,targetV);
		}
		
	}
	/**
	 * 在指定视图前插入视图
	 * @param  {View} newView 新视图
	 * @param  {View} targetView 目标视图
	 */
	this.insertBefore = function(newView,targetView){
		var targetV = targetView.__nodes[0],
			newV = newView.__nodes[0],
			p = targetView.__nodes[0].parentNode;
		var fragment = newV;
		if(newView.__nodes.length > 1){
			fragment = document.createDocumentFragment();
			for(var i=0;i<newView.__nodes.length;i++){
				fragment.appendChild(newView.__nodes[i]);
			}
		}
		if(p)
		p.insertBefore(fragment,targetV);
	}

	/**
	 * 在指定视图后插入视图
	 * @param  {View} newView 新视图
	 * @param  {View} targetView 目标视图
	 */
	this.insertAfter = function(newView,targetView){
		var targetV = targetView.__nodes[0],
			newV = newView.__nodes[0],
			p = targetView.__nodes[0].parentNode;
		var last = p.lastChild;
		var fragment = newV;
		if(newView.__nodes.length > 1){
			fragment = document.createDocumentFragment();
			for(var i=0;i<newView.__nodes.length;i++){
				fragment.appendChild(newView.__nodes[i]);
			}
		}

		if(last == targetV){
			p.appendChild(fragment);
		}else{
			var next = targetView.__nodes[targetView.__nodes.length-1].nextSibling;
			p.insertBefore(fragment,next);
		}
	}

	/**
	 * 在指定视图内插入视图，并插入到最后位置
	 * @param  {View} newView 新视图
	 * @param  {View} targetView 目标视图
	 */
	this.append = function(newView,targetView){
		var newV = newView.__nodes[0],
			p = targetView.__nodes[0];
		var fragment = newV;
		if(newView.__nodes.length > 1){
			fragment = document.createDocumentFragment();
			for(var i=0;i<newView.__nodes.length;i++){
				fragment.appendChild(newView.__nodes[i]);
			}
		}

		p.appendChild(fragment);
	}

	/**
	 * 在指定视图内插入视图，并插入到最前位置
	 * @param  {View} newView 新视图
	 * @param  {View} targetView 目标视图
	 */
	this.prepend = function(newView,targetView){
		var newV = newView.__nodes[0],
			p = targetView.__nodes[0];
		var fragment = newV;
		if(newView.__nodes.length > 1){
			fragment = document.createDocumentFragment();
			for(var i=0;i<newView.__nodes.length;i++){
				fragment.appendChild(newView.__nodes[i]);
			}
		}

		p.insertBefore(fragment,p.firstChild);
	}

	/**
	 * 创建一个占位视图
	 * <br/>在DOM中表现为注释元素
	 * @param  {string} content 占位内容
	 * @return {View} 新视图
	 */
	this.createPlaceholder = function(content){
		return new View(null,null,[document.createComment(content)]);
	}
}