const { queryCollection, updateDoc, addDoc, getDoc, setDoc } = require('../backend/database/firestore');

async function setSuperAdmin() {
  const targetEmail = 'camanishkalra@gmail.com';
  console.log(`Setting ${targetEmail} as super_admin...`);

  try {
    const users = await queryCollection('users', {
      filters: [{ field: 'email', op: '==', value: targetEmail }]
    });

    if (users && users.length > 0) {
      for (const u of users) {
        console.log(`Found existing user ID: ${u.id}, current role: ${u.role}`);
        await updateDoc('users', u.id, {
          role: 'super_admin',
          status: 'active',
          is_onboarded: true,
          updated_at: new Date().toISOString()
        });
        console.log(`Updated user ${u.id} (${targetEmail}) to role: super_admin`);
      }
    } else {
      console.log(`User not found in Firestore yet. Creating pre-provisioned super_admin profile for ${targetEmail}...`);
      const newAdmin = await addDoc('users', {
        name: 'CA Manish Kalra',
        email: targetEmail,
        role: 'super_admin',
        status: 'active',
        is_onboarded: true,
        auth_provider: 'google',
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=ManishKalra`,
        profilePictureUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=ManishKalra`,
        created_at: new Date().toISOString()
      });
      console.log(`Created new super_admin account for ${targetEmail} with ID: ${newAdmin.id}`);
    }
    console.log('Done!');
  } catch (err) {
    console.error('Error setting super_admin:', err);
  }
}

setSuperAdmin();
