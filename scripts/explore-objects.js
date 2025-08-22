const { GraphQLClient } = require('graphql-request');

// Load environment variables
require('dotenv').config();

async function exploreObjects() {
  console.log('🔍 Exploring Twenty CRM Object System...\n');

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
    // 1. First, let's see if we can query objects directly
    console.log('📋 Trying to query objects...');
    
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
      console.log('✅ Found objects:');
      objectsResult.objects.edges.forEach(edge => {
        const obj = edge.node;
        console.log(`- ${obj.labelSingular} (${obj.nameSingular}): ${obj.description || 'No description'} - Active: ${obj.isActive}`);
      });
      console.log('');
    } catch (error) {
      console.log('❌ Objects query failed, trying alternative approach...\n');
    }

    // 2. Let's try to find people/persons directly
    console.log('🔍 Trying to query people...');
    
    const peopleQuery = `
      query {
        people {
          edges {
            node {
              id
              name {
                firstName
                lastName
              }
              email
              phone
              createdAt
            }
          }
        }
      }
    `;

    try {
      const peopleResult = await client.request(peopleQuery);
      console.log('✅ People query successful! Found people:');
      peopleResult.people.edges.slice(0, 3).forEach(edge => {
        const person = edge.node;
        console.log(`- ${person.name.firstName} ${person.name.lastName}: ${person.email} | ${person.phone}`);
      });
      console.log(`Total people found: ${peopleResult.people.edges.length}`);
      console.log('');
    } catch (error) {
      console.log('❌ People query failed:', error.message);
    }

    // 3. Let's try to find companies
    console.log('🔍 Trying to query companies...');
    
    const companiesQuery = `
      query {
        companies {
          edges {
            node {
              id
              name
              domainName
              createdAt
            }
          }
        }
      }
    `;

    try {
      const companiesResult = await client.request(companiesQuery);
      console.log('✅ Companies query successful! Found companies:');
      companiesResult.companies.edges.slice(0, 3).forEach(edge => {
        const company = edge.node;
        console.log(`- ${company.name}: ${company.domainName}`);
      });
      console.log(`Total companies found: ${companiesResult.companies.edges.length}`);
      console.log('');
    } catch (error) {
      console.log('❌ Companies query failed:', error.message);
    }

    // 4. Let's try to find opportunities
    console.log('🔍 Trying to query opportunities...');
    
    const opportunitiesQuery = `
      query {
        opportunities {
          edges {
            node {
              id
              name
              amount {
                amountMicros
                currencyCode
              }
              stage
              createdAt
            }
          }
        }
      }
    `;

    try {
      const opportunitiesResult = await client.request(opportunitiesQuery);
      console.log('✅ Opportunities query successful! Found opportunities:');
      opportunitiesResult.opportunities.edges.slice(0, 3).forEach(edge => {
        const opportunity = edge.node;
        console.log(`- ${opportunity.name}: $${opportunity.amount?.amountMicros / 1000000 || 0} ${opportunity.amount?.currencyCode || 'USD'} - Stage: ${opportunity.stage}`);
      });
      console.log(`Total opportunities found: ${opportunitiesResult.opportunities.edges.length}`);
      console.log('');
    } catch (error) {
      console.log('❌ Opportunities query failed:', error.message);
    }

    // 5. Now let's try to create a person
    console.log('🎯 Testing person creation...');
    
    const createPersonMutation = `
      mutation CreatePerson($data: PersonCreateInput!) {
        createPerson(data: $data) {
          id
          name {
            firstName
            lastName
          }
          email
          phone
          createdAt
        }
      }
    `;

    const personData = {
      name: {
        firstName: "Test",
        lastName: "Contact"
      },
      email: "test@example.com",
      phone: "+1234567890"
    };

    try {
      const createResult = await client.request(createPersonMutation, { data: personData });
      console.log('✅ Person creation successful!');
      console.log('Created person:', JSON.stringify(createResult, null, 2));
      
      // Try to delete the test person
      try {
        const deletePersonMutation = `
          mutation DeletePerson($id: ID!) {
            deletePerson(id: $id) {
              id
            }
          }
        `;
        
        await client.request(deletePersonMutation, { id: createResult.createPerson.id });
        console.log('✅ Test person cleaned up');
      } catch (deleteError) {
        console.warn('⚠️  Could not delete test person:', deleteError.message);
      }
      
    } catch (error) {
      console.log('❌ Person creation failed:', error.message);
      if (error.response && error.response.errors) {
        console.log('GraphQL Errors:', JSON.stringify(error.response.errors, null, 2));
      }
    }

  } catch (error) {
    console.error('❌ Error exploring objects:', error.message);
    if (error.response && error.response.errors) {
      console.error('GraphQL Errors:', JSON.stringify(error.response.errors, null, 2));
    }
  }
}

// Run the exploration
exploreObjects().catch(console.error);
