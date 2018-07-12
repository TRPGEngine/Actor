const debug = require('debug')('trpg:component:actor:event');
const uuid = require('uuid/v1');

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
    let db = await app.storage.connectAsync();
    if(!uuid || typeof uuid !== 'string') {
      // 返回个人所有的模板
      let templates = await player.user.getTemplatesAsync();
      cb({result: true, templates});
    }else {
      // 返回指定模板信息
      let template = await db.models.actor_template.oneAsync({uuid});
      cb({result: true, template});
    }
    db.close();
  }catch(err) {
    debug('get template failed, received %o\n%O', data, err);
    cb({result: false, msg: err});
    db.close();
  }
}

exports.findTemplate = async function (data, cb) {
  let app = this.app;
  let socket = this.socket;

  try {
    let player = app.player.list.find(socket);
    if(!player) {
      cb({result: false, msg: '用户不存在，请检查登录状态'});
      return;
    }

    let nameFragment = data.name;
    if(!nameFragment) {
      cb({result:false, msg: '缺少必要参数'});
      return;
    }

    let db = await app.storage.connectAsync();
    let templates = await db.models.actor_template.findTemplateAsync(nameFragment);
    for (template of templates) {
      let creator = await template.getCreatorAsync();
      if(creator) {
        template.creator_name = creator.getName();
      }
    }
    cb({result: true, templates});
    db.close();
  }catch(err) {
    debug('find template failed, received %o\n%O', data, err);
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
            db.close();
            return;
          }

          if(!!isExist) {
            cb({result: false, msg: '该模板名字已存在'});
            db.close();
            return;
          }

          modelTemplate.create({
            name,
            desc,
            avatar,
            info,
            createAt: new Date(),
            updateAt: new Date(),
          }, function(err, template) {
            if(!!err) {
              cb({result: false, msg: err.toString});
              db.close();
              return;
            }

            template.setCreator(player.user, function(err) {
              if(!!err) {
                cb({result: false, msg: err.toString});
              }else {
                cb({result: true, template});
              }
              db.close();
            });
          });
        })
      })
    }else {
      cb({result: false, msg: '缺少参数'});
    }
  } catch (err) {
    debug('create template fail. received data %o \n%O', data, e);
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
    if(template.creator_id !== player.user.id) {
      cb({result: false, msg: '您不是该模板的所有者，无法修改模板'});
      db.close();
      return;
    }
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
    db.close();
  } catch (e) {
    debug('update template fail. received data %o \n%O', data, e);
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
    db.close();
  }catch(e) {
    debug('remove template fail. received data %o \n%O', data, e);
  }
}

exports.createActor = async function(data, cb) {
  let app = this.app;
  let socket = this.socket;

  try {
    let player = app.player.list.find(socket);
    if(!player) {
      cb({result: false, msg: '用户不存在，请检查登录状态'});
      return;
    }

    let name = data.name;
    let avatar = data.avatar;
    let desc = data.desc;
    let info = data.info || '{}';
    if(!name) {
      cb({result: false, msg: '人物名不能为空'});
      return;
    }
    let db = await app.storage.connectAsync();
    let actor = await db.models.actor_actor.createAsync({
      name,
      avatar,
      desc,
      uuid: uuid(),
      info,
    });
    let actorFull = await actor.setOwnerAsync(player.user);
    if(!!avatar) {
      let tmp = avatar.split('/');
      let avatarModel = await db.models.file_avatar.oneAsync({name: tmp[tmp.length - 1]});
      avatarModel.attach_uuid = actor.uuid;
      avatarModel.save(() => {});
    }
    cb({result: true, actor: actor.getObject()});
    db.close();
  }catch(e) {
    cb({result: false, msg: '系统忙'});
    debug('create actor fail. received data %o \n%O', data, e);
  }
}

