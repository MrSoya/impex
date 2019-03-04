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
    var preRid = -1;
    var outPre = true;
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
        //build RawNode
        if(outPre){
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
            if(attrAry){
                preRid = parseHTML_attrs(attrAry,node,compNode);
            }
        }
        

        if(preRid>-1 && outPre){
            outPre = false;
        }

        //handle void el root
        if(str.length<1)break;

        //handle slot
        if(outPre){
            if(tagName === SLOT){
                slotList.push([parentNode,node,node.attributes.name?node.attributes.name:null]);
            }else if(node.attributes.slot){
                var slotComp = compNode;
                if(slotComp === node){//component can be inserted into slots
                    slotComp = compStack[compStack.length-1-1];
                }
                if(slotComp)slotComp.slotMap[node.attributes.slot] = node;
            }
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
            if(outPre)parseHTML_txt(str.substr(0,nextIndex),parentNode);

            str = str.substr(nextIndex + nextNodeData[0].length);
        }else{
            if(outPre)parseHTML_txt(str.substr(0,endIndex),parentNode);

            var lastEndIndex = endIndex + endNodeData[0].length;
            TAG_END_EXP_G.lastIndex = 0;
            TAG_END_EXP_G.exec(str);
            do{
                var tmp = stack.pop();
                if(tmp === compNode){
                    compStack.pop();
                    compNode = compStack[compStack.length-1];
                }
                if(outPre && tmp === node){
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
                if(outPre && txt.trim()){
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
                if(!outPre && tmp.rid === preRid && stack[stack.length-1].rid !== preRid){
                    outPre = true;
                    preRid = -1;
                    var preTxt = new RawNode();
                    preTxt.txtQ = [parentNode.getInnerHTML()];
                    parentNode.children.push(preTxt);
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
       
        //pre only
        if(directive == 'pre')return node.rid;

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
                attrNode.push({dName:dName,dArgsAry:directive[1],dModifiers:directive[2]});
                attrNode.push({vExp:expStr,vFilterAry:expFilterAry});
                node.directives[aName] = attrNode;

                //props
                node.props[aName] = {v:value,isDi:aName};
            }
        }else{
            node.attributes[aName] = value;
            //props
            node.props[aName] = {v:value};
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
    var modifiers = null;
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
            case 'if':
            case 'else-if':
            case 'else':
            case 'for':
            case 'html':
            case 'pre':
            return c;
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
        var mIndex = params.indexOf(CMD_MODIFIER_DELIMITER);
        if(mIndex > -1){
            modifiers = params.substr(mIndex+1);
            modifiers = modifiers.split('.');
            params = params.substring(0,mIndex);
        }

        params = params.split(CMD_PARAM_DELIMITER);
    }

    return rs?[rs,params,modifiers]:rs;
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