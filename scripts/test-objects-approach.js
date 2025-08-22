const { GraphQLClient } = require('graphql-request');

async function testObjectsApproach() {
  console.log('🔍 Testing the objects-based approach...\n');

  const apiUrl = 'https://crm.thespartanexteriors.com';
  const newToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMjNkMmE4My01YTAyLTQ3ZjYtODE2OS1lNWVlNWFiMmEwMjQiLCJ0eXBlIjoiQVBJX0tFWSIsIndvcmtzcGFjZUlkIjoiZTIzZDJhODMtNWEwMi00N2Y2LTgxNjktZTVlZTVhYjJhMDI0IiwiaWF0IjoxNzU1ODMyNzY1LCJleHAiOjQ5MDk0MzI3NjQsImp0aSI6IjliZmFiNmE1LWQwMTItNGE1Mi1hNDgxLWI1NzJjY2ZlNzkyYiJ9.E1Ffy_Q1oXRkUJOT3exfSA2p9fekRE0URve2QpEnPF8';

  const client = new GraphQLClient(`${apiUrl}/graphql`, {
    headers: {
      'X-API-Key': newToken,
      'content-type': 'application/json'
    }
  });

  try {
    // Test 1: Try to query objects
    console.log('📋 Testing objects query...');
    
    try {
      const objectsQuery = `
        query {
          objects {
            edges {
              node {
                id
                nameSingular
                namePlural
                labelSingular
                labelPlural
                isActive
              }
            }
          }
        }
      `;
      
      const objectsResult = await client.request(objectsQuery);
      console.log('✅ Objects query successful!');
      
      const activeObjects = objectsResult.objects.edges.filter(edge => edge.node.isActive);
      console.log('\nActive objects found:');
      activeObjects.forEach(edge => {
        const obj = edge.node;
        console.log(`- ${obj.labelSingular} (${obj.nameSingular}) - ID: ${obj.id}`);
      });
      
      // Look for person-like objects
      const personObject = activeObjects.find(edge => 
        edge.node.nameSingular.toLowerCase().includes('person') ||
        edge.node.labelSingular.toLowerCase().includes('person') ||
        edge.node.nameSingular.toLowerCase().includes('people') ||
        edge.node.labelSingular.toLowerCase().includes('people')
      );
      
      if (personObject) {
        console.log(`\n🎯 Found person object: ${personObject.node.labelSingular} (${personObject.node.nameSingular})`);
        console.log(`Object ID: ${personObject.node.id}`);
        
        // Try to query this specific object
        const objectName = personObject.node.namePlural;
        console.log(`\n🧪 Testing query for ${objectName}...`);
        
        try {
          const specificQuery = `
            query {
              ${objectName} {
                edges {
                  node {
                    id
                  }
                }
              }
            }
          `;
          
          const specificResult = await client.request(specificQuery);
          console.log(`✅ ${objectName} query successful!`);
          console.log('Found records:', specificResult[objectName].edges.length);
          
          // Now try to create one using the correct object type
          console.log(`\n🎯 Testing creation for ${objectName}...`);
          
          // Try different creation patterns
          const createMutations = [
            {
              name: `create${personObject.node.nameSingular.charAt(0).toUpperCase() + personObject.node.nameSingular.slice(1)}`,
              mutation: `
                mutation($data: ${personObject.node.nameSingular.charAt(0).toUpperCase() + personObject.node.nameSingular.slice(1)}CreateInput!) {
                  create${personObject.node.nameSingular.charAt(0).toUpperCase() + personObject.node.nameSingular.slice(1)}(data: $data) {
                    id
                  }
                }
              `,
              variables: { data: { name: { firstName: "Test", lastName: "Person" }, email: "test@example.com" } }
            }
          ];
          
          for (const createTest of createMutations) {
            try {
              console.log(`Testing ${createTest.name}...`);
              const createResult = await client.request(createTest.mutation, createTest.variables);
              console.log('✅ CREATE SUCCESS!', JSON.stringify(createResult, null, 2));
              
              console.log('\n🎉 FOUND THE WORKING SOLUTION!');
              console.log(`Object: ${personObject.node.labelSingular}`);
              console.log(`Query: ${objectName}`);
              console.log(`Mutation: ${createTest.name}`);
              return { objectName, mutation: createTest };
              
            } catch (createError) {
              console.log(`❌ ${createTest.name} failed:`, createError.message.split(':')[0]);
            }
          }
          
        } catch (specificError) {
          console.log(`❌ ${objectName} query failed:`, specificError.message.split(':')[0]);
        }
      }
      
    } catch (objectsError) {
      console.log('❌ Objects query failed:', objectsError.message);
      
      // If objects query fails, let's try a different approach
      console.log('\n🔄 Trying alternative approach...');
      
      // Check what queries are actually available
      const availableQueriesQuery = `
        query {
          __schema {
            queryType {
              fields {
                name
              }
            }
          }
        }
      `;
      
      const availableQueries = await client.request(availableQueriesQuery);
      console.log('\nAll available queries:');
      availableQueries.__schema.queryType.fields.slice(0, 20).forEach(field => {
        console.log(`- ${field.name}`);
      });
    }

  } catch (error) {
    console.error('❌ Error testing objects approach:', error.message);
    if (error.response && error.response.errors) {
      console.error('GraphQL Errors:', JSON.stringify(error.response.errors, null, 2));
    }
  }
}

testObjectsApproach().catch(console.error);
