const { GraphQLClient } = require('graphql-request');

// Load environment variables
require('dotenv').config();

async function fullSchemaIntrospection() {
  console.log('🔍 Full Twenty CRM GraphQL Schema Introspection...\n');

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
    // Get all query fields
    console.log('📖 Available Query Fields:');
    const queryFieldsQuery = `
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
                  }
                }
              }
            }
          }
        }
      }
    `;

    const queryResult = await client.request(queryFieldsQuery);
    const queryFields = queryResult.__schema.queryType.fields;
    
    console.log('All available queries:');
    queryFields.forEach(field => {
      console.log(`- ${field.name}${field.args.length > 0 ? ' (has args)' : ''}: ${field.description || 'No description'}`);
    });
    console.log('');

    // Get all mutation fields
    console.log('🔧 Available Mutation Fields:');
    const mutationFieldsQuery = `
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
                  }
                }
              }
            }
          }
        }
      }
    `;

    const mutationResult = await client.request(mutationFieldsQuery);
    const mutationFields = mutationResult.__schema.mutationType.fields;
    
    console.log('All available mutations:');
    mutationFields.forEach(field => {
      console.log(`- ${field.name}${field.args.length > 0 ? ' (has args)' : ''}: ${field.description || 'No description'}`);
    });
    console.log('');

    // Look for the createOneObject mutation specifically
    const createOneObjectMutation = mutationFields.find(field => field.name === 'createOneObject');
    if (createOneObjectMutation) {
      console.log('🎯 Found createOneObject mutation! Exploring...');
      console.log('Args:', createOneObjectMutation.args.map(arg => `${arg.name}: ${arg.type.name || arg.type.ofType?.name}`).join(', '));
      
      // Let's try to use it with a simple test
      console.log('\n🧪 Testing createOneObject...');
      
      try {
        const testCreateMutation = `
          mutation TestCreate($input: JSON!) {
            createOneObject(input: $input)
          }
        `;
        
        const testInput = {
          name: "Test Lead",
          email: "test@example.com"
        };

        const testResult = await client.request(testCreateMutation, { input: testInput });
        console.log('✅ createOneObject test result:', JSON.stringify(testResult, null, 2));
      } catch (error) {
        console.log('❌ createOneObject test failed:', error.message);
        if (error.response && error.response.errors) {
          console.log('Errors:', JSON.stringify(error.response.errors, null, 2));
        }
      }
    }

    // Try to find any REST API endpoints by looking at the error messages or documentation
    console.log('\n🌐 Checking if this might be a REST API instead...');
    
    // Let's try a simple REST API call
    try {
      const restResponse = await fetch(`${apiUrl}/rest/people`, {
        method: 'GET',
        headers: {
          'X-API-Key': apiToken,
          'Content-Type': 'application/json'
        }
      });
      
      if (restResponse.ok) {
        const restData = await restResponse.json();
        console.log('✅ REST API endpoint found! Sample response:', JSON.stringify(restData, null, 2));
      } else {
        console.log(`❌ REST API call failed: ${restResponse.status} ${restResponse.statusText}`);
      }
    } catch (restError) {
      console.log('❌ REST API test failed:', restError.message);
    }

  } catch (error) {
    console.error('❌ Error during schema introspection:', error.message);
    if (error.response && error.response.errors) {
      console.error('GraphQL Errors:', JSON.stringify(error.response.errors, null, 2));
    }
  }
}

// Run the introspection
fullSchemaIntrospection().catch(console.error);
