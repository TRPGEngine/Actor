const debug = require('debug')('trpg:component:actor:event');

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
    let desc = data.desc;
    let avatar = data.avatar;
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

          modelTemplate.create({name, desc, avatar, info}, function(err, template) {
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
    debug('agree friends invite fail. received data %o \n%O', data, e);
  }
}
