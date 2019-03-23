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

	var PluginInited = false;

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
