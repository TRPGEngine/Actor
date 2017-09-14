const uuid = require('uuid/v1');

module.exports = function Actor(orm, db) {
  let Actor = db.define('actor_actor', {
    name: {type: 'text', require: true},
    desc: {type: 'text', require: true},
    avatar: {type: 'text', required: false},
    uuid: {type: 'text', required: false},
    template_uuid: {type: 'text', required: true},
    info: {type: 'object'},
  }, {
    hooks: {
      beforeCreate: function(next) {
        if (!this.uuid) {
  				this.uuid = uuid();
  			}
  			return next();
      }
    },
  })

  let User = db.models.player_user;
  if(!!User) {
    Actor.hasOne('owner', User);
  }

  return Actor;
}