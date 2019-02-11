/*
 * impexjs is a powerful web application engine to build 
 * reactive webUI system
 *
 *
 * Copyright 2015-2019 MrSoya and other contributors
 * Released under the MIT license
 *
 * website: http://impexjs.org
 * last build: 2019-2-11
 */
!function (global) {
	'use strict';
/**
 * 系统常量
 * 包括所有语法标识符、错误信息等
 */

	var CMD_PREFIX = 'x-';//指令前缀
	var CMD_PARAM_DELIMITER = ':';
	var CMD_FILTER_DELIMITER = '.';

	var EXP_START_TAG = '{{',
		EXP_END_TAG = '}}';
	var REG_CMD = /^x-.*/;
	var ATTR_REF_TAG = 'ref';
	var ATTR_ID_TAG = 'id';
	var COMP_SLOT_TAG = 'component';
	var PROP_TYPE_PRIFX = '.';

	var EVENT_AB_PRIFX = '@';
	var BIND_AB_PRIFX = '.';
	var EXP_EXP = new RegExp(EXP_START_TAG+'(.+?)(?:(?:(?:=>)|(?:=&gt;))(.+?))?'+EXP_END_TAG,'img');

	var DOM_COMP_ATTR = 'impex-component';

	var im_counter = 0;

	var DISPATCHERS = [];
	var FILTER_MAP = {};
	var DIRECT_MAP = {};
	var COMP_MAP = {'component':1};
	var EVENT_MAP = {};

	//removeIf(production)
	function error(compName,code,msg,e){
		console && console.error('xerror[' + compName +'] - #'+code+' - '+msg,e||'','\n\nFor more information about the xerror,please visit the following address: http://impexjs.org/doc/techniques.html#techniques-xerror');
	}
	function assert(isTrue,compName,code,msg,e) {
		!isTrue && error(compName,code,msg,e);
	}
	var XERROR = {
		COMPONENT:{//1XXX
			CONTAINER:1001,
			TEMPLATEPROP:1002,
			LOADERROR:1003,
			LOADTIMEOUT:1004,
			TEMPLATETAG:1005,
			COMPUTESTATE:1006,
			DEP:1007
		},
		COMPILE:{//2XXX
			ONEROOT:2001,
			EACH:2002,
			HTML:2003,
			ROOTTAG:2004,
			ROOTCOMPONENT:2005,
			NOFILTER:2006,
			ERROR:2007
		},
		//COMPONENT ATTRIBUTE ERRORS
		INPUT:{//3XXX
			REQUIRE:3001,
			TYPE:3002
		},
		STORE:{//4XXX
			NOSTORE:4001
		}
	}
	//endRemoveIf(production)

/**
 * utils
 */
    function ext(from,to){
        var keys = Object.keys(from);
        for (var i=keys.length;i--;) {
            var k = keys[i];
            to[k] = from[k];
        }
    }
    function isObject(obj){
        return typeof(obj) === 'object' && obj !== null;
    }
    function isArray(obj){
        return Array.isArray(obj);
    }
    function isString(obj){
        return typeof obj === 'string';
    }
    function isUndefined(obj){
        return obj === undefined;
    }
    function isFunction(obj){
        return obj instanceof Function;
    }

/**
 * 视图模版解析模块，解析结果送入编译器进行编译
 * 包含组件识别、指令处理、属性解析、SLOT解析、文本解析等
 * 支持 
 *     表达式错误提醒
 *     结构指令 - for/if/else-if/else/html
 *     指令过滤器
 */

//https://www.w3.org/TR/html5/syntax.html#void-elements
var VOIDELS = ['br','hr','img','input','link','meta','area','base','col','embed','keygen','param','source','track','wbr'];
var TAG_START_EXP = new RegExp('<([-a-z0-9]+)((?:\\s+[-a-zA-Z0-9_'+EVENT_AB_PRIFX+BIND_AB_PRIFX+CMD_PARAM_DELIMITER+']+(?:\\s*=\\s*(?:(?:"[^"]*")|(?:\'[^\']*\')))?)*)\\s*(?:\/?)>','im');
var TAG_ATTR_EXP = new RegExp('[a-zA-Z_'+EVENT_AB_PRIFX+BIND_AB_PRIFX+'][-a-zA-Z0-9_'+EVENT_AB_PRIFX+BIND_AB_PRIFX+CMD_PARAM_DELIMITER+']*(?:\\s*=\\s*(?:(?:"[^"]*")|(?:\'[^\']*\')|[^>\\s]+))?','img');
var TAG_END_EXP = /<\/([-a-z0-9]+)>/im;
var TAG_END_EXP_G = /<\/([-a-z0-9]+)>/img;
var SLOT = 'slot';

function parseHTML(str){
    var startNodeData = null;
    var endNodeData;
    var stack = [];
    var compStack = [];
    var roots = [];
    var slotList = [];
    var compNode;
    while(str.length>0){
        if(!startNodeData){
            startNodeData = TAG_START_EXP.exec(str);
            //removeIf(production)
            assert(startNodeData,compStack.length<1?'ROOT':compStack[compStack.length-1],XERROR.COMPILE.HTML,"html template compile error - syntax error in - \n"+str);
            //endRemoveIf(production)
            if(!startNodeData){}
            var index = startNodeData.index + startNodeData[0].length;
            str = str.substr(index);
        }
        //build VNode
        var tagName = startNodeData[1];
        var node = new RawNode(tagName);
        node.outerHTML = startNodeData[0];
        node.innerHTML = str;
        var parentNode = stack[stack.length-1];
        if(parentNode){
            parentNode.children.push(node);
        }else{
            roots.push(node);
        }
        if(COMP_MAP[tagName]){
            compNode = node;
            compStack.push(node);
        }
        var attrStr = startNodeData[2].trim();
        var attrAry = attrStr.match(TAG_ATTR_EXP);
        if(attrAry)parseHTML_attrs(attrAry,node,compNode);

        //handle void el root
        if(str.length<1)break;

        //handle slot
        if(tagName === SLOT){
            slotList.push([parentNode,node,node.attributes.name?node.attributes.name:null]);
        }else if(node.attributes.slot){
            var slotComp = compNode;
            if(slotComp === node){//component can be inserted into slots
                slotComp = compStack[compStack.length-1-1];
            }
            if(slotComp)slotComp.slotMap[node.attributes.slot] = node;
        }

        if(VOIDELS.indexOf(tagName)<0)stack.push(node);
        else{
            node.innerHTML = '';
        }

        //check
        var nextNodeData = TAG_START_EXP.exec(str);
        if(nextNodeData){
            startNodeData = nextNodeData;
        }
        endNodeData = TAG_END_EXP.exec(str);
        var endIndex = endNodeData?endNodeData.index:-1;
        var nextIndex = nextNodeData?nextNodeData.index:-1;
        parentNode = stack[stack.length-1];
        if(nextIndex>-1 && nextIndex < endIndex){
            parseHTML_txt(str.substr(0,nextIndex),parentNode);

            str = str.substr(nextIndex + nextNodeData[0].length);
        }else{
            parseHTML_txt(str.substr(0,endIndex),parentNode);

            var lastEndIndex = endIndex + endNodeData[0].length;
            TAG_END_EXP_G.lastIndex = 0;
            TAG_END_EXP_G.exec(str);
            do{
                var tmp = stack.pop();
                if(tmp === compNode){
                    compStack.pop();
                    compNode = compStack[compStack.length-1];
                }

                if(tmp === node){
                    if(node.innerHTML == endNodeData.input){
                        node.innerHTML = endNodeData.input.substring(0,endNodeData.index);
                    }else{
                        var part = node.innerHTML.replace(endNodeData.input,'');
                        node.innerHTML = part + endNodeData.input.substring(0,endNodeData.index);
                    }                        
                }
                if(stack.length<1)break;
                endNodeData = TAG_END_EXP_G.exec(str);
                //removeIf(production)
                assert(endNodeData,compStack.length<1?'ROOT':compStack[compStack.length-1],XERROR.COMPILE.HTML,"html template compile error - there's no end tag of <"+tagName+"> - \n"+str);
                //endRemoveIf(production)
                endIndex = endNodeData.index;
                var txt = str.substring(lastEndIndex,endNodeData.index);
                if(txt.trim()){
                    if(endIndex>nextIndex){
                        var tmp = TAG_START_EXP.exec(txt);
                        if(tmp){
                            txt = txt.substr(0,tmp.index).trim();
                        }
                    }
                    if(txt.trim()){
                        node = stack[stack.length-1];
                        parseHTML_txt(txt,node);
                    }                    
                }
                lastEndIndex = endIndex + endNodeData[0].length;
            }while(endIndex < nextIndex);
            
            if(!nextNodeData)break;
            str = str.substr(nextIndex + nextNodeData[0].length);
        }
    }

    return [roots,slotList];
}
function parseHTML_attrs(attrs,node,compNode){
    for(var i=attrs.length;i--;){
        var attrStr = attrs[i];
        var splitIndex = attrStr.indexOf('=');
        var value=null,aName;
        if(splitIndex<0){
            aName = attrStr;
        }else{
            aName = attrStr.substring(0,splitIndex);
            value = attrStr.substring(splitIndex+2,attrStr.length-1);
        }

        var attrNode = [aName,value];
        var directive = isDirectiveVNode(aName,node,compNode && node == compNode);
        if(directive){
            var expStr = null,expFilterAry = null;
            if(value){
                //convert
                value = value.replace(/&amp;/mg,'&');
                //handle filter
                var splitIndex = value.indexOf('=>');
                var filterStr;
                if(splitIndex<0){
                    expStr = value;
                }else{
                    expStr = value.substring(0,splitIndex);
                    filterStr = value.substring(splitIndex+2,value.length);
                }
                expStr = expStr.trim();
                expFilterAry = parseExpFilter(filterStr);    
            }
            
            var tmp = null;
            var dName = isArray(directive)?directive[0]:directive;
            var parseDir = true;
            switch(dName){
                case 'for':
                    node.for = parseDirectFor(expStr,expFilterAry,attrNode,compNode);
                    parseDir = false;
                    break;
                case 'if':
                    node.if = expStr;
                    parseDir = false;
                    break;
                case 'else-if':
                    node.elseif = expStr;
                    parseDir = false;
                    break;
                case 'else':
                    node.else = true;
                    parseDir = false;
                    break;
                case 'html':
                    node.html = expStr;
                    parseDir = false;
                    break;
            }

            if(parseDir){
                attrNode.push({dName:dName,dArgsAry:directive[1],dFilter:directive[2]});
                attrNode.push({vExp:expStr,vFilterAry:expFilterAry});
                node.directives[aName] = attrNode;
            }
        }else{
            node.attributes[aName] = value;
        }
    }
}
function parseHTML_txt(txt,node){
    txt = txt.trim();
    var txtQ = [];
    if(txt){
        var expData = null;
        var lastIndex = 0;
        while(expData = EXP_EXP.exec(txt)){
            var t = txt.substring(lastIndex,expData.index);
            if(t)txtQ.push(t);
            txtQ.push([expData[1],parseExpFilter(expData[2],true)]);
            lastIndex = expData.index + expData[0].length;
        }
        if(lastIndex < txt.length){
            txtQ.push(txt.substr(lastIndex));
        }
        if(txtQ.length<1)txtQ.push(txt);
        var tn = new RawNode();
        tn.txtQ = txtQ;
        node.children.push(tn);
    }
}
function parseExpFilter(filterStr,isTxt){
    var filterAry = [];
    if(filterStr){
        var filters = filterStr.split('|');
        for(var i=0;i<filters.length;i++){
            var parts = filters[i].split(':');
            filterAry.push({
                name:parts[0].trim(),
                param:parts.slice(1)
            });
        }
    }
    return filterAry;
}
//解析属性名，如果是指令，返回指令name,参数
function isDirectiveVNode(attrName,comp,isCompNode){
    var rs = null;
    var params = null;
    var filter = null;
    if(REG_CMD.test(attrName)){
        var c = attrName.replace(CMD_PREFIX,'');
        var CPDI = c.indexOf(CMD_PARAM_DELIMITER);
        if(CPDI > -1)c = c.substring(0,CPDI);
        rs = c;

        var i = attrName.indexOf(CMD_PARAM_DELIMITER);
        if(i > -1){
            params = attrName.substr(i+1);
        }

        switch(c){
            case 'if':case 'else-if':case 'else':case 'for':case 'html':return c;
        }

        //removeIf(production)
        //如果没有对应的处理器
        assert(DIRECT_MAP[c],comp?comp.$name:'ROOT',"there is no handler of directive '"+c+"' ");
        //endRemoveIf(production)
    }else if(attrName[0] === EVENT_AB_PRIFX){
        rs = 'on';
        params = attrName.substr(1);
    }else if(attrName[0] === BIND_AB_PRIFX && !isCompNode){/* 区分指令参数和bind */
        rs = 'bind';
        params = attrName.substr(1);
    }

    if(params){
        var fi = params.indexOf(CMD_FILTER_DELIMITER);
        if(fi > -1){
            filter = params.substr(fi+1);
            params = params.substring(0,fi);
        }

        params = params.split(CMD_PARAM_DELIMITER);
    }

    return rs?[rs,params,filter]:rs;
}
//解析for语句：datasource，alias
//包括to和普通语法
function parseDirectFor(expStr,expFilterAry,attrNode,compNode){
    var rs = null;//k,v,filters,ds1,ds2;
    var forExpStr = expStr;
    var filters = expFilterAry;
    //removeIf(production)    
    assert(forExpStr.match(/^([\s\S]*?)\s+as\s+([\s\S]*?)$/),compNode?compNode.name:'ROOT',XERROR.COMPILE.EACH,'invalid for expression : '+forExpStr);
    //endRemoveIf(production)
    var alias = RegExp.$2;
    var kv = alias.split(',');
    var k = kv.length>1?kv[0]:null;
    var v = kv.length>1?kv[1]:kv[0];
    var ds = RegExp.$1;
    if(ds.match(/^([\s\S]*?)\s+to\s+([\s\S]*?)$/)){ 
        rs = [k,v,filters,RegExp.$1,RegExp.$2];
    }else{
        rs = [k,v,filters,ds];
    }
    return rs;
}
/**
 * 编译模块，解析结果进行编译，编译后可以进行link
 * 支持 
 *     编译错误提醒
 *     VNODE构建
 *     过滤器处理
 *
 * 变量作用域支持所在域组件变量、全局变量，不支持上级组件变量
 */

var VDOM_CACHE = [];
function compile(str,comp){
    if(VDOM_CACHE[str] && !comp._slots && !comp._slotMap)return VDOM_CACHE[str];

    var rs = 'with(comp){return '+compileVDOMStr(str,comp,[])+'}';
    rs = new Function('comp,_ce,_tmp,_ct,_li,_fi',rs);
    VDOM_CACHE[str] = rs;
    return rs;
}
function compileVDOMStr(str,comp,forScopeAry){
    var pair = parseHTML(str);
    var roots = pair[0];

    //removeIf(production)
    assert(roots.length==1,comp.$name,XERROR.COMPILE.ONEROOT,"should only have one root in your template");
    //endRemoveIf(production)
    
    var rs = roots[0];

    //removeIf(production)
    assert(rs.tag && rs.tag != 'template' && rs.tag != 'slot' && !rs.for,comp.$name,XERROR.COMPILE.ROOTTAG,"root element cannot be <template> or <slot>");
    assert(!COMP_MAP[rs.tag],comp.$name,XERROR.COMPILE.ROOTCOMPONENT,"root element <"+rs.tag+"> should be a non-component tag");
    //endRemoveIf(production)
    
    //doslot
    doSlot(pair[1],comp._slots,comp._slotMap);
    var str = buildEvalStr(rs,forScopeAry);
    return str;
}
function doSlot(slotList,slots,slotMap){
    if(slots || slotMap)
        slotList.forEach(function(slot){
            var parent = slot[0];
            var node = slot[1];
            var name = slot[2];
            //update slot position everytime
            var pos = parent.children.indexOf(node);
            var params = [pos,1];
            
            if(name){
                if(slotMap[name])
                    params.push(slotMap[name]);
            }else{
                params = params.concat(slots);
            }
            parent.children.splice.apply(parent.children,params);
        });
}

var FORSCOPE_COUNT = 0;
var RNODE_MAP = {};
function buildEvalStr(raw,forScopeAry){
    var str = '';
    if(raw.tag){
        var forScopeStr,forScopeChainStr;
        if(raw.for){
            forScopeStr = 'forScope'+FORSCOPE_COUNT++;
            forScopeAry = forScopeAry.concat(forScopeStr);
        }
        forScopeChainStr = '['+forScopeAry.toString()+']';

        var children = '';
        RNODE_MAP[raw.rid] = raw;
        if(!COMP_MAP[raw.tag]){
            var startIf = false,ifStr = '';
            for(var i=0;i<raw.children.length;i++){
                var pmc = raw.children[i];
                var npmc = raw.children[i+1];
                var nodeStr = buildEvalStr(pmc,forScopeAry);
                if(pmc.if && !pmc.for){
                    startIf = true;
                    ifStr = '';
                }
                if(startIf){
                    if(pmc.else){
                        startIf = false;
                        children += ',' + ifStr + nodeStr;
                        continue;
                    }
                    if(ifStr && !pmc.elseif){
                        startIf = false;
                        children += ',' + ifStr + 'null,'+nodeStr;
                        continue;
                    }
                    ifStr += nodeStr;
                    if(!npmc || npmc.if){
                        children += ',' + ifStr + 'null';
                    }
                }else{
                    children += ',' + nodeStr;
                }
                
            }
            if(children.length>0)children = children.substr(1);
        }
        var ifStr = raw.if || raw.elseif;
        var ifStart = '',ifEnd = '';
        if(ifStr){
            ifStart = '('+ifStr+')?';
            ifEnd = ':';
        }

        var diCalcExpMap = buildDirectiveExp(raw.directives);
        var innerHTML = raw.html || 'null';
        var nodeStr = '_ce(this,"'+raw.rid+'",['+children+'],{'+diCalcExpMap+'},'+innerHTML+','+forScopeChainStr;
        if(raw.tag == 'template'){
            nodeStr = '_tmp(['+children+'],'+forScopeChainStr;
        }
        nodeStr = ifStart + nodeStr;
        if(raw.for){
            var k = (raw.for[0]||'').trim();
            var v = raw.for[1].trim();
            var filters = raw.for[2];
            var ds1 = raw.for[3];
            var ds2 = raw.for[4];
            var dsStr = ds1;
            var declare = "";
            if(raw.attributes.var){
                declare = raw.attributes.var;
                var list = declare.replace(/^{|}$/mg,'').split(',');
                var s = '';
                list.forEach(function(de) {
                    var pair = de.split(':');
                    s += 'var '+ pair[0] +'='+pair[1]+';';
                });
                declare = s;
            }
            if(ds2){
                dsStr = "(function(){var rs=[];for(var i="+ds1+";i<="+ds2+";i++)rs.push(i);return rs;}).call(this)"
            }
            if(filters.length>0){
                dsStr = "_fi("+dsStr+","+buildFilterStr(filters)+",comp)";
            }
            str = '_li('+dsStr+',function('+forScopeStr+'){with('+forScopeStr+'){'+declare+' return '+nodeStr+')'+(ifEnd?':null':'')+'}},this,"'+k+'","'+v+'")';
        }else{
            str = nodeStr+')'+ifEnd;
        }
    }else{
        var tmp = buildTxtStr(raw.txtQ);
        str += '_ct('+tmp+')';
    }

    return str;
}
function buildDirectiveExp(map){
    var dirStr = '';
    for(var k in map){
        var attr = map[k];
        var exp = attr[3].vExp;
        var dName = attr[2].dName;
        var calcExp = dName === 'on'||dName === 'model'?JSON.stringify(exp):exp;
        dirStr += ',"'+k+'":'+ (calcExp || 'null');
    }//end for
    return dirStr.substr(1);
}
function buildTxtStr(q){
    var rs = '';
    q.forEach(function(item){
        if(item instanceof Array){
            var exp = item[0];
            var filter = item[1];
            if(filter.length>0){
                rs += "+_fi("+exp+","+buildFilterStr(filter)+",comp)";
            }else{
                rs += "+("+exp+")";
            }
        }else if(item){
            rs += "+"+JSON.stringify(item);
        }
    });
    rs = rs.replace(/\n/mg,'');
    if(rs.length>0)rs = rs.substr(1);
    return rs;
}
function buildFilterStr(filters){
    var rs = '';
    filters.forEach(function(f){
        var tmp = '["'+f.name+'",['+f.param.toString()+']]';
        rs += ','+tmp;
    });
    return '['+rs.substr(1)+']';
}
/**
 * for DOM event delegation，support mouseEvent , touchEvent and pointerEvent
 */
function dispatch(type,e) {
    var p = e.target;
    var canceled = false;
    do{
        var uid = p._vid;
        if(uid === undefined)continue;
        var evMap = EVENT_MAP[type];
        if(!evMap)continue;
        var tmp = evMap[uid];
        if(!tmp)continue;

        var vnode = tmp[0];

        if(type == 'mouseleave'){
            var t = e.target;
            if(!contains(vnode.dom,t))return;
            var toElement = e.toElement || e.relatedTarget;
            if(contains(vnode.dom,toElement))return;
            
            var i = vnodes_mouseEntered.indexOf(vnode);
            if(i>-1)vnodes_mouseEntered.splice(i,1);
        }
        if(type == 'mouseenter'){
            var t = e.target;
            var fromElement = e.relatedTarget;
            if(contains(vnode.dom,t) && vnode.dom != t && vnodes_mouseEntered.indexOf(vnode)>-1)return;
            if(fromElement && contains(vnode.dom,fromElement))return;
            vnodes_mouseEntered.push(vnode);
        }

        var filter = tmp[1];

        if(type.indexOf('key')===0 && filter){
            if(e.key.toLowerCase() != filter)continue;
        }

        var fn = tmp[2];
        var cid = tmp[3];
        var isFn = tmp[4];
        var comp = impex._cs[cid];
        if(isFn){
            fn.call(comp,e,vnode);
        }else{
            var args = [comp,e,vnode];
            if(vnode._forScopeQ)
                for(var i=0;i<vnode._forScopeQ.length;i++){
                    args.push(vnode._forScopeQ[i]);
                }
            fn.apply(comp,args);
        }

        canceled = e.cancelBubble;
        
    }while((p = p.parentNode) && p.tagName != 'BODY' && !canceled);
}
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
//scope vars
var vnodes_mouseEntered = [];

//touch/mouse/pointer events
var userAgent = self.navigator.userAgent.toLowerCase();
var isAndroid = userAgent.indexOf('android')>0?true:false;
var isIphone = userAgent.indexOf('iphone')>0?true:false;
var isIpad = userAgent.indexOf('ipad')>0?true:false;
var isWphone = userAgent.indexOf('windows phone')>0?true:false;
var isMobile = isIphone || isIpad || isAndroid || isWphone;
if(isMobile){
    var FLING_INTERVAL = 200;
    var lastTapTime = 0;
    var timer;
    var hasMoved = false;
    var canceled = false;
    var fling_data;
    ///////////////////// touch events /////////////////////
    document.addEventListener('touchstart',doStart,true);
    document.addEventListener('touchmove',doMove,true);
    document.addEventListener('touchend',doEnd,true);
    document.addEventListener('touchcancel',doCancel,true);
    function doStart(e){
        dispatch('touchstart',e);
        dispatch('pointerdown',e);

        //start timer
        timer = setTimeout(function(){
            dispatch('press',e);
        },800);

        hasMoved = false;
        canceled = false;

        //handle fling
        var touch = e.touches[0];
        fling_data = {
            x:touch.clientX,
            y:touch.clientY,
            t:Date.now()
        };
    }
    function doMove(e){
        clearTimeout(timer);

        dispatch('touchmove',e);
        dispatch('pointermove',e);

        hasMoved = true;
    }
    function doCancel(e){
        clearTimeout(timer);

        canceled = true;
        dispatch('touchcancel',e);
        dispatch('pointercancel',e);
    }
    function doEnd(e){
        clearTimeout(timer);
        
        dispatch('touchend',e);
        dispatch('pointerup',e);

        if(canceled)return;

        if(!hasMoved){
            dispatch('tap',e);

            if(Date.now() - lastTapTime < 300){
                dispatch('dbltap',e);
            }

            lastTapTime = Date.now();
        }else{
            var touch = e.changedTouches[0];
            var dx = touch.clientX,
                dy = touch.clientY;

            var data = fling_data;
            var sx = data.x,
                sy = data.y,
                st = data.t;

            var long = Date.now() - st;
            var s = Math.sqrt((dx-sx)*(dx-sx)+(dy-sy)*(dy-sy)) >> 0;
            //时间小于interval并且位移大于20px才触发fling
            if(long <= FLING_INTERVAL && s > 20){
                var r = Math.atan2(dy-sy,dx-sx);

                var extra = {
                    slope:r,
                    interval:long,
                    distance:s
                }

                dispatch('fling',e,extra);
            }
        }
    }
}else{
    ///////////////////// 鼠标事件分派器 /////////////////////
    document.addEventListener('click',doClick,true);
    document.addEventListener('dblclick',doDblClick,true);
    document.addEventListener('mousedown',doMousedown,true);
    document.addEventListener('mousemove',doMousemove,true);
    document.addEventListener('mouseup',doMouseup,true);
    window.addEventListener('blur',doMouseCancel,true);
    var type = self.onmousewheel == null?'mousewheel':'DOMMouseScroll';
    document.addEventListener(type,doMousewheel,true);

    document.addEventListener('mouseout',doMouseout,true);
    document.addEventListener('mouseover',doMouseover,true);

    var inited = true;
    var lastClickTime = 0;
    var timer;

    function doClick(e) {
        dispatch('click',e);
        dispatch('tap',e);
    }

    function doDblClick(e) {
        dispatch('dblclick',e);
        dispatch('dbltap',e);
    }
        
    function doMousedown(e){
        dispatch('mousedown',e);
        dispatch('pointerdown',e);

        //start timer
        timer = setTimeout(function(){
            dispatch('press',e);
        },800);
    }
    function doMousemove(e){
        clearTimeout(timer);

        dispatch('mousemove',e);
        dispatch('pointermove',e);
    }
    function doMouseup(e){
        clearTimeout(timer);

        dispatch('mouseup',e);
        dispatch('pointerup',e);
    }
    function doMouseCancel(e){
        clearTimeout(timer);

        dispatch('pointercancel',e);                
    }
    function doMouseout(e){
        dispatch('mouseout',e);
        dispatch('mouseleave',e);

        //check entered
        var t = e.target;
        var toDel = [];
        vnodes_mouseEntered.forEach(function(vnode) {
            if(!contains(vnode.dom,t))return;
            var toElement = e.toElement || e.relatedTarget;
            if(contains(vnode.dom,toElement))return;
            
            toDel.push(vnode);
        });
        toDel.forEach(function(vnode) {
            var i = vnodes_mouseEntered.indexOf(vnode);
            vnodes_mouseEntered.splice(i,1);
        });
    }
    function doMouseover(e){
        dispatch('mouseover',e);
        dispatch('mouseenter',e);
    }
    function doMousewheel(e){
        dispatch('mousewheel',e);
    }
}

//model events
document.addEventListener('input',function(e){
    dispatch('input',e);
},true);
document.addEventListener('change',function(e){
    dispatch('change',e);
},true);

//keyboard events
document.addEventListener('keydown',function(e){
    dispatch('keydown',e);
},true);
document.addEventListener('keypress',function(e){
    dispatch('keypress',e);
},true);
document.addEventListener('keyup',function(e){
    dispatch('keyup',e);
},true);

//focus events
document.addEventListener('focus',function(e){
    dispatch('focus',e);
},true);
document.addEventListener('blur',function(e){
    dispatch('blur',e);
},true);

//mousewheel
var mousewheel = self.onwheel==null?'wheel':'mousewheel';
document.addEventListener(mousewheel,function(e){
    dispatch('wheel',e);
},true);

//scroll
document.addEventListener('scroll',function(e){
    dispatch('scroll',e);
},true);
/**
 * 当属性发生变更时，一个变更对象会被创建并通过watcher传递给handler
 */
function Change(name,newVal,oldVal,type,object){
	this.name = name;
	this.newVal = newVal;
	this.oldVal = oldVal;
	this.type = type;
	this.object = object;
}
/**
 * 用于关联属性的观察器。当属性通知观察器更新时，观察器需要调用不同的逻辑处理器
 */
function Watcher(handler,comp){
	this.key;
	this.handler = handler;
	this.component = comp;
	this.monitors = [];

	comp._watchers.push(this);
}
Watcher.prototype = {
	/**
	 * 更新处理
	 */
	update:function(change) {
		this.handler && this.handler.call(this.component,change,this);
	},
	//销毁watcher
	dispose:function() {
		this.monitors.forEach(function(m){
			m.removeWatcher(this);
		},this);
		
		this.component = 
		this.handler = 
		this.monitors = 
		this.key = null;
	},
	depend:function(monitor) {
		if(this.monitors.indexOf(monitor)<0)
			this.monitors.push(monitor);
	}
};
/**
 * 监控属性的变更以及依赖收集
 */
function Monitor(){
	this.key;
	this.target;
	this.value;
	this.watchers = [];
}
Monitor.prototype = {
	/**
	 * 通知watcher进行更新
	 */
	notify:function(newVal,type) {
		this.value = newVal;

		var c = new Change(this.key,newVal,this.value,type,this.target);
		this.watchers.forEach(function(watcher) {
			watcher.key = this.key;
			watcher.update(c);
		},this);
	},
	/**
	 * 收集依赖
	 */
	collect:function() {
		if(Monitor.target){
			Monitor.target.depend(this);
			if(this.watchers.indexOf(Monitor.target)<0)
				this.watchers.push(Monitor.target);
		}
	},
	/**
	 * 删除已监控的watcher
	 */
	removeWatcher:function(watcher) {
		var i = this.watchers.indexOf(watcher);
		if(i>-1){
			this.watchers.splice(i,1);
		}
		console.log('removeWatcher',this.key)
	}
};
/**
 * 兼容IE11的observer实现，包括
 * 	watcher
 *  组件参数依赖
 *  计算属性
 *  ...
 */
function observe(state,target) {
   	target.$state = defineProxy(state,null,target,true);
}
function defineProxy(state,pmonitor,target,isRoot) {
    var t = Array.isArray(state)?wrapArray([],target,pmonitor):{};
    for(var k in state){
        var v = state[k];
        var react = null;
        var monitor = null;

        //对象被重新赋值后出发
        if(pmonitor && pmonitor.value){
            var desc = Object.getOwnPropertyDescriptor(pmonitor.value,k);
            if(desc && desc.get){
                monitor = desc.get.__mm__;
            }
        }
        
        //monitor has existed
        var desc = Object.getOwnPropertyDescriptor(state,k);
        if(desc && desc.get){
            monitor = desc.get.__mm__;
        }
        if(!monitor){
            monitor = new Monitor();
        }
        if(isObject(v)){
            v = defineProxy(v,monitor,target,false);
        }
        proxy(k,v,t,target,isRoot,monitor);
    }
    return t;
}
function proxy(k,v,t,target,isRoot,monitor) {
    monitor.key = k;
    monitor.target = t;
    monitor.value = v;
    var getter = function() {
            //收集依赖
            monitor.collect();

            return monitor.value;
        };
    Object.defineProperty(getter,'__mm__',{value:monitor});
    var handler = {
        enumerable:true,
        configurable:true,
        get:getter,
        set:function(v) {
            if(v === monitor.value)return;
            
            if(isObject(v)){
                v = defineProxy(v,monitor,target,false);
                if (Array.isArray(v)) {
                    v = wrapArray(v,target,monitor);
                }
            }
            
            //触发更新
            monitor.notify(v,'update');
        }
    };
    
    Object.defineProperty(t,k,handler);
    if(isRoot){
        Object.defineProperty(target,k,handler);
    }
    return monitor;
}
var AP_PUSH = Array.prototype.push;
var AP_POP = Array.prototype.pop;
var AP_SHIFT = Array.prototype.shift;
var AP_UNSHIFT = Array.prototype.unshift;
var AP_SPLICE = Array.prototype.splice;
var AP_REVERSE = Array.prototype.reverse;
var AP_SORT = Array.prototype.sort;
function wrapArray(ary,component,monitor) {
    if(ary.push !== AP_PUSH)return ary;
    Object.defineProperties(ary,{
        'push':{
            value:function() {
                var bl = this.length;
                var nl = AP_PUSH.apply(this,arguments);
                if(nl > bl){
                    //proxy
                    var rv = defineProxy(this,monitor,component,false);
                    monitor.notify(rv,'add');
                }
                return nl;
            }
        },
        'pop':{
            value:function() {
                var bl = this.length;
                var rs = AP_POP.call(this);
                if(this.length < bl){
                    monitor.notify(this,'del');
                }
                return rs;
            }
        },
        'unshift':{
            value:function() {
                var bl = this.length;
                var nl = AP_UNSHIFT.apply(this,arguments);
                if(nl > bl){
                    //proxy
                    var rv = defineProxy(this,monitor,component,false);
                    monitor.notify(rv,'add');
                }
                return nl;
            }
        },
        'shift':{
            value:function() {
                var bl = this.length;
                var rs = AP_SHIFT.call(this);
                if(this.length < bl){
                    monitor.notify(this,'del');
                }
                return rs;
            }
        },
        'splice':{
            value:function() {
                var type = null;
                if(arguments[1]>-1){
                    type = 'del';
                }
                if(arguments.length>2){
                    type = type=='del'?'update':'add';
                }
                var bl = this.length;
                var ary = AP_SPLICE.apply(this,arguments);
                if(type != 'del'){
                    //proxy
                    var rv = defineProxy(this,monitor,component,false);
                    monitor.notify(this,type);
                }
                if((ary && ary.length>0) || bl != this.length){
                    monitor.notify(this,type);
                }
                return ary;
            }
        },
        'reverse':{
            value:function() {
                if(this.length<1)return this;

                AP_REVERSE.call(this);

                monitor.notify(this,'update');
                
                return this;
            }
        },
        'sort':{
            value:function(sortby) {
                if(this.length<1)return this;

                AP_SORT.call(this,sortby);

                monitor.notify(this,'update');

                return this;
            }
        },
    });

    return ary;
}
/**
 * 虚拟节点
 * 保存编译前和编译后的信息
 */
var vn_counter = 0;
var rn_counter = 0;
function RawNode(tag) {
    this.rid = rn_counter++;
    this.tag = tag;
    this.children = [];
    this.directives = {};//{name:[dName,value,{dName,dArgsAry,dFilter},{vExp,vFilterAry}]
    this.attributes = {};
    this.txtQ;
    this.slotMap = {};
    this.outerHTML;
    this.innerHTML;
}
RawNode.prototype = {
    getInnerHTML:function() {
        var r = new RegExp('<\s*\/\s*'+this.tag+'\s*>','img');
        var rs = this.innerHTML.trim();
        var match = r.exec(rs);
        if(match){
            return rs.substring(0,match.index);
        }
        return rs;
    },
    getOuterHTML:function (){
        return this.outerHTML+this.getInnerHTML()+'</'+this.tag+'>';
    }
}

function VNode(tag,rawNode){
    this.tag = tag;
    this.txt;
    this.children = [];
    this.dom;
    this.vid = vn_counter++;
    //和真实DOM保持一致的当前节点属性，
    //不仅包含原始属性，也可能包含通过指令或者接口调用而产生的其他属性
    this.attributes;
    //[name,value,{dName,dArgsAry,dFilter},{vExp,vFilterAry}]
    this.directives = [];
    this._hasEvent;
    this._slots;
    this._comp;//组件
    this._forScopeQ;
    //原始信息
    this.raw = rawNode;
}
VNode.prototype = {
    /**
     * 绑定事件到该节点
     * @param {String} type 事件类型
     * @param {String|Function} exp 表达式或回调函数
     * @param {String} filter 过滤表达式
     */
    on:function(type,exp,filter){
        var evMap = EVENT_MAP[type];
        if(!evMap){
            evMap = EVENT_MAP[type] = {};
        }
        var fn = false;
        if(isFunction(exp)){
            fn = true;
        }
        if(fn){
            evMap[this.vid] = [this,filter,exp,this._cid,fn];
        }else{
            var declare = this.getAttribute('var');
            if(declare){
                var list = declare.replace(/^{|}$/mg,'').split(',');
                var str = '';
                list.forEach(function(de) {
                    var pair = de.split(':');
                    str += 'var '+ pair[0] +'='+pair[1]+';';
                });
                declare = str;
            }
            var forScopeStart = '',forScopeEnd = '';
            if(this._forScopeQ)
                for(var i=0;i<this._forScopeQ.length;i++){
                    forScopeStart += 'with(arguments['+(3/* event.js line 47 */+i)+']){';
                    forScopeEnd += '}';
                }
            evMap[this.vid] = [this,filter,new Function('comp,$event,$vnode','with(comp){'+forScopeStart+declare+";"+exp+forScopeEnd+'}'),this._cid];
        }

        this._hasEvent = true;
    },
    /**
     * 卸载事件
     * @param {String} [type] 事件类型。为空时，卸载所有事件
     */
    off:function(type){
        var evMap = EVENT_MAP[type];
        if(evMap){
            evMap[this.vid] = null;
        }else if(!type){
            for(var k in EVENT_MAP){
                evMap = EVENT_MAP[k];
                if(evMap)evMap[this.vid] = null;
            }
        }
    },
    setAttribute:function(k,v){
        this.attributes[k] = v;
        return this;
    },
    getAttribute:function(k){
        return this.attributes[k];
    },
    removeAttribute:function(k) {
        this.attributes[k] = null;
        delete this.attributes[k];
    }
};
/**
 * VDOM构建器，用来构建VDOM树
 */
function createElement(comp,rid,children,diCalcExpMap,html,forScopeAry){
    var raw = RNODE_MAP[rid];
    var tag = raw.tag;
    var rs = new VNode(tag,raw);

    //把计算后的指令表达式值放入vnode中
    for(var k in raw.directives){
        var di = raw.directives[k];
        di[1] = diCalcExpMap[k];
        rs.directives.push([di[0],di[1],di[2],di[3]]);
    }
    //复制原始属性
    rs.attributes = Object.assign({},raw.attributes);
    rs._isEl = true;
    if(forScopeAry.length>0)
        rs._forScopeQ = forScopeAry;
    if (COMP_MAP[tag] || tag == 'component') {
        rs._comp = true;
        
        rs._slots = raw.children;
        rs._slotMap = raw.slotMap;
        return rs;
    }
    if(html != null){
        var forScopeStart = '',forScopeEnd = '';
        var root,str;
        var args = [comp,createElement,createTemplate,createText,createElementList,doFilter];
        //build for scope
        var scopeAry = [];
        var argCount = args.length;
        if(rs._forScopeQ)
            for(var i=0;i<rs._forScopeQ.length;i++){
                var tmp = 'forScope'+FORSCOPE_COUNT++;
                forScopeStart += 'with('+tmp+'){';
                forScopeEnd += '}';
                args.push(rs._forScopeQ[i]);
                scopeAry.push(tmp);
            }

        str = compileVDOMStr('<'+tag+'>'+html+'</'+tag+'>',comp,scopeAry);

        var argStr = scopeAry.length>0?','+scopeAry.toString():'';
        
        var fn = new Function('comp,_ce,_tmp,_ct,_li,_fi'+argStr,'with(comp){'+forScopeStart+'return '+str+';'+forScopeEnd+'}');
        root = fn.apply(comp,args);
        children = root.children || [];
    }
    
    if(children.length>0){
        rs.children = [];
        children.forEach(function(node){
            if(node){
                if(node instanceof Array){
                    node.forEach(function(c){
                        c.parent = rs;
                        rs.children.push(c);
                    });
                }else{
                    node.parent = rs;
                    rs.children.push(node);
                }//end if
            }//end if
        });
    }
    
    return rs;
}
function createTemplate(children,forScope){
    var fsq = null;
    if(forScope)
        fsq = [forScope];
    var rs = [];
    if(children.length>0){
        children.forEach(function(node){
            if(node){
                if(node instanceof Array){
                    node.forEach(function(c){
                        rs.push(c);
                        if(fsq){
                            var cfsq = c._forScopeQ;
                            if(cfsq){
                                c._forScopeQ = fsq.concat(cfsq);
                            }else{
                                c._forScopeQ = fsq;
                            }
                        }
                    });
                }else{
                    rs.push(node);
                    if(fsq){
                        var cfsq = node._forScopeQ;
                        if(cfsq){
                            node._forScopeQ = fsq.concat(cfsq);
                        }else{
                            node._forScopeQ = fsq;
                        }
                    }
                }//end if
            }//end if
        });
    }
    
    return rs;
}
function createText(txt){
    var rs = new VNode();
    rs.txt = txt && txt.toString?txt.toString():txt;
    return rs;
}
function createElementList(ds,iterator,scope,k,v){
    var rs = [];
    ds.forEach(function(item,i){
        var forScope = {$index:i};
        
        if(k)forScope[k] = i;
        forScope[v] = item;
        var tmp = iterator.call(scope,forScope);
        if(tmp){
            if(isArray(tmp)){
                rs = rs.concat(tmp);
            }else{
                rs.push(tmp);
            }
        }
    });
    return rs;
}
function doFilter(v,filters,comp){
    for(var i=0;i<filters.length;i++){
        var f = filters[i];
        var ins = FILTER_MAP[f[0]];
        if(!ins)ins = comp[f[0]];
        //removeIf(production)
        assert(ins,comp.$name,XERROR.COMPILE.NOFILTER,"can not find filter '"+f[0]+"'");
        //endRemoveIf(production)
        var params = f[1];
        params.unshift(v);
        v = ins.apply(comp,params);
    }
    return v;
}
/**
 * 把VDOM 转换成 真实DOM
 */

function transform(vnode,comp){
	var n,cid = comp.$id;
	if(vnode._isEl){
		n = document.createElement(vnode.tag);
		n._vid = vnode.vid;
		vnode._cid = cid;

		if(!vnode._comp){//uncompiled node dosen't exec directive
			//directive init
			var dircts = vnode.directives;
			if(vnode._comp_directives){
				dircts = dircts.concat(vnode._comp_directives);
			}

			if(dircts && dircts.length>0){
				dircts.forEach(function(di){
					var part = getDirectiveParam(di,comp);
					var d = part[0];
					d.onBind && d.onBind(vnode,part[1]);
				});
			}
		}

		for(var k in vnode.attributes){
			if(k[0] === BIND_AB_PRIFX)continue;
			var attr = vnode.attributes[k];
			n.setAttribute(k,attr);
		}

		if(vnode.attributes[ATTR_REF_TAG]){
			comp.$ref[vnode.attributes[ATTR_REF_TAG]] = n;
		}
		
		if(vnode._comp){
			var c = newComponentOf(vnode,vnode.tag,n,comp,vnode._slots,vnode._slotMap,vnode.attributes);
			vnode._comp = c;
		}else{
			if(vnode.children && vnode.children.length>0){
				for(var i=0;i<vnode.children.length;i++){
					var c = transform(vnode.children[i],comp);
					n.appendChild(c);
				}
			}
		}
		
	}else{
		n = document.createTextNode(filterEntityTxt(vnode.txt));
	}
	vnode.dom = n;
	return n;
}
function filterEntityTxt(str){
	return str && str.replace?str
	.replace(/&lt;/img,'<')
	.replace(/&gt;/img,'>')
	.replace(/&nbsp;/img,'\u00a0')
	.replace(/&amp;/img,'&'):str;
}
//创建有类型组件
function newComponentOf(vnode,type,el,parent,slots,slotMap,attrs){
	//handle component
	if(type == 'component'){
		type = attrs.is;
		if(attrs['.is']){//'.is' value can only be a var
			type = attrs['.is'];
			type = new Function('scope',"with(scope){return "+type+"}")(parent);
		}
	}
	var c = new Component(el);
	c.$name = type;
	//bind parent
	parent.$children.push(c);
	c.$parent = parent;
	c.$root = parent.$root;
	// c.$store = c.$root.$store;
	c.$vnode = vnode;
	c._props = attrs;
	//ref
	if(attrs[ATTR_REF_TAG]){
		parent.$ref[attrs[ATTR_REF_TAG]] = c;
	}
	//global
	if(attrs[ATTR_ID_TAG]){
		impex.id[attrs[ATTR_ID_TAG]] = c;
	}
	//custom even
	vnode.directives.forEach(function(di){
		var dName = di[2].dName;
		if(dName !== 'on')return;
		
		var type = di[2].dArgsAry[0];
		var exp = di[3].vExp;
		var fnStr = exp.replace(/\(.*\)/,'');
		var fn = new Function('comp','with(comp){return '+fnStr+'}');

		//parse context
		di[1] = exp.replace(/this\./img,'impex._cs["'+parent.$id+'"].');

        fn = fn.call(parent,parent);
        if(parent[fnStr])
        	fn = fn.bind(parent);
       
        if(fn){
			c.on(type,fn);
        }
	});

	c._slots = slots;
	c._slotMap = slotMap;
	c._innerHTML = vnode.raw.getInnerHTML();
	
	return c;
}
/**
 * VDOM对比模块
 * 包括
 *     原始dom对比
 *     组件对比
 *     属性对比
 *
 * DOM更新包括
 *     新增、删除、属性变更、文本变更
 *
 * 
 */

var forScopeQ = null;
function compareVDOM(newVNode,oldVNode,comp){
    forScopeQ = {};
    if(isSameVNode(newVNode,oldVNode)){
        compareSame(newVNode,oldVNode,comp);
    }else{
        //remove old,insert new
        insertBefore(newVNode,oldVNode,oldVNode.parent?oldVNode.parent.children:null,oldVNode.parent,comp);
        removeVNode(oldVNode);
    }
    return forScopeQ;
}
function isSameComponent(nv,ov) {
    var c = impex._cs[ov._cid];
    if(!c)return false;
    //compare attrs
    var nas = nv.raw.attributes;
    var oas = c.$vnode.raw.attributes;
    if(Object.keys(nas).length !== Object.keys(oas).length)return false;
    for(var k in nas){
        if(isUndefined(oas[k]))return false;
    }
    //compare slots
    return nv.raw.getInnerHTML() == c._innerHTML;
}
function compareSame(newVNode,oldVNode,comp){
    if(newVNode._comp){
        forScopeQ[oldVNode._cid] = newVNode._forScopeQ;
        //update directive of components
        oldVNode._comp_directives = newVNode.directives;
        return;
    }

    if(newVNode.tag){
        //update events forscope
        oldVNode._forScopeQ = newVNode._forScopeQ;
        
        var renderedAttrs = Object.assign({},oldVNode.attributes);
        //overwirte raw attrs
        oldVNode.raw.attributes = newVNode.raw.attributes;
        oldVNode.attributes = {};

        //bind _attr
        for(var k in oldVNode.raw.attributes){
            oldVNode.attributes[k] = oldVNode.raw.attributes[k];
        }

        var nvdis = newVNode.directives,
            ovdis = oldVNode.directives;
        var nvDiMap = getDirectiveMap(nvdis),
            ovDiMap = getDirectiveMap(ovdis);
        var add=[],del=[],update=[];
        //compare dirs
        for(var i=ovdis.length;i--;){
            var odi = ovdis[i];
            var odiStr = odi[0]+odi[3];
            if(!nvDiMap[odiStr]){
                del.push(odi);
            }
        }
        for(var i=nvdis.length;i--;){
            var ndi = nvdis[i];
            var ndiStr = ndi[0]+ndi[3];
            if(ovDiMap[ndiStr]){
                ovDiMap[ndiStr][2] = ndi[2];
                update.push(ndi);
            }else{
                add.push(ndi);
            }
        }
        //do del
        for(var i=del.length;i--;){
            var index = oldVNode.directives.indexOf(del[i]);
            oldVNode.directives.splice(index,1);

            var part = getDirectiveParam(del[i],comp);
            var d = part[0];
            d.onDestroy && d.onDestroy(oldVNode,part[1]);
        }
        //do update
        update.forEach(function(di){
            var part = getDirectiveParam(di,comp);
            var d = part[0];
            d.onUpdate && d.onUpdate(oldVNode,part[1],oldVNode.dom);
        });
        //add bind
        add.forEach(function(di){
            oldVNode.directives.push(di);
            
            var part = getDirectiveParam(di,comp);
            var d = part[0];
            d.onBind && d.onBind(oldVNode,part[1]);
        });
        //rebind component's
        if(oldVNode._comp_directives){
            oldVNode._comp_directives.forEach(function(di){
                
                var part = getDirectiveParam(di,comp);
                var d = part[0];
                d.onBind && d.onBind(oldVNode,part[1]);
            });
        }

        //for unstated change like x-html
        updateAttr(comp,oldVNode.attributes,renderedAttrs,oldVNode.dom,oldVNode.tag);
    }else{
        if(newVNode.txt !== oldVNode.txt){
            updateTxt(newVNode,oldVNode);
        }
    }

    if(newVNode.children && oldVNode.children){
        compareChildren(newVNode.children,oldVNode.children,oldVNode,comp);
    }else if(newVNode.children){
        //插入新的整个子树
        insertChildren(oldVNode,newVNode.children,comp);
    }else if(oldVNode.children && oldVNode.children.length>0){
        //删除旧的整个子树
        removeVNode(oldVNode.children);
    }
}
function getDirectiveMap(directives){
    var map = {};
    for(var i=directives.length;i--;){
        var di = directives[i];
        var diStr = di[0]+di[3];
        map[diStr] = di;
    }
    return map;
}
function compareChildren(nc,oc,op,comp){
    if(nc.length<1){
        if(oc.length>0)
            removeVNode(oc);
        return;
    }
    var osp = 0,oep = oc.length-1,
        nsp = 0,nep = nc.length-1,
        os = oc[0],oe = oc[oep],
        ns = nc[0],ne = nc[nep];

    while(osp <= oep && nsp <= nep){
        if(isSameVNode(ns,os)){
            compareSame(ns,os,comp);
            os = oc[++osp],
            ns = nc[++nsp];
            continue;
        }else if(isSameVNode(ne,oe)){
            compareSame(ne,oe,comp);
            oe = oc[--oep],
            ne = nc[--nep];
            continue;
        }else if(isSameVNode(ne,os)){
            insertBefore(os,next(oe),oc,op,comp);
            os = oc[osp];oep--;
            ne = nc[--nep];
            continue;
        }else if(isSameVNode(ns,oe)){
            insertBefore(oe,os,oc,op,comp);
            oe = oc[oep];osp++;
            ns = nc[++nsp];
            continue;
        }else{
            //todo xid
            
            //插入ov之前，并删除ov
            insertBefore(ns,os,oc,op,comp);
            removeVNode(os);
            os = oc[++osp],
            ns = nc[++nsp];
        }
    }
    //在osp位置，插入剩余的newlist，删除剩余的oldlist
    if(osp == nsp && oep>nep){//right match case
        var toDelList = oc.splice(osp,oep - nep);
        if(toDelList.length>0){
            removeVNode(toDelList);
        }
    }else if(osp <= oep && oep>0){
        var toDelList = oc.splice(osp,oep-osp+1);
        if(toDelList.length>0){
            removeVNode(toDelList);
        }
    }
    if(nsp <= nep){
        var toAddList = nsp==nep?[nc[nsp]]:nc.splice(nsp,nep-nsp+1);
        if(toAddList.length>0){
            insertBefore(toAddList,oc[osp],oc,op,comp);
        }
    }
}
function insertBefore(nv,target,list,targetParent,comp){
    if(list){
        //处理vdom
        if(nv.dom){//删除ov
            var i = list.indexOf(nv);
            if(i>-1)list.splice(i,1);
        }
        var p = targetParent;
        if(target){
            i = list.indexOf(target);
            p = p || target.parent;
            if(isArray(nv)){
                for(var l=nv.length;l--;){
                    nv[l].parent = p;
                }
                var args = [i,0].concat(nv);
                list.splice.apply(list,args);
            }else{
                nv.parent = p;
                list.splice(i,0,nv);
            }//end if
        }else{
            if(isArray(nv)){
                nv.forEach(function(n){
                    list.push(n);
                    n.parent = p;
                });
            }else{
                nv.parent = p;
                list.push(nv);
            }//end if
        }
    }
    //处理dom
    var dom = nv.dom;
    var compAry = [];
    if(!dom){
        if(isArray(nv)){
            var fragment = document.createDocumentFragment();
            for(var i=0;i<nv.length;i++){
                var vn = nv[i];
                var tmp = transform(vn,comp);

                fragment.appendChild(tmp);
            }
            dom = fragment;
        }else{
            dom = transform(nv,comp);
        }
    }else{
        dom.parentNode.removeChild(dom);
    }
    // if(dom.parentNode)dom.parentNode.removeChild(dom);
    if(target){
        var tdom = target.dom;
        tdom.parentNode.insertBefore(dom,tdom);
    }else{
        targetParent.dom.appendChild(dom);
    }
}
function next(nv){
    var p = nv.parent;
    var i = p.children.indexOf(nv);
    return p.children[i+1];
}
function removeVNode(vnodes){
    if(!isArray(vnodes))vnodes = [vnodes];
    var parent = vnodes[0].parent;
    for(var i=vnodes.length;i--;){
        var vnode = vnodes[i];
        var k = parent.children.indexOf(vnode);
        if(k>-1){
            parent.children.splice(k,1);
        }
        var p = vnode.dom.parentNode;
        p && p.removeChild(vnode.dom);

        //todo...   release other resource
        if(impex._cs[vnode._cid] && vnode.getAttribute(DOM_COMP_ATTR)){
            impex._cs[vnode._cid].destroy();
        }
    }
}
function insertChildren(parent,children,comp){
    parent.children = children;
    var fragment = document.createDocumentFragment();
    var compAry = [];
    for(var i=0;i<children.length;i++){
        var vn = children[i];
        var dom = transform(vn,comp);
        fragment.appendChild(dom);
    }
    parent.dom.appendChild(fragment);
}
function isSameVNode(nv,ov){
    if(nv._comp){
        if(ov.tag === nv.tag)return true;//for loading component
        if(!ov.tag || (ov.getAttribute(DOM_COMP_ATTR) != nv.tag))return false;
        return isSameComponent(nv,ov);
    }
    return ov.tag === nv.tag;
}
function updateTxt(nv,ov){
    ov.txt = nv.txt;
    var dom = ov.dom;
    dom.textContent = nv.txt;
}
function updateAttr(comp,newAttrs,oldAttrs,dom,tag){
    //比较节点属性
    var nvas = newAttrs;
    var ovas = oldAttrs;
    var nvasKs = Object.keys(nvas);
    var ovasKs = Object.keys(ovas);
    var isInputNode = tag === 'input'; 
    for(var i=nvasKs.length;i--;){
        var k = nvasKs[i];
        var index = ovasKs.indexOf(k);
        if(index<0){
            dom.setAttribute(k,nvas[k]);
            if(isInputNode && k === 'value'){
                dom.value = nvas[k];
            }
        }else{
            if(nvas[k] != ovas[k]){
                dom.setAttribute(k,nvas[k]);
                if(isInputNode && k === 'value'){
                    dom.value = nvas[k];
                }
            }
            ovasKs.splice(index,1);
        }
    }
    for(var i=ovasKs.length;i--;){
        if(ovasKs[i] === DOM_COMP_ATTR)continue;
        dom.removeAttribute(ovasKs[i]);
    }

    //update ref
    if(newAttrs[ATTR_REF_TAG]){
        comp.$ref[newAttrs[ATTR_REF_TAG]] = dom;
    }

    //update new attrs
    var comp_attr = oldAttrs[DOM_COMP_ATTR];
    if(comp_attr)newAttrs[DOM_COMP_ATTR] = comp_attr;
}



/**
 * @classdesc 事件类，为所有组件提供自定义事件接口
 * 
 * @class 
 */
function EventEmitter(){
	this._eeMap = {};
}
EventEmitter.prototype = {
	/**
	 * 事件注册不支持队列。相同类型的事件注册会被覆盖
	 * @param  {String} type   事件类型
	 * @param  {Function} handler 回调函数
	 * @param  {Object} [context] 上下文
	 * @return {Object}   返回事件函数返回值
	 */
	on:function(type,handler,context) {
		this._eeMap[type] = [handler,context||this];
		return this;
	},
	/**
	 * 取消事件注册
	 * @param  {[type]} type [description]
	 * @return {[type]}      [description]
	 */
	off:function(type) {
		this._eeMap[type] = null;
	},
	emit:function(type){
		var pair = this._eeMap[type];
		if(!pair)return;
		var fn = pair[0],
			ctx = pair[1];
		if(!fn)return;

		var args = [];
		for(var i=1;i<arguments.length;i++){
			args.push(arguments[i]);
		}
		return fn.apply(ctx,args);
	},
	/**
	 * 获取事件，可以用来实现同步的事件处理
	 * @param  {String} type   事件类型
	 * @return {Array}  [handler,context]
	 */
	getEvent:function(type) {
		return this._eeMap[type];
	}
}
/**
 * @classdesc 组件类，包含视图、模型、控制器，表现为一个自定义标签。同内置标签样，
 * 组件也可以有属性。
 * <br/>
 * 组件可以设置事件或者修改视图样式等<br/>
 * 组件实例为组件视图提供了数据和控制
 * 组件可以包含组件，所以子组件视图中的表达式可以访问到父组件模型中的值
 * 
 * @class 
 */
function Component (el) {
	EventEmitter.call(this);

	this.$id = 'C_' + im_counter++;

	/**
	 * 对顶级元素的引用
	 * @type {HTMLElement}
	 */
	this.$el = el;
	/**
	 * 对子组件/dom的引用
	 * @type {Object}
	 */
	this.$ref = {};
	/**
	 * 组件标签引用
	 * @type {Object}
	 */
	this.$compTags = {};
	/**
	 * 组件类型，在创建时由系统自动注入
	 */
	this.$name;
	/**
	 * 对父组件的引用
	 * @type {Component}
	 */
	this.$parent;
	/**
	 * 子组件列表
	 * @type {Array}
	 */
	this.$children = [];

	this._watchers = [];
	this._combiningChange = false;
	this._updateMap = {};

	impex._cs[this.$id] = this;
};
function F(){}
F.prototype = EventEmitter.prototype;  
Component.prototype = new F();  
Component.prototype.constructor = Component.constructor; 
ext({
	/**
	 * 监控当前组件中的模型属性变化，如果发生变化，会触发回调
	 * @param  {String} path 属性路径，比如a.b.c
	 * @param  {Function} cbk      回调函数，[newVal,oldVal,k]
	 */
	$watch:function(path,cbk){
		var watcher = new Watcher(function(change) {
			cbk && cbk.call(this,change.newVal,change.oldVal,change.name);
		},this);
		console.log('watcher变更监控。。。。',this.$id);
		Monitor.target = watcher;
		//find monitor
		var makeWatch = new Function('state','return state.'+path);

		makeWatch(this.$state);
		Monitor.target = null;
		console.log('watcher变更监控。。。。end');

		return this;
	},
	/**
	 * 销毁组件，会销毁组件模型，以及对应视图，以及子组件的模型和视图
	 */
	destroy:function(){
		this.onDestroy && this.onDestroy();
		var id = this.$id;

		this._watchers.forEach(function(watcher) {
			watcher.dispose();
		});
		this._watchers = null;

		if(this._updateTimer){
			clearTimeout(this._updateTimer);
			this._updateTimer = null;
		}

		if(this.$parent){
			
			var index = this.$parent.$children.indexOf(this);
			if(index > -1){
				this.$parent.$children.splice(index,1);
			}
			this.$parent = null;
		}

		while(this.$children.length > 0){
			this.$children[0].destroy();
		}

		this.$children = 
		impex._cs[id] = null;
		delete impex._cs[id];

		destroyDirective(this.$vnode,this);

		this.$vnode = 
		this.$el = 
		this.$compTags = 
		this.$root = 

		this.$ref = 
		this.$id = null;
	},
	/**
	 * 如果一个引用参数发生了改变，那么子组件必须重载该方法，
	 * 并自行判断是否真的修改了。但是更好的方案是，调用子组件的某个方法比如刷新之类
	 */
	onPropChange:function(key,newVal,oldVal){
		this[key] = newVal;
    },
    /**
     * 把一个未挂载的根组件挂载到指定的dom中
     * @param  {HTMLElement|String} target 挂载的目标dom或者选择器
     */
    $mount:function(target) {
    	if(target){
    		if(isString(target) && target.trim()){
	    		target = document.querySelector(target);
	    	}
	    	target.append(this.$el);
    	}

    	mountComponent(this,this.$vnode);
    },
    //解析组件参数，并编译视图
    _parse:function(opts) {
    	opts = opts || COMP_MAP[this.$name];
    	preprocess(this,opts);

    	//lc onCreate
    	this.onCreate && this.onCreate();

		if(this._processedTmpl)
			compileComponent(this);

		//挂载组件
		if(this.$el){
			this.$mount();
		}

		//init children
		for(var i = this.$children.length;i--;){
			this.$children[i]._parse();
		}
	}
},Component.prototype);

function getDirectiveParam(di,comp) {
	var dName = di[2].dName;
	var d = DIRECT_MAP[dName];
	var params = di[2].dArgsAry;
	var filter = di[2].dFilter;
	var v = di[1];
	var exp = di[3].vExp;

	return [d,{comp:comp,value:v,args:params,exp:exp,filter:filter}];
}

/*********	component handlers	*********/
function callDirective(vnode,comp,type){
	if(isUndefined(vnode.txt)){
		if(!vnode._comp){//uncompiled node  dosen't exec directive
			//directive init
			var dircts = vnode.directives;
			if(vnode._comp_directives){
				dircts = dircts.concat(vnode._comp_directives);
			}
			if(dircts && dircts.length>0){
				dircts.forEach(function(di){
					var part = getDirectiveParam(di,comp);
					var d = part[0];
					
					if(type == 0){
						d.onActive && d.onActive(vnode,part[1],vnode.dom);
					}else{
						d.onUpdate && d.onUpdate(vnode,part[1],vnode.dom);
					}
				});
			}

			if(vnode.children && vnode.children.length>0){
				for(var i=0;i<vnode.children.length;i++){
					callDirective(vnode.children[i],comp,type);
				}
			}//end if
		}//end if
	}
}

function destroyDirective(vnode,comp){
	if(isUndefined(vnode.txt)){
		if(!vnode._comp){//uncompiled node  dosen't exec directive
			//directive init
			var dircts = vnode.directives;
			if(vnode._comp_directives){
				dircts = dircts.concat(vnode._comp_directives);
			}
			if(dircts && dircts.length>0){
				dircts.forEach(function(di){
					var part = getDirectiveParam(di,comp);
					var d = part[0];
					
					d.onDestroy && d.onDestroy(vnode,part[1]);
				});
			}

			if(vnode.children && vnode.children.length>0){
				for(var i=0;i<vnode.children.length;i++){
					destroyDirective(vnode.children[i],comp);
				}
			}//end if
		}//end if
	}
}

/**
 * 在编译组件前进行预处理，包括
 * 	解析组件模型
 * 	参数绑定处理
 * 	模版处理
 * 	监控state
 * 	计算状态处理
 */
function preprocess(comp,opts) {
    var tmpl = null,
    	state = {},
    	computeState = {},
    	input = null;

    //解析组件模型
    if(opts){
    	tmpl = opts.template;
    	state = opts.state || {};
    	input = opts.input;
    	computeState = opts.computeState;

    	var keys = Object.keys(opts);
        for (var i=keys.length;i--;) {
            var k = keys[i];
            if(isFunction(opts[k])) {
            	comp[k] = opts[k];
            }
        }
		
		if(isFunction(state)){
			state = state.call(comp);
		}
	}

	//解析入参，包括
	//验证必填项和入参类型
	//建立变量依赖
	//触发onPropBind
	if(comp._props){
		var props = parseInputProps(comp,comp.$parent,comp._props,input);
		for(var k in props){
			state[k] = props[k];
		}
	}
	
	//编译前可以对模版视图或者slot的内容进行操作
	//可以通过RawNode来获取组件的innerHTML或者结构化的RawNode节点
	//但是任何试图修改raw的操作都是无效的，因为此时的vnode在组件编译后会被替换
	//顶级组件不会调用该方法
	if(tmpl){
		if(comp.onBeforeCompile && comp.vnode)
	        tmpl = comp.onBeforeCompile(tmpl,comp.vnode.raw);
		comp._processedTmpl = tmpl.trim()
	    .replace(/<!--[\s\S]*?-->/mg,'')
	    .replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/mg,'')
	    .replace(/^\s+|\s+$/img,' ')
	    .replace(/>\s([^<]*)\s</,function(a,b){
	            return '>'+b+'<';
	    });
	}	

	//observe state
	observe(state,comp);

	//removeIf(production)
    //check computeState
	for(var k in computeState){
		var cs = computeState[k];
		var fn = cs.get || cs;

		assert(fn instanceof Function,comp.$name,XERROR.COMPONENT.COMPUTESTATE,"invalid computeState '"+k+"' ,it must be a function or an object with getter");
	}
	//endRemoveIf(production)

	//compute state
	for(var k in computeState){
		var cs = computeState[k];
		var fn = cs.get || cs;
		//record hooks
		var watcher = new Watcher(function(change,wtc) {
			var v = wtc.fn.call(this,this);
			this[wtc.k] = v;
		},comp);
		watcher.k = k;
		watcher.fn = fn;

		Monitor.target = watcher;
		console.log('compute变更监控。。。。',comp.$id);
		var v = fn.call(comp);
		Monitor.target = null;
		console.log('compute变更监控。。。。end');

		comp.$state[k] = v;
		comp.$state = defineProxy(comp.$state,null,comp,true);
	}
}
function parseInputProps(comp,parent,parentAttrs,input,requires){

	//解析input，抽取必须项
	var requires = {};
	if(input){
		for(var k in input){
			var arg = input[k];
			if(arg.require){
				requires[k] = type;
			}
		}
	}

	var rs = {};
	if(parentAttrs){
		var depMap = {};
		for(var k in parentAttrs){
			var v = parentAttrs[k];
			if(k == ATTR_REF_TAG){
				continue;
			}
			k = k.replace(/-[a-z0-9]/g,function(a){return a[1].toUpperCase()});
			// xxxx
			if(k[0] !== PROP_TYPE_PRIFX){
				rs[k] = v;
				continue;
			}

			// .xxxx
			var n = k.substr(1);
			depMap[n] = v;
		}//end for
		//创建watcher
		for(k in depMap){
			var vn = comp.$vnode;
			var args = [parent];
			var forScopeStart = '',forScopeEnd = '';
			if(vn._forScopeQ)
		        for(var i=0;i<vn._forScopeQ.length;i++){
		            forScopeStart += 'with(arguments['+(1+i)+']){';
		            forScopeEnd += '}';
		            args.push(vn._forScopeQ[i]);
		        }
			var fn = new Function('scope','with(scope){'+forScopeStart+'return '+ depMap[k] +forScopeEnd+'}');
			//建立parent的watcher
			var watcher = new Watcher(function(change,wtc) {
				this[wtc.k] = wtc.fn.apply(parent,wtc.args);
			},comp);
			watcher.k = k;
			watcher.fn = fn;
			watcher.args = args;
			Monitor.target = watcher;
			console.log('入参变更监控。。。。',comp.$id);
			//removeIf(production)
			try{
		    //endRemoveIf(production)
		       	rs[k] = fn.apply(parent,args);
		    //removeIf(production)
		    }catch(e){
		        assert(false,comp.$name,XERROR.COMPONENT.DEP,"creating dependencies error with prop "+JSON.stringify(k)+": ",e);
		    }
		    //endRemoveIf(production)
		    Monitor.target = null;
		    console.log('入参变更监控。。。。end');
		}
		//验证input
		for(var k in rs){
			var v = rs[k];
			if(input && k in input){
				delete requires[k];
				
				//removeIf(production)
				//check type 
				if(isUndefined(input[k].type))continue;
				assert((function(k,v,input,component){
					if(!input[k] || !input[k].type)return false;
					var checkType = input[k].type;
					checkType = checkType instanceof Array?checkType:[checkType];
					var vType = typeof v;
					if(v instanceof Array){
						vType = 'array';
					}
					if(vType !== 'undefined' && checkType.indexOf(vType) < 0){
						return false;
					}
					return true;
				})(k,v,input,comp),comp.$name,XERROR.INPUT.TYPE,"invalid type ["+(v instanceof Array?'array':(typeof v))+"] of input prop ["+k+"];should be ["+(input[k].type && input[k].type.join?input[k].type.join(','):input[k].type)+"]");
				//endRemoveIf(production)
			}
		}//end for
	}

	//removeIf(production)
	//check requires
	assert(Object.keys(requires).length==0,comp.$name,XERROR.INPUT.REQUIRE,"input props ["+Object.keys(requires).join(',')+"] are required");
	//endRemoveIf(production)
	
	if(!rs)return;

	if(comp.onPropBind){
		rs = comp.onPropBind(rs);
	}

	return rs;	
}

