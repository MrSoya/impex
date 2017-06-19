/**
 * @classdesc 事件分派器。用来定义原生或自定义事件，以代理方式高效的处理事件。
 * 
 * @class 
 * @param {data} 扩展数据
 */
var Handler = new function() {
	var EVENTS_MAP = {};

	this.evalEventExp = function(meta,e,type,extra){
		var originExp = meta.exp;
		var context = meta.context;
		var comp = meta.comp;
		var tmpExp = originExp;

		var ev = new Event(type,e,meta.el);
		if(extra)
			Util.ext(ev,extra);

		//如果表达式是函数，计算返回表达式
		if(originExp instanceof Function && !meta.componentFn/*没有表达式时执行*/){
			try{
				tmpExp = originExp.call(context,ev);
			}catch(error){
				LOGGER.debug("error in event '"+type +"'",error);
			}

			if(!tmpExp || typeof(tmpExp) != "string")return tmpExp;//没有表达式直接返回
		}

		if(!meta.cache && typeof(tmpExp) == "string"){
			var expObj = lexer(tmpExp);

			var evalStr = Renderer.getExpEvalStr(comp,expObj);

			var tmp = evalStr.replace(/self\.\$event/mg,'$event');
			tmp = tmp.replace(/self\.arguments/mg,'arguments');
			var componentFn = new Function('$event','arguments',tmp);

			meta.componentFn = componentFn;//cache
			meta.cache = true;
		}
		
		try{
			return meta.componentFn.call(context,ev,[ev]);
		}catch(error){
			LOGGER.debug("error in event '"+type +"'",error);
		}
	}

	this.emitEventExp = function(meta,type,params){
		var originExp = meta.exp;
		var context = meta.context;
		var comp = meta.comp || context;
		var tmpExp = originExp;
		//如果表达式是函数，计算返回表达式
		if(originExp instanceof Function && !meta.componentFn/*没有表达式时执行*/){
			try{
				tmpExp = originExp.apply(context,params);
			}catch(error){
				LOGGER.debug("error in event '"+type +"'",error);
			}

			if(!tmpExp || typeof(tmpExp) != "string")return tmpExp;//没有表达式直接返回
		}
		
		if(!meta.cache && typeof(tmpExp) == "string"){
			if(!(comp instanceof Component)){
				LOGGER.error("need a context to parse '"+originExp+"' of type '"+type +"'");
				return;
			}

			var expObj = lexer(tmpExp);

			var evalStr = Renderer.getExpEvalStr(comp,expObj);

			var tmp = evalStr.replace(/self\.arguments/mg,'arguments');
			var componentFn = new Function('arguments',tmp);

			meta.componentFn = componentFn;//cache
			meta.cache = true;//不在重新计算表达式
		}

		try{
			meta.componentFn.call(context,params);
		}catch(error){
			LOGGER.debug("error in event '"+type +"'",error);
		}
	}
	this.addDefaultEvent = function(type,meta){
		if(!EVENTS_MAP[type]){
			EVENTS_MAP[type] = [];
		}
		EVENTS_MAP[type].push(meta);
		var ref = this.__defaultEventHandler.bind(this);
		meta.ref = ref;

        if(meta.el)meta.el.addEventListener(type,ref,false);
	}

	this.removeDefaultEvent = function(type,meta){
		var metas = EVENTS_MAP[type];
		for(var i=metas.length;i--;){
			if(metas[i].id === meta.id){
				break;
			}
		}

		metas.splice(i,1);

        if(meta.el)meta.el.removeEventListener(type,meta.ref,false);
	}

	this.__defaultEventHandler = function(e){
		var type = e.type;
		var t = e.currentTarget;
		var metas = EVENTS_MAP[type];
		for(var i=metas.length;i--;){
			if(metas[i].el === t){
				break;
			}
		}
		this.evalEventExp(metas[i],e,type);
	}
}