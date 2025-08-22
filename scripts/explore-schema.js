const { GraphQLClient } = require('graphql-request');

// Load environment variables
require('dotenv').config();

async function exploreGraphQLSchema() {
  console.log('🔍 Exploring Twenty CRM GraphQL Schema...\n');

  const apiUrl = process.env.TWENTY_API_URL || 'https://crm.thespartanexteriors.com';
  const apiToken = process.env.TWENTY_API_TOKEN;

  // Use X-API-Key header since it works
  const client = new GraphQLClient(`${apiUrl}/graphql`, {
    headers: {
      'X-API-Key': apiToken,
      'content-type': 'application/json'
    }
  });

  try {
    // 1. Get all available types
    console.log('📋 Getting available types...');
    const typesQuery = `
      query {
        __schema {
          types {
            name
            kind
            description
          }
        }
      }
    `;

    const typesResult = await client.request(typesQuery);
    const types = typesResult.__schema.types.filter(type => 
      type.name.toLowerCase().includes('lead') || 
      type.name.toLowerCase().includes('person') ||
      type.name.toLowerCase().includes('contact') ||
      type.name.toLowerCase().includes('company') ||
      type.name.toLowerCase().includes('opportunity')
    );

    console.log('🎯 Relevant types found:');
    types.forEach(type => {
      console.log(`- ${type.name} (${type.kind}): ${type.description || 'No description'}`);
    });
    console.log('');

    // 2. Get mutation operations
    console.log('🔧 Getting available mutations...');
    const mutationsQuery = `
      query {
        __schema {
          mutationType {
            fields {
              name
              description
              args {
                name
                type {
                  name
                  kind
                  ofType {
                    name
                    kind
                  }
                }
              }
            }
          }
        }
      }
    `;

    const mutationsResult = await client.request(mutationsQuery);
    const mutations = mutationsResult.__schema.mutationType.fields.filter(field =>
      field.name.toLowerCase().includes('create') || 
      field.name.toLowerCase().includes('person') ||
      field.name.toLowerCase().includes('contact') ||
      field.name.toLowerCase().includes('company') ||
      field.name.toLowerCase().includes('lead') ||
      field.name.toLowerCase().includes('opportunity')
    );

    console.log('🎯 Relevant mutations found:');
    mutations.forEach(mutation => {
      console.log(`- ${mutation.name}: ${mutation.description || 'No description'}`);
      if (mutation.args.length > 0) {
        console.log(`  Args: ${mutation.args.map(arg => `${arg.name}: ${arg.type.name || arg.type.ofType?.name}`).join(', ')}`);
      }
    });
    console.log('');

    // 3. Get query operations for reading data
    console.log('📖 Getting available queries...');
    const queriesQuery = `
      query {
        __schema {
          queryType {
            fields {
              name
              description
              args {
                name
                type {
                  name
                  kind
                  ofType {
                    name
                    kind
                  }
                }
              }
            }
          }
        }
      }
    `;

    const queriesResult = await client.request(queriesQuery);
    const queries = queriesResult.__schema.queryType.fields.filter(field =>
      field.name.toLowerCase().includes('person') ||
      field.name.toLowerCase().includes('contact') ||
      field.name.toLowerCase().includes('company') ||
      field.name.toLowerCase().includes('lead') ||
      field.name.toLowerCase().includes('opportunity')
    );

    console.log('🎯 Relevant queries found:');
    queries.forEach(query => {
      console.log(`- ${query.name}: ${query.description || 'No description'}`);
    });
    console.log('');

    // 4. If we found person-related types, let's explore the person type in detail
    const personType = types.find(type => type.name.toLowerCase().includes('person'));
    if (personType) {
      console.log(`📝 Exploring ${personType.name} type in detail...`);
      const personDetailsQuery = `
        query {
          __type(name: "${personType.name}") {
            fields {
              name
              type {
                name
                kind
                ofType {
                  name
                  kind
                }
              }
              description
            }
          }
        }
      `;

      const personDetails = await client.request(personDetailsQuery);
      console.log(`Fields in ${personType.name}:`);
      personDetails.__type.fields.forEach(field => {
        const typeName = field.type.name || field.type.ofType?.name || 'Unknown';
        console.log(`- ${field.name}: ${typeName} ${field.description ? '(' + field.description + ')' : ''}`);
      });
      console.log('');
    }

    // 5. Look for create person mutation specifically
    const createPersonMutation = mutations.find(m => m.name.toLowerCase().includes('person') && m.name.toLowerCase().includes('create'));
    if (createPersonMutation) {
      console.log(`🎯 Found create person mutation: ${createPersonMutation.name}`);
      
      // Get the input type details
      const inputArg = createPersonMutation.args.find(arg => arg.name === 'data' || arg.name === 'input');
      if (inputArg) {
        const inputTypeName = inputArg.type.name || inputArg.type.ofType?.name;
        console.log(`Input type: ${inputTypeName}`);
        
        if (inputTypeName) {
          const inputTypeQuery = `
            query {
              __type(name: "${inputTypeName}") {
                inputFields {
                  name
                  type {
                    name
                    kind
                    ofType {
                      name
                      kind
                    }
                  }
                  description
                }
              }
            }
          `;

          const inputTypeDetails = await client.request(inputTypeQuery);
          console.log(`Fields in ${inputTypeName}:`);
          inputTypeDetails.__type.inputFields.forEach(field => {
            const typeName = field.type.name || field.type.ofType?.name || 'Unknown';
            console.log(`- ${field.name}: ${typeName} ${field.description ? '(' + field.description + ')' : ''}`);
          });
        }
      }
    }

  } catch (error) {
    console.error('❌ Error exploring schema:', error.message);
    if (error.response && error.response.errors) {
      console.error('GraphQL Errors:', JSON.stringify(error.response.errors, null, 2));
    }
  }
}

// Run the exploration
exploreGraphQLSchema().catch(console.error);