function compileComponent(comp){
	//监控state
	var watcher = new Watcher(function(change) {
		this._updateMap[change.name] = change;
		if(!this._combiningChange){
			ready2notify(this);
		}
		console.log('组件属性变更',arguments);
	},comp);
	Monitor.target = watcher;
	console.log('组件属性变更监控。。。。',comp.$id);
	var vnode = buildVDOMTree(comp);
	Monitor.target = null;
	console.log('组件属性变更监控。。。。end');

	var pv = null;
	if(comp.$vnode){
		pv = comp.$vnode.parent;
		var cs = pv.children;
		var i = cs.indexOf(comp.$vnode);
		if(i>-1){
			cs.splice(i,1,vnode);
		}
		//绑定组件上的指令
		vnode._comp_directives = comp.$vnode.directives;
	}
	//覆盖编译后的vnode
	comp.$vnode = vnode;
	vnode.parent = pv;

	comp.onCompile && comp.onCompile(comp.$vnode);//must handle slots before this callback 
}
function ready2notify(comp) {
	comp._combiningChange = true;
	console.log('ready2notify',comp.$id)
	comp._updateTimer = setTimeout(function(){
		//通知组件更新
		updateComponent(comp,comp._updateMap);

		console.log('update',comp.$id)

		//restore
		comp._updateMap = {};
		comp._combiningChange = false;
	},20);
}
/**
 * 准备挂载组件到页面
 */
