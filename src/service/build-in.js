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

impex.service('Msg',new function(){
	var messageMap = {};
    //发送消息
    this.pub = function(){
        var channel = arguments[0];
        var params = [this.host];
        for (var i =1 ; i < arguments.length; i++) {
            params.push(arguments[i]);
        }
        setTimeout(function(){
            if(messageMap[channel]){
                var mq = messageMap[channel];
                if(mq)
                for(var i=0;i<mq.length;i++){
                    var suber = mq[i];
                    suber[1].apply(suber[0],params);
                }
            }
        },0);
    }
    //订阅消息
    this.sub = function(channel,handler){
        if(!messageMap[channel]){
            messageMap[channel] = [];
        }
        messageMap[channel].push([this.host,handler]);
    }
});