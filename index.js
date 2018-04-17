const fetch = require('node-fetch');
const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
const { graphqlExpress, graphiqlExpress } = require('apollo-server-express');
const { HttpLink } = require('apollo-link-http');
const { ApolloLink, from } = require('apollo-link');
const { makeRemoteExecutableSchema, mergeSchemas } = require('graphql-tools');

const dumpSchema = require('./dump');

const authHeaders = {
  Authorization: 'Bearer ...',
  'X-Organization-Slug': '...',
};

const uri1 = 'https://zlapi';
const uri2 = 'https://wlapi';

const link1 = new HttpLink({
  uri: uri1,
  fetch,
});

const link2 = new HttpLink({
  uri: uri2,
  fetch,
});

const p1 = dumpSchema({
  uri: uri1,
  headers: authHeaders,
});

const p2 = dumpSchema({
  uri: uri2,
  headers: authHeaders,
});

Promise.all([p1, p2]).then((results) => {
  const forwardHeadersMiddleware = new ApolloLink((operation, forward) => {
    const context = operation.getContext();

    operation.setContext(({ headers = {} }) => {
      const newHeaders = {
        Authorization: context.graphqlContext.headers.authorization,
        'X-Organization-Slug': context.graphqlContext.headers['x-organization-slug'],
      };

      return {
        headers: {
          ...headers,
          ...newHeaders,
        },
      };
    });

    return forward(operation);
  });

  const schema1 = makeRemoteExecutableSchema({
    schema: results[0],
    link: from([forwardHeadersMiddleware, link1]),
  });

  const schema2 = makeRemoteExecutableSchema({
    schema: results[1],
    link: from([forwardHeadersMiddleware, link2]),
  });

  const newSchema = mergeSchemas({
    schemas: [schema1, schema2],
  });

  const app = express();

  app.use('/graphql', cors(), bodyParser.json(), graphqlExpress((req) => {
    return {
      schema: newSchema,
      // req is needed later in remote link header forwarding
      context: req,
    };
  }));

  app.get('/graphiql', graphiqlExpress({ endpointURL: '/graphql' }));

  app.listen(3000);
});