function mountComponent(comp,parentVNode){
	var dom = transform(comp.$vnode,comp);

	//beforemount
	comp.onBeforeMount && comp.onBeforeMount(dom);

	//mount
	//在子组件之前插入页面可以在onMount中获取正确的dom样式
	comp.$el.parentNode.replaceChild(dom,comp.$el);
	comp.$el = dom;

	if(comp.$name){
		comp.$el.setAttribute(DOM_COMP_ATTR,comp.$name);
		comp.$vnode.setAttribute(DOM_COMP_ATTR,comp.$name);
	}
	
	comp.onMount && comp.onMount(comp.$el);

	callDirective(comp.$vnode,comp,0);
}

//////	update flow
function updateComponent(comp,changeMap){
	var renderable = true;
	var syncPropMap = {};
	
	if(comp.onBeforeUpdate){
		renderable = comp.onBeforeUpdate(changeMap);
	}
	if(renderable === false)return;

	//rebuild VDOM tree
	var vnode = buildVDOMTree(comp);

	//diffing
	var forScopeQ = compareVDOM(vnode,comp.$vnode,comp);

	//mount subcomponents which created by VDOM 
	for(var i = 0;i<comp.$children.length;i++){
		var c = comp.$children[i];
		if(isUndefined(c._processedTmpl)){
			c._parse();
		}
	}

	comp.onUpdate && comp.onUpdate(changeMap);

	//call directives of subcomponents
	comp.$children.forEach(function(child) {
		var cvnode = child.$vnode;
		if(cvnode._comp_directives){
			cvnode._comp_directives.forEach(function(di){
				var part = getDirectiveParam(di,child);
				var d = part[0];
				
				d.onUpdate && d.onUpdate(cvnode,part[1],cvnode.dom);
			});
		}
	});
}

