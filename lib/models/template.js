const at = require('trpg-actor-template');

module.exports = function Template(Sequelize, db) {
  let Template = db.define('actor_template', {
    uuid: {type: Sequelize.UUID, defaultValue: Sequelize.UUIDV1},
    name: {type: Sequelize.STRING, require: true},
    desc: {type: Sequelize.STRING},
    avatar: {type: Sequelize.STRING},
    info: {type: Sequelize.TEXT},
    is_deleted: {type: Sequelize.BOOLEAN, defaultValue: false},
  }, {
    methods: {
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

  Template.findTemplateAsync = (nameFragment) => {
    const Op = Sequelize.Op;
    return Template.findAll({
      where: {
        name: {
          [Op.like]: `%${nameFragment}%`
        },
        is_deleted: false
      },
      limit: 10
    })
  }

  let User = db.models.player_user;
  if(!!User) {
    // Template.hasOne('creator', User, {reverse: 'templates'});
    Template.belongsTo(User, {as: 'creator'})
  }

  return Template;
}
