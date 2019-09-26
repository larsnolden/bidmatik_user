import { GraphQLScalarType } from 'graphql';
import moment from 'moment';

export default {
  Date: new GraphQLScalarType({
    name: 'Date',
    description: 'Date custom scalar type',
    parseValue(value) {
      return moment(value); // value from the client
    },
    serialize(value) {
      return moment(value).format('YYYYMMDD'); // value sent to the client
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.INT) {
        return new Date(ast.value); // ast value is always in string format
      }
      return null;
    }
  })
};
