const debug = require('debug')('trpg:component:actor');
const event = require('./event');

module.exports = function ActorComponent(app) {
  initStorage.call(app);
  initSocket.call(app);
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
    socket.on('actor::createTemplate', event.createTemplate.bind(wrap));
  })
}