exports.createTemplateAdvanced = async function(data, cb, db) {
  let app = this.app;
  let socket = this.socket;

  let player = app.player.list.find(socket);
  if(!player) {
    throw '用户不存在，请检查登录状态';
  }

  let name = data.name;
  let avatar = data.avatar;
  let desc = data.desc;
  let info = data.info;

  if(!name) {
    throw '人物名不能为空';
  }

  if(!info) {
    throw '数据不能为空';
  }

  let actor = await db.models.actor_actor.createAsync({
    name,
    avatar,
    desc,
    uuid: uuid(),
    info,
  });
  await actor.setOwnerAsync(player.user);
  if(!!avatar) {
    let tmp = avatar.split('/');
    let avatarModel = await db.models.file_avatar.oneAsync({name: tmp[tmp.length - 1]});
    avatarModel.attach_uuid = actor.uuid;
    avatarModel.save(() => {});
  }

  return {actor: actor.getObject()};
}

exports.getActor = async function(data, cb) {
  let app = this.app;
  let socket = this.socket;

  try {
    let player = app.player.list.find(socket);
    if(!player) {
      cb({result: false, msg: '用户不存在，请检查登录状态'});
      db.close();
      return;
    }

    let db = await app.storage.connectAsync();
    let uuid = data.uuid;
    if(uuid) {
      let actor = await db.models.actor_actor.oneAsync({uuid});
      cb({result: true, actor});
    }else {
      let actors = await player.user.getActorsAsync();
      cb({result: true, actors});
    }
    db.close();
  }catch(e) {
    cb({result: false, msg: '系统忙'});
    debug('get actor fail. received data %o \n%O', data, e);
  }
}

exports.removeActor = async function(data, cb) {
  let app = this.app;
  let socket = this.socket;

  try {
    let player = app.player.list.find(socket);
    if(!player) {
      cb({result: false, msg: '用户不存在，请检查登录状态'});
      return;
    }
    let uuid = data.uuid;
    if(!uuid) {
      cb({result: false, msg: '缺少必要参数'});
      return;
    }
    let db = await app.storage.connectAsync();
    let actor = await db.models.actor_actor.oneAsync({uuid, owner_id: player.user.id});
    let remove = await actor.removeAsync();
    cb({result: true, remove});
    db.close();
  }catch(e) {
    cb({result: false, msg: '系统忙'});
    debug('get actor fail. received data %o \n%O', data, e);
  }
}

exports.updateActor = async function(data, cb) {
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
    let avatar = data.avatar;
    let desc = data.desc;
    let info = data.info || {};
    if(!uuid) {
      cb({result: false, msg: '缺少必要参数'});
      return;
    }
    if(!name) {
      cb({result: false, msg: '人物名不能为空'});
      return;
    }
    let db = await app.storage.connectAsync();
    let actor = await db.models.actor_actor.oneAsync({uuid});
    let oldAvatar = actor.avatar.toString();
    actor.name = name;
    actor.avatar = avatar;
    actor.desc = desc;
    actor.info = info;
    let saveActor = await actor.saveAsync();
    cb({result: true, actor: saveActor.getObject()});
    console.log('oldAvatar:', oldAvatar);
    console.log('newAvatar:', avatar);
    if(oldAvatar && oldAvatar !== avatar) {
      // 在返回之后更新attach
      let oldtmp = oldAvatar.split('/');
      let tmp = avatar.split('/');
      let oldAvatarModel = await db.models.file_avatar.oneAsync({name: oldtmp[oldtmp.length - 1]});
      let avatarModel = await db.models.file_avatar.oneAsync({name: tmp[tmp.length - 1]});
      if(oldAvatarModel) {
        oldAvatarModel.attach_uuid = null;
        await oldAvatarModel.saveAsync();
      }
      avatarModel.attach_uuid = uuid;
      await avatarModel.saveAsync();
    }
    db.close();
  }catch(e) {
    cb({result: false, msg: '系统忙'});
    debug('create actor fail. received data %o \n%O', data, e);
  }
}
