const mysql = require('mysql');
const MySQLEvents = require('@apagiaro/mysql-events');
const config = require('../config');

const start = async () => {
  const connection = await mysql.createConnection(config.db);
  const instance = new MySQLEvents(connection, {
    startAtEnd: false,
    excludedSchemas: {
      mysql: true,
    },
  });

  await instance.start();

  instance.addTrigger({
    name: 'REQUEST ADDED',
    expression: '_odg.processing_requests',
    statement: MySQLEvents.STATEMENTS.INSERT,
    onEvent: async (event) => {
      console.log("insert", event);
    },
  });

  instance.addTrigger({
    name: 'REQUEST UPDATED',
    expression: '_odg.processing_requests',
    statement: MySQLEvents.STATEMENTS.UPDATE,
    onEvent: async (event) => {
      console.log("update", event);
    },
  });

  instance.on(MySQLEvents.EVENTS.CONNECTION_ERROR, console.error);
  instance.on(MySQLEvents.EVENTS.ZONGJI_ERROR, console.error);
}

start()
  .then(() => console.log("Watching..."))
  .catch(console.error);
