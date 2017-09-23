const uuid = require('uuid/v1');
const at = require('trpg-actor-template');

module.exports = function Template(orm, db) {
  let Template = db.define('actor_template', {
    name: {type: 'text', require: true},
    desc: {type: 'text'},
    avatar: {type: 'text'},
    uuid: {type: 'text'},
    info: {type: 'text'},
  }, {
    hooks: {
      beforeCreate: function(next) {
        if (!this.uuid) {
  				this.uuid = uuid();
  			}
  			return next();
      },
    },
    method: {
      getObject: function() {
        let info = {};
        try {
          info = at.parse(this.info);
        } catch(err) {
          console.error(err);
        } finally {
          return info;
        }
      }
    }
  })

  let User = db.models.player_user;
  if(!!User) {
    Template.hasOne('creator', User, {reverse: 'templates'});
  }

  return Template;
}
