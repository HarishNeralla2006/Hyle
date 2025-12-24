# Vercel Deployment Instructions

This project is configured to run on Vercel with a TiDB Cloud Serverless database. Follow these steps to deploy your application.

## 1. Environment Variables

For the application to connect to your TiDB database, you must configure the following Environment Variables in your Vercel Project Settings.

| Variable Name | Description | Required | Example Value |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Connection string for your Primary TiDB Cluster. | **Yes** | `mysql://username:password@gateway.tidbcloud.com:4000/test?ssl={"minVersion":"TLSv1.2"}` |
| `DATABASE_URL_SECONDARY` | Connection string for a Failover/Secondary TiDB Cluster. | No | `mysql://username:password@gateway.adb.tidbcloud.com:4000/test` |

> **Note:** Ensure your connection string includes the SSL configuration if required by your cluster (standard for TiDB Serverless).

## 2. Firebase Configuration

Your Firebase configuration is currently hardcoded in `lib/firebaseClient.ts`. No additional environment variables are needed for Firebase authentication to work immediately, but moving these to environment variables is recommended for a production-grade security posture.

## 3. Deploying

1.  Push this repository to GitHub.
2.  Import the repository into Vercel.
3.  In the **Configure Project** step, expand **Environment Variables** and add `DATABASE_URL`.
4.  Click **Deploy**.

## 4. Database Initialization

The application is designed to automatically check and initialize the database schema (tables like `profiles`, `posts`, `chats`, etc.) when the application loads.
- The initialization logic is in `lib/initDb.ts`.
- It executes safely via the `/api/query` route, protecting your database credentials from being exposed to the client.
