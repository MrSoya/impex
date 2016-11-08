/**
 * 过渡工厂
 */

var TransitionFactory = {
	hooks:{},
	register:function(type,hook){
		this.hooks[type] = hook;
	},
	transitions:{},
	get:function(type,directive){
		var tmp = new Transition(type,directive,this.hooks[type]);
		
		return tmp;
	}
}