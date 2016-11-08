/**
 * 渲染器
 */

var Renderer = new function() {

	/**
	 * 渲染组件
	 */
	this.render = function(component){
 		renderExpNodes(component.__expNodes);
	}

	this.recurRender = function(component){
		
		var children = component.children;
 		renderExpNodes(component.__expNodes);

 		for(var j=children.length;j--;){
 			Renderer.render(children[j]);
 		}
	}

	//表达式节点渲染
	function renderExpNodes(expNodes){
		var cache = {};
		for(var i=expNodes.length;i--;){
			var expNode = expNodes[i];

			var val = null;
			if(cache[expNode.origin] && cache[expNode.origin].comp === expNode.component){
				val = cache[expNode.origin].val;
			}else{
				val = calcExpNode(expNode);
				cache[expNode.origin] = {
					comp:expNode.component,
					val:val
				}
			}
			
			if(expNode.toHTML){
				var rs = renderHTML(expNode,val,expNode.node,expNode.component);
				if(rs){
					continue;
				}
			}
			if(val !== null){
				// console.log('更新DOM');
				updateDOM(expNode.node,expNode.attrName,val);
			}
		}//over for
		
	}
	this.renderExpNodes = renderExpNodes;

	var propMap = {
		value:['INPUT']
	};

	function updateDOM(node,attrName,val){
		if(node.setAttribute){
			node.setAttribute(attrName,val);
			var propOn = propMap[attrName];
			if(propOn && propOn.indexOf(node.tagName)>-1){
				node[attrName] = val;
			}
		}else{
			if(node.parentNode)//for IE11
			//文本节点
			node.nodeValue = val;
		}
	}

	function clone(obj){
		if(obj === null)return null;
		var rs = obj;
		if(obj instanceof Array){
			rs = obj.concat();
			for(var i=rs.length;i--;){
				rs[i] = clone(rs[i]);
			}
		}else if(Util.isObject(obj)){
			rs = {};
			var ks = Object.keys(obj);
            if(ks.length>0){
                for(var i=ks.length;i--;){
                    var k = ks[i],
                        v = obj[k];
                    if(k.indexOf('__im__')===0)continue;
                    rs[k] = typeof obj[k]==='object'? clone(obj[k]): obj[k];
                }
            }
		}
		return rs;
	}

	//计算表达式的值，每次都使用从内到外的查找方式
	function calcExpNode(expNode){
		var component = expNode.component,
			origin = expNode.origin,
			expMap = expNode.expMap;
		//循环获取每个表达式的值
		var map = {};
		for(var exp in expMap){
			//表达式对象
			var expObj = expMap[exp];
			var rs = evalExp(component,expObj);

			var filters = expObj.filters;
			if(Object.keys(filters).length > 0){
				if(rs && Util.isObject(rs)){
					rs = clone(rs);
				}

				for(var k in filters){
					var c = filters[k][0];
					var params = filters[k][1];
					var actParams = [];
					for(var i=params.length;i--;){
						var v = params[i];
						if(v.varTree && v.words){
							v = Renderer.evalExp(component,v);
						}
						actParams[i] = v;
					}
					c.value = rs;
					rs = c.to.apply(c,actParams);
				}
			}

			map[exp] = rs===undefined?'':rs;
		}

		//替换原始串中的表达式
		for(var k in map){
			origin = origin.replace(EXP_START_TAG +k+ EXP_END_TAG,map[k]+'');
		}
		return origin;
	}

	this.calcExpNode = calcExpNode;

	//计算表达式对象
	function evalExp(component,expObj){
		var evalExp = getExpEvalStr(component,expObj);
		var rs = '';
		try{
			rs = eval(evalExp);
		}catch(e){
			LOGGER.debug(e.message + ' when eval "' + evalExp+'"');
		}
		
		return rs;
	}

	this.evalExp = evalExp;

	function getExpEvalStr(component,expObj){
		var varTree = expObj.varTree;
		var expVarPath = {};
		for(var varStr in varTree){
			var varObj = varTree[varStr];

			var path = buildVarPath(component,varObj,varStr);
			expVarPath[varStr] = path;
		}

		var evalExp = joinExpStr(expObj.words,expVarPath);
		return evalExp;
	}
	this.getExpEvalStr = getExpEvalStr;

	//拼接表达式串
	function joinExpStr(words,vMap){
		var evalExp = '';
		for(var i=0;i<words.length;i++){
			var w = words[i];
			if(w instanceof Array){
 				evalExp += vMap[w[0]];
 			}else{
 				evalExp += w;
 			}
		}
		return evalExp;
	}

	function keyWordsMapping(str,component){
        if(str.indexOf('.this')===0){
        	return str.replace('.this',component.__getPath());
        }
    }

	//提供通用的变量遍历方法 
 	//用于获取一个变量表达式的全路径
 	function buildVarPath(component,varObj,varStr){
 		var subVarPath = {};
 		for(var subV in varObj.subVars){
 			var subVar = varObj.subVars[subV];
 			var subPath = buildVarPath(component,subVar,subV);
 			subVarPath[subV] = subPath;
 		}

 		var isKeyword = false;
 		var fullPath = '';
 		for(var i=0;i<varObj.words.length;i++){
 			var w = varObj.words[i];
 			if(w instanceof Array){
 				if(subVarPath[w[0]]){
 					fullPath += subVarPath[w[0]];
 					continue;
 				}

				var keywordPath = keyWordsMapping(w[0],component);
                if(keywordPath){
                    isKeyword = true;
                    fullPath += keywordPath;
                }else{
                    fullPath += w[0];
                }
 			}else{
 				fullPath += w;
 			}
 		}
 		var watchPath = '';
 		if(varObj.watchPath){
	 		watchPath = varObj.watchPath;
 		}else{
 			for(var i=0;i<varObj.watchPathWords.length;i++){
	 			var w = varObj.watchPathWords[i];
	 			if(w instanceof Array){
	 				watchPath += subVarPath[w[0]] || w[0];	
	 			}else{
	 				watchPath += w;
	 			}
	 		}
 		}

 		if(isKeyword || fullPath.indexOf('impex._cs')===0)return fullPath;

 		var isDataType = varStr[varStr.length-1]===')'?false:true;
 		var searchPath = watchPath || fullPath;
 		if(isDataType){
 			searchPath = '.data' + searchPath;
 		}else{
 			searchPath = '.' + searchPath.substr(1);
 		}
 		component = varInComponent(component,searchPath);

 		if(component){
 			if(isDataType){
	 			fullPath = '.data' + fullPath;
	 		}else{
	 			fullPath = '.' + fullPath.substr(1);
	 		}
 			return component.__getPath() + fullPath;
 		}

 		return 'self' + fullPath;
 	}

 	function varInComponent(comp,v){
		if(getVarByPath(v,comp.__getPath()) !== undefined){
			return comp;
		}
		return null;
	}

	function getVarByPath(path,mPath){
		var varExp = mPath + path;
		var rs = undefined;
		try{
			rs = eval(varExp.replace(/^\./,''));
		}catch(e){}
		return rs;
	}

	function renderHTML(expNode,val,node,component){
		if(!Util.isDOMStr(val)){
			val = val.replace(/</mg,'&lt;').replace(/>/mg,'&gt;');
		}
		if(expNode.__lastVal === val)return;
		if(node.nodeType != 3)return;
		if(!expNode.__placeholder){
			var ph = document.createComment('-- [html] placeholder --');
			node.parentNode.insertBefore(ph,node);
			expNode.__lastVal = val;
			expNode.__placeholder = ph;
			node.parentNode.removeChild(node);
		}

		if(expNode.__lastView){
			//release
			expNode.__lastView.__destroy();
		}

		var target = document.createComment('-- [html] target --');
		expNode.__placeholder.parentNode.insertBefore(target,expNode.__placeholder);

		var nodes = DOMViewProvider.compile(val,target);
		var el = nodes.length===1 && nodes[0].nodeType===1?nodes[0]:null;

		var nView = null;
		if(nodes.length > 0){
			nView = new View(el,target,nodes);
			nView.__display();
		}

		expNode.__lastView = nView;
		expNode.__lastVal = val;

		if(nView)
			Scanner.scan(nView,component);
		Builder.build(component);
		Renderer.render(component);

		//init children
		for(var i = component.children.length;i--;){
			component.children[i].init();
		}
		for(var i = component.directives.length;i--;){
			component.directives[i].init();
		}

		//display children
		for(var i = 0;i<component.children.length;i++){
			if(!component.children[i].templateURL)
				component.children[i].display();
		}

		for(var i = component.directives.length;i--;){
			component.directives[i].active();
		}


		return true;
	}
}

