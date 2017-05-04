/**
 * 组件工厂用于统一管理系统内所有组件实例
 */
function _ComponentFactory(viewProvider){
	Factory.call(this,Component);

	this.viewProvider = viewProvider;
}
Util.inherits(_ComponentFactory,Factory);
Util.ext(_ComponentFactory.prototype,{
	getRestrictOf : function(type){
		return this.types[type].props['restrict'];
	},
	//parse component
	parse:function(tmpl,component){
		var el = component.el;
		//解析属性
		var propMap = el.attributes;
		var innerHTML = el.innerHTML;

		var cssStr = null,compileStr = null;
		if(!this.types[component.name].tmplCache){
			var tmp = peelCSS(tmpl);
			compileStr = tmp[1];
			cssStr = tmp[0];
			cssStr = cssHandler(component.name,cssStr);

			this.types[component.name].tmplCache = compileStr;
			
			//attach style
			if(cssStr.trim().length>0){
				var target = document.head.children[0];
				if(target){
					var nodes = DOMHelper.compile(cssStr);
					DOMHelper.insertBefore(nodes,target);
				}else{
					document.head.innerHTML = cssStr;
				}
			}			
		}else{
			compileStr = this.types[component.name].tmplCache;
		}
		compileStr = slotHandler(compileStr,innerHTML);

		if(component.onBeforeCompile)
            compileStr = component.onBeforeCompile(compileStr);

		var nodes = DOMHelper.compile(compileStr);

		el.innerHTML = '';
		DOMHelper.attach(el,nodes);

		//check props
		var requires = {};
		var propTypes = component.propTypes;
		if(propTypes){
			for(var k in propTypes){
				var type = propTypes[k];
				if(type.require){
					requires[k] = type;
				}
			}
		}

		if(propMap){
			//bind props
			for(var i=propMap.length;i--;){
				var k = propMap[i].name.toLowerCase();
				var v = propMap[i].value;
				if(k == ATTR_REF_TAG){
					var expNode = Scanner.getExpNode(v,component);
					var calcVal = expNode && Renderer.calcExpNode(expNode);
					component.parent.comps[calcVal || v] = component;
					continue;
				}

				var instance = null;
				if(REG_CMD.test(k)){
					var c = k.replace(CMD_PREFIX,'');
					var CPDI = c.indexOf(CMD_PARAM_DELIMITER);
					if(CPDI > -1)c = c.substring(0,CPDI);
					//如果有对应的处理器
					if(DirectiveFactory.hasTypeOf(c)){
						instance = DirectiveFactory.newInstanceOf(c,component.el,component,k,v);
					}
				}else if(k.indexOf(CMD_PARAM_DELIMITER) === 0){
					instance = DirectiveFactory.newInstanceOf('on',component.el,component,k,v);
				}else{
					handleProps(k,v,requires,propTypes,component);
				}

				if(instance){
					instance.init();
				}
			}
		}

		//check requires
		var ks = Object.keys(requires);
		if(ks.length > 0){
			LOGGER.error("props ["+ks.join(',')+"] of component["+component.name+"] are required");
			return;
		}
	},
	/**
	 * 创建指定基类实例
	 */
	newInstance : function(els,param){
		var el = null;
		if(els.length===1){
			el = els[0];
		}
		
		var rs = new this.baseClass();
		rs.el = el;
		rs.__nodes = els;

		if(param){
			Util.ext(rs,param);
		}
		
		return rs;
	},
	/**
	 * 创建指定类型组件实例
	 * @param  {String} type       		组件类型
	 * @param  {HTMLElement} target  	组件应用节点
	 * @return {Component}
	 */
	newInstanceOf : function(type,target){
		if(!this.types[type])return null;

		var rs = new this.types[type].clazz(this.baseClass);
		rs.name = type;
		rs.el = target;
		rs.__nodes = [target];

		var state = this.types[type].state;
		if(typeof state == 'string'){
			rs.__url = state;
		}else{
			this.initInstanceOf(type,rs);
		}

		this._super.createCbk.call(this,rs,type);

		return rs;
	},
	initInstanceOf : function(type,ins){
		if(!this.types[type])return null;
		
		Util.ext(ins,this.types[type].props);
		var state = this.types[type].state;
		if(state){
			if(state instanceof Function){
				state = state.call(ins);
			}
			Util.ext(ins.state,state);
		}
	}
});

var ComponentFactory = new _ComponentFactory(DOMHelper);

