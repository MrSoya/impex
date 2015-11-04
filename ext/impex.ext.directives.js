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
	    	switch(this.$view.name){
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
}(impex);