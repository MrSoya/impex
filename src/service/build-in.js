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
impex.service('ComponentManager',new function(){
	/**
	 * 是否存在指定类型的组件
	 * @return {Boolean} 
	 */
    this.hasTypeOf = function(type){
    	return ComponentFactory.hasTypeOf(type);
    }
    /**
     * 查询当前运行时所有符合条件的组件
     * @param  {Object} conditions 条件对象
     * @return {Array}  结果数组
     */
    this.findAll = function(conditions){
    	var ins = ComponentFactory.instances;
    	var rs = [];
    	for(var i=ins.length;i--;){
    		var matchAll = true;
			for(var k in conditions){
				if(comp[k] != conditions[k]){
					matchAll = false;
					break;
				}
			}
			if(matchAll){
				rs.push(comp);
			}
    	}
    	return rs;
    }
});