import express from 'express'
import Stripe from 'stripe'
import { supabase } from '../supabase.js'
import { requireAuth } from '../auth.js'

const router = express.Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const SAFE_COLS = 'id, name, description, type, price, request_quota, developer_id'

// list all agents for sale — public, URL never exposed
router.get('/agents', async (req, res) => {
  const { data, error } = await supabase
    .from('agents').select(SAFE_COLS).eq('status', 'approved').eq('deleted', false).order('created_at', { ascending: true })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// create a Stripe checkout session from a list of agent ids — logged in only
router.post('/checkout', requireAuth, async (req, res) => {
  const { agentIds } = req.body
  if (!Array.isArray(agentIds) || agentIds.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' })
  }

  // fetch real prices from DB (never trust prices from the client)
  const { data: agents, error } = await supabase
    .from('agents').select('id, name, price').in('id', agentIds)
  if (error) return res.status(500).json({ error: error.message })
  if (!agents.length) return res.status(400).json({ error: 'No valid agents' })

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: agents.map((a) => ({
        price_data: {
          currency: 'usd',
          product_data: { name: a.name },
          unit_amount: Math.round(Number(a.price) * 100), // cents
        },
        quantity: 1,
      })),
      // pass which agents + which user, so we can grant on success
      metadata: { userId: String(req.user.id), agentIds: agents.map((a) => a.id).join(',') },
      success_url: `${process.env.FRONTEND_URL}/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cart`,
    })
    res.json({ url: session.url })
  } catch (e) {
    res.status(500).json({ error: 'Stripe error: ' + e.message })
  }
})

// verify a completed session and grant the agents — called on success redirect
router.post('/grant', requireAuth, async (req, res) => {
  const { sessionId } = req.body
  if (!sessionId) return res.status(400).json({ error: 'Missing session' })

  let session
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId)
  } catch (e) {
    return res.status(400).json({ error: 'Invalid session' })
  }

  // must be paid, and must belong to this user
  if (session.payment_status !== 'paid') return res.status(400).json({ error: 'Payment not completed' })
  if (String(req.user.id) !== session.metadata.userId) return res.status(403).json({ error: 'Not your session' })

  // idempotency: if we already logged this session, don't grant twice
  const { data: already } = await supabase
    .from('purchases').select('id').eq('stripe_session', sessionId).limit(1)
  if (already && already.length) return res.json({ ok: true, alreadyGranted: true })

  const agentIds = session.metadata.agentIds.split(',').map(Number)
  const { data: agents } = await supabase
    .from('agents').select('id, price, request_quota').in('id', agentIds)

  for (const a of agents) {
    // top up balance (add quota if they already own it)
    const { data: existing } = await supabase
      .from('user_agents').select('id, requests_left')
      .eq('user_id', req.user.id).eq('agent_id', a.id).maybeSingle()

    if (existing) {
      await supabase.from('user_agents')
        .update({ requests_left: existing.requests_left + a.request_quota, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await supabase.from('user_agents')
        .insert({ user_id: req.user.id, agent_id: a.id, requests_left: a.request_quota })
    }

    // log the purchase
    await supabase.from('purchases').insert({
      user_id: req.user.id, agent_id: a.id,
      price_paid: a.price, requests_granted: a.request_quota, stripe_session: sessionId,
    })
  }

  res.json({ ok: true })
})

// agents the user owns AND still has requests for — these show as "Owned" (unbuyable).
// At 0 requests, an agent drops off this list so it becomes repurchasable.
router.get('/my-agent-ids', requireAuth, async (req, res) => {
  const { data } = await supabase
    .from('user_agents').select('agent_id').eq('user_id', req.user.id).gt('requests_left', 0)
  res.json((data || []).map((r) => r.agent_id))
})

export default router