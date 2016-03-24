# Change Log
## Version 0.9.7 - 2016/3/24
### 新增
* Directive.priority属性，用于标识指令优先级

### 更新
* 当指令的顶级节点多于1个，指令的$view.el为null
* 过滤器 orderBy 区分了数字、字符以及其他 
* demos

### bug修复
* {{# }}表达式在某些情况下出错
* IE下兼容问题
* x-cloak
* x-if指令和x-each指令同时使用报错


## Version 0.9.6 - 2016/3/1
### 更新
* 优化预编译性能
* demos
* 组件被挂起后，并不会从组件树中移除
* if/show指令使用在被挂起组件中时无效

### bug修复
* IE下扫描器不稳定
* IE下文本域内的表达式无法渲染


## Version 0.9.4 - 2016/2/17
### 新增
* Component.$replace替换模式，如果为false，组件标签会保留只替换内部
* Component.onBeforeCompile 生命周期回调

### 更新
* demos


## Version 0.9.3 - 2016/2/1
### bug修复
* filterBy过滤器，对非字符串类型的key报错
* x-show指令无法使用基于CSS的transition


## Version 0.9.2 - 2016/1/28
### 新增
* 当组件模版的顶级元素超过1个时，会给出警告信息

### 更新
* 优化组件模版解析
* demos

### bug修复
* 词法分析器某些情况下会解析错误
* Component.destroy()时没有从组件列表中移除

### 移除(重要！)
* impex.findAll()



## Version 0.9.1 - 2016/1/15
### 新增
* x-on指令，以及冒号语法

### 更新
* 非重要更新
* demos

### bug修复
* Transition 某些条件下没有触发

### 移除(重要！)
* impex.ext.directives 中的单一事件指令


## Version 0.9.0 - 2016/1/14
### 新增
* Component.emit()，用于向上级组件发送事件
* Component.broadcast()，用于向下级组件广播事件
* Component.$view.on/off，用于视图事件的注册和解除
* 新增demo

### 更新
* 组件结构优化
* Component.on()不再进行视图事件注册，而是注册自定义事件
* each指令应用过滤器后，直接指向原始数据的引用，不再需要$origin
* 其他更新

### bug修复
* 被if指令隐藏的视图没有渲染

### 移除(重要！)
* 对IE8的支持


## Version 0.8.0 - 2016/1/7
### 新增
* 内置过滤器filterBy/limitBy/orderBy/json，可以用于表达式、指令以及each指令中
* Transition类，用于实现过渡效果，自定义指令或组件可以通过注入[Transitions]服务来实现
* each/if/show指令现在支持transition特性，用于指定CSS3或者javascript过渡
* impex.transition()接口，用于注册过渡回调
* 新增&更新大量demo

### 更新
* x-each/x-each-start语法变更，k=>v变为k,v
* each指令现在支持过滤器操作
* 视图的元素引用不再支持数组，而是单一元素el。如果组件模版有多个顶级节点，el为null
* filter现在支持类型参数，如果一个字符串参数没有带引号，则会被认为是一个变量，
filter参数中的变量变动也会引起视图的更新
* Component.find()现在返回数组
* 运行时视图上不会出现impex指令
* 一些性能提升

### bug修复
* show/if指令在最开始会闪一下
* 挂起组件重新显示时，重复构建模型

### 移除(重要！)
* Component.$view.elements
* Component.findD()



## Version 0.7.4 - 2015/12/30
### 新增
* 支持select标签多选模式时的x-model支持
* 支持x-model特性，debounce、number
* 新demo，演示debounce和number


## Version 0.7.3 - 2015/12/28
### 新增
* Component.watch现在支持*参数，可以响应任何属性的变化

### bug修复
* lexer某些场景解析错误
* 当x-each的数据源为多级变量，且多级变量都不存在时会报错

### 更新
* Component.watch的回调参数增加了变动变量的路径数组


## Version 0.7.2 - 2015/12/23
### 新增
* Component.$isolate 隔离列表，可以禁止组件属性修改时，自动广播给子组件
* impex.config 支持cacheable属性
* 新demos

### bug修复
* 当父组件修改了变量x，并且子组件视图中表达式引用了x(实际上引用的是子组件自身模型上的x)，子组件视图也会刷新
* destroyed 的组件没有从全局列表中去掉
* destroyed 的指令没有从父节点指令列表中去掉
* destroyed 的组件没有完全释放

### 更新
* 优化数据绑定性能


## Version 0.7.1 - 2015/12/21
### 新增
* 支持组件属性横线格式自动转为驼峰格式(Camel-Case)的组件属性，如 <x-comp my-prop="x"></x-comp> 组件就会自动拥有myProp属性

### 更新
* 优化数据绑定性能


## Version 0.7.0 - 2015/12/17
### 新增
* impex.config 支持logger属性
* 扩展日志器 impex.ext.console ，并可用0-4来精确控制日志级别
* 新增调试点，排错更方便

### 更新
* x-if指令隐藏的视图不会再响应数据绑定，直到恢复显示
* 全新日志系统，核心包不再包含日志器，减小核心包容量
* 使用日志必须依赖扩展日志器，具体方法见demo

### bug修复
* Component.suspend恢复时没有设置parent属性
* 创建组件时判断内置函数覆盖的错误

### 移除(重要！)
* impex.config 不在支持debug属性
* 核心包内的console


## Version 0.6.0 - 2015/12/11
### 新增
* impex.filter 过滤器定义
* impex.config 全局配置定义
* View.hasClass/addClass/removeClass/toggleClass
* 内置指令x-model，用于视图->模型的绑定
* 新的过滤器使用"goes to"语法 {{ ' Hello impex' => trim:side.cap}}
* 新的指令语法，可以让指令接收参数和过滤函数 directive[:param1:param2:...][.filter]
* 新的HTML表达式 {{# html}}
* 新demos

### 更新
* 内置指令x-bind，不再用于视图->模型的绑定，变为视图属性绑定 <a x-bind:href="address"></a>
* 警告信息需要开启debug

### bug修复
* 监控系统会导致x-each在某些情况下卡死
* 表达式中无法使用true/false等关键字
* HTML转换器无法切换到文本再切换到HTML标签

### 移除(重要！)
* impex.option
* impex.converter
* Converter


## Version 0.5.0 - 2015/12/04
### 新增
* Component.$restrict属性，用来定义组件的使用范围
* 新demos

### 更新
* Component.find()方法，支持递归查询
* 组件模版异步加载缓存机制，当同一个异步组件再次加载时，会变成同步
* 优化监控算法
* 视图中可能导致bug的代码

### bug修复
* 当子组件使用了父组件同一个对象引用时，修改父组件变量无法刷新子组件视图
* 两个表达式中的&nbsp;被忽略，比如{{a}}&nbsp;{{b}}

### 移除
* impex.option不在需要recurDepth参数


## Version 0.4.1 - 2015/11/23
### 新增
* Service.$host属性，用来访问服务宿主
* 新demos

### 更新
* 渲染器，提升性能
* 词法分析器，提升性能

### 移除
* XRouter.bind，不再需要首先bind组件了，见route demo


## Version 0.4.0 - 2015/11/19
### 新增
* x-if-start/end 指令，可以控制一组视图
* x-show-start/end 指令，可以控制一组视图
* 新demos

### 更新
* 视图模型，现在对$view的操作可以反馈到视图的每个顶级节点
* 词法分析器，现在可以在表达式中使用函数返回值作用域链，比如{{a(3-x).b[y+1]}}
* 构建器

### bug修复
* 扫描器的bug
* 某些条件下会导致watch无法获取正确值
* x-each某些条件下无效


## Version 0.3.2 - 2015/11/15
### 新增
* 组件/指令创建时，内置属性覆盖检查
* ViewModel.closest()，用于查找最近的祖先组件	
* tree2.html demo，演示父组件在子组件构建前，修改子组件数据域

### 更新
* debug系统，现在打开debug选项后可以动态跟踪所有组件和指令的状态信息，以帮助开发者检测程序

### bug修复
* 渲染器判断组件属性链可能会导致的错误
* 指令初始化后没有设置组件状态


## Version 0.3.0 - 2015/11/12
### 新增
* {{=CONTENT}}模版指令，用于引用组件内部内容
* {{=BINDPROPS}}模版指令，用于引用组件上所有属性
* impex.ext.directives 新增事件指令

### 更新
* 组件onDisplay调用时机
* 组件模版支持多个顶级节点作为视图
* 延迟x-each/-start指令获取数据源的时间，这样可以让父组件在onInit中修改each的数据源
* 现在所有指令共享一个View对象
* 增加扫描器效率

### bug修复
* 组件事件handler调用时丢失context的问题
* 部分组件创建时没有触发onCreate回调
* 修正watch匹配算法以及回调参数错误
* 无法修改input的value问题
* 内部工具错误

### 移除(重要!)
* 不再支持{{=tagBody}}模版标签，但，请看新增部分
* 核心包不再支持事件指令

## Version 0.2.0 - 2015/11/6
### 新增
* Component.findD查询指令接口
* Component.suspend挂起接口
* each performance demo，可以查看each的性能细节 

### 更新
* each指令算法，大幅提升each性能
* Component.find查询组件接口，支持*通配符
* 监控算法，优化模型响应流程

### bug修复
* 当watch一个数组时，数组内容变化后Component.watch回调参数错误
* IE8兼容相关


## Version 0.1.5 - 2015/11/4
### 新增
* 指令扩展
* x-each-start/end指令，用于段落循环
* 增加多个demo

### 更新
* 核心库不在支持x-bind指令
* 增强的x-bind指令
* 组件模版现在可以加载多个顶级元素


## Version 0.1.4 - 2015/10/30
### 新增
* ie8扩展

### 更新
* 部分对ie8的支持

### bug修复
* 监控对象没有释放
* IE observe监控死循环


## Version 0.1.3 - 2015/10/29
### 新增
* new examples
* 支持表达式中使用this关键字
* 组件模版可以使用{{=属性}}表达式来替换模版内容

### 更新
* impex.render入口的匿名组件也可以注入服务了

### bug修复
* Component.init重复执行报错的bug
* impex.render入口的匿名组件没有触发onCreate事件