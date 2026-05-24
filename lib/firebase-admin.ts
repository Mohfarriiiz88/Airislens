import "server-only";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

import { getFirebaseAdminConfig } from "@/lib/env";

export function getFirebaseAdminMessaging() {
  const config = getFirebaseAdminConfig();

  if (!config) {
    return null;
  }

  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: config.projectId,
        clientEmail: config.clientEmail,
        privateKey: config.privateKey,
      }),
      projectId: config.projectId,
    });

  return getMessaging(app);
}
