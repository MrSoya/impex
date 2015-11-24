/**
 * 指令扩展
 */
;!function(impex){
	/**
	 * 绑定模型属性，当控件修改值后，模型值也会修改
	 * <br/>使用方式：<input x-bind="model.prop">
	 */
	impex.directive('bind',{
	    onCreate : function(){
	    	switch(this.$view.elements[0].nodeName.toLowerCase()){
	    		case 'textarea':
	    		case 'input':
	    			var type = this.$view.attr('type');
	    			switch(type){
	    				case 'radio':
	    					this.on('click','changeModel($event)');
	    					break;
	    				case 'checkbox':
	    					this.on('click','changeModelCheck($event)');
	    					break;
	    				default:
	    					var hack = document.body.onpropertychange===null?'propertychange':'input';
	        				this.on(hack,'changeModel($event)');
	    			}
	    			
	        		break;
	        	case 'select':
	        		this.on('change','changeModel($event)');
	        		break;
	    	}
	    },
	    changeModelCheck : function(e){
	    	var t = e.target || e.srcElement;
	    	var val = t.value;
	    	var mVal = this.$parent.data(this.$value);
	    	var parts = mVal.split(',');
	    	if(t.checked){
	    		parts.push(val);
	    	}else{
	    		var i = parts.indexOf(val);
	    		if(i > -1){
	    			parts.splice(i,1);
	    		}
	    	}
	    	this.$parent.data(this.$value,parts.join(',').replace(/^,/,''));
	    },
	    changeModel : function(e){
	        this.$parent.data(this.$value,(e.target || e.srcElement).value);
	    }
	});

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
     * 失去焦点视图指令，不包含子视图
     * <br/>使用方式：<div x-focus="fn() + fx()"></div>
     */
    impex.directive('mousewheel',{
        onInit : function(){
            var type = document.body.onmousewheel == null?'mousewheel':'DOMMouseScroll';
            this.on(type,this.$value);
        }
    });
}(impex);