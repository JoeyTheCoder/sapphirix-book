// Fill these values from Firebase Console > Project settings > Your apps.
export const firebasePublicConfig = {
  apiKey: 'AIzaSyBpz1dxm7IJefeezbq7pdib0D9OhUUuaHw',
  authDomain: 'barboo-27dcc.firebaseapp.com',
  projectId: 'barboo-27dcc',
  appId: '1:830325068393:web:5f833df856e1dd599cc8f8',
};

export function isFirebasePublicConfigReady(): boolean {
  return Object.values(firebasePublicConfig).every((value) => value.trim().length > 0);
}