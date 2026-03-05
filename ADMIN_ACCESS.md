# Velvet Vault — Admin Access Guide

**© 2026 Velvet Vault — Sean Michael Paterson. All rights reserved.**

This document outlines the procedure for granting administrative privileges and using the admin panel to manage player deposits and withdrawals.

---

## 1. Granting Admin Access

Admin access is controlled by a **Firebase custom claim**. To grant a user admin privileges, you must set the `admin` claim to `true` for their user account. This can only be done via a trusted server-side environment (like the Firebase Admin SDK) or the Google Cloud console.

### Steps to Grant Admin via Google Cloud Console:

1.  **Go to the Firebase Console:**
    *   Navigate to the [Firebase Console](https://console.firebase.google.com/).
    *   Select your project: **`the-velvet-vault-11bd2`**.

2.  **Open Firestore Database:**
    *   In the left-hand menu, go to **Build > Firestore Database**.

3.  **Find the User:**
    *   Navigate to the `users` collection.
    *   Find the document corresponding to the user you want to make an admin. The document ID is the user's UID.

4.  **Set the Custom Claim (Requires a Helper Function):**
    *   Firebase Console UI does not directly support setting custom claims. You must use the Firebase Admin SDK. A simple way to do this is to create a temporary callable function.

    **Example Helper Function (`setAdmin.ts`):**
    ```typescript
    import * as functions from "firebase-functions";
    import * as admin from "firebase-admin";

    // IMPORTANT: Deploy this function, use it once, then DELETE it.
    export const setAdminClaim = functions.https.onCall(async (data, context) => {
      // This check is a safeguard. The caller should be an authenticated admin.
      if (context.auth?.token.admin !== true) {
        throw new functions.https.HttpsError("permission-denied", "Must be admin to run.");
      }
      const { uid } = data;
      if (!uid) {
        throw new functions.https.HttpsError("invalid-argument", "UID is required.");
      }
      await admin.auth().setCustomUserClaims(uid, { admin: true });
      return { message: `Success! ${uid} is now an admin.` };
    });
    ```

5.  **Call the Helper Function:**
    *   Once deployed, you can call this function from your browser's developer console (while logged in as an existing admin) to elevate another user.

---

## 2. Accessing the Admin Panel

Once a user has the `admin: true` custom claim, they can access the admin panel.

1.  **Log In:**
    *   Log in to Velvet Vault as the admin user.

2.  **Navigate to Admin Panel:**
    *   The **Admin Console** link will automatically appear in the top-left hamburger menu.
    *   Alternatively, go directly to: `https://velvet-vault-lilac.vercel.app/admin.html`

---

## 3. Managing Deposits & Withdrawals

The admin panel provides tools to review and process pending player requests.

### Available Admin Commands (Callable Functions)

These commands are called by the admin panel UI. They all require the caller to have an `admin: true` custom claim.

| Command | Description |
| :--- | :--- |
| `adminListPendingDepositRequests` | Fetches a list of all deposit requests with `status: "pending"`. |
| `adminListPendingWithdrawalRequests` | Fetches a list of all withdrawal requests with `status: "pending"`. |
| `adminApproveDepositRequest` | Approves a deposit, adds funds to the user's wallet, and creates a ledger entry. |
| `adminRejectDepositRequest` | Rejects a deposit request and updates its status. |
| `adminApproveWithdrawalRequest` | Approves a withdrawal, debits funds from the user's wallet, and creates a ledger entry. |
| `adminRejectWithdrawalRequest` | Rejects a withdrawal request and updates its status. |
| `adminCredit` | Manually credits a user's wallet. |
| `adminDebit` | Manually debits a user's wallet. |
| `adminSetBalance` | Sets a user's wallet balance to a specific amount. |
| `adminFreeze` | Freezes or un-freezes a user's account. |
| `adminGetUserLedger` | Fetches the full transaction ledger for a specific user. |
| `adminSentryEvaluateUser` | Runs a risk analysis on a user. |
| `adminSentryListFlagged` | Lists all users flagged by the Sentry risk system. |
| `adminDepositAssist` | Provides an AI-powered recommendation for a deposit request. |
| `adminWithdrawAssist` | Provides an AI-powered recommendation for a withdrawal request. |

