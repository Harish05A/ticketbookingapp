
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

/**
 * Scheduled Function: releaseExpiredHolds
 * Runs every 2 minutes to reclaim "zombie" held seats.
 */
// Fix: Using Firebase Functions v2 onSchedule instead of deprecated v1 pubsub.schedule
export const releaseExpiredHolds = onSchedule("every 2 minutes", async (event) => {
    const now = Date.now();
    const showsRef = db.collection("shows");
    const showsSnap = await showsRef.get();
    
    if (showsSnap.empty) return;

    const batch = db.batch();
    let hasUpdates = false;

    for (const showDoc of showsSnap.docs) {
      const showData = showDoc.data();
      const seats = showData.seats || {};
      let showNeedsUpdate = false;
      const updatedSeats = { ...seats };

      for (const [seatId, seatData] of Object.entries(seats)) {
        if (
          typeof seatData === "object" && 
          seatData !== null && 
          (seatData as any).status === "held" && 
          (seatData as any).expiresAt < now
        ) {
          updatedSeats[seatId] = "available";
          showNeedsUpdate = true;
        }
      }

      if (showNeedsUpdate) {
        batch.update(showDoc.ref, { seats: updatedSeats });
        hasUpdates = true;
      }
    }

    if (hasUpdates) await batch.commit();
  });

/**
 * TRIGGER: handleTheaterAdminCreation
 * When a Superuser adds a "pending_admin", this function:
 * 1. Creates a Firebase Auth user.
 * 2. Creates a /users/ document with is_staff=true and managedTheater=ID.
 */
// Fix: Using Firebase Functions v2 onDocumentCreated instead of deprecated v1 firestore.document().onCreate()
export const handleTheaterAdminCreation = onDocumentCreated('pending_admins/{adminId}', async (event) => {
    const snap = event.data;
    if (!snap) return;
    
    const data = snap.data();
    const { username, email, password, theaterId, theaterName } = data;

    try {
      // 1. Create the Authentication Account
      const userRecord = await admin.auth().createUser({
        email: email,
        password: password,
        displayName: username,
      });

      // 2. Create the User Document in Firestore
      await db.collection('users').doc(userRecord.uid).set({
        username: username,
        email: email,
        is_staff: true,
        is_superuser: false,
        managedTheater: {
          id: theaterId,
          name: theaterName
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`Successfully provisioned Theater Admin for ${theaterName}: ${userRecord.uid}`);
    } catch (error) {
      console.error('Error provisioning theater admin:', error);
    }
  });
