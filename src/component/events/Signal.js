/**
 * 信号类用来实现impex内部的消息系统
 * @class Signal
 */
function Signal(data){
    if(data)Util.ext(this,data);
    this.__signalMap = {};
}
Signal.prototype = {
    /**
     * 监听信号。支持原生事件类型或自定义事件类型。<br/>
     * 如果同一个事件类型两者都有，自定义事件会优先绑定
     * @param  {String} type 信号类型,多个类型使用空格分割
     * @param {String | Function} exp 自定义函数表达式，比如  fn(x+1) 。或者回调函数，回调参数e
     * @param {Object} context 参数/回调函数所属上下文。可以是组件、指令或者任何对象
     * @see impex.events
     */
    on:function(type,exp,context){
        var ts = type.replace(/\s+/mg,' ').split(' ');
        for(var i=ts.length;i--;){
            var t = ts[i];
            var listeners = this.__signalMap[t];
            if(!listeners)listeners = this.__signalMap[t] = [];
            var comp = this instanceof Component?this:this.component;
            var meta = {
                id:Date.now() + Math.random(),
                el:this.el,
                exp:exp,
                comp:comp,
                context:context||this
            }
            listeners.push(meta);

            //查找
            var isDefault = true;
            for(var l=DISPATCHERS.length;l--;){
                var events = DISPATCHERS[l][0];
                if(events.indexOf(t) > -1){
                    isDefault = false;
                    break;
                }
            }

            if(isDefault){
                Handler.addDefaultEvent(t,meta);
            }else{
                DISPATCHERS[l][1].addEvent(t,meta);
                DISPATCHERS[l][1].onInit();
            }
        }//end for
        
    },
    /**
     * 解除信号监听<br/>
     * @param  {String} type 信号类型,多个类型使用空格分割
     * @param {String | Function} exp 自定义函数表达式，比如  fn(x+1) 。或者回调函数，回调参数e
     * @param {Object} context 参数/回调函数所属上下文。可以是组件、指令或者任何对象
     * @see impex.events
     */
    off:function(type,exp,context){
        context = context||this;

        var types = null;
        if(!type){
            types = Object.keys(this.__signalMap);
        }else{
            types = type.replace(/\s+/mg,' ').split(' ');
        }

        for(var i=types.length;i--;){
            var listeners = this.__signalMap[types[i]];
            if(listeners){
                var toDel = [];
                for(var j=listeners.length;j--;){
                    if(context === listeners[j].context && 
                        (exp?listeners[j].exp === exp:true)){
                        toDel.push(listeners[j]);
                    }
                }
                toDel.forEach(function(meta){
                    var index = listeners.indexOf(meta);
                    listeners.splice(index,1);

                    //del defautl
                    Handler.removeDefaultEvent(type,meta);

                    //del custom
                    if(meta.dispatcher)
                        meta.dispatcher._delEvent(type,meta);
                });
            }
        }
    },
    //type
    emit:function(){
        var type = arguments[0];
        var listeners = this.__signalMap[type];
        if(!listeners)return;

        var params = [];
        for(var i=1;i<arguments.length;i++){
            params.push(arguments[i]);
        }

        listeners.forEach(function(meta){
            Handler.emitEventExp(meta,type,params);
        });
    }
}