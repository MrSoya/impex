# Impex —— A powerful web application engine

impex是一个用于开发web应用的组件式开发引擎，impex可以运行在桌面或移动端让你的web程序更好维护，更好开发。
impex的目标是让开发者基于web技术以最低的学习成本构建应用，所以impex会尽量简单。
	
## 一切皆组件
* **为什么**
基本上所有的web开发都大量使用了各种不同的组件，包括浏览器内置的(video/audio/colorpicker...)或者第三方开发的(日历/Dialog...)，组件具有独立的作用域和控制方法，甚至拥有独立的样式，可以在适合的场景重复使用，
让开发变的更简单，更高效。
那么，还需要什么？
当你使用了类似bootstrap之类的库时，一个modal组件就会导致你的页面上产生几十行的HTML代码，
而仅仅是描述了一个弹窗，如果是10个就会产生大量的HTML描述标签，当你维护源码时一定会头痛。

* **impex组件**
impex提供让开发者定义web组件的能力，就像video标签样，看上去只有一行代码，而在运行时impex自动解析标签实现组件功能。组件可以嵌套组件，从而组合出强大的功能。如果你无法从web网站的开发中理解组件的价值，那么可以换个思路，如果使用HTML来开发移动应用，所有UI就是组件，面板、列表、表单等等

## impex有多简单？
* **组件**
    * 表现为自定义标签，减少代码量
	* 可重用的自包含逻辑实体，一处定义，多处使用
    * 表达式使用数据绑定技术，模型改变，视图自动刷新
    * 表达式使用js原生语法，让你不用担心学习成本{{ show('x'+x,y||3) }}
* **指令**
    * 表现为自定义属性，增强组件功能
    * 继承自组件，主要操作视图来实现功能，比如x-each/x-show
* **过滤器**
    * 使用在表达式中，对输出结果进行过滤，比如金额、大小写等
    * 如果不喜欢，也可以不用过滤器，别忘了，impex支持调用域外函数
* **服务**
    * 如果需要自定义复杂的组件/指令/过滤器，可以注入服务来辅助你。impex内置了一些不错的工具

## Demo

一个“很复杂”的demo

```html
<div id="entry">
    {{ 'hello ' + title => cap}}
    <x-subtitle>
        {{version}}
    </x-subtitle>
</div>
<script>
	//过滤器
    impex.filter('cap',{
        to:function(){
            var cap = this.$value[0].toUpperCase();
            return cap + this.$value.substr(1);
        }
    });
    //组件
    impex.component('x-subtitle',{
        $template:"<sub>{{=CONTENT}}</sub>"
    });

    //渲染
    impex.render(document.getElementById('entry'),new function(){
        this.title = 'impex';
        this.version = impex.version.toString();
    });

</script>
```

## API Doc
[website here](http://mrsoya.github.io/impex/doc)

## 如何构建

impex为了通用，内置了一些指令，如果你不需要或者还需要内置其他东西，可以重新构建impex。
Impex使用 [gulp](http://gulpjs.com) 来构建源码，而在这之前你需要安装了nodejs，然后只需要在Impex工程目录执行如下命令

	
1.安装依赖模块
	
	npm install
	
2.执行gulp

    gulp

看吧，这有多简单

### 兼容性
* IE8(with impex.ext.ie8)
* IE9+
* FF38+
* chrome43+
* safari8+
* opera31+
* android4.0+
* IOS7.1+

### 应用场景
impex可以使用在任何web环境来提高开发效率，比如在线网站或者本地web应用等。

用于HTML5交互动画开发的IDE [Soya Studio](http://soya2d.com/ide/) 就是基于impex开发的本地web应用。

### Github Issues

如果有bug或者新的特性需求，请提交在issues中

### FAQ

如果你遇见了问题或者发现了bug，请先查阅issues和wiki中，是否已经有了解决方案。如果你发现了满意的答案，那会为你节省很多时间。

## License

Impex基于 [MIT](http://opensource.org/licenses/MIT) 协议发布。请查阅LICENSE文件
