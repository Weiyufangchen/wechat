/*
  验证服务器的有效性
    1. 填写服务配置（测试号管理页面）
      - URL 开发者服务器地址（保证能在互联网中能访问）
        通过 ngrok http 端口号  就得到一个网址
      - Token 参与微信签名的加密
    2. 验证服务器地址的有效性
      - 将timestamp、nonce、token三个参数按照字典序排序（0-9，a-z）
      - 将三个参数拼接在一起，进行sha1加密
      - 将加密后生成的字符串和微信签名进行对比
        如果相同说明成功，返回一个echostr给微信服务器，
        如果不相同，说明签名算法出了问题，配置不成功
*/

//引入配置对象
const config = require('../config'); //这里省略index，可以不写，默认找index.js文件
//引入sha1加密模块
const sha1 = require('sha1');

module.exports = () => {
  return (req, res, next) => {
    //接受微信服务器发送过来的请求参数
    console.log(req.query);
    /*
      { signature: '13756a9ed744dc9ce02e6853d18fe2ea8bf8e748', 微信的加密签名（timestamp、nonce、token）
        echostr: '2278252705631300345',  随机字符串
        timestamp: '1529989817',  时间戳
        nonce: '1555066028' }  随机数字
    */
    //获取参与加密的参数
    const {signature, echostr, timestamp, nonce} = req.query;
    const {token} = config;
    /*// - 将timestamp、nonce、token三个参数按照字典序排序（0-9，a-z）
    const arr = [timestamp, nonce, token].sort();
    // - 将三个参数拼接在一起，进行sha1加密
    const str = arr.join('');
    const sha1Str = sha1(str);*/
    //简写
    const sha1Str = sha1([timestamp, nonce, token].sort().join(''));
    // - 将加密后生成的字符串和微信签名进行对比
    if (sha1Str === signature) {
      //说明配置，返回echostr给微信服务器
      res.send(echostr);
    } else {
      //说明失败
      res.send('');
    }
  }
};
