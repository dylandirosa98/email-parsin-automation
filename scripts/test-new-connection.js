const { GraphQLClient } = require('graphql-request');

async function testNewToken() {
  console.log('🧪 Testing new API token with Twenty CRM...\n');

  const apiUrl = 'https://crm.thespartanexteriors.com';
  const newToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMjNkMmE4My01YTAyLTQ3ZjYtODE2OS1lNWVlNWFiMmEwMjQiLCJ0eXBlIjoiQVBJX0tFWSIsIndvcmtzcGFjZUlkIjoiZTIzZDJhODMtNWEwMi00N2Y2LTgxNjktZTVlZTVhYjJhMDI0IiwiaWF0IjoxNzU1ODMyNzY1LCJleHAiOjQ5MDk0MzI3NjQsImp0aSI6IjliZmFiNmE1LWQwMTItNGE1Mi1hNDgxLWI1NzJjY2ZlNzkyYiJ9.E1Ffy_Q1oXRkUJOT3exfSA2p9fekRE0URve2QpEnPF8';

  // Test with X-API-Key header (our updated format)
  const client = new GraphQLClient(`${apiUrl}/graphql`, {
    headers: {
      'X-API-Key': newToken,
      'content-type': 'application/json'
    }
  });

  try {
    // Test 1: Basic introspection
    console.log('Test 1: Basic Schema Access');
    const introspectionQuery = `
      query {
        __schema {
          queryType {
            name
          }
        }
      }
    `;
    
    const result = await client.request(introspectionQuery);
    console.log('✅ Schema access successful');
    console.log('- Query type:', result.__schema.queryType.name);
    console.log('');

    // Test 2: Try the old lead creation to see if it works now
    console.log('Test 2: Testing Lead Creation (old format)');
    try {
      const createLeadMutation = `
        mutation CreateLead($input: LeadCreateInput!) {
          createLead(data: $input) {
            id
            name
            email {
              primaryEmail
            }
            phone {
              primaryPhoneNumber
            }
            source
            status
          }
        }
      `;
      
      const leadData = {
        name: "Test Lead New Token",
        source: "WEBSITE_DIRECT",
        status: "NEW",
        email: { primaryEmail: "test@example.com" },
        phone: { primaryPhoneNumber: "+1234567890" },
        notes: "Test lead created with new API token"
      };

      const leadResult = await client.request(createLeadMutation, { input: leadData });
      console.log('✅ Lead creation successful!');
      console.log('Created lead:', JSON.stringify(leadResult, null, 2));
      
      // Try to clean up
      try {
        const deleteLeadMutation = `
          mutation DeleteLead($id: ID!) {
            deleteLead(id: $id) {
              id
            }
          }
        `;
        
        await client.request(deleteLeadMutation, { id: leadResult.createLead.id });
        console.log('✅ Test lead cleaned up');
      } catch (deleteError) {
        console.warn('⚠️  Could not delete test lead:', deleteError.message);
      }
      
    } catch (leadError) {
      console.log('❌ Lead creation (old format) failed:', leadError.message);
      if (leadError.response && leadError.response.errors) {
        console.log('Errors:', JSON.stringify(leadError.response.errors, null, 2));
      }
    }
    
    console.log('\n🎉 NEW TOKEN IS WORKING!');
    console.log('✅ Authentication successful with X-API-Key header');
    console.log('✅ GraphQL schema access working');
    
    console.log('\n📋 Next steps:');
    console.log('1. Update your Railway environment variable TWENTY_API_TOKEN with the new token');
    console.log('2. Restart your service');
    console.log('3. Test lead submissions');

  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    if (error.response && error.response.errors) {
      console.error('GraphQL Errors:', JSON.stringify(error.response.errors, null, 2));
    }
  }
}

testNewToken().catch(console.error);
