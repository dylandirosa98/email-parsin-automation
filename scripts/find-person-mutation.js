const { GraphQLClient } = require('graphql-request');

async function findPersonMutation() {
  console.log('🔍 Finding the correct person/contact creation method...\n');

  const apiUrl = 'https://crm.thespartanexteriors.com';
  const newToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMjNkMmE4My01YTAyLTQ3ZjYtODE2OS1lNWVlNWFiMmEwMjQiLCJ0eXBlIjoiQVBJX0tFWSIsIndvcmtzcGFjZUlkIjoiZTIzZDJhODMtNWEwMi00N2Y2LTgxNjktZTVlZTVhYjJhMDI0IiwiaWF0IjoxNzU1ODMyNzY1LCJleHAiOjQ5MDk0MzI3NjQsImp0aSI6IjliZmFiNmE1LWQwMTItNGE1Mi1hNDgxLWI1NzJjY2ZlNzkyYiJ9.E1Ffy_Q1oXRkUJOT3exfSA2p9fekRE0URve2QpEnPF8';

  const client = new GraphQLClient(`${apiUrl}/graphql`, {
    headers: {
      'X-API-Key': newToken,
      'content-type': 'application/json'
    }
  });

  try {
    // Let's try to find what queries are available for people/persons
    console.log('📖 Looking for person-related queries...');
    
    const queriesQuery = `
      query {
        __schema {
          queryType {
            fields {
              name
              description
            }
          }
        }
      }
    `;

    const queriesResult = await client.request(queriesQuery);
    const personQueries = queriesResult.__schema.queryType.fields.filter(field =>
      field.name.toLowerCase().includes('person') ||
      field.name.toLowerCase().includes('people') ||
      field.name.toLowerCase().includes('contact')
    );

    console.log('Person-related queries found:');
    personQueries.forEach(query => {
      console.log(`- ${query.name}: ${query.description || 'No description'}`);
    });

    // Test if we can query people directly
    console.log('\n🧪 Testing direct people query...');
    
    const testQueries = [
      { name: 'people', query: 'query { people { edges { node { id name { firstName lastName } } } } }' },
      { name: 'persons', query: 'query { persons { edges { node { id name { firstName lastName } } } } }' },
      { name: 'contacts', query: 'query { contacts { edges { node { id name { firstName lastName } } } } }' }
    ];

    for (const testQuery of testQueries) {
      try {
        console.log(`\nTesting ${testQuery.name} query...`);
        const result = await client.request(testQuery.query);
        console.log(`✅ ${testQuery.name} query works!`);
        console.log('Sample result:', JSON.stringify(result, null, 2).substring(0, 300));
        
        // If this works, let's try to create one
        console.log(`\n🎯 Testing ${testQuery.name} creation...`);
        
        const createMutations = [
          `mutation { createPerson(data: { name: { firstName: "Test", lastName: "Person" }, email: "test@example.com" }) { id name { firstName lastName } } }`,
          `mutation { create${testQuery.name.charAt(0).toUpperCase() + testQuery.name.slice(1, -1)}(data: { name: { firstName: "Test", lastName: "Person" }, email: "test@example.com" }) { id name { firstName lastName } } }`
        ];

        for (const createMutation of createMutations) {
          try {
            const createResult = await client.request(createMutation);
            console.log(`✅ Creation successful!`, JSON.stringify(createResult, null, 2));
            
            // Found it! This is the working mutation
            console.log(`\n🎉 FOUND WORKING MUTATION!`);
            console.log(`Query: ${testQuery.name}`);
            console.log(`Mutation: ${createMutation}`);
            return;
            
          } catch (createError) {
            console.log(`❌ Create mutation failed:`, createError.message.split(':')[0]);
          }
        }
        
      } catch (error) {
        console.log(`❌ ${testQuery.name} query failed:`, error.message.split(':')[0]);
      }
    }

    // If direct queries don't work, let's check the createOneObject approach
    console.log('\n🔧 Exploring createOneObject mutation...');
    
    const mutationQuery = `
      query {
        __schema {
          mutationType {
            fields {
              name
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

    const mutationResult = await client.request(mutationQuery);
    const createOneObject = mutationResult.__schema.mutationType.fields.find(field => field.name === 'createOneObject');
    
    if (createOneObject) {
      console.log('createOneObject mutation details:');
      console.log('Arguments:', createOneObject.args.map(arg => `${arg.name}: ${arg.type.name || arg.type.ofType?.name}`));
      
      // Try different argument patterns for createOneObject
      const testCreateMutations = [
        { 
          name: 'No args',
          mutation: `mutation { createOneObject { id } }`,
          variables: {}
        },
        {
          name: 'With data',
          mutation: `mutation($data: JSON!) { createOneObject(data: $data) { id } }`,
          variables: { data: { name: "Test" } }
        }
      ];

      for (const test of testCreateMutations) {
        try {
          console.log(`\nTesting createOneObject with ${test.name}...`);
          const result = await client.request(test.mutation, test.variables);
          console.log(`✅ Success:`, JSON.stringify(result, null, 2));
        } catch (error) {
          console.log(`❌ Failed:`, error.message.split(':')[0]);
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

findPersonMutation().catch(console.error);
