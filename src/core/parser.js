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
var NODEPRIFIX = '>-)';
var NODESPLIT = '(>.<)';
var PRE = CMD_PREFIX+'pre';

function parseHTML(str){
    var startNodeData = null;
    var endNodeData;
    var stack = [];
    var compStack = [];
    var innerHTML = undefined;
    var roots = [];
    var compNode;
    var preRid = -1;
    var inPre = false;
    var preTxt = '';
    var rowNum = 0;
    var parentNode;

    var nodeList = str.replace(/(\n?\s*)?<\/?[^>]*>/img,function(a){return NODESPLIT+NODEPRIFIX+a+NODESPLIT}).split(NODESPLIT);
    nodeList.forEach(function(str) {
        var isTag = str.indexOf(NODEPRIFIX)==0;
        if(isTag)str = str.replace(NODEPRIFIX,'');

        //处理换行
        var tmp = countRows(str);
        var rows = tmp[0]
        rowNum += rows;
        str = tmp[1];

        if(!str.trim())return;

        if(isDefined(innerHTML)){
            var lines = '';
            for(var i=rows;i--;){
                lines += '\n';
            }
            innerHTML += lines+str;
        }

        if(inPre && isUndefined(innerHTML)){
            preTxt += str;
            return;
        }

        if(isTag){
            endNodeData = TAG_END_EXP.exec(str);
            if(endNodeData){
                //进入弹出流程
                var tagName = endNodeData[1];
                var tmp = stack[stack.length-1];
                if(tmp.tag == tagName)
                    stack.pop();

                if(compNode && compNode.tag == tagName){
                    compStack.pop();
                    compNode.innerHTML = innerHTML.substring(0,innerHTML.lastIndexOf(str));
                    innerHTML = undefined;
                    compNode = compStack[compStack.length-1];
                }

                return;
            }
            if(isDefined(innerHTML))return;

            startNodeData = TAG_START_EXP.exec(str);

            //进入压栈流程
            var tagName = startNodeData[1];

            if(tagName == PRE){
                inPre = true;
                preTxt = '';
                return;
            }
            //build RawNode
            var node = new RawNode(tagName);

            parentNode = stack[stack.length-1];
            if(parentNode){
                if(!parentNode.children)parentNode.children = [];
                parentNode.children.push(node);
            }else{
                roots.push(node);
            }
            if(COMP_MAP[tagName]){
                compNode = node;
                node.isComp = true;
                compStack.push(node);
                innerHTML = '';
            }
            var attrStr = startNodeData[2].trim();
            var attrAry = attrStr.match(TAG_ATTR_EXP);
            if(attrAry){
                parseAttrs(attrAry,node,rowNum,str,compNode);
            }

            if(VOIDELS.indexOf(tagName)<0)stack.push(node);
        }
        if(!isTag && isUndefined(innerHTML))
            parseHTML_txt(str,stack[stack.length-1],rowNum);
    });

    return roots;
}
function countRows(str) {
    var i = str.indexOf('\n');
    var rows = 0;
    while(i>-1){
        str = str.substr(i+1);
        rows++;
        i = str.indexOf('\n');
    }
    return [rows,str];
}
//替换slot为对应内容
function filterSlot(innerHTML,tmpl) {
    var slotTagExp = /<slot([^>]*)>.*?<\/slot>/img;
    var slotRefExp = /<([^\s]+)[^>]*slot="([^'"]+)"[^>]*>.*?<\/\1>/img;

    var rs = tmpl.replace(slotTagExp,function(match,attrs) {
        var name = null;
        if(attrs){
            /name\s*=\s*['"]([^'"]+)['"]/.exec(attrs);
            name = RegExp.$1;
        }
        if(name){
            var attrMatch;
            slotRefExp.lastIndex = 0;
            while((attrMatch=slotRefExp.exec(innerHTML))){
                if(attrMatch[2] == name)return attrMatch[0];
            }
        }
        return innerHTML;
    });
    return rs;
}

/**
 * 解析节点属性
 */
