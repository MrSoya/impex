/**
 * 内建服务，提供基础操作接口
 */

/**
 * 视图管理服务提供额外的视图操作，可以用在指令或组件中。
 * 使用该服务，只需要注入即可
 */
impex.service('DOMHelper',DOMHelper);


/**
 * 组件管理服务提供对组件的额外操作
 * 使用该服务，只需要注入即可
 */
impex.service('ComponentManager',{
	/**
	 * 是否存在指定类型的组件
	 * @return {Boolean} 
	 */
    hasTypeOf : function(type){
    	return ComponentFactory.hasTypeOf(type);
    }
});

/**
 * 组件管理服务提供对组件的额外操作
 * 使用该服务，只需要注入即可
 */
impex.service('Transitions',new function(){
	var transitionObjs = [];
	this.get = function(type,component){
		type = type||'x';
		return TransitionFactory.get(type,component);
	}
});