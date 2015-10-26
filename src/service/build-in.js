/**
 * 内建服务，提供基础操作接口
 */

/**
 * 视图管理服务提供额外的视图操作，可以用在指令或组件中。
 * 使用该服务，只需要注入即可
 */
impex.service('ViewManager',ViewManager);

/**
 * 组件管理服务提供对组件的额外操作
 * 使用该服务，只需要注入即可
 */
impex.service('ComponentManager',function(){
    /**
     * 替换视图，会把旧视图更新为新视图
     * <br/>在DOM中表现为更新元素
     * @param  {View} newView 新视图
     * @param  {View} oldView 旧视图
     */
	this.newInstance = function(view,model){
		
	}
});