/**
 * 移动端指令扩展
 */
;!function(impex){
	///////////////////// 事件指令 /////////////////////


    /**
     * 注册tap事件。
     * <br/>使用方式：<div :tap="hello()"></div>
     */
    impex.events.register('tap',function(target,callback){
        target.__impex_data_callback = callback;
        target.__impex_hook_touchstart = function(e){
            
            var t = e.target;
            t.__impex_data_isMoved = false;

            t.__impex_hook_touchmove = function(e){
                var t = e.target;
                t.__impex_data_isMoved = true;
            };
            t.__impex_hook_touchend = function(e){
                var t = e.target;
                if(t.__impex_data_isMoved === false && t.__impex_data_callback){
                    t.__impex_data_callback(e);
                }
                document.removeEventListener('touchmove',t.__impex_hook_touchmove,false);
                document.removeEventListener('touchend',t.__impex_hook_touchend,false);
                document.removeEventListener('touchcancel',t.__impex_hook_touchend,false);
                t.__impex_hook_touchmove = null;
                t.__impex_hook_touchend = null;
            };
            document.addEventListener('touchmove',t.__impex_hook_touchmove,false);
            document.addEventListener('touchend',t.__impex_hook_touchend,false);
            document.addEventListener('touchcancel',t.__impex_hook_touchend,false);
        };
        
        target.addEventListener('touchstart',target.__impex_hook_touchstart,false);
    },function(target){
        target.removeEventListener('touchstart',target.__impex_hook_touchstart,false);
    });
}(impex);