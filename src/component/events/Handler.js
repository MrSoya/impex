/**
 * @classdesc 事件分派器。用来定义原生或自定义事件，以代理方式高效的处理事件。
 * 
 * @class 
 * @param {data} 扩展数据
 */
var Handler = new function() {
	var EVENTS_MAP = {};

	this.evalEventExp = function(meta,e,type){
		var originExp = meta.exp;
		var handler = meta.handler;
		var comp = meta.comp;
		var componentFn = meta.componentFn;

		var tmpExp = originExp;

		if(handler instanceof Function){
			tmpExp = handler.call(comp,e,originExp);
		}
		if(!tmpExp)return;

		if(!componentFn){
			var expObj = lexer(tmpExp);

			var evalStr = Renderer.getExpEvalStr(comp,expObj);

			var tmp = evalStr.replace('self.$event','$event');
			componentFn = new Function('$event',tmp);

			meta.componentFn = componentFn;//cache
		}
		
		try{
			return componentFn(e);
		}catch(error){
			LOGGER.debug("error in event '"+type +"'",error);
		}
	}
	this.addDefaultEvent = function(type,meta){
		var originExp = meta.exp;
		
		var tmpExpOutside = '';
		var fnOutside = null;

		if(!EVENTS_MAP[type]){
			EVENTS_MAP[type] = [];
		}
		EVENTS_MAP[type].push(meta);

        meta.el.addEventListener(type,this.__defaultEventHandler.bind(this),false);
	}

	this.__defaultEventHandler = function(e){
		var type = e.type;
		var t = e.target;
		var metas = EVENTS_MAP[type];
		for(var i=metas.length;i--;){
			if(metas[i].el === t){
				break;
			}
		}
		this.evalEventExp(metas[i],e,type);
	}
}