# Change Log
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