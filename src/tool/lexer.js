//todo...cache exp
var lexer = (function(){

    var STR_EXP_START = /(['"])/,
        VAR_EXP_START = /[a-zA-Z$_]/,
        VAR_EXP_BODY = /[a-zA-Z$_0-9.]/;

    var keyWords = ['as','instanceof'];
    
    function Var(){
        return {
            subVars:{},
            words:[],
            segments:[],
            brakLength:0//记录顶级方括号的个数
        }
    }
    function typeDetect(l,sentence,varMap){
        if(VAR_EXP_START.test(l)){
            var rs = varParse(varMap,sentence);
            lastType = 'var';
            return rs;
        }else
        if(STR_EXP_START.test(l)){
            lastType = 'str';
            return strParse(sentence,RegExp.$1);
        }else{
            lastType = '';
            return l;
        }
    }
    function strParse(sentence,startTag){
        var escape = false;
        var literal = startTag;
        for(var i=1;i<sentence.length;i++){
            var l = sentence[i];
            if(l == '\\'){
                escape = true;
                literal += l;
                continue;
            }else
            if(!escape && l == startTag){
                return literal+startTag;
            }else{
                literal += l;
            }
            escape = false;
        }
    }
    function varParse(varMap,sentence,nested,parentVO){
        var literal = '';
        var stack = [];
        var stackBeginPos = -1;
        var lastWordPos = -1;
        var lastSegPos = -1;
        //记录当前变量信息
        var varObj = parentVO || Var();
        for(var i=0;i<sentence.length;i++){
            var l = sentence[i];
            if(stack.length>0){
                if(VAR_EXP_BODY.test(l)){
                    var vo = Var();
                    var varLiteral = varParse(varMap,sentence.substr(i),true,vo);
                    i = i + varLiteral.length - 1;

                    //words
                    var tmp = varLiteral;
                    if(VAR_EXP_START.test(varLiteral[0])){
                        varObj.subVars['.'+varLiteral] = vo;
                        //keywords check
                        if(keyWords.indexOf(tmp) < 0)
                            tmp = ['.'+tmp];
                    }
                    varObj.words.push(tmp);
                }else 
                if(l == ']'){
                    stack.pop();
                    if(stack.length == 0){
                        var part = sentence.substring(stackBeginPos,i+1);
                        literal += part;

                        varObj.segments.push(part);
                        lastSegPos = i;
                    }
                    //push words
                    varObj.words.push(']');
                    lastWordPos = i;

                }else{
                    //非var
                    var strLiteral = typeDetect(l,sentence.substr(i),varMap);
                    i = i + strLiteral.length - 1;
                    //push words
                    varObj.words.push(strLiteral);

                    lastWordPos = i;
                }
            }else{
                if(VAR_EXP_BODY.test(l)){
                    literal += l;

                    if(l=='.'){
                        var tmp = literal.substr(lastSegPos+1);
                        tmp = tmp.replace(/\./,'');
                        if(tmp){
                            varObj.segments.push(tmp);
                            lastSegPos = i;
                        }
                    }
                }else 
                if(l == '['){
                    stack.push('[');
                    stackBeginPos = i;

                    varObj.brakLength++;
  
                    //push words
                    var tmpStr = literal.substr(lastWordPos+1);
                    if(tmpStr){
                        var tmp = tmpStr;
                        if(keyWords.indexOf(tmpStr) < 0 && lastWordPos<0)
                         tmp = ['.'+tmpStr];
                        varObj.words.push(tmp);
                    }
                    varObj.words.push('[');

                    //segments
                    if(literal[i-1] != ']'){
                        var index = tmpStr.lastIndexOf('.');
                        if(index > -1){
                            tmpStr = tmpStr.substr(index);
                            varObj.segments.push(tmpStr);
                        }else{
                            varObj.segments.push(tmpStr);
                        }
                        lastSegPos = i;
                    }
                    

                    lastWordPos = i;
                }else
                if(l == ']' && nested){
                    //push words
                    var tmp = literal;
                    //x.y ]
                    //x[...].y ]
                    //x[..] ]
                    if(tmp[tmp.length-1] != ']'){
                        if(/[a-zA-Z0-9$_]+\[.+\]/.test(literal)){
                            tmp = tmp.replace(/[a-zA-Z0-9$_]+\[.+\]/,'');
                            varObj.words.push(tmp);
                        }else{
                            //keywords check
                            if(keyWords.indexOf(tmp) < 0)
                                varObj.words.push(['.'+tmp]);
                        }

                        //segments
                        tmp = tmp.substr(tmp.lastIndexOf('.'));
                        varObj.segments.push(tmp);
                        lastSegPos = i;
                    }
                    lastWordPos = i;

                    return literal;
                }else{
                    
                    //push words
                    var tmp = literal.substr(lastWordPos+1);
                    if(tmp){
                        if(tmp[0] != '.' && keyWords.indexOf(tmp) < 0)
                            tmp = ['.'+tmp];
                        varObj.words.push(tmp);
                    }

                    var segStr = literal.substr(lastSegPos+1);
                    if(segStr){
                        varObj.segments.push(segStr);
                        lastSegPos = i;
                    }
                    
                    if(!nested && keyWords.indexOf(tmp) < 0){
                        varMap['.'+literal] = varObj;
                    }
                    return literal;
                }
            }
        }

        var str = literal.substr(literal.lastIndexOf(']')+1);
        if(str){
            var segStr = literal.substr(lastSegPos+1);
            varObj.segments.push(segStr);

            var tmp = str[0]=='['?str:str[0]=='.'?str:'.'+str;
            if(varObj.words.length<1 && keyWords.indexOf(tmp) < 0){
                tmp = [tmp]
            }
            varObj.words.push(tmp);

        }
        
        if(!nested){
            varMap['.'+literal] = varObj;
        }
        
        return literal;
    }
    function parseWatchPath(map){
        for(var k in map){
            var varObj = map[k];
            var lastPart = null,
                watchPath = null;
            var i = k.lastIndexOf('.');
            if(k[k.length-1] == ']'){
                i = brak(k,varObj.brakLength);

                var brakLen = varObj.brakLength;
                varObj.watchPathWords = [];
                for(var j=0;j<varObj.words.length;j++){
                    var w = varObj.words[j];
                    if(w == '['){
                        if(--brakLen<1){
                            break;
                        }
                    }
                    varObj.watchPathWords.push(w);
                }
            }else{
                varObj.watchPathWords = varObj.words.concat();
                varObj.watchPathWords.splice(-1,1);
            }

            lastPart = k.substr(i);
            varObj.lastVar = lastPart;

            if(Object.keys(varObj.subVars).length<1){
                watchPath = k.substring(0,i).replace(/\.$/,'');
                varObj.watchPath = watchPath;
            }


            for(var j=varObj.segments.length;j--;){
                varObj.segments[j] = varObj.segments[j].replace(/^\.|\.$/g,'');
            }

            parseWatchPath(varObj.subVars);
        }
    }
    function brak(k,len){
        for(var i=0;i<k.length;i++){
            var l = k[i];

            if(l == '['){
                
                if(--len < 1){
                    return i;
                }
            }
        }
    }

    var lastType = '';
    return function(sentence){
        var words = [],
            varMap = {};

        for(var i=0;i<sentence.length;i++){
            var l = sentence[i];
            lastType = '';
            var literal = typeDetect(l,sentence.substr(i),varMap);
            i = i + literal.length - 1;
            switch(lastType){
                case 'var':
                    words.push(keyWords.indexOf(literal)<0?['.'+literal]:literal);
                    break;
                case 'str':
                case '':
                    words.push(literal);
                    break;
            }
        }

        parseWatchPath(varMap);
        

        // console.log('输入',sentence);
        // console.log('校验',words.join(''));
        // console.log('分词',JSON.stringify(words));
        // //input--->a[b.x[c]].d
        // //a[b.x[c]].d ---> b.x[c]
        // //b.x[c] ---> c
        // console.log('变量tree',varMap);
        
        return {
            words:words,
            varTree:varMap
        };
    }
})();