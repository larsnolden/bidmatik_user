# User Microservice

## Code Style:


### Graphql

> use input Object types  for mutations

They make creating mutations on the client easier and more compact

*** Client:  ***
```
mutation createPlanet($input: CreatePlanetInput!) {
  createPlanet(input: $input) {
    planet {
      id
      name
      age
      color
      size
    }
  }
}
```

*** Server:  ***

```
input CreatePlanetInput {
  name: String!
  age: Int!
  color: Color!
  size: Int!
}

type MutationRootType {
  createPlanet(input: CreatePlanetInput!): Planet!
}
```

1. We save on writing out the full set of arguments on the client in the mutation request:

```
(Bad Form)

mutation createPlanet(
  $name: String!,
  $age: Int!,
  $color: Color!,
  $size: Int!
  ) {
  createPlanet(
    name: $name,
    age: $age,
    color: $color,
    size: $size,
  ) {
    planet {
      id
      name
      age
      color
      size
    }
  }
}

```

2. We do not have to change any GQL on the frontend if we decide to change (eg. add or delete) the arguments for the mutation

___

> always return the affected type as a result of a mutation

This in combination with an ID on every type allows the client cache to merge the updated type automagically.

____
> Extract as much logic as possible out of the resolver in testable functions
___
> Create .graphql files for every type or very similar types
___
> Use the db handler on the context to resolve data
```
TODO: insert example
```
___
