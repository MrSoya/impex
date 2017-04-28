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
		if(originExp instanceof Function)
			meta.componentFn = originExp;
		var componentFn = meta.componentFn;

		var tmpExp = originExp;

		var ev = new Event(type,e,meta.el);

		if(extra)
			Util.ext(ev,extra);

		if(!meta.cache && componentFn){
			tmpExp = componentFn.call(context,ev);
		}

		if(typeof(tmpExp) == "string"){
			var expObj = lexer(tmpExp);

			var evalStr = Renderer.getExpEvalStr(comp,expObj);

			var tmp = evalStr.replace(/self\.\$event/mg,'$event');
			tmp = tmp.replace(/self\.arguments/mg,'arguments');
			componentFn = new Function('$event','arguments',tmp);

			meta.componentFn = componentFn;//cache
			meta.cache = true;
		}
		
		try{
			return componentFn.call(context,ev,[ev]);
		}catch(error){
			LOGGER.debug("error in event '"+type +"'",error);
		}
	}

	this.emitEventExp = function(meta,type,params){
		var originExp = meta.exp;
		var context = meta.context;
		var comp = meta.comp || context;

		if(originExp instanceof Function){
			meta.componentFn = originExp;
			meta.isCbkFn = true;
		}
		var componentFn = meta.componentFn;

		var tmpExp = originExp;

		if(!meta.cache && componentFn){
			tmpExp = componentFn.apply(context,params);
		}

		if(typeof(tmpExp) == "string"){
			if(!(comp instanceof Component)){
				LOGGER.error("need a context to parse '"+originExp+"' of type '"+type +"'");
				return;
			}

			var expObj = lexer(tmpExp);

			var evalStr = Renderer.getExpEvalStr(comp,expObj);

			var tmp = evalStr.replace(/self\.arguments/mg,'arguments');
			componentFn = new Function('arguments',tmp);

			meta.componentFn = componentFn;//cache
			meta.cache = true;
		}


		try{
			if(meta.isCbkFn){
				componentFn.apply(context,params);
			}else{
				componentFn.call(context,params);
			}
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