function parseAttrs(attrs,node,rowNum,str,compNode){
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

        //解析指令参数、标识符、类型
        var modifiers = null;
        if(aName.lastIndexOf(CMD_MODIFIER_DELIMITER)>0){
            modifiers = aName.split(CMD_MODIFIER_DELIMITER);
        }        
        var params = null;
        if(modifiers){
            params = modifiers.shift();
        }else{
            params = aName;
        }
        params = params.split(CMD_PARAM_DELIMITER);
        var dName = params.shift();
        if(params.length<1)params = null;

        //ref
        if(dName == ATTR_REF_TAG){
            node[ATTR_REF_TAG] = value;
            continue;
        }
        //slot
        if(dName == ATTR_SLOT_TAG){
            node[ATTR_SLOT_TAG] = value;
            continue;
        }


        var isEvent = false;
        var isBind = false;
        var isDi = false;
        if(dName.indexOf(CMD_PREFIX)===0){
            isDi = true;
        }else if(dName[0] === EVENT_AB_PRIFX){
            isEvent = true;
        }else if(dName[0] === BIND_AB_PRIFX){
            isBind = true;
        }
        //解析value
        var expStr = null,
            expFilterAry = null;
        if(value && (isDi||isEvent||isBind)){
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
            if(filterStr){
                expFilterAry = parseExpFilter(filterStr,false,rowNum,expStr,str.indexOf(attrStr)+attrStr.indexOf(expStr),node);
            }            

            //class & style
            if(!node.isComp && (dName.indexOf('class')>0 || dName.indexOf('style')>0)){
                node[dName.replace(/^(?:\.)|(?:x-)/,'')] = expStr;
                continue;
            }
        }

        var colPos = str.indexOf(attrStr);
        if(isDi)colPos += CMD_PREFIX.length;
        var waveLen = attrStr.length;
        
        if(isDi){
            dName = dName.substr(2);
            var parseDir = true;
            switch(dName){
                case 'for':
                    //removeIf(production)
                    setDebugMap(node,dName,rowNum,colPos,waveLen,'directs');
                    //endRemoveIf(production)
                    node.for = parseDirectFor(expStr,expFilterAry,compNode);
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
            //removeIf(production)
            switch(dName){
                case 'if':
                case 'else-if':
                case 'html':
                    setDebugMap(node,dName,rowNum,colPos,waveLen,'directs');
            }
            //endRemoveIf(production)

            if(parseDir){
                if(!node.directives){
                    node.directives = {};
                }
                var aName = toCamelCase(dName);
                node.directives[aName] = {
                    name:dName,
                    args:params,
                    modifiers:modifiers,
                    exp:expStr,
                    filters:expFilterAry
                };

                //removeIf(production)
                setDebugMap(node,aName,rowNum,colPos,waveLen,'directs');
                //endRemoveIf(production)
            }
        }else if(isEvent){
            dName = dName.substr(1);
            if(!node.events)node.events = {};
            var aName = toCamelCase(dName);
            node.events[aName] = {
                modifiers:modifiers,
                exp:expStr,
                args:params,
                modifiers:modifiers
            };
            //removeIf(production)
            setDebugMap(node,aName,rowNum,colPos,waveLen,'events');
            //endRemoveIf(production)
        }else{
            if(isBind){
                dName = dName.substr(1);
                value = expStr;
            }else{
                value = JSON.stringify(value);
            }
            if(!node.attrs)node.attrs = {};
            var aName = toCamelCase(dName);
            node.attrs[aName] = value;
            //removeIf(production)
            setDebugMap(node,aName,rowNum,colPos,waveLen,'attrs');
            //endRemoveIf(production)
        }
    }
}
function toCamelCase(str) {
    return str.replace(/\-[a-z]/g , function(a, b){
        return a.replace('-','').toUpperCase();
    });
}
function parseHTML_txt(str,node,rowNum){
    var txt = str//.trim();
    var txtQ = [];
    if(txt){
        var tn = new RawNode();
        var expData = null;
        var lastIndex = 0;
        while(expData = EXP_EXP.exec(txt)){
            var t = txt.substring(lastIndex,expData.index);
            if(t)txtQ.push(t);
            lastIndex = expData.index + expData[0].length;
            var k = expData[1];
            txtQ.push([k,parseExpFilter(expData[2],true,rowNum,expData[0],expData.index,tn,k)]);

            //removeIf(production)
            setDebugMap(tn,k,rowNum,str.replace(/\t/mg,'    ').indexOf(expData[0]),expData[0].length,'txt');
            //endRemoveIf(production)
        }
        if(lastIndex < txt.length){
            txtQ.push(txt.substr(lastIndex));
        }
        if(txtQ.length<1)txtQ.push(txt);
        tn.txtQ = txtQ;

        if(!node.children)node.children = [];
        node.children.push(tn);
    }
}
function parseExpFilter(filterStr,isTxt,rowNum,str,startPos,node){
    var filterAry = null;
    if(filterStr){
        filterAry = [];
        var filters = filterStr.split('|');
        for(var i=0;i<filters.length;i++){
            var parts = filters[i].split(':');
            var filterName = parts[0].trim();
            
            //removeIf(production)
            setDebugMap(node,str+":"+filterName,rowNum,str.indexOf(filterName)+startPos,filterName.length,'filter');
            //endRemoveIf(production)
            
            filterAry.push({
                name:filterName,
                param:parts.slice(1),
                id:str+":"+filterName,
                rid:node.rid
            });
        }
    }
    return filterAry;
}
//解析for语句：datasource，alias
//包括to和普通语法
function parseDirectFor(expStr,expFilterAry,compNode){
    var rs = null;//k,v,filters,ds1,ds2;
    var forExpStr = expStr;
    var filters = expFilterAry;
    forExpStr.match(/^([\s\S]*?)\s+as\s+([\s\S]*?)$/);
    
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