# Change Log

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