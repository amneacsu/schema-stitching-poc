const fetch = require('node-fetch');
const { introspectionQuery } = require('graphql/utilities/introspectionQuery');
const { buildClientSchema } = require('graphql/utilities/buildClientSchema');
const { printSchema } = require('graphql/utilities/schemaPrinter');

module.exports = function dumpSchema({ uri, headers }) {
  return new Promise((resolve, reject) => {
    fetch(uri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        query: introspectionQuery,
      }),
    })
      .then((result) => result.json())
      .then((result) => {
        if (result.data) {
          const schema = buildClientSchema(result.data);
          const output = printSchema(schema);
          resolve(output);
        }

        if (result.errors) {
          reject(result.errors);
        }
      }).catch((e) => {
        console.error(e);
      });
  });
};
