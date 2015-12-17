# Change Log
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