import type { NextApiRequest, NextApiResponse } from 'next';
import { connect } from '@tidbcloud/serverless';

// -----------------------------------------------------------------------------
// SERVER-SIDE DATABASE STACK (FAILOVER LAYER)
// -----------------------------------------------------------------------------
// This handler implements a "Database Stack" strategy to ensure high availability.
// It attempts to execute queries on the Primary Cluster first.
// If the Primary fails (e.g. timeout, connection error), it falls back to the Secondary Cluster.
//
// Stack Config:
// 1. Primary: process.env.DATABASE_URL (The initial/old cluster)
// 2. Secondary: process.env.DATABASE_URL_SECONDARY (The new 'Cluster1')
// -----------------------------------------------------------------------------

// Define the stack of connection strings
const dbUrls = [
  process.env.DATABASE_URL,
  process.env.DATABASE_URL_SECONDARY
].filter(Boolean) as string[];

// Initialize connections for each URL in the stack
const connections = dbUrls.map(url => connect({ url }));

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { query, params } = req.body;

    if (!query) {
      return res.status(400).json({ message: 'Query is required' });
    }

    // console.log('[API] Stack Execution Start:', query);

    let lastError: any = null;

    // -------------------------------------------------------------------------
    // STACK EXECUTION LOOP
    // -------------------------------------------------------------------------
    for (let i = 0; i < connections.length; i++) {
      const conn = connections[i];
      const isPrimary = i === 0;
      const clusterName = isPrimary ? "PRIMARY" : `SECONDARY_${i}`;

      try {
        // console.log(`[API] Attempting execution on ${clusterName}...`);

        // Execute query safely
        const result = await conn.execute(query, params || []);

        // console.log(`[API] Success on ${clusterName}`);

        // Return immediately on success (One finishes after other concept)
        return res.status(200).json({
          data: {
            rows: result,
            meta: { source: clusterName } // Debug info to know which DB answered
          }
        });

      } catch (error: any) {
        console.warn(`[API] Failed on ${clusterName}:`, error.message);
        lastError = error;
        // Continue to the next connection in the stack...
      }
    }

    // If we exit the loop, it means ALL connections in the stack failed.
    throw lastError || new Error('No database connections available in stack.');

  } catch (error: any) {
    console.error('[Database Stack Error]', error);
    res.status(500).json({
      message: 'All Database Stack Layers Failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
