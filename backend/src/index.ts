import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIO } from 'socket.io';
import dns from 'dns';
import { initDb } from './db';

// Force Node to prefer IPv4 to fix ENETUNREACH errors on Render for Gmail SMTP
dns.setDefaultResultOrder('ipv4first');
import batteryRouter, { setLatestData } from './routes/battery';
import { BatteryData } from '../../shared/types';

const app = express();
const server = http.createServer(app);
const io = new SocketIO(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use('/battery', batteryRouter);

// Brevo API Key
const BREVO_API_KEY = process.env.BREVO_API_KEY;

// In-memory OTP store (email -> { otp, expiresAt })
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

// Raise Ticket Endpoint
app.post('/ticket', async (req, res) => {
  const { issue, userInfo } = req.body;
  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #0056b3; border-bottom: 2px solid #0056b3; padding-bottom: 10px;">ASTRA App - New Issue Ticket</h2>
        <p><strong>Date & Time:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' })}</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #d9534f;">
          <h3 style="margin-top: 0; color: #d9534f; font-size: 18px;">Issue Description</h3>
          <p style="white-space: pre-wrap; font-size: 15px; line-height: 1.5;">${issue}</p>
        </div>
        
        <div style="background-color: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #31708f;">
          <h3 style="margin-top: 0; color: #31708f; font-size: 18px;">User Information</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            ${userInfo ? Object.entries(userInfo).map(([key, value]) => {
              let displayValue = value;
              if (key === 'timestamp' && value) {
                displayValue = new Date(String(value)).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' });
              }
              return `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold; width: 35%; color: #555; text-transform: capitalize;">${key.replace(/([A-Z])/g, ' $1').trim()}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; word-break: break-all; color: #333;">${displayValue}</td>
              </tr>
              `;
            }).join('') : '<tr><td>No user info provided.</td></tr>'}
          </table>
        </div>
        
        <p style="font-size: 12px; color: #777; text-align: center; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">
          This is an automated message generated from the ASTRA application.<br>Please do not reply directly to this email.
        </p>
      </div>
    `;

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY || '',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { email: 'hosurv45@gmail.com', name: 'ASTRA System' },
        to: [{ email: 'hosurv45@gmail.com' }],
        subject: 'New Issue Ticket Raised from ASTRA App',
        htmlContent: htmlContent
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Brevo API Error:', errText);
      return res.status(500).json({ success: false, error: 'Failed to raise ticket' });
    }

    res.json({ success: true, message: 'Ticket raised successfully' });
  } catch (error) {
    console.error('Error sending ticket:', error);
    res.status(500).json({ success: false, error: 'Failed to raise ticket' });
  }
});

// Send OTP Endpoint
app.post('/otp/send', async (req, res) => {
  const { email, name } = req.body;
  if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  // Store it with a 10-minute expiration
  otpStore.set(email.toLowerCase(), { otp, expiresAt: Date.now() + 10 * 60 * 1000 });

  try {
    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa; padding: 40px 0; margin: 0;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden;">
          <tr>
            <td style="background-color: #0891b2; padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: 600; letter-spacing: 1px;">ASTRA APP</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #1e293b; font-size: 20px; margin-top: 0; margin-bottom: 20px; font-weight: 600;">Secure Authentication</h2>
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-top: 0; margin-bottom: 24px;">
                Dear ${name || 'User'},
              </p>
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-top: 0; margin-bottom: 30px;">
                A request has been made to register a new account with ASTRA using this email address. To complete your registration and verify your identity, please use the following One-Time Password (OTP):
              </p>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 24px; text-align: center; margin-bottom: 30px;">
                <span style="display: inline-block; font-family: monospace; font-size: 32px; font-weight: bold; color: #0f172a; letter-spacing: 8px;">${otp}</span>
              </div>
              <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin-top: 0; margin-bottom: 10px;">
                <strong>Note:</strong> This code is valid for exactly <strong>10 minutes</strong>. For security reasons, please do not share this code with anyone, including ASTRA staff.
              </p>
              <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin-top: 0; margin-bottom: 0;">
                If you did not initiate this request, you may safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0; line-height: 1.5;">
                &copy; ${new Date().getFullYear()} ASTRA Smart Lithium Battery Intelligence.<br>All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </div>
    `;

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY || '',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { email: 'hosurv45@gmail.com', name: 'ASTRA System' },
        to: [{ email: email, name: name || 'User' }],
        subject: 'Your ASTRA Registration OTP',
        htmlContent: htmlContent
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Brevo API Error:', errText);
      return res.status(500).json({ success: false, error: 'Failed to send OTP' });
    }

    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Brevo OTP Error:', error);
    res.status(500).json({ success: false, error: 'Failed to send OTP' });
  }
});

// Verify OTP Endpoint
app.post('/otp/verify', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ success: false, error: 'Email and OTP are required' });

  const record = otpStore.get(email.toLowerCase());
  if (!record) {
    return res.status(400).json({ success: false, error: 'OTP not found or expired' });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return res.status(400).json({ success: false, error: 'OTP has expired' });
  }

  if (record.otp !== otp) {
    return res.status(400).json({ success: false, error: 'Invalid OTP' });
  }

  // OTP verified successfully
  otpStore.delete(email.toLowerCase());
  res.json({ success: true, message: 'OTP verified successfully' });
});

// WebSocket: push real-time data to all connected clients
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

export function broadcastData(data: BatteryData) {
  setLatestData(data);
  io.emit('battery:data', data);
}

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await initDb();
    console.log('Database initialized successfully.');
  } catch (err) {
    console.warn('Warning: Could not connect to the database. History recording will fail, but the server will still run.');
  }
  
  server.listen(PORT, () => console.log(`BMS backend running on port ${PORT}`));
}

start().catch(console.error);
