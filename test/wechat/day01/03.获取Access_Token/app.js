const express = require('express');
const auth = require('./wechat/auth');
const app = express();


//接受微信服务器发送过来的请求 GET
//应用级中间件能够接受和处理所有请求
app.use(auth());


app.listen(3000, err => {
  (!err) && console.log('服务器启动成功了！！');
});