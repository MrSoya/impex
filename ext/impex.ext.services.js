/**
 * 服务扩展
 */
;!function(impex){
	///////////////////// 消息服务 /////////////////////
    var messageMap = {};
    impex.service('imsg',{
        //发送消息
        pub:function(){
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
        },
        //订阅消息
        sub:function(channel,handler){
            if(!messageMap[channel]){
                messageMap[channel] = [];
            }
            messageMap[channel].push([this.host,handler]);
        }
    });
}(impex);