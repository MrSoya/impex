/**
 * 指令扩展
 */
;!function(impex){

	///////////////////// 事件指令 /////////////////////
    /**
     * 视图点击指令
     * <br/>使用方式：<div x-click="fn() + fx()"></div>
     */
    impex.directive('click',{
        onInit : function(){
            this.on('click',this.$value);
        }
    });
    /**
     * 鼠标移入视图指令，不包含子视图
     * <br/>使用方式：<div x-mouseover="fn() + fx()"></div>
     */
    impex.directive('mouseover',{
        onInit : function(){
            this.on('mouseover',this.$value);
        }
    });
    /**
     * 鼠标移出视图指令，不包含子视图
     * <br/>使用方式：<div x-mouseout="fn() + fx()"></div>
     */
    impex.directive('mouseout',{
        onInit : function(){
            this.on('mouseout',this.$value);
        }
    });
    /**
     * 鼠标按下视图指令，不包含子视图
     * <br/>使用方式：<div x-mousedown="fn() + fx()"></div>
     */
    impex.directive('mousedown',{
        onInit : function(){
            this.on('mousedown',this.$value);
        }
    });
    /**
     * 鼠标弹起视图指令，不包含子视图
     * <br/>使用方式：<div x-mouseup="fn() + fx()"></div>
     */
    impex.directive('mouseup',{
        onInit : function(){
            this.on('mouseup',this.$value);
        }
    });
    /**
     * 鼠标移出视图指令，包含子视图
     * <br/>使用方式：<div x-mouseleave="fn() + fx()"></div>
     */
    impex.directive('mouseleave',{
        onInit : function(){
        	var currentTarget = this.$view.elements[0];
            this.on('mouseout',this.$value,function(e,origin){
            	var target = e.target || e.srcElement;

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
     * 获取焦点视图指令，不包含子视图
     * <br/>使用方式：<div x-focus="fn() + fx()"></div>
     */
    impex.directive('focus',{
        onInit : function(){
            this.on('focus',this.$value);
        }
    });
    /**
     * 失去焦点视图指令，不包含子视图
     * <br/>使用方式：<div x-focus="fn() + fx()"></div>
     */
    impex.directive('blur',{
        onInit : function(){
            this.on('blur',this.$value);
        }
    });

    /**
     * 鼠标滚动视图指令，不包含子视图
     * <br/>使用方式：<div x-mousewheel="fn() + fx()"></div>
     */
    impex.directive('mousewheel',{
        onInit : function(){
            var type = document.body.onmousewheel == null?'mousewheel':'DOMMouseScroll';
            this.on(type,this.$value);
        }
    });
}(impex);