/**
 * get vdom tree for component
 */
function buildVDOMTree(comp){
    var root = null;
    var fn = compile(comp._processedTmpl,comp);
    //removeIf(production)
    try{
    //endRemoveIf(production)
        root = fn.call(comp,comp,createElement,createTemplate,createText,createElementList,doFilter);
    //removeIf(production)
    }catch(e){
        assert(false,comp.$name,XERROR.COMPILE.ERROR,"compile error with attributes "+JSON.stringify(comp.$attributes)+": ",e);
    }
    //endRemoveIf(production)
    
    return root;
}

	/**
	 * impex是一个用于开发web应用的组件式开发引擎，impex可以运行在桌面或移动端
	 * 让你的web程序更好维护，更好开发。
	 * impex的目标是让开发者基于web技术以最低的学习成本获得最大的收益，所以impex会尽量简单。
	 * impex由组件、指令、过滤器和服务这几个概念构成
	 * @namespace 
	 * @author {@link https://github.com/MrSoya MrSoya}
	 */
	var impex = new function(){
		/**
		 * 保存注册过的全局组件实例引用。
		 * 注册全局组件可以使用id属性.
		 * <p>
		 * 		<x-panel id="xPanel" >...</x-panel>
		 * </p>
		 * <p>
		 * 		impex.id.xPanel.todo();
		 * </p>
		 * @type {Object}
		 */
		this.id = {};

		/**
	     * 版本信息
	     * @type {Object}
	     * @property {Array} v 版本号
	     * @property {string} state
	     * @property {function} toString 返回版本
	     */
		this.version = {
	        v:[0,99,1],
	        state:'alpha',
	        toString:function(){
	            return impex.version.v.join('.') + ' ' + impex.version.state;
	        }
	    };
	    /**
	     * 官网地址
	     * @type {String}
	     * @constant
	     */
		this.website = 'http://impexjs.org';

		/**
		 * 设置impex参数
		 * @param  {Object} cfg 参数选项
		 * @param  {String} cfg.delimiters 表达式分隔符，默认{{ }}
		 */
		this.config = function(cfg){
			var delimiters = cfg.delimiters || [];
			EXP_START_TAG = delimiters[0] || '{{';
			EXP_END_TAG = delimiters[1] || '}}';

			EXP_EXP = new RegExp(EXP_START_TAG+'(.+?)(?:(?:(?:=>)|(?:=&gt;))(.+?))?'+EXP_END_TAG,'img');
		};

		/**
		 * 定义组件<br/>
		 * 定义的组件实质是创建了一个组件类的子类，该类的行为和属性由model属性
		 * 指定，当impex解析对应指令时，会动态创建子类实例<br/>
		 * @param  {string} name  组件名，全小写，必须是ns-name格式，至少包含一个"-"
		 * @param  {Object} model 组件模型对象
		 * @return this
		 */
		this.component = function(name,model){
			COMP_MAP[name] = model;
			
			return this;
		}

		/**
		 * 查询是否定义了指定组件
		 * @param  {String}  name 组件名称
		 * @return {Boolean}
		 */
		this.hasComponentOf = function(name){
			return !!COMP_MAP[name];
		}

		/**
		 * 定义指令
		 * @param  {string} name  指令名，不带前缀
		 * @param  {Object} model 指令模型
		 * @return this
		 */
		this.directive = function(name,model){
			DIRECT_MAP[name] = model;
			return this;
		}

		/**
		 * 定义过滤器。过滤器可以用在表达式或者指令中
		 * <p>
		 * 	{{ exp... => cap}}
		 * </p>
		 * 过滤器可以连接使用，并以声明的顺序依次执行，比如
		 * <p>
		 * 	{{ exp... => lower|cap}}
		 * </p>
		 * 过滤器支持参数，比如
		 * <p>
		 * 	{{ exp... => currency:'€':4}}
		 * </p>
		 * <p>
		 * 	x-for="list as item => orderBy:'desc'"
		 * </p>
		 * @param  {string} name 过滤器名
		 * @param  {Function} to 过滤函数。回调参数为 [value,params...]，其中value表示需要过滤的内容
		 * @return this
		 */
		this.filter = function(name,to){
			FILTER_MAP[name] = to;
			return this;
		}

		/**
		 * 渲染一个DOM节点组件，比如
		 * <pre>
		 * 	<x-stage id="entry" @click="showStage()"><x-stage>
		 * 	...
		 * 	impex.create({
		 * 		el:'$entry',
		 * 		state:{...},
		 * 		showStage:function(){}
		 * 	})
		 * </pre>
		 * 创建一个impex实例。
		 * 如果有el参数那就会以el为根渲染一个组件树，如果el参数是已经挂载的DOM节点或者选择器，
		 * 渲染完成后的组件树会自动挂载到页面，否则需要手动挂载
		 * 如果el参数为空，会创建一个只对state监控的非视图组件，无法挂载
		 * 
		 * @param  {Object} opts  
		 * @param  {var} [opts.el] DOM节点或选择器字符串或一段HTML代码
		 * @param  {Object} [opts.state] 组件状态，内部所有属性会被监控
		 * @param  {Object} [opts.computeState] 计算状态
		 * @param  {...} [functions] 所有函数都会直接绑定到组件上
		 */
		this.create = function(opts){
			var tmpl = null;
			var el = opts.el;
			if(el instanceof HTMLElement){
				//removeIf(production)
	            assert(el.tagName !== 'BODY','ROOT',XERROR.COMPONENT.CONTAINER,"root element must be inside <body> tag");
	            //endRemoveIf(production)
				tmpl = el.outerHTML;
			}else if(isString(el) && el.trim()){
				try{
            		el = document.querySelector(el);
            		//removeIf(production)
		            assert(el.tagName !== 'BODY','ROOT',XERROR.COMPONENT.CONTAINER,"root element must be inside <body> tag");
		            //endRemoveIf(production)
            		tmpl = el.outerHTML;
				}catch(e){
					tmpl = el;
				}
            }

            //创建根组件
			var root = new Component(isString(el)?null:el);
			root.$name = 'ROOT';
			root.$root = root;

			opts.template = tmpl;
			root._parse(opts);

            return root;
		}

		Object.defineProperty(this,'_cs',{enumerable: false,writable: true,value:{}});

		//for prototype API
		this.Component = Component;

		this.EventEmitter = EventEmitter;
	}


