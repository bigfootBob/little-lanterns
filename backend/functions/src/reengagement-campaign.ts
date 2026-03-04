import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v1';

/**
 * STRATEGY: 14-Day Reengagement Campaign
 * * Marketing Goal: Re-engage users who haven't been active for 2 weeks.
 * * Logic: Runs daily to find users whose 'lastActiveAt' timestamp was between 14 and 15 days ago.
 */
export const reengagementCampaign = functions.pubsub
    .schedule('every 24 hours') // Runs once a day
    .onRun(async (context: functions.EventContext) => {

        // Use the current time to find the 14-day window
        const now = Date.now();
        const fourteenDaysAgo = now - (14 * 24 * 60 * 60 * 1000);
        const fifteenDaysAgo = now - (15 * 24 * 60 * 60 * 1000);

        // 1. SEGMENTATION: Find users active 14-15 days ago
        // We assume 'lastActiveAt' is updated whenever the user opens the app or performs an action
        const inactiveUsersSnapshot = await admin.firestore()
            .collection('users')
            .where('lastActiveAt', '<=', fourteenDaysAgo)
            .where('lastActiveAt', '>', fifteenDaysAgo)
            .get();

        if (inactiveUsersSnapshot.empty) {
            console.log('No users qualify for the 14-day re-engagement nudge today.');
            return null;
        }

        // 2. CAMPAIGN EXECUTION: Prepare the notification payload
        const messages: admin.messaging.Message[] = [];

        inactiveUsersSnapshot.forEach((userDoc: admin.firestore.QueryDocumentSnapshot) => {
            const userData = userDoc.data();

            // Explicitly omit web users if their platform is recorded as 'web'
            if (userData.fcmToken && userData.platform !== 'web') {
                messages.push({
                    token: userData.fcmToken,
                    notification: {
                        title: "We miss you! 🏮",
                        body: "It's been 2 weeks since you last lit a lantern. Come back to see what's new!",
                    },
                    data: {
                        screen: "home_screen", // Deep link to bring them back to the action
                        campaign_id: "day_14_reengagement"
                    }
                });
            }
        });

        // 3. DELIVERY: Send the batch
        if (messages.length > 0) {
            await admin.messaging().sendEach(messages);
            console.log(`Sent 14-day re-engagement nudge to ${messages.length} users.`);
        }

        return null;
    });
