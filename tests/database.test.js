const { sequelize } = require('../config/database');

describe('Database Connection', () => {
  test('should connect to test database successfully', async () => {
    await expect(sequelize.authenticate()).resolves.not.toThrow();
  });

  test('should be able to execute raw queries', async () => {
    const [results] = await sequelize.query('SELECT 1 as test_value');
    expect(results[0].test_value).toBe(1);
  });
});
