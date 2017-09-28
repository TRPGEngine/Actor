const debug = require('debug')('trpg:component:actor');
const event = require('./event');
const at = require('trpg-actor-template');
const uuid = require('uuid/v1');

module.exports = function ActorComponent(app) {
  initStorage.call(app);
  initSocket.call(app);
  initReset.call(app);
}

function initStorage() {
  let app = this;
  let storage = app.storage;
  storage.registerModel(require('./models/actor.js'));
  storage.registerModel(require('./models/template.js'));

  app.on('initCompleted', function(app) {
    // 数据信息统计
    debug('storage has been load 2 actor db model');
  });
}

function initSocket() {
  let app = this;
  app.on('connection', function(socket) {
    let wrap = {app, socket};
    socket.on('actor::getTemplate', event.getTemplate.bind(wrap));
    socket.on('actor::findTemplate', event.findTemplate.bind(wrap));
    socket.on('actor::createTemplate', event.createTemplate.bind(wrap));
    socket.on('actor::updateTemplate', event.updateTemplate.bind(wrap));
    socket.on('actor::removeTemplate', event.removeTemplate.bind(wrap));
    socket.on('actor::createActor', event.createActor.bind(wrap));
  })
}

function initReset() {
  let app = this;

  app.on('resetStorage', function(storage, db) {
    debug('start reset actor storage');

    let template = at.getInitTemplate('刀剑神域模板');
    template.desc = '这是一个测试用的模板';
    template.insertCell(at.getInitCell('姓名').setValue('亚丝娜'));
    template.insertCell(at.getInitCell('年龄').setValue(22));
    template.insertCell(at.getInitCell('性别').setValue('女'));
    template.insertCell(at.getInitCell('职业').setValue('刺剑使'));
    template.insertCell(at.getInitCell('力量').setValue('10'));
    template.insertCell(at.getInitCell('敏捷').setValue('15'));
    template.insertCell(at.getInitCell('耐力').setValue('12'));
    template.insertCell(at.getInitCell('智力').setValue('8'));
    template.insertCell(at.getInitCell('魅力').setValue('11'));
    template.insertCell(at.getInitCell('生命值').setFunc('expression').setDefault('({{力量}}*0.5 + {{耐力}}*2)*10'));
    template.insertCell(at.getInitCell('魔法值').setFunc('expression').setDefault('({{魅力}}*0.5 + {{智力}}*2)*10'));
    template.insertCell(at.getInitCell('物理攻击力').setFunc('expression').setDefault('{{力量}}*3 + {{敏捷}}*1'));
    template.insertCell(at.getInitCell('魔法攻击力').setFunc('expression').setDefault('{{智力}}*4'));

    db.models.actor_template.create({
      name: template.name,
      desc: template.desc,
      avatar: '',
      uuid: uuid(),
      createAt: template.createAt,
      updateAt: new Date().valueOf(),
      info: at.stringify(template),
      creator_id: 1,
    }, function(err, template) {
      if(!!err) {
        throw new Error(err);
      }
    })
  })
}
