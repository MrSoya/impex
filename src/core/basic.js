/**
 * 系统常量
 * 包括所有语法标识符、错误信息等
 */

	var CMD_PREFIX = 'x-';//指令前缀
	var CMD_PARAM_DELIMITER = ':';
	var CMD_MODIFIER_DELIMITER = '.';

	//modifiers
	var EVENT_MODIFIER_NATIVE = 'native';
	var EVENT_MODIFIER_STOP = 'stop';
	var EVENT_MODIFIER_PREVENT = 'prevent';
	var EVENT_MODIFIER_SELF = 'self';

	var EXP_START_TAG = '{{',
		EXP_END_TAG = '}}';
	var REG_CMD = /^x-.*/;
	var ATTR_REF_TAG = 'ref';
	var ATTR_ID_TAG = 'id';
	var ATTR_SLOT_TAG = 'slot';
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
	var PLUGIN_LIST = [];
	var Mixins = [];//global mixins
	var TickMap = {
		g:[]
	};

	var LC_DI = {//指令生命周期
		'bind':'bind',
		'appended':'appended',
		'update':'update',
		'unbind':'unbind'
	};
	var LC_CO = {//指令生命周期
		'created':'created',
		'compile':'compile',
		'willMount':'willMount',
		'mounted':'mounted',
		'destroy':'destroy',
		'willUpdate':'willUpdate',
		'updated':'updated',
		'propsChange':'propsChange'
	};

	//debugs
	var DebugMap = {
		attrs:{},
		events:{},
		directs:{},
		txt:{},
		filter:{}
	};
	function setDebugMap(node,name,rowNum,colPos,len,type) {
		var map = DebugMap[type][node.rid];
		if(!map){
			map = DebugMap[type][node.rid] = {};
		}
		map[name] = {r:rowNum,c:colPos,l:len};
	}

	var PluginInited = false;

	//removeIf(production)
	function error(comp,desc,e,stack){
		var msg = 'Impex error : '
				+(desc||'')
				+(e?' - '+e.message:'')
				//+'\nFor more information about the xerror,please visit the following address: http://impexjs.org/doc/techniques.html#techniques-xerror'
				+'\n\n';
		if(stack)msg += stack;
		var stackRowStr = '\n     ';
		if(isString(comp)){
			comp = impex._cs[comp];
		}
		var target = comp?comp.$name:'ROOT';
		msg += '\n---> <' + target +'>';
		if(comp){
			var p = comp.$parent;
			var indents = '       ';
			while(p){
				msg += '\n'+indents+'<' + p.$name +'>';
				p = p.$parent;
				indents += '  ';
			}
		}
		
		console.error(msg);
	}
	function assert(isTrue,comp,code,msg,e) {
		!isTrue && error(comp,msg,e);
	}
	function getStack(compId,rid,k,type) {
		var comp = impex._cs[compId];
		var map = DebugMap[type][rid];
		var debugInfo = map[k];

		//生成调试信息
		var errorMsg = '';
		var prveMsgs = [];
		var nextMsgs = [];
		var findError = false;
		for(var i=0;i<comp._tmplRows.length;i++){
			var str = comp._tmplRows[i].replace(/\t/mg,'    ');
			var rowMsg = i+str+'\n';
			if(findError && nextMsgs.length<2){
				nextMsgs.push(rowMsg);
				if(nextMsgs.length>1){
					if(comp._tmplRows[i+1]){
						nextMsgs.push('...\n');
					}
					break;
				}
				continue;
			}

			prveMsgs.push(rowMsg);
			if(prveMsgs.length>2)prveMsgs.shift();
			if(debugInfo.r == i){
				var waveLine = '';
				for(var s=0;s<str.length;s++){
					if(s<debugInfo.c){
						waveLine += ' ';
					}else if(s>=debugInfo.c+debugInfo.l){
						break;
					}else{
						waveLine += '^';
					}
				}
				var blanks = '';
				for(var l=(i+'').length;l--;){
					blanks += ' ';
				}
				errorMsg += blanks+waveLine+'\n';

				findError = true;
			}
		}
		prveMsgs = prveMsgs.join('');
		if(i>1)prveMsgs = '...\n'+prveMsgs;
		return prveMsgs+errorMsg+nextMsgs.join('');
	}

	var XERROR = {
		COMPONENT:{//1XXX
			CONTAINER:1001,
			TEMPLATEPROP:1002,
			LOADERROR:1003,
			LOADTIMEOUT:1004,
			TEMPLATETAG:1005,
			COMPUTESTATE:1006,
			DEP:1007,
			STATE:1008,
			MIXINS:1009
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
		PLUGIN:{//4xxx
			NOINSTALL:4001
		}
	}
	//endRemoveIf(production)
