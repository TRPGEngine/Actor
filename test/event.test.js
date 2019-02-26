const db = global.db;
const emitEvent = global.emitEvent;
const _ = global._;

beforeAll(async () => {
  const loginInfo = await emitEvent('player::login', {
    username: 'admin1',
    password: '21232f297a57a5a743894a0e4a801fc3'
  })
  expect(loginInfo.result).toBe(true);
  this.userInfo = loginInfo.info;
})

afterAll(async () => {
  let {
    uuid,
    token
  } = this.userInfo;
  await emitEvent('player::logout', { uuid, token })
})

describe('template event', () => {
  beforeAll(async () => {
    expect(db.models).toHaveProperty('actor_template');
    this.testTemplate = await db.models.actor_template.findOne();
  })

  test('getTemplate all should be ok', async () => {
    let ret = await emitEvent('actor::getTemplate');
    expect(ret.result).toBe(true);
    expect(ret).toHaveProperty('templates');
    expect(Array.isArray(ret.templates)).toBe(true);
  })

  test('getTemplate specify should be ok', async () => {
    let ret = await emitEvent('actor::getTemplate', {uuid: this.testTemplate.uuid});
    expect(ret.result).toBe(true);
    expect(ret).toHaveProperty('template');
    expect(ret.template.uuid).toBe(this.testTemplate.uuid);
  })

  test('findTemplate should be ok', async () => {
    let ret = await emitEvent('actor::findTemplate', {name: '刀'});
    expect(ret.result).toBe(true);
    expect(ret).toHaveProperty('templates');
    expect(ret).toHaveProperty('templates.0.creator_name');
  })

  test('createTemplate should be ok', async () => {
    let ret = await emitEvent('actor::createTemplate', {
      name: 'test template ' + Math.random(),
      info: JSON.stringify({
        test: 'abc',
        number: 2
      })
    })

    expect(ret.result).toBe(true);
    expect(ret).toHaveProperty('template');
    expect(ret).toHaveProperty('template.creator_id');

    let uuid = _.get(ret, 'template.uuid');
    let dnum = await db.models.actor_template.destroy({
      where: {uuid},
      force: true, // 硬删除，默认是软删除
    });
    expect(dnum).toBeTruthy();
  })
})

// describe('actor event', () => {

// })
