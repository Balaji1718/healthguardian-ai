rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Helper function: user must be authenticated
    function isSignedIn() {
      return request.auth != null;
    }

    // Helper function: user can access only their own data
    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    // =========================================================
    // USER ROOT DOCUMENT
    // /users/{userId}
    // =========================================================
    match /users/{userId} {

      // User can read only their own root user document
      allow read: if isOwner(userId);

      // User can create only their own user document with 'user' role and 'active' status
      allow create: if isOwner(userId)
        && request.resource.data.role == 'user'
        && request.resource.data.accountStatus == 'active';

      // Security-sensitive identity fields cannot be changed by the client.
      allow update: if isOwner(userId)
        && request.resource.data.uid == resource.data.uid
        && request.resource.data.role == resource.data.role
        && request.resource.data.accountStatus == resource.data.accountStatus;

      // User can delete only their own user document
      allow delete: if isOwner(userId);

      // =======================================================
      // ALL USER SUBCOLLECTIONS
      // /users/{userId}/...
      // =======================================================
      match /{document=**} {
        allow read, write: if isOwner(userId);
      }
    }
  }
}