/**
 * 内建指令
 */
///////////////////// 视图控制指令 /////////////////////
/**
 * 内联样式指令
 * <br/>使用方式：
 * <div x-style="{'font-size': valExp}" >...</div>
 * <div x-style="{'fontSize': valExp}" >...</div>
 * <div x-style="'color:red;font-size:20px;'" >...</div>
 * <div x-style="obj" >...</div>
 */
impex.directive('style',{
    onBind:function(vnode,data){
        var v = data.value;
        if(isString(v)){
            var rs = {};
            var tmp = v.split(';');
            for(var i=tmp.length;i--;){
                if(!tmp[i])continue;
                var pair = tmp[i].split(':');
                rs[pair[0]] = pair[1];
            }
            v = rs;
        }
        var style = vnode.getAttribute('style')||'';
        for(var k in v){
            var n = this.filterName(k);
            var val = v[k];
            n = n.replace(/[A-Z]/mg,function(a){return '-'+a.toLowerCase()});
            style += n+':'+val+';';
            // if(val.indexOf('!important')){
            //     val = val.replace(/!important\s*;?$/,'');
            //     n = n.replace(/[A-Z]/mg,function(a){return '-'+a.toLowerCase()});
            //     style.setProperty(n, v, "important");
            // }else{
            //     style[n] = val;
            // }
        }
        vnode.setAttribute('style',style);
    },
    onUpdate:function(vnode,data) {
        vnode.setAttribute('style',vnode.raw.attributes.style);
        this.onBind(vnode,data);
    },
    onDestroy:function(vnode){
        if(isUndefined(vnode.raw.attributes.style)){
            vnode.removeAttribute('style');
        }else{
            vnode.setAttribute('style',vnode.raw.attributes.style);  
        }
        
    },
    filterName:function(k){
        return k.replace(/-([a-z])/img,function(a,b){
            return b.toUpperCase();
        });
    }
})
/**
 * 外部样式指令
 * <br/>使用方式：
 * <div x-class="'cls1 cls2 cls3 ...'" >...</div>
 * <div x-class="['cls1','cls2','cls3']" >...</div>
 * <div x-class="{cls1:boolExp,cls2:boolExp,cls3:boolExp}" >...</div>
 */
