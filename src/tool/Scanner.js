/**
 * 扫描器
 */

var Scanner = new function() {
	//预扫描
	function prescan(node){
		if(!node)return;
		var textNodeAry = [];
		var replacements = [];
		queryAllTextNode(node,textNodeAry);

		for(var ii=textNodeAry.length;ii--;){
			var node = textNodeAry[ii];
			var text = node.nodeValue;
			var segments = [];
			var lastPos = 0;
			text.replace(REG_EXP,function(fullTxt,modelExp,pos){
				var txt = text.substring(lastPos,pos);
				if(txt)segments.push(txt);
				segments.push(fullTxt);

				lastPos = pos + fullTxt.length;
			});

			var txt = text.substring(lastPos,text.length);
			if(txt)segments.push(txt);

			if(segments.length<2){
				replacements.unshift(null);
				continue;
			}
			
			var fragment = document.createDocumentFragment();
			for(var i=0;i<segments.length;i++){
				var tn = document.createTextNode(segments[i]);
				fragment.appendChild(tn);
			}
			replacements.unshift(fragment);
		}
		
		for(var i=textNodeAry.length;i--;){
			var n = textNodeAry[i];
			if(replacements[i] && replacements[i].childNodes.length>1 && n.parentNode)
				n.parentNode.replaceChild(replacements[i],n);
		}
	}
	function queryAllTextNode(node,textAry){
		if(node.tagName === 'SCRIPT')return;
		if(node.attributes || node.nodeType === 11){
			if(node.childNodes.length>0){
				for(var i=0,l=node.childNodes.length;i<l;i++){
					queryAllTextNode(node.childNodes[i],textAry);
				}
			}
		}else
		if(node.nodeType === 3){
			if(node.nodeValue.replace(/\t|\r|\s/img,'').length<1)return;
			textAry.push(node);
		}
	}

	/**
	 * 扫描DOM节点
	 */
	this.scan = function(scanNodes,component){
        
        for(var i=0,l=scanNodes.length;i<l;i++){
        	prescan(scanNodes[i]);
            scan(scanNodes[i],component);
        }
	}

	function getRestrictParent(selfComp){
		if(selfComp.restrict)return selfComp;
		var p = selfComp.parent;
		while(p){
			if(p.name && p.restrict)return p;
			p = p.parent;
		};
		return null;
	}

	function scan(node,component){
		if(node.tagName === 'SCRIPT')return;

		if(node.attributes || node.nodeType === 11){
			if(node.tagName){
				var tagName = node.tagName.toLowerCase();
				
				var atts = [];
				for(var i=node.attributes.length;i--;){
					var tmp = node.attributes[i];
					atts.push([tmp.name,tmp.value]);
				}

				var scopeDirs = [];
				//检测是否有子域属性，比如each
				for(var i=atts.length;i--;){
					var name = atts[i][0];
					if(name.indexOf(CMD_PREFIX) !== 0)continue;
					
					var c = name.replace(CMD_PREFIX,'');
					var CPDI = c.indexOf(CMD_PARAM_DELIMITER);
					if(CPDI > -1)c = c.substring(0,CPDI);

					if(DirectiveFactory.hasTypeOf(c)){
						if(DirectiveFactory.isFinal(c)){
							scopeDirs.push([c,atts[i],DirectiveFactory.priority(c) || 0]);
						}
					}
				}

				if(scopeDirs.length>0){
					scopeDirs.sort(function(a,b){
						return b[2] - a[2];
					});
					var c = scopeDirs[0][0],
						attr = scopeDirs[0][1];
					if(DirectiveFactory.isFinal(c)){
						DirectiveFactory.newInstanceOf(c,node,component,attr[0],attr[1]);
						return;
					}
				}

				//解析组件
				if(component.name!==tagName && ComponentFactory.hasTypeOf(tagName)){
					var pr = getRestrictParent(component);
					if(pr && pr.restrict.children){
						var children = pr.restrict.children.split(',');
						if(children.indexOf(tagName) < 0)return;
					}
					var cr = ComponentFactory.getRestrictOf(tagName);
					if(cr && cr.parents){
						var parents = cr.parents.split(',');
						if(parents.indexOf(pr.name) < 0)return;
					}
					var instance = component.createSubComponentOf(node);

					return;
				}
				

				//others
				for(var i=atts.length;i--;){
					var attName = atts[i][0];
					var attVal = atts[i][1];
					if(REG_CMD.test(attName)){
						var c = attName.replace(CMD_PREFIX,'');
						var CPDI = c.indexOf(CMD_PARAM_DELIMITER);
						if(CPDI > -1)c = c.substring(0,CPDI);
						//如果有对应的处理器
						if(DirectiveFactory.hasTypeOf(c)){
							DirectiveFactory.newInstanceOf(c,node,component,attName,attVal);
						}
					}else if(attName[0] === ':'){
						DirectiveFactory.newInstanceOf('on',node,component,attName,attVal);
					}else if(REG_EXP.test(attVal)){//只对value检测是否表达式，name不检测
				    	recordExpNode(attVal,component,node,attName);
					}
				}
			}

	    	if(node.childNodes.length>0){
				for(var i=0,l=node.childNodes.length;i<l;i++){
					scan(node.childNodes[i],component);
				}
			}
		}else if(node.nodeType === 3){
			if(node.nodeValue.replace(/\t|\r|\s/img,'').length<1)return;
			//文本节点处理
			recordExpNode(node.nodeValue,component,node);
		}
	}

	//表达式解析
	function recordExpNode(origin,component,node,attrName){
		//origin可能包括非表达式，所以需要记录原始value
		var expNode = getExpNode(origin,component,node,attrName);
		expNode && component.__expNodes.push(expNode);

		return expNode;
	}

	function getExpNode(origin,component,node,attrName){
		var exps = {};
		var toHTML = !attrName && origin.replace(/\s*/mg,'').indexOf(EXP_START_TAG + EXP2HTML_EXP_TAG)===0;
		if(toHTML){
			origin = origin.replace(EXP2HTML_EXP_TAG,'');
		}
		origin.replace(REG_EXP,function(a,modelExp){

			var filters = {};
			var i = 1;
			var varMap = null;
			if(FILTER_EXP.test(modelExp)){
				varMap = parseFilters(lexer(RegExp.$1),filters,component);
				i = modelExp.indexOf(FILTER_EXP_START_TAG);
			}

			var expStr = modelExp;
			if(i > 1)
				expStr = modelExp.substring(0,i);
    		var tmp = lexer(expStr);
    		
    		if(varMap)
    			Util.ext(tmp.varTree,varMap);
    		//保存表达式
    		exps[modelExp] = {
    			words:tmp.words,
    			varTree:tmp.varTree,
    			filters:filters
    		};
    	});
		if(Object.keys(exps).length<1)return;

		return new ExpNode(node,attrName,origin,exps,component,toHTML);
	}

	this.getExpNode = getExpNode;

	function parseFilters(expNode,filters,component){
		var currParams = [],
			currParam = null;
		var inParam = false;
		var varMap = {};

		var words = [];
		var wds = expNode.words;
		for(var i=0;i<wds.length;i++){
			if(wds[i] instanceof Array){
				var w = wds[i][0];
				var tmp = w.split('.');
				
				for(var k=1;k<tmp.length;k++){
					words.push([tmp[k]]);
				}
			}else{
				words.push(wds[i]);
			}
		}
		for(var i=0;i<words.length;i++){
			var w = words[i];
			switch(w){
				case ':':
					inParam = true;
					if(currParam !== null)
						currParams.push(currParam);
					currParam = '';
					break;
				case '.':
					inParam = false;
					if(currParam !== null)
						currParams.push(currParam);
					currParam = '';
					currParams = [];
					break;
				default:
					if(w instanceof Array){
						var partName = w[0];
						var filterName = partName.toLowerCase();
						if(!inParam && filterName && FilterFactory.hasTypeOf(filterName)){
							currParam = null;
							filters[filterName] = [FilterFactory.newInstanceOf(filterName,component),currParams];
						}else{
							var tmp = lexer(partName);
							Util.ext(varMap,tmp.varTree);
							currParams.push(tmp);
							currParam = null;
						}
					}else{
						if(!inParam || !w.replace(/\s+/,''))continue;
						currParam += w.replace(/^['"]|['"]$/g,'');
					}
			}
		}

		if(currParam){
			currParams.push(currParam);
		}

		return varMap;
	}

	this.parseFilters = parseFilters;
}