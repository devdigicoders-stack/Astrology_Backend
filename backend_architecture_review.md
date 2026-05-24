# Backend Architecture & Code Flow Review (Astrolargery)

This document provides a deep cross-check ("Deepcross") of the Astrolargery backend codebase.

## 1. Overall Architecture
The application is built using **Node.js, Express.js, MongoDB (Mongoose), and Socket.io**.
It is a marketplace application connecting **Users (Customers)** with **Astrologers**, managed by **Admins**.

- **Entry Point:** `Server.js`
- **Real-time Communication:** Socket.io (attached to the Express server) for call timers and chat.
- **Video/Audio Calling:** Agora (Tokens generated via `agora-token`).
- **Database:** MongoDB.

## 2. Authentication Flow
- **JWT (JSON Web Tokens)** is used for securing APIs. Middleware (`authMiddleware.js`) separates access for `protectUser`, `protectAstrologer`, and `protectAdmin`.
- **User Login/Registration:** 
  - Users request an OTP using their phone number (`sendOTP`). 
  - Currently, OTP is mocked as `123456` or logged to the console.
  - Upon verifying OTP, if the user doesn't exist, they are prompted for details or registered.
- **Astrologer Registration:** 
  - Astrologers **cannot self-register**. They are created by Admins (`registerAstrologer`).
  - Once created and marked `isVerified`, astrologers can log in using their phone number and OTP.

## 3. The Core Feature: Call & Billing Flow
This is the most critical part of the application (handled in `callController.js` and `sockets/callHandler.js`):

1. **Initiation (`/api/calls/initiate`):** 
   - A User initiates a call. The system checks if the Astrologer is `online` and if the User has enough wallet balance for at least a 5-minute call.
   - A `pending` call history record is created.
   - An `incoming_call_request` socket event is sent to the Astrologer.
   - *Auto-Reject:* If not answered in 60 seconds, the call automatically rejects.
2. **Acceptance (`/api/calls/accept`):** 
   - Astrologer accepts the call. Status changes to `ongoing`.
   - Astrologer's availability becomes `busy`.
   - A socket event `call_accepted` is sent to the user.
3. **Agora Connection:**
   - The frontend calls `/api/calls/:id/agora-token` to get an Agora token to start the actual WebRTC audio/video stream.
4. **Live Billing (Socket.io - `start_timer`):**
   - The frontend emits `start_timer` to Socket.io.
   - `handleMinuteTick` immediately deducts for the first minute.
   - A `setInterval` runs every **60 seconds**.
   - **First Call Free Logic:** If `isFirstCallFree` is true and duration < 5 mins, `0` is deducted.
   - **Wallet Deduction:** The `perMinuteRate` is deducted from the User's wallet. It is split into `astrologerShare` and `superAdminShare` based on `commissionPercentage`.
   - **Force Disconnect:** If the user's wallet goes empty, a `force_disconnect` event is emitted to end the call immediately.
5. **End Call:**
   - Timer is cleared, Astrologer is marked `online` again, and the call is marked `completed`.

## 4. Admin & Settings
- Admins manage Users and Astrologers.
- **Global Commission:** SuperAdmins can set a global commission percentage (`setGlobalAstrologerCommission`), ensuring the platform takes a cut from the wallet deductions.

## 5. Code Health & Suggestions (Cross-Check Results)
The code is logically sound, well-organized, and follows standard MVC patterns. However, here are a few things to note before going to production:

> [!WARNING]
> **Sudden Disconnects:** In `sockets/callHandler.js`, the `disconnect` event has a comment `// Ideally handle sudden disconnects if they are in an active call`. If a user loses internet abruptly during a call, the timer (`setInterval`) might keep running until their balance is fully drained or the astrologer hangs up. You should implement logic to pause or end the call if a socket disconnects.

> [!TIP]
> **OTP Integration:** The OTP verification (`otp !== "123456"`) is currently hardcoded for testing. Ensure a real SMS provider (like Twilio, MSG91, or Firebase) is integrated before launch.

> [!IMPORTANT]
> **Environment Variables:** Ensure `JWT_SECRET`, `AGORA_APP_ID`, and `AGORA_APP_CERTIFICATE` are securely set in your production `.env` file. The app falls back to `"fallback_secret_key"`, which is a security risk if deployed as-is.
