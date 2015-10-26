/**
 * 提供视图操作
 */
var ViewManager = new function (){
	this.$singleton = true;
    /**
     * 替换视图，会把旧视图更新为新视图
     * <br/>在DOM中表现为更新元素
     * @param  {View} newView 新视图
     * @param  {View} oldView 旧视图
     */
	this.replace = function(newView,oldView){
		var oldNode = oldView instanceof View?oldView.element:oldView;
		var newNode = newView instanceof View?newView.element:newView;
		var pNode = oldNode.parentNode;
		if(pNode)
			pNode.replaceChild(newNode,oldNode);
	}
	/**
	 * 在指定视图前插入一个或一组视图
	 * @param  {View | Array} newView 新视图
	 * @param  {View} targetView 目标视图
	 */
	this.insertBefore = function(newView,targetView){
		var targetNode = targetView instanceof View?targetView.element:targetView;
		var newNode = newView instanceof View?newView.element:newView;
		targetNode.parentNode.insertBefore(newNode,targetNode);
	}

	/**
	 * 在指定视图后插入一个或一组视图
	 * @param  {View | Array} newView 新视图
	 * @param  {View} targetView 目标视图
	 */
	this.insertAfter = function(newView,targetView){
		var targetNode = targetView instanceof View?targetView.element:targetView;
		var newNode = newView instanceof View?newView.element:newView;

		var p = targetNode.parentNode;
		var last = p.lastChild;
		if(last == targetNode){
			p.appendChild(newNode);
		}else{
			p.insertBefore(newNode,targetNode.nextSibling);
		}
	}

	/**
	 * 创建一个占位视图
	 * <br/>在DOM中表现为注释元素
	 * @param  {string} content 占位内容
	 * @return {View} 新视图
	 */
	this.createPlaceholder = function(content){
		return new View(document.createComment(content));
	}
}