.directive('class',{
    onBind:function(vnode,data){
        var v = data.value;
        var cls = vnode.getAttribute('class')||'';
        var clsAry = cls.trim().replace(/\s+/mg,' ').split(' ');
        var appendCls = null;
        if(isString(v)){
            appendCls = v.split(' ');
        }else if(isArray(v)){
            appendCls = v;
        }else{
            appendCls = [];
            for(var k in v){
                var val = v[k];
                if(val)
                    appendCls.push(k);
            }
        }
        appendCls.forEach(function(c) {
            if(c && clsAry.indexOf(c.trim())<0){
                clsAry.push(c);
            }
        });
        
        vnode.setAttribute('class',clsAry.join(' '));
    },
    onUpdate:function(vnode,data) {
        vnode.setAttribute('class',vnode.raw.attributes.class);
        this.onBind(vnode,data);
    },
    onDestroy:function(vnode,data) {
        if(isUndefined(vnode.raw.attributes.class)){
            vnode.removeAttribute('class');
        }else{
            vnode.setAttribute('class',vnode.raw.attributes.class);   
        }
    }
})
/**
 * 绑定视图事件，以参数指定事件类型，用于减少单一事件指令书写
 * <br/>使用方式1：<img x-on:load:mousedown:touchstart="hi()" x-on:dblclick="hello()">
 * <br/>使用方式2：<img :load:mousedown:touchstart="hi()" :dblclick="hello()">
 */
