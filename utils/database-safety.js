const ALLOW_TOKEN = 'YES_I_UNDERSTAND';

const isTestDatabase = (name = '') => /^pawear_test_[a-z0-9_]+$/i.test(String(name));

const destructiveAllowed = (dbName) =>
  isTestDatabase(dbName) || process.env.ALLOW_DESTRUCTIVE_DB_OPS === ALLOW_TOKEN;

const destructiveError = (operation, dbName) =>
  new Error(
    `[PAWEAR DB SAFETY] Blocked ${operation} on database "${dbName || 'unknown'}". ` +
    `Destructive database operations are disabled outside isolated pawear_test_* databases. ` +
    `Set ALLOW_DESTRUCTIVE_DB_OPS=${ALLOW_TOKEN} only for an intentional one-off maintenance task.`
  );

const installDatabaseSafety = (connection) => {
  if (!connection || connection.__pawearDatabaseSafetyInstalled) return;

  const dbName = connection.name || connection.db?.databaseName || '';
  const assertDestructiveAllowed = (operation) => {
    if (!destructiveAllowed(dbName)) throw destructiveError(operation, dbName);
  };

  if (typeof connection.dropDatabase === 'function') {
    const originalDropDatabase = connection.dropDatabase.bind(connection);
    connection.dropDatabase = async (...args) => {
      assertDestructiveAllowed('mongoose.connection.dropDatabase()');
      return originalDropDatabase(...args);
    };
  }

  if (connection.db && typeof connection.db.dropDatabase === 'function') {
    const originalNativeDropDatabase = connection.db.dropDatabase.bind(connection.db);
    connection.db.dropDatabase = async (...args) => {
      assertDestructiveAllowed('db.dropDatabase()');
      return originalNativeDropDatabase(...args);
    };
  }

  if (connection.db && typeof connection.db.dropCollection === 'function') {
    const originalDropCollection = connection.db.dropCollection.bind(connection.db);
    connection.db.dropCollection = async (...args) => {
      assertDestructiveAllowed('db.dropCollection()');
      return originalDropCollection(...args);
    };
  }

  Object.defineProperty(connection, '__pawearDatabaseSafetyInstalled', {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false,
  });
};

module.exports = {
  ALLOW_TOKEN,
  destructiveAllowed,
  installDatabaseSafety,
  isTestDatabase,
};
