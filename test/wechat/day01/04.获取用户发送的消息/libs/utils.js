/*
  工具函数
*/
//引入解析xml的库
const {parseString} = require('xml2js');
module.exports = {
  getUserDataAsync (req){
    //这个流式读取可能一次，可能多次
    /*
      用户数据是通过流的方式发送，通过绑定data事件接受数据
    */
    return new Promise(((resolve, reject) => {
      let data = '';
      //可以链式调用
      req
        .on('data', userData => {
          //将流式数据全部拼接起来
          data += userData;
        })
        .on('end', ()=>{
          //确保数据全部获取了
          resolve(data);
        })
    }))
  },

  parseXMLAsync (xmlData) {
    return new Promise(((resolve, reject) => {
      parseString(xmlData, {trim: true}, (err, data) => {
        if (!err) {
          //解析成功了
          resolve(data);
        } else {
          //解析失败了
          reject('parseXMLAsync方法出了问题：' + err);
        }
      })
    }))
  },
  formatMessage(jsData){
    const data = jsData.xml;
    //初始化一个空对象
    let message = {};
    //判断数据是一个合法的数据
    if (typeof data === 'object') {
      //循环遍历对象中的所有数据
      for (let key in data) {
        //data中可能有空数组，或者空字符串，需要过滤
        //获取属性值
        let value = data[key];
        //过滤掉空的数据和空的数组
        if (Array.isArray(value) && value.length > 0) {
          //在新对象中添加属性和值
          message[key] = value[0];
        }
      }
    }
    //将格式化后的数据返回
    return message;
  }
};