/**
 * 指令扩展
 */
;!function(impex){
	///////////////////// 事件指令 /////////////////////

    /**
     * 鼠标移出视图指令，包含子视图
     * <br/>使用方式：<div x-mouseleave="fn() + fx()"></div>
     */
    impex.directive('mouseleave',{
        onInit : function(){
        	var currentTarget = this.el;
            this.on('mouseout',this.value,function(e,origin){
            	var target = e.target;

            	if(!contains(currentTarget,target))return false;

            	var toElement = e.toElement || e.relatedTarget;
            	if(contains(currentTarget,toElement))return false;
            	
            	return origin;
            });
        }
    });

    function contains(a,b){
    	if(a.contains){
    		return a.contains(b);
    	}
    	do{
    		if(a == b)return true;
    		b = b.parentNode;
    	}while(b && b.tagName != 'BODY');
    	return false;
    }


    /**
     * 鼠标滚动视图指令，不包含子视图
     * <br/>使用方式：<div x-mousewheel="fn() + fx()"></div>
     */
    impex.directive('mousewheel',{
        onInit : function(){
            var type = document.body.onmousewheel == null?'mousewheel':'DOMMouseScroll';
            this.on(type,this.value);
        }
    });
}(impex);