function slotHandler(tmpl,innerHTML){
	var slotMap = {};
	var findMap = {};
    innerHTML.replace(/<(?:\s+)?([a-z](?:.+)?)[^<>]+slot(?:\s+)?=(?:\s+)?['"]([^<>]+?)?['"](?:[^<>]+)?>/img,function(a,tag,slot,i){
    	findMap[tag] = [slot,i];
    });
    for(var tag in findMap){
    	var startPos = findMap[tag][1];
    	var slot = findMap[tag][0];
    	var stack = 0;
    	var endPos = -1;
    	var reg = new RegExp("<(?:(?:\s+)?\/)?(?:\s+)?"+tag+"[^>]*?>",'img');
        innerHTML.replace(reg,function(tag,i){
        	if(i <= startPos)return;

        	if(/<(?:(?:\s+)?\/)/.test(tag)){
        		stack--;
        		if(stack < 0){
        			endPos = i;
        		}
        	}else{
        		stack++;
        	}
        });
        var tmp = innerHTML.substring(startPos,endPos);
        slotMap[slot] = tmp+'</'+tag+'>';
    }

    if(innerHTML.trim().length>0)
    tmpl = tmpl.replace(/<(?:\s+)?slot(?:\s+)?>(?:[^<>]+)?<\/(?:\s+)?slot(?:\s+)?>/img,function(str){
    	return innerHTML;
    });

    tmpl = tmpl.replace(/<(?:\s+)?slot\s+name(?:\s+)?=(?:\s+)?['"]([^<>]+?)?['"](?:[^<>]+)?>(?:[^<>]+)?<\/(?:\s+)?slot(?:\s+)?>/img,function(str,name){
    	return slotMap[name] || str;
    });

    return tmpl;
}

function peelCSS(tmpl){
	var rs = '';
	tmpl = tmpl.replace(/<(?:\s+)?style(?:.+)?>([^<]+)?<\/(?:\s+)?style(?:\s+)?>/img,function(str){
        rs += str;
        return '';
    });

    return [rs,tmpl];
}

function cssHandler(name,tmpl){
	tmpl = tmpl.replace(/<(?:\s+)?style(?:.+)?>([^<]+)?<\/(?:\s+)?style(?:\s+)?>/img,function(str,style){
        return '<style>'+filterStyle(name,style)+'</style>';
    });
    return tmpl;
}

function filterStyle(host,style){
	style = style.replace(/\n/img,'').trim();
	style = style.replace(/(^|})(?:\s+)?[a-z:_$.>~+](?:[^{]+)?\{/img,function(name){
		var rs = name.trim();
		if(!/(^|}|((?:\s+)?,))(?:\s+)?:host/.test(rs)){
			if(rs[0]==='}'){
				rs = rs.substr(1);
				rs = '}'+host + ' ' +rs;
			}else{
				rs = host + ' ' +rs;
			}
			
		}
		rs = rs.replace(/:host/img,host);
		return rs;
	});
	return style;
}

function checkPropType(k,v,propTypes,component){
	if(!propTypes[k] || !propTypes[k].type)return;
	var checkType = propTypes[k].type;
	checkType = checkType instanceof Array?checkType:[checkType];
	var vType = typeof v;
	if(v instanceof Array){
		vType = 'array';
	}
	if(vType !== 'undefined' && checkType.indexOf(vType) < 0){
		LOGGER.error("invalid type ["+vType+"] of prop ["+k+"] of component["+component.name+"];should be ["+checkType.join(',')+"]");
	}
}

function handleProps(k,v,requires,propTypes,component){
	k = k.replace(/-[a-z0-9]/g,function(a){return a[1].toUpperCase()});

	// xxxx
	if(k[0] !== PROP_TYPE_PRIFX){
		if(propTypes && k in propTypes){
			delete requires[k];
			checkPropType(k,v,propTypes,component);
		}
		component.state[k] = v;
		return;
	}

	// .xxxx
	var n = k.substr(1);
	var tmp = lexer(v);
	var rs = Renderer.evalExp(component.parent,tmp);

	//call onPropBind
	if(Util.isObject(rs) && component.onPropBind)
		rs = component.onPropBind(n,rs);

	//check sync
	if(PROP_SYNC_SUFX_EXP.test(n)){
		n = n.replace(PROP_SYNC_SUFX_EXP,'');

		var keys = Object.keys(tmp.varTree);
		//watch props
		keys.forEach(function(key){
			if(tmp.varTree[key].isFunc)return;

			var prop = new Prop(component,n,tmp.varTree[key].segments,tmp);
			component.parent.__watchProps.push(prop);
		});
	}
	if(propTypes && n in propTypes){
		delete requires[n];
		checkPropType(n,rs,propTypes,component);
	}
	if(rs instanceof Function){
		component[n] = rs;
		return;
	}	

	component.state[n] = rs;
}