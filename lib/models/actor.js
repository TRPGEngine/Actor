const uuid = require('uuid/v1');

module.exports = function Actor(orm, db) {
  let Actor = db.define('actor_actor', {
    name: {type: 'text', require: true},
    desc: {type: 'text'},
    avatar: {type: 'text'},
    uuid: {type: 'text'},
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
    methods: {
      getObject: function() {
        return {
          name: this.name,
          desc: this.desc,
          avatar: this.avatar,
          uuid: this.uuid,
          template_uuid: this.template_uuid,
          info: this.info,
        }
      }
    }
  })

  let User = db.models.player_user;
  if(!!User) {
    Actor.hasOne('owner', User, {reverse: 'actors'});
  }

  return Actor;
}
