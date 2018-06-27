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
//引入工具函数
const {getUserDataAsync, parseXMLAsync, formatMessage} = require('../libs/utils');


module.exports = () => {
  return async (req, res, next) => {
    //接受微信服务器发送过来的请求参数
    // console.log(req.query);
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

    /*
      微信服务器会主动发送两种方法的消息
        GET请求，验证服务器有效性
        POST请求，微信服务器会将用户发送过来的消息转发到开发者服务器上
    */
    if (req.method === 'GET') {
      // - 将加密后生成的字符串和微信签名进行对比
      if (sha1Str === signature) {
        //说明配置，返回echostr给微信服务器
        res.send(echostr);
      } else {
        //说明失败
        res.send('');
      }
    }else if (req.method === 'POST') {
      //接受用户发送过来的消息
      // console.log(req.query);
      /*
        { signature: '48b131f90da0f3fe417ea5fefa724df960fb95ff',
          timestamp: '1530016619',
          nonce: '1743992966',
          openid: 'o4vDr0ZhW18g5mt7DlLO3swlO-Bk' } //用户id
      */
      //验证消息是否来自于微信服务器
      if (sha1Str !== signature){
        //说明消息不是来自己微信服务器
        //过滤掉非法请求
        res.send('error');
        return
      }
      //获取用户的消息
      const xmlData = await getUserDataAsync(req);
      // console.log(xmlData);
      /*
        <xml>
          <ToUserName><![CDATA[gh_b2b371bfb62f]]></ToUserName>  //开发者的id
          <FromUserName><![CDATA[o4vDr0ZhW18g5mt7DlLO3swlO-Bk]]></FromUserName> //用户的openid
          <CreateTime>1530017932</CreateTime>  //消息的发送时间
          <MsgType><![CDATA[text]]></MsgType>  //消息的类型
          <Content><![CDATA[666]]></Content>  //消息的具体内容
          <MsgId>6571376980665151476</MsgId>  //消息的id
        </xml>
      */
      //将xml解析成js对象
      const jsData = await parseXMLAsync(xmlData);
      // console.log(jsData);
      /*
        { xml:
         { ToUserName: [ 'gh_b2b371bfb62f' ],
           FromUserName: [ 'o4vDr0ZhW18g5mt7DlLO3swlO-Bk' ],
           CreateTime: [ '1530019883' ],
           MsgType: [ 'text' ],
           Content: [ '999' ],
           MsgId: [ '6571385360146346628' ] } }

      */
      //格式化数据
      const message = formatMessage(jsData);
      console.log(message);
      /*
        { ToUserName: 'gh_b2b371bfb62f',
          FromUserName: 'o4vDr0ZhW18g5mt7DlLO3swlO-Bk',
          CreateTime: '1530027296',
          MsgType: 'text',
          Content: '888',
          MsgId: '6571417198738914033' }
      */

      //返回用户消息
      /*
        1. 假如服务器无法保证在5秒内处理并回复
        2. 回复xml数据中有多余的空格 ******
        如果有以上现象，就会导致微信客户端中的报错：
          '该公众号暂时无法提供服务，请稍后再试'
      */
      //设置回复用户消息的具体内容
      let content = '';

      if (message.MsgType === 'text') {
        if (message.Content === '1') {
          content = 'hello! nice to meet you!';
        } else if (message.Content === '2') {
          content = '2货哪里跑';
        } else if (message.Content.match('爱')) {
          //模糊匹配
          content = 'I love you,too.';
        } else {
          content = '好好说话';
        }
      } else {
        content = '好好说话';
      }

      //拼串
      let replyMessage = '<xml>' +
        '<ToUserName><![CDATA[' + message.FromUserName + ']]></ToUserName>' +
        '<FromUserName><![CDATA[' + message.ToUserName + ']]></FromUserName>' +
        '<CreateTime>' + Date.now() + '</CreateTime>' +
        '<MsgType><![CDATA[text]]></MsgType>' +
        '<Content><![CDATA[' + content + ']]></Content>' +
        '</xml>';

      //返回响应给微信服务器
      res.send(replyMessage);

      //先返回一个空的响应给服务器，防止微信服务器反复发送请求
      // res.send('');
    }
  }
};