.directive('on',{
    onBind:function(vnode,data){
        var args = data.args;
        for(var i=args.length;i--;){
            vnode.on(args[i],data.value,data.filter);
        }
    },
    onDestroy:function(vnode,data){
        var args = data.args;
        for(var i=args.length;i--;){
            vnode.off(args[i]);
        }
    }
})
/**
 * 绑定视图属性，并用表达式的值设置属性
 * <br/>使用方式：<img x-bind:src="exp">
 */
.directive('bind',{
    onBind:function(vnode,data){
        var args = data.args;
        for(var i=args.length;i--;){
            var p = args[i];

            switch(p){
                case 'style':
                    DIRECT_MAP[p].onUpdate(vnode,data);
                    break;
                case 'class':
                    DIRECT_MAP[p].onUpdate(vnode,data);
                    break;
                default:
                    vnode.setAttribute(p,data.value);
            }//end switch
        }//end for
    },
    onUpdate:function(vnode,data) {
        this.onBind(vnode,data);
    },
    onDestroy:function(vnode,data) {
        var args = data.args;
        for(var i=args.length;i--;){
            var p = args[i];
            switch(p){
                case 'style':
                    DIRECT_MAP[p].onDestroy(vnode,data);
                    break;
                case 'class':
                    DIRECT_MAP[p].onDestroy(vnode,data);
                    break;
                default:
                    vnode.removeAttribute(p);
            }//end switch
        }//end for
    }
})
/**
 * 控制视图显示指令，根据表达式计算结果控制
 * <br/>使用方式：<div x-show="exp"></div>
 */
