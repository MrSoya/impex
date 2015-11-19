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
		var targetV = targetView.elements[0],
			newV = newView.elements[0],
			p = targetView.elements[0].parentNode;
		var fragment = newV;
		if(newView.elements.length > 1){
			fragment = document.createDocumentFragment();
			for(var i=0;i<newView.elements.length;i++){
				fragment.appendChild(newView.elements[i]);
			}
		}
		if(targetView.elements.length > 1){
			p.insertBefore(fragment,targetV);
			
			for(var i=targetView.elements.length;i--;){
				p.removeChild(targetView.elements[i]);
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
		var targetV = targetView.elements[0],
			newV = newView.elements[0],
			p = targetView.elements[0].parentNode;
		var fragment = newV;
		if(newView.elements.length > 1){
			fragment = document.createDocumentFragment();
			for(var i=0;i<newView.elements.length;i++){
				fragment.appendChild(newView.elements[i]);
			}
		}
		p.insertBefore(fragment,targetV);
	}

	/**
	 * 在指定视图后插入视图
	 * @param  {View} newView 新视图
	 * @param  {View} targetView 目标视图
	 */
	this.insertAfter = function(newView,targetView){
		var targetV = targetView.elements[0],
			newV = newView.elements[0],
			p = targetView.elements[0].parentNode;
		var last = p.lastChild;
		var fragment = newV;
		if(newView.elements.length > 1){
			fragment = document.createDocumentFragment();
			for(var i=0;i<newView.elements.length;i++){
				fragment.appendChild(newView.elements[i]);
			}
		}

		if(last == targetV){
			p.appendChild(fragment);
		}else{
			var next = targetView.elements[targetView.elements.length-1].nextSibling;
			p.insertBefore(fragment,next);
		}
	}

	/**
	 * 创建一个占位视图
	 * <br/>在DOM中表现为注释元素
	 * @param  {string} content 占位内容
	 * @return {View} 新视图
	 */
	this.createPlaceholder = function(content){
		return new View([document.createComment(content)]);
	}
}