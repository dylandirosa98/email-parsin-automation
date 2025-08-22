const { GraphQLClient } = require('graphql-request');

// Load environment variables
require('dotenv').config();

async function exploreCreateObject() {
  console.log('🔍 Exploring createOneObject mutation in detail...\n');

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
    // Get detailed information about createOneObject mutation
    console.log('🔧 Getting createOneObject mutation details...');
    const mutationDetailsQuery = `
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
                    kind
                    ofType {
                      name
                      kind
                    }
                  }
                }
                description
              }
              type {
                name
                kind
                fields {
                  name
                  type {
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

    const mutationDetails = await client.request(mutationDetailsQuery);
    const createOneObjectMutation = mutationDetails.__schema.mutationType.fields.find(field => field.name === 'createOneObject');
    
    if (createOneObjectMutation) {
      console.log('✅ createOneObject mutation found:');
      console.log('Arguments:');
      createOneObjectMutation.args.forEach(arg => {
        const typeName = arg.type.name || arg.type.ofType?.name || arg.type.ofType?.ofType?.name || 'Unknown';
        console.log(`- ${arg.name}: ${typeName} (${arg.type.kind})`);
      });
      
      console.log('\nReturn type:', createOneObjectMutation.type.name);
      if (createOneObjectMutation.type.fields) {
        console.log('Return fields:');
        createOneObjectMutation.type.fields.slice(0, 10).forEach(field => {
          console.log(`- ${field.name}: ${field.type.name || 'Unknown'}`);
        });
      }
    }

    // Let's also check what objects are available
    console.log('\n📋 Getting available objects...');
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
              description
              isActive
            }
          }
        }
      }
    `;

    try {
      const objectsResult = await client.request(objectsQuery);
      console.log('✅ Available objects:');
      objectsResult.objects.edges.forEach(edge => {
        const obj = edge.node;
        if (obj.isActive) {
          console.log(`- ${obj.labelSingular} (${obj.nameSingular}) - ID: ${obj.id}`);
        }
      });
      
      // Find person/people object
      const personObject = objectsResult.objects.edges.find(edge => 
        edge.node.nameSingular.toLowerCase().includes('person') ||
        edge.node.labelSingular.toLowerCase().includes('person') ||
        edge.node.nameSingular.toLowerCase().includes('contact') ||
        edge.node.labelSingular.toLowerCase().includes('contact')
      );
      
      if (personObject) {
        console.log(`\n🎯 Found person-like object: ${personObject.node.labelSingular} (${personObject.node.nameSingular})`);
        console.log(`Object ID: ${personObject.node.id}`);
        
        // Try to create a person using this object
        console.log('\n🧪 Testing object creation...');
        
        // First, let's see what the actual mutation signature is by trying different approaches
        const testMutations = [
          {
            name: 'No arguments',
            query: `
              mutation {
                createOneObject {
                  id
                }
              }
            `,
            variables: {}
          },
          {
            name: 'With data argument',
            query: `
              mutation TestCreate($data: JSON!) {
                createOneObject(data: $data) {
                  id
                }
              }
            `,
            variables: { data: { name: "Test" } }
          },
          {
            name: 'With object argument',
            query: `
              mutation TestCreate($object: JSON!) {
                createOneObject(object: $object) {
                  id
                }
              }
            `,
            variables: { object: { name: "Test" } }
          }
        ];

        for (const testMutation of testMutations) {
          console.log(`\nTesting: ${testMutation.name}`);
          try {
            const result = await client.request(testMutation.query, testMutation.variables);
            console.log('✅ SUCCESS!', JSON.stringify(result, null, 2));
            break; // If one works, we found it
          } catch (error) {
            console.log('❌ Failed:', error.message.split(':')[0]);
          }
        }
      }
      
    } catch (error) {
      console.log('❌ Objects query failed:', error.message);
    }

    // Let's try a different approach - check if there are REST endpoints
    console.log('\n🌐 Checking for REST API endpoints...');
    
    const restEndpoints = [
      '/rest/objects',
      '/api/objects',
      '/rest/people',
      '/api/people',
      '/rest/persons',
      '/api/persons',
      '/rest/contacts',
      '/api/contacts'
    ];

    for (const endpoint of restEndpoints) {
      try {
        const response = await fetch(`${apiUrl}${endpoint}`, {
          method: 'GET',
          headers: {
            'X-API-Key': apiToken,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          console.log(`✅ Found working REST endpoint: ${endpoint}`);
          const data = await response.text();
          console.log('Sample response (first 200 chars):', data.substring(0, 200));
          
          // Try to create via REST
          console.log(`\n🧪 Testing POST to ${endpoint}...`);
          try {
            const createResponse = await fetch(`${apiUrl}${endpoint}`, {
              method: 'POST',
              headers: {
                'X-API-Key': apiToken,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                name: "Test Contact",
                email: "test@example.com",
                phone: "+1234567890"
              })
            });
            
            if (createResponse.ok) {
              const createData = await createResponse.json();
              console.log('✅ REST creation successful!', JSON.stringify(createData, null, 2));
            } else {
              console.log(`❌ REST creation failed: ${createResponse.status} ${createResponse.statusText}`);
              const errorText = await createResponse.text();
              console.log('Error response:', errorText.substring(0, 200));
            }
          } catch (restCreateError) {
            console.log('❌ REST creation error:', restCreateError.message);
          }
          
          break; // Found a working endpoint
        }
      } catch (restError) {
        // Silently continue to next endpoint
      }
    }

  } catch (error) {
    console.error('❌ Error exploring createOneObject:', error.message);
    if (error.response && error.response.errors) {
      console.error('GraphQL Errors:', JSON.stringify(error.response.errors, null, 2));
    }
  }
}

// Run the exploration
exploreCreateObject().catch(console.error);
