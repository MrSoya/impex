/**
 * impex日志系统
 */
;!function(g){

    g.imLog = new function(){
        this.level = 1;
        this.warn = function(txt,error){
            if(this.level < 2)return;
            console.error('im warn :: ' + txt,error);
        }
        this.error = function(txt,error){
            if(this.level < 1)return;
            console.error('im error :: ' + txt,error);
        }
        this.debug = function(txt,error){
            if(this.level < 3)return;
            console.error('im debug :: ' + txt,error);
        }
        this.log = function(txt){
            if(this.level < 4)return;

            if(arguments.length===2){
                stateLog.call(null,arguments[0],arguments[1]);
                return;
            }
            console.log('im log :: ' + txt);
        }
    }

    var lastComp;
    function stateLog(comp,state){
        var indent = '';
        var p = comp.parent;
        while(p){
            indent += '=';
            p = p.parent;
        }
        var info = '';
        if(comp === lastComp){
            info = '↑↑↑ ↑↑↑ ↑↑↑ ';
        }else{
            var props = [];
            props.push('id:'+comp.__id);
            if(comp.name)
                props.push('name:'+comp.name);
            var viewName = comp.view?comp.view.__nodes[0].tagName:'';
            props.push('view:'+viewName);
            if(comp.parent){
                props.push('parentId:'+(comp.parent?comp.parent.__id:'null'));
            }

            var type = comp.endTag === null?'Directive':'Component';

            info = type+'{'+ props.join(',') +'} ';
        }
        lastComp = comp;
        
        console.log('im log :: '+indent + (indent?'> ':'') + info + state);
    }

    //polyfill
    self.console = self.console||new function(){
        this.log = function(){}
        this.debug = function(){}
        this.error = function(){}
        this.warn = function(){}
    }
}(window);