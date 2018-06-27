/*
  获取access_token:
    全局唯一的接口调用凭据，今后使用微信的接口基本上都需要携带上这个参数
    2小时需要更新一次，提前5分钟刷新

    请求地址：
      https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=APPID&secret=APPSECRET
    请求方式：
      GET

  设计思路：
    首先发送请求获取凭据，保存为一个唯一的文件
    然后后面请求先去本地文件读取数据
      判断凭据是否过期
        如果没有过期，直接使用
        如果过期了，重新发送请求获取凭据，保存下来覆盖之前的文件
  总结：
    先去本地查看有没有指定文件 (readAccessToken)
      如果有（之前请求过凭据）
        判断凭据是否过期  (isValidAccessToken)
          如果没有过期，直接使用
          如果过期了，重新发送请求获取凭据，保存下来覆盖之前的文件  (getAccessToken、saveAccessToken)
      如果没有（之前都没有请求过凭据）
        发送请求获取凭据，保存为一个唯一的文件
*/
//引入配置对象
const {appID, appsecret} = require('../config');
//引入发送http请求的库
const rp = require('request-promise-native');
//引入fs模块(读写两个方法)
const {readFile, writeFile} = require('fs');


class Wechat {
  getAccessToken() {
    //定义请求地址
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appID}&secret=${appsecret}`;
    /*
      问题：需要将回调函数中的数据返回出去？
      解决：promise解决

      所有的异步操作：都应该包装一层promise，让这个异步操作执行完毕之后，再去执行后面的代码
      简化：异步操作使用promise包装
    */
    //发送ajax请求
    //下载 request-promise-native request
    //rp函数返回值是一个promise
    return new Promise((resolve, reject) => {
      rp({method: 'GET', json: true, url})
        .then(res => {
          //请求成功的状态
          //当前时间加上2小时，就是过期时间 (7200秒 - 5分钟)
          res.expires_in = Date.now() + (res.expires_in - 300) * 1000;
          // console.log(res);
          resolve(res);

        })
        .catch(err => {
          //请求失败
          reject('getAccessToken方法出了问题：' + err);
        })
    })
  }

  saveAccessToken(data) {
    // console.log(typeof data); //[object Object]
    /*
      第一次由于没有凭据，直接catch发送第二次请求，而在读写保存数据的时候，将data对象转化成了字符串
      问题：writeFile方法会将对象转化为字符串
      解决：将对象转化为json字符串
    */
    data = JSON.stringify(data);
    //异步方法，包装promise对象
    return new Promise((resolve, reject) => {
      //将凭据保存一个文件，需要fs读写模块
      writeFile('accessToken.txt', data, err => {
        if (!err) {
          //写入成功
          resolve();
        } else {
          //写入失败
          reject('saveAccessToken方法出了问题：' + err);
        }
      })
    })
  }

  readAccessToken() {
    //异步方法，包装promise对象
    return new Promise((resolve, reject) => {
      //将凭据读取出来
      readFile('accessToken.txt', (err, data) => {
        if (!err) {
          //读取成功
          // console.log(data); //data是一个Buffer类型数据
          //将读取的Buffer数据转化为json字符串
          data = data.toString();
          data = JSON.stringify(data);
          // console.log(data);
          resolve(data);
        } else {
          //读取失败
          reject('readAccessToken方法出了问题：' + err);
        }
      })
    })
  }

  isValidAccessToken(data) {
    /*
      判断凭据是否过期
        true 表示凭据没有过期
        false表示凭据过期
    */
    //过滤非法数据
    if (!data || !data.access_token || !data.expires_in) return false;
    //判断凭据是否过期
    //大于为true，小于就是false过期
    /*if (data.expires_in > Date.now()) {
      //如果凭据的过期时间大于当前时间，说明没有过期
      return true;
    } else {
      //如果凭据的过期时间小于当前时间，说明过期了
      return false;
    }*/
    return data.expires_in > Date.now();

  }

  fetchAccessToken() {
    //优化操作 调用之前先判断文件有没有，而且有没有过期，这样就不去执行读取文件操作
    if (this.access_token && this.expires_in && this.isValidAccessToken(this)) {
      //说明this有凭据和过期时间，并且凭据未过期
    }
    return this.readAccessToken()
      .then(async res => {
        //判断凭据是否过期
        if (this.isValidAccessToken(res)) {
          //没有过期，直接使用
          return Promise.resolve(res);
        } else {
          //过期,重新调用请求获取凭据
          const data = await this.getAccessToken();
          //保存
          await this.saveAccessToken(data);
          //将请求回来的凭据返回出去
          return Promise.resolve(data);
        }
      })
      .catch(async err => {
        console.log(err);
        //重新调用请求获取凭据
        const data = await this.getAccessToken();
        //保存
        await this.saveAccessToken(data);
        //将请求回来的凭据返回出去
        return Promise.resolve(data);
      })
      .then(res => {
        //将其请求回来的凭据和过期时间挂载到this上
        this.access_token = res.access_token;
        this.expires_in = res.expires_in;
        //指定fetchAccessToken方法返回值
        return Promise.resolve(res);
      })
  }
}

//测试
// new Wechat().getAccessToken();
(async () => {
  /*
    先去本地查看有没有指定文件 (readAccessToken)
      如果有（之前请求过凭据）
        判断凭据是否过期  (isValidAccessToken)
          如果没有过期，直接使用
          如果过期了，重新发送请求获取凭据，保存下来覆盖之前的文件  (getAccessToken、saveAccessToken)
      如果没有（之前都没有请求过凭据）
        发送请求获取凭据，保存为一个唯一的文件
  */
  const wechatApi = new Wechat();
  console.log(await wechatApi.fetchAccessToken());
  //返回的promise对象，并不是一瞬间就执行到resolve状态，所以需要await等待函数执行完，再来打印输出结果
})();






