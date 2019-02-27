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
    this.testTemplate = await db.models.actor_template.create({
      name: 'test template ' + Math.random(),
      info: 'test info',
      creatorId: this.userInfo.id
    })
  })

  afterAll(async () => {
    await this.testTemplate.destroy({
      force: true
    });
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
    expect(ret).toHaveProperty('template.creatorId');

    let uuid = _.get(ret, 'template.uuid');
    let dnum = await db.models.actor_template.destroy({
      where: {uuid},
      force: true, // 硬删除，默认是软删除
    });
    expect(dnum).toBeTruthy(); // 删除行数必须大于0
  })

  test('updateTemplate should be ok', async () => {
    let randomText = 'modified ' + Math.random();
    let ret = await emitEvent('actor::updateTemplate', {
      uuid: this.testTemplate.uuid,
      name: randomText + 'name',
      desc: randomText + 'desc',
      avatar: randomText + 'avatar',
      info: randomText + 'info',
    })

    expect(ret.result).toBe(true);
    expect(ret).toHaveProperty('template');
    expect(ret).toHaveProperty('template.name', randomText + 'name');
    expect(ret).toHaveProperty('template.desc', randomText + 'desc');
    expect(ret).toHaveProperty('template.avatar', randomText + 'avatar');
    expect(ret).toHaveProperty('template.info', randomText + 'info');

    let dbInstance = await db.models.actor_template.findOne({
      where: {
        uuid: this.testTemplate.uuid
      }
    });
    expect(dbInstance).toHaveProperty('name', randomText + 'name');
    expect(dbInstance).toHaveProperty('desc', randomText + 'desc');
    expect(dbInstance).toHaveProperty('avatar', randomText + 'avatar');
    expect(dbInstance).toHaveProperty('info', randomText + 'info');
  })

  test('removeTemplate should be ok', async () => {
    let oldTemplate = await db.models.actor_template.create({
      name: 'test ' + Math.random(),
      info: 'info',
      creatorId: this.userInfo.id
    });

    let ret = await emitEvent('actor::removeTemplate', {
      uuid: oldTemplate.uuid
    });
    expect(ret.result).toBe(true);

    let newTemplate = await db.models.actor_template.findOne({
      where: {
        uuid: oldTemplate.uuid,
      },
      paranoid: false // 搜索包括已经被软删除的行
    })
    expect(newTemplate).toBeTruthy(); // 没有被硬删除
    expect(newTemplate.deletedAt).toBeTruthy(); // 已经被软删除

    // 把测试数据硬删除掉
    await newTemplate.destroy({force: true});
  })
})

// describe('actor event', () => {

// })
