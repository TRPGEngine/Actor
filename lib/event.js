const debug = require('debug')('trpg:component:actor:event');

exports.getTemplate = async function(data, cb) {
  let app = this.app;
  let socket = this.socket;

  try {
    let player = app.player.list.find(socket);
    if(!player) {
      cb({result: false, msg: '用户不存在，请检查登录状态'});
      return;
    }

    let uuid = data.uuid;
    if(!uuid || typeof uuid !== 'string') {
      // 返回个人所有的模板
      let templates = await player.user.getTemplatesAsync();
      cb({result: true, templates});
    }else {
      // 返回指定模板信息
      let db = await app.storage.connectAsync();
      let template = await db.models.actor_template.find({uuid});
      cb({result: true, template});
    }
  }catch(err) {
    cb({result: false, msg: err});
  }
}

exports.createTemplate = function(data, cb) {
  let app = this.app;
  let socket = this.socket;

  try {
    if(typeof data === 'string') {
      data = JSON.parse(data);
    }

    let player = app.player.list.find(socket);
    if(!player) {
      cb({result: false, msg: '用户不存在，请检查登录状态'});
      return;
    }

    let name = data.name;
    let desc = data.desc || '';
    let avatar = data.avatar || '';
    let info = data.info;

    if(!!name && !!info) {
      app.storage.connect(function(db) {
        let modelTemplate = db.models.actor_template;
        modelTemplate.exists({name}, function(err, isExist) {
          if(!!err) {
            cb({result: false, msg: err.toString});
            return;
          }

          if(!!isExist) {
            cb({result: false, msg: '该模板名字已存在'});
            return;
          }

          modelTemplate.create({
            name,
            desc,
            avatar,
            info,
            createAt: new Date().valueOf(),
            updateAt: new Date().valueOf(),
          }, function(err, template) {
            template.setCreator(player.user, function(err) {
              if(!!err) {
                cb({result: false, msg: err.toString});
              }else {
                cb({result: true, template});
              }
            });
          });
        })
      })
    }else {
      cb({result: false, msg: '缺少参数'});
    }
  } catch (err) {
    debug('create template invite fail. received data %o \n%O', data, e);
  }
}

exports.updateTemplate = async function(data, cb) {
  let app = this.app;
  let socket = this.socket;

  try {
    let player = app.player.list.find(socket);
    if(!player) {
      cb({result: false, msg: '用户不存在，请检查登录状态'});
      return;
    }

    let uuid = data.uuid;
    let name = data.name;
    let desc = data.desc;
    let avatar = data.avatar;
    let info = data.info;

    if(!uuid || typeof uuid !== 'string') {
      cb({result: false, msg: '缺少必要参数'});
      return;
    }

    let db = await app.storage.connectAsync();
    let template = await db.models.actor_template.oneAsync({uuid});
    if(data.name) {
      template.name = data.name;
    }
    if(data.desc) {
      template.desc = data.desc;
    }
    if(data.avatar) {
      template.avatar = data.avatar;
    }
    if(data.info) {
      template.info = data.info;
    }
    template.updateAt = new Date().valueOf();
    template = await template.saveAsync();
    cb({result: true, template});
  } catch (e) {
    debug('update template invite fail. received data %o \n%O', data, e);
  }
}

exports.removeTemplate = async function(data, cb) {
  let app = this.app;
  let socket = this.socket;

  try {
    let player = app.player.list.find(socket);
    if(!player) {
      cb({result: false, msg: '用户不存在，请检查登录状态'});
      return;
    }

    let db = await app.storage.connectAsync();
    let uuid = data.uuid;
    let template = await db.models.actor_template.oneAsync({
      uuid,
      creator_id: player.user.id
    });
    let res = await template.removeAsync();
    cb({result: true, res});
  }catch(e) {
    debug('remove template invite fail. received data %o \n%O', data, e);
  }
}
