const debug = require('debug')('trpg:component:actor:event');
const uuid = require('uuid/v1');

exports.getTemplate = async function(data, cb, db) {
  let app = this.app;
  let socket = this.socket;

  let player = app.player.list.find(socket);
  if(!player) {
    throw '用户不存在，请检查登录状态';
  }

  let uuid = data.uuid;
  if(!uuid || typeof uuid !== 'string') {
    // 返回个人所有的模板
    let user = await db.models.player_user.oneAsync({uuid: player.uuid});
    let templates = await user.getTemplates();
    return {templates};
  }else {
    // 返回指定模板信息
    let template = await db.models.actor_template.oneAsync({uuid});
    return {template}
  }
}

exports.findTemplate = async function (data, cb, db) {
  const app = this.app;
  const socket = this.socket;

  const player = app.player.list.find(socket);
  if(!player) {
    throw '用户不存在，请检查登录状态';
  }

  let nameFragment = data.name;
  if(!nameFragment) {
    throw '缺少必要参数';
  }

  let templates = await db.models.actor_template.findTemplateAsync(nameFragment);
  for (template of templates) {
    let creator = await template.getCreator();
    if(creator) {
      template.dataValues.creator_name = creator.getName();
    }
  }
  return {templates};
}

exports.createTemplate = async function(data, cb, db) {
  const app = this.app;
  const socket = this.socket;

  let player = app.player.list.find(socket);
  if(!player) {
    throw '用户不存在，请检查登录状态';
  }

  let name = data.name;
  let desc = data.desc || '';
  let avatar = data.avatar || '';
  let info = data.info;

	if(!name) {
    throw '缺少模板名'
	}

	if(!info) {
    throw '缺少模板信息';
  }

  let isExistTemplate = await db.models.actor_template.findOne({
    where: {name}
  });
  if(isExistTemplate) {
    throw '该模板名字已存在'
  }

  let template = await db.models.actor_template.create({
    name,
    desc,
    avatar,
    info,
  });
  await template.setCreator(player.user);
  return {template};
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
    template.is_deleted = true; // TODO
    await template.saveAsync();
    cb({result: true});
    db.close();
  }catch(e) {
    debug('remove template fail. received data %o \n%O', data, e);
  }
}

exports.createActor = async function(data, cb, db) {
  let app = this.app;
  let socket = this.socket;

  let player = app.player.list.find(socket);
  if(!player) {
    cb({result: false, msg: '用户不存在，请检查登录状态'});
    return;
  }

  let name = data.name;
  let avatar = data.avatar;
  let desc = data.desc;
  let info = data.info || '{}';
  let template_uuid = data.template_uuid;
  if(!name) {
    cb({result: false, msg: '人物名不能为空'});
    return;
  }

  let actor = null;
  await db.transactionAsync(async () => {
    actor = await db.models.actor_actor.createAsync({
      name,
      avatar,
      desc,
      uuid: uuid(),
      info,
      template_uuid,
    });
    await actor.setOwnerAsync(player.user);
    if(!!avatar) {
      let tmp = avatar.split('/');
      let avatarModel = await db.models.file_avatar.oneAsync({name: tmp[tmp.length - 1]});
      avatarModel.attach_uuid = actor.uuid;
      avatarModel.save(() => {});
    }
  })

  if(actor) {
    return {actor: actor.getObject()};
  }else {
    return false;
  }
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
      let user = await db.models.player_user.oneAsync({uuid: player.uuid});
      let actors = await user.getActorsAsync();
      cb({result: true, actors});
    }
    db.close();
  }catch(e) {
    cb({result: false, msg: '系统忙'});
    debug('get actor fail. received data %o \n%O', data, e);
  }
}

exports.removeActor = async function(data, cb, db) {
  let app = this.app;
  let socket = this.socket;

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

  await db.transactionAsync(async () => {
    let actor = await db.models.actor_actor.oneAsync({uuid, owner_id: player.user.id});
    await actor.removeAsync();

    if(db.models.group_actor) {
      // 移除相关的团角色
      await db.models.group_actor.find({actor_uuid: uuid}).removeAsync();
    }
  })
  return true;
}

exports.updateActor = async function(data, cb, db) {
  let app = this.app;
  let socket = this.socket;

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

  await db.transactionAsync(async () => {
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
      let userId = player.user.id;
      let oldAvatarModel = await db.models.file_avatar.find({name: oldtmp[oldtmp.length - 1], owner_id: userId}).order('-id').oneAsync();
      if(oldAvatarModel) {
        oldAvatarModel.attach_uuid = null;
        await oldAvatarModel.saveAsync();
      }

      let avatarModel = await db.models.file_avatar.find({name: tmp[tmp.length - 1], owner_id: userId}).order('-id').oneAsync();
      avatarModel.attach_uuid = uuid;
      await avatarModel.saveAsync();
    }
  });
}