.directive('show',{
    onBind:function(vnode,data){
        var style = vnode.getAttribute('style')||'';
        if(data.value){
            style = style.replace(/;display\s*:\s*none\s*;?/,'');
        }else{
            style = style.replace(/;display:none;/,'') + ';display:none;';
        }
        
        vnode.setAttribute('style',style);
        return style;
    },
    onUpdate:function(vnode,data,dom) {
        var style = this.onBind(vnode,data);
        dom.setAttribute('style',style);
    },
    onDestroy:function(vnode) {
        var style = vnode.getAttribute('style');
        if(!style)return;
        style = style.replace(/;display\s*:\s*none\s*;?/,'');
        vnode.setAttribute('style',style);
    }
})
/**
 * 隐藏视图显示指令，用于屏蔽指定渲染模块
 * <br/>使用方式：
 * <style>
 *     [x-cloak]{
            display: none;
        }
 * </style>
 * <div x-cloak></div>
 */
.directive('cloak',{})
///////////////////// 模型控制指令 /////////////////////
/**
 * 绑定模型属性，当控件修改值后，模型值也会修改
 * <br/>使用方式：<input x-model="model.prop">
 */
.directive('model',{
    onBind:function(vnode,data){
        vnode._exp = data.exp;
        switch(vnode.tag){
            case 'select':
                vnode.on('change',this.handleChange);
                break;
            case 'input':
                var type = vnode.attributes.type;
                if(type == 'radio' || type == 'checkbox'){
                    vnode.on('change',this.handleChange);
                    break;
                }
            default:
                vnode.on('input',handleInput);
        }
    },
    handleChange:function(e,vnode){
        var el = e.target;
        var tag = el.tagName.toLowerCase();
        var val = el.value;
        switch(tag){
            case 'textarea':
            case 'input':
                var type = el.getAttribute('type');
                switch(type){
                    case 'radio':
                        handleInput(e,vnode,this);
                        break;
                    case 'checkbox':
                        changeModelCheck(e,vnode,this);
                        break;
                }
                break;
            case 'select':
                var mul = el.getAttribute('multiple');
                if(mul !== null){
                    var parts = [];
                    for(var i=el.options.length;i--;){
                        var opt = el.options[i];
                        if(opt.selected){
                            parts.push(opt.value);
                        }
                    }
                    setModel(vnode,parts,this);
                }else{
                    handleInput(e,vnode,this);
                }
                break;
        }
    }
});

function handleInput(e,vnode,comp){
    var v = (e.target || e.srcElement).value;
    var toNum = vnode.getAttribute('number');
    if(!isUndefined(toNum)){
        v = parseFloat(v);
    }
    var debounce = vnode.getAttribute('debounce');
    if(debounce){
        if(vnode.debounceTimer){
            clearTimeout(vnode.debounceTimer);
            vnode.debounceTimer = null;
        }
        var that = this;
        vnode.debounceTimer = setTimeout(function(){
            clearTimeout(vnode.debounceTimer);
            vnode.debounceTimer = null;
            
            setModel(vnode,v,that || comp);
        },debounce);
    }else{
        setModel(vnode,v,this || comp);
    }
}
function changeModelCheck(e,vnode,comp){
    var t = e.target || e.srcElement;
    var val = t.value;
    var str = 'with(scope){return '+vnode._exp+'}';
    var fn = new Function('scope',str);
    var parts = null;
    if(!this){
        parts = fn(comp);
    }else{
        parts = fn(this);
    }
    if(isArray(parts)){
        parts = parts.concat();
    }else{
        parts = [parts];
    }
    if(t.checked){
        parts.push(val);
    }else{
        var i = parts.indexOf(val);
        if(i > -1){
            parts.splice(i,1);
        }
    }
    setModel(vnode,parts,comp);
}
function setModel(vnode,value,comp){
    var fn = new Function('comp','v','comp.'+vnode._exp+'= v;');
    fn(comp,value);
}
impex.filter('json',function(v){
    return JSON.stringify(v);
})

//filterBy:'xxx'
//filterBy:'xxx':'name'
//filterBy:filter
.filter('filterBy',function(v,key,inName){
    var ary = v;
    if(!isArray(ary)){
        return v;
    }
    var rs = [];
    if(isFunction(key)){
        for(var i=ary.length;i--;){
            var need = key.call(this,ary[i]);
            if(need){
                rs.unshift(ary[i]);
            }
        }
    }else{
        for(var i=ary.length;i--;){
            var item = ary[i];
            if(inName){
                if(!key || (item[inName]+'').indexOf(key) > -1){
                    rs.unshift(item);
                }
            }else{
                if(!key || item.indexOf && item.indexOf(key) > -1){
                    rs.unshift(item);
                }
            }
        }
    }
    return rs;
})

//[1,2,3,4,5] => limitBy:3:1   ----> [2,3,4]
.filter('limitBy',function(v,count,start){
    if(!isArray(v)){
        return v;
    }
    v = v.concat();
    if(!count)return v;
    return v.splice(start||0,count);
})

//[1,2,3,4,5] => orderBy:'':'desc'   ----> [5,4,3,2,1]
.filter('orderBy',function(v,key,dir){
    if(!key && !dir)return v;
    if(!isArray(v)){
        return v;
    }
    v = v.concat();
    v.sort(function(a,b){
        var x = key?a[key]:a,
            y = key?b[key]:b;

        if(typeof x === "string"){
            return x.localeCompare(y);
        }else if(typeof x === "number"){
            return x - y;
        }else{
            return (x+'').localeCompare(y);
        }
    });
    if(dir === 'desc'){
        v.reverse();
    }
    return v;
});

 	if ( typeof module === "object" && typeof module.exports === "object" ) {
 		module.exports = impex;
 	}else{
 		global.impex = impex;
 	}

 }(window||this);