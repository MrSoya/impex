window.addEventListener('load',function(){
    if(window.demos){
        
        impex.filter('format',{
            to:function(){
                var tmp = this.$value;
                if(!/^0\./.test(this.$value)){
                    tmp = tmp.replace(/^0\./,'');

                    if(this.$value.length>1){
                        tmp = tmp.replace(/^0/,'');
                    }
                }



                return tmp;
            }
        });

        impex.component('demo-calc',{
            $template:'<div class="calc">\
                            <div class="block-display {{exp.length >9?exp.length >20?\'small-font\':\'normal-font\':\'\'}}">\
                                {{exp => format}}\
                            </div>\
                            <div class="block-buttons">\
                                <div x-each="buttons as btn">\
                                    <button :click="addExp(btn)">{{btn}}</button>\
                                </div>\
                                <div style="clear: both;"></div>\
                            </div>\
                        </div>',
            buttons:[
                '1','2','3','+',
                '4','5','6','-',
                '7','8','9','*',
                '0','(',')','/',
                '.','←','C','=',
            ],
            exp:'0',
            clear:function () {
                this.exp = '0';
            },
            addExp:function(v){
                switch(v){
                    case 'C':
                        this.clear();
                        return;
                    case '←':
                        if(this.exp.length>1)
                            this.exp = this.exp.substring(0,this.exp.length-1);
                        return;
                    case '=':
                        var v = eval(this.exp.replace(/^0/,''));
                        this.exp = v+'';
                        return;
                    default:
                        this.exp += v;
                }
            }
        });

        impex.component('demo-todo',{
            $template:'<section class="todos">\
                            <header>\
                                <input :keydown="addTodo($event)" placeholder="What needs to be done?">\
                            </header>\
                            <section>\
                                <ul class="todolist">\
                                    <li x-each="todos as v => filterBy:filterType:\'type\' " \
                                        transition="todo" \
                                        class="{{v.type==\'completed\'?\'completed\':\'\'}}"\
                                    >\
                                        <input type="checkbox" x-checked="v.type==\'completed\'" :click="done($event,v)">\
                                        {{v.val}} <i :click="removeTodo(v)" class="close">&times;</i>\
                                    </li>\
                                </ul>\
                            </section>\
                            <footer>\
                                <span>{{activeTodos}} item left</span>\
                                <a class="button {{filterType===\'\'?\'active\':\'\'}}" :click="filterTodos(\'\')">All</a>\
                                <a class="button {{filterType===\'active\'?\'active\':\'\'}}" :click="filterTodos(\'active\')">Active</a>\
                                <a class="button {{filterType===\'completed\'?\'active\':\'\'}}" :click="filterTodos(\'completed\')">Completed</a>\
                            </footer>\
                        </section>',
            todos:[
                {id:1,val:'read a book',type:'active'},
                {id:1,val:'have a drink',type:'completed'},
                {id:1,val:'write a game',type:'active'},
            ],
            filterType:'',
            activeTodos:0,
            onInit:function(){
                this.watch('todos',function(type,newVal){
                    this.activeTodos = newVal.filter(function(todo){
                        return todo.type === 'active';
                    }).length;
                })
            },
            addTodo:function(e){
                var t = e.target;
                if(e.keyCode === 13 && t.value.trim()){

                    this.todos.push({id:Math.random()+'',val:t.value,type:'active'});
                    t.value = '';
                }
            },
            removeTodo:function(todo){
                var i = this.todos.indexOf(todo);
                if(i > -1)
                this.todos.splice(i,1);
            },
            done:function(e,todo){
                var type = 'active';
                if(e.target.checked){
                    type = 'completed';
                }

                todo.type = type;

                this.activeTodos = this.todos.filter(function(td){
                    return td.type === 'active';
                }).length;

                var t = this.filterType;
                this.filterType = '';
                this.filterType = t;
            },
            filterTodos:function(type){
                this.filterType = type;
            }
        });


        if($('div[name="calc"]')[0]){
            window.demos.output = '<demo-calc></demo-calc>'
        }

        if($('div[name="todo"]')[0]){
            impex.directive('checked',{
                observe:function(rs){
                    this.$view.el.checked = rs;
                }
            })
            window.demos.output = '<demo-todo></demo-todo>'
        }
    }